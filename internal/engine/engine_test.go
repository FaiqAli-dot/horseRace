package engine_test

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"github.com/FaiqAli-dot/horseRace/internal/audit"
	"github.com/FaiqAli-dot/horseRace/internal/config"
	"github.com/FaiqAli-dot/horseRace/internal/domain"
	"github.com/FaiqAli-dot/horseRace/internal/engine"
	"github.com/FaiqAli-dot/horseRace/internal/rgs"
	"github.com/FaiqAli-dot/horseRace/internal/rng"
	"github.com/FaiqAli-dot/horseRace/internal/storage/sqlite"
)

type nopBus struct{}

func (nopBus) Broadcast(string, any) {}

func testEngine(t *testing.T, seed int64) *engine.Engine {
	t.Helper()
	dir := t.TempDir()
	cfg := config.Config{
		DemoPlayerID:     "demo-player",
		StartingBalanceC: 100000,
		TakeoutRate:      0.04,
		BettingWindow:    2 * time.Second,
		RaceWindow:       30 * time.Millisecond,
		ResultWindow:     20 * time.Millisecond,
		UpcomingRaces:    2,
		RNGSeed:          seed,
		ZeroWinPolicy:    "refund_market",
		DBPath:           filepath.Join(dir, "t.db"),
	}
	store, err := sqlite.Open(cfg.DBPath)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = store.Close() })
	eng := engine.New(cfg, store, rng.NewMock(seed), rgs.NewMock(), audit.New(store.InsertAudit), nopBus{})
	if err := eng.Bootstrap(context.Background()); err != nil {
		t.Fatal(err)
	}
	return eng
}

func TestLifecycleLockRejectsBets(t *testing.T) {
	eng := testEngine(t, 42)
	ctx := context.Background()
	race, err := eng.CurrentRace()
	if err != nil {
		t.Fatal(err)
	}
	_, err = eng.PlaceBet(ctx, engine.PlaceBetRequest{
		RaceID: race.ID, HorseID: "thunder", Market: domain.MarketWin, Stake: 10,
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := eng.LockAndGenerate(ctx, race.ID); err != nil {
		t.Fatal(err)
	}
	_, err = eng.PlaceBet(ctx, engine.PlaceBetRequest{
		RaceID: race.ID, HorseID: "thunder", Market: domain.MarketWin, Stake: 5,
	})
	if err == nil {
		t.Fatal("expected bet after lock to fail")
	}
}

func TestDuplicateIdempotency(t *testing.T) {
	eng := testEngine(t, 7)
	ctx := context.Background()
	race, _ := eng.CurrentRace()
	req := engine.PlaceBetRequest{
		RaceID: race.ID, HorseID: "shadow", Market: domain.MarketPlace2, Stake: 3,
		IdempotencyKey: "idem-1",
	}
	b1, err := eng.PlaceBet(ctx, req)
	if err != nil {
		t.Fatal(err)
	}
	b2, err := eng.PlaceBet(ctx, req)
	if err != nil {
		t.Fatal(err)
	}
	if b1.ID != b2.ID {
		t.Fatalf("idempotency broken %s vs %s", b1.ID, b2.ID)
	}
	bal, _ := eng.Balance("")
	if bal != 100000-300 {
		t.Fatalf("balance=%d", bal)
	}
}

func TestRNGIndependentOfPools(t *testing.T) {
	eng := testEngine(t, 99)
	ctx := context.Background()
	race, _ := eng.CurrentRace()
	// Dump money on thunder
	for i := 0; i < 5; i++ {
		_, err := eng.PlaceBet(ctx, engine.PlaceBetRequest{
			RaceID: race.ID, HorseID: "thunder", Market: domain.MarketWin, Stake: 20,
			IdempotencyKey: "heavy-" + string(rune('a'+i)),
		})
		if err != nil {
			t.Fatal(err)
		}
	}
	if err := eng.LockAndGenerate(ctx, race.ID); err != nil {
		t.Fatal(err)
	}
	got, _ := eng.GetRace(race.ID)
	if got.Result == nil {
		t.Fatal("missing result")
	}
	// Same seed+raceNumber via second engine should match finishing order
	eng2 := testEngine(t, 99)
	race2, _ := eng2.CurrentRace()
	_ = eng2.LockAndGenerate(ctx, race2.ID)
	got2, _ := eng2.GetRace(race2.ID)
	if got.Result.Winner != got2.Result.Winner {
		// race numbers both start at 1 with same seed → should match
		t.Fatalf("determinism broken %s vs %s", got.Result.Winner, got2.Result.Winner)
	}
}

func TestSettlementAndWallet(t *testing.T) {
	eng := testEngine(t, 1)
	ctx := context.Background()
	race, _ := eng.CurrentRace()
	_, err := eng.PlaceBet(ctx, engine.PlaceBetRequest{
		RaceID: race.ID, HorseID: "thunder", Market: domain.MarketWin, Stake: 10,
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := eng.LockAndGenerate(ctx, race.ID); err != nil {
		t.Fatal(err)
	}
	if err := eng.StartRace(race.ID); err != nil {
		t.Fatal(err)
	}
	if err := eng.FinishAndSettle(ctx, race.ID); err != nil {
		t.Fatal(err)
	}
	// Idempotent second settle
	if err := eng.FinishAndSettle(ctx, race.ID); err != nil {
		t.Fatal(err)
	}
	bal, _ := eng.Balance("")
	if bal < 0 || bal > 100000+100000 {
		t.Fatalf("absurd balance %d", bal)
	}
	bets, _ := eng.PlayerBets("")
	if len(bets) == 0 {
		t.Fatal("expected bets")
	}
	settled := bets[0]
	if settled.SettlementStatus != domain.SettlementSettled && settled.SettlementStatus != domain.SettlementRefunded {
		t.Fatalf("status=%s", settled.SettlementStatus)
	}
}

func TestBetOnUpcomingRace(t *testing.T) {
	eng := testEngine(t, 3)
	ctx := context.Background()
	up, err := eng.UpcomingRaces()
	if err != nil || len(up) == 0 {
		t.Fatalf("upcoming=%v err=%v", up, err)
	}
	_, err = eng.PlaceBet(ctx, engine.PlaceBetRequest{
		RaceID: up[0].ID, HorseID: "comet", Market: domain.MarketPlace3, Stake: 2,
	})
	if err != nil {
		t.Fatal(err)
	}
}

func TestDuplicateSettlementIdempotent(t *testing.T) {
	eng := testEngine(t, 11)
	ctx := context.Background()
	race, _ := eng.CurrentRace()
	_, _ = eng.PlaceBet(ctx, engine.PlaceBetRequest{RaceID: race.ID, HorseID: "blaze", Market: domain.MarketWin, Stake: 5})
	_ = eng.LockAndGenerate(ctx, race.ID)
	_ = eng.StartRace(race.ID)
	_ = eng.FinishAndSettle(ctx, race.ID)
	bal1, _ := eng.Balance("")
	_ = eng.FinishAndSettle(ctx, race.ID)
	bal2, _ := eng.Balance("")
	if bal1 != bal2 {
		t.Fatalf("settlement not idempotent %d vs %d", bal1, bal2)
	}
}
