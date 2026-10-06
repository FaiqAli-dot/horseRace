package pool_test

import (
	"testing"

	"github.com/FaiqAli-dot/horseRace/internal/domain"
	"github.com/FaiqAli-dot/horseRace/internal/money"
	"github.com/FaiqAli-dot/horseRace/internal/pool"
)

func TestTakeoutAndDistributable(t *testing.T) {
	take, dist := money.Distributable(10000, 0.04)
	if take != 400 || dist != 9600 {
		t.Fatalf("got take=%d dist=%d", take, dist)
	}
}

func TestEstimatedDividend(t *testing.T) {
	d := money.EstimatedDividend(9600, 2400)
	if d != 4.0 {
		t.Fatalf("dividend=%v want 4", d)
	}
	if money.EstimatedDividend(9600, 0) != 0 {
		t.Fatal("zero horse pool should be 0 dividend")
	}
}

func TestProportionalSettlement(t *testing.T) {
	// Two winners: 600 and 400 on winning horse, dist 9600
	p1 := money.ProportionalPayout(600, 1000, 9600)
	p2 := money.ProportionalPayout(400, 1000, 9600)
	if p1 != 5760 || p2 != 3840 {
		t.Fatalf("payouts %d %d", p1, p2)
	}
	if p1+p2 != 9600 {
		t.Fatalf("sum %d", p1+p2)
	}
}

func TestSettleMarketWin(t *testing.T) {
	bets := []domain.Bet{
		{ID: "b1", Market: domain.MarketWin, HorseID: "thunder", StakeC: 1000, Status: domain.BetAccepted},
		{ID: "b2", Market: domain.MarketWin, HorseID: "shadow", StakeC: 3000, Status: domain.BetAccepted},
	}
	result := domain.RaceResult{Winner: "thunder", Second: "shadow", Third: "rocket"}
	payouts, refund, dist, winPool := pool.SettleMarket(domain.MarketWin, bets, result, 0.04)
	if refund {
		t.Fatal("should not refund")
	}
	if winPool != 1000 {
		t.Fatalf("winPool=%d", winPool)
	}
	if dist != 3840 { // 4000 * 0.96
		t.Fatalf("dist=%d", dist)
	}
	if payouts["b1"] != 3840 {
		t.Fatalf("b1 payout=%d", payouts["b1"])
	}
	if payouts["b2"] != 0 {
		t.Fatalf("loser payout=%d", payouts["b2"])
	}
}

func TestSettleMarketZeroWinningBetsRefunds(t *testing.T) {
	bets := []domain.Bet{
		{ID: "b1", Market: domain.MarketWin, HorseID: "shadow", StakeC: 1000, Status: domain.BetAccepted},
	}
	result := domain.RaceResult{Winner: "thunder", Second: "shadow", Third: "rocket"}
	_, refund, _, _ := pool.SettleMarket(domain.MarketWin, bets, result, 0.04)
	if !refund {
		t.Fatal("expected refund_all when no winning stakes")
	}
}

func TestBuildMarketPoolPercentages(t *testing.T) {
	stakes := map[string]int64{"thunder": 2500, "shadow": 7500}
	mp := pool.BuildMarketPool(domain.MarketWin, stakes, 0.04, domain.Horses)
	if mp.TotalPoolC != 10000 {
		t.Fatalf("total=%d", mp.TotalPoolC)
	}
	if mp.TakeoutC != 400 || mp.DistributableC != 9600 {
		t.Fatalf("take/dist %d %d", mp.TakeoutC, mp.DistributableC)
	}
	var thunder domain.HorsePoolSlice
	for _, h := range mp.PerHorse {
		if h.HorseID == "thunder" {
			thunder = h
		}
	}
	if thunder.Percentage != 25 {
		t.Fatalf("pct=%v", thunder.Percentage)
	}
	if thunder.EstDividend != 3.84 {
		t.Fatalf("div=%v", thunder.EstDividend)
	}
}

func TestPoolDoesNotAffectResultMapping(t *testing.T) {
	// Document invariant: settlement inputs are stakes+result; result is independent.
	result := domain.RaceResult{Winner: "comet", Second: "blaze", Third: "rocket"}
	heavy := []domain.Bet{
		{ID: "b1", Market: domain.MarketWin, HorseID: "thunder", StakeC: 999999, Status: domain.BetAccepted},
	}
	_, refund, _, _ := pool.SettleMarket(domain.MarketWin, heavy, result, 0.04)
	if !refund {
		t.Fatal("heavy money on non-winner must not invent a win; refund policy")
	}
	// Winner remains comet regardless of pool
	if result.Winner != "comet" {
		t.Fatal("result mutated")
	}
}
