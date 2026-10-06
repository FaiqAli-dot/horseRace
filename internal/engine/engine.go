package engine

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/FaiqAli-dot/horseRace/internal/audit"
	"github.com/FaiqAli-dot/horseRace/internal/config"
	"github.com/FaiqAli-dot/horseRace/internal/domain"
	"github.com/FaiqAli-dot/horseRace/internal/pool"
	"github.com/FaiqAli-dot/horseRace/internal/rgs"
	"github.com/FaiqAli-dot/horseRace/internal/rng"
	"github.com/FaiqAli-dot/horseRace/internal/storage/sqlite"
	"github.com/google/uuid"
)

type Broadcaster interface {
	Broadcast(event string, payload any)
}

type Engine struct {
	cfg   config.Config
	store *sqlite.Store
	rng   rng.RNG
	rgs   rgs.RGS
	audit *audit.Logger
	bus   Broadcaster

	mu sync.Mutex
}

func New(cfg config.Config, store *sqlite.Store, r rng.RNG, g rgs.RGS, a *audit.Logger, bus Broadcaster) *Engine {
	return &Engine{cfg: cfg, store: store, rng: r, rgs: g, audit: a, bus: bus}
}

func (e *Engine) ensurePlayer() error {
	return e.store.EnsureWallet(e.cfg.DemoPlayerID, e.cfg.StartingBalanceC)
}

func (e *Engine) Bootstrap(ctx context.Context) error {
	if err := e.ensurePlayer(); err != nil {
		return err
	}
	return e.EnsurePipeline(ctx)
}

// EnsurePipeline keeps one BETTING_OPEN (or transitioning) race and upcoming SCHEDULED races.
func (e *Engine) EnsurePipeline(ctx context.Context) error {
	e.mu.Lock()
	defer e.mu.Unlock()

	active, err := e.store.ListRacesByStatus(
		domain.StatusBettingOpen, domain.StatusLocked, domain.StatusRacing, domain.StatusFinished,
	)
	if err != nil {
		return err
	}
	scheduled, err := e.store.ListRacesByStatus(domain.StatusScheduled)
	if err != nil {
		return err
	}

	if len(active) == 0 {
		if len(scheduled) > 0 {
			if err := e.openBettingLocked(ctx, scheduled[0]); err != nil {
				return err
			}
			scheduled = scheduled[1:]
		} else {
			r, err := e.createRaceLocked(time.Now().UTC(), true)
			if err != nil {
				return err
			}
			if err := e.openBettingLocked(ctx, r); err != nil {
				return err
			}
		}
	}

	// Refresh scheduled list
	scheduled, err = e.store.ListRacesByStatus(domain.StatusScheduled)
	if err != nil {
		return err
	}
	for len(scheduled) < e.cfg.UpcomingRaces {
		anchor := time.Now().UTC()
		if cur, err := e.currentRaceLocked(); err == nil {
			anchor = cur.BettingCloseAt.Add(e.cfg.RaceWindow + e.cfg.ResultWindow)
			for _, s := range scheduled {
				if s.BettingOpenAt.After(anchor) {
					anchor = s.BettingOpenAt.Add(e.cfg.BettingWindow + e.cfg.RaceWindow + e.cfg.ResultWindow)
				}
			}
		}
		if _, err := e.createRaceLocked(anchor, false); err != nil {
			return err
		}
		scheduled, err = e.store.ListRacesByStatus(domain.StatusScheduled)
		if err != nil {
			return err
		}
	}
	return nil
}

func (e *Engine) createRaceLocked(openAt time.Time, openNow bool) (domain.Race, error) {
	n, err := e.store.NextRaceNumber()
	if err != nil {
		return domain.Race{}, err
	}
	if openNow {
		openAt = time.Now().UTC()
	}
	closeAt := openAt.Add(e.cfg.BettingWindow)
	startAt := closeAt
	r := domain.Race{
		ID:             fmt.Sprintf("race-%d", n),
		RaceNumber:     n,
		Status:         domain.StatusScheduled,
		ScheduledAt:    time.Now().UTC(),
		BettingOpenAt:  openAt,
		BettingCloseAt: closeAt,
		RaceStartAt:    startAt,
		Horses:         domain.Horses,
		TakeoutRate:    e.cfg.TakeoutRate,
		ConfigVersion:  "v1-pari-mutuel",
	}
	if err := e.store.UpsertRace(r); err != nil {
		return domain.Race{}, err
	}
	e.audit.Log(audit.RaceCreated, r.ID, "", "", fmt.Sprintf("raceNumber=%d", n))
	e.emit("race.created", r)
	return r, nil
}

func (e *Engine) openBettingLocked(ctx context.Context, r domain.Race) error {
	now := time.Now().UTC()
	r.Status = domain.StatusBettingOpen
	r.BettingOpenAt = now
	r.BettingCloseAt = now.Add(e.cfg.BettingWindow)
	r.RaceStartAt = r.BettingCloseAt
	if err := e.store.UpsertRace(r); err != nil {
		return err
	}
	e.audit.Log(audit.BettingOpened, r.ID, "", "", "")
	e.emit("race.betting_open", r)
	_ = ctx
	return nil
}

func (e *Engine) currentRaceLocked() (domain.Race, error) {
	active, err := e.store.ListRacesByStatus(
		domain.StatusBettingOpen, domain.StatusLocked, domain.StatusRacing, domain.StatusFinished, domain.StatusSettled,
	)
	if err != nil {
		return domain.Race{}, err
	}
	if len(active) == 0 {
		return domain.Race{}, fmt.Errorf("no current race")
	}
	// Prefer non-settled; otherwise the newest settled (still in result window).
	for _, r := range active {
		if r.Status != domain.StatusSettled {
			return r, nil
		}
	}
	return active[len(active)-1], nil
}

func (e *Engine) CurrentRace() (domain.Race, error) {
	e.mu.Lock()
	defer e.mu.Unlock()
	return e.currentRaceLocked()
}

func (e *Engine) UpcomingRaces() ([]domain.Race, error) {
	return e.store.ListRacesByStatus(domain.StatusScheduled)
}

func (e *Engine) GetRace(id string) (domain.Race, error) {
	return e.store.GetRace(id)
}

func (e *Engine) ListRaces(limit int) ([]domain.Race, error) {
	return e.store.ListRaces(limit)
}

func (e *Engine) Pools(raceID string) ([]domain.MarketPool, error) {
	r, err := e.store.GetRace(raceID)
	if err != nil {
		return nil, err
	}
	bets, err := e.store.ListBetsByRace(raceID)
	if err != nil {
		return nil, err
	}
	return pool.BuildAllPools(bets, r.TakeoutRate, domain.Horses), nil
}

type PlaceBetRequest struct {
	RaceID         string        `json:"raceId"`
	HorseID        string        `json:"horseId"`
	Market         domain.Market `json:"market"`
	Stake          float64       `json:"stake"` // dollars
	PlayerID       string        `json:"playerId,omitempty"`
	IdempotencyKey string        `json:"idempotencyKey,omitempty"`
	IsMock         bool          `json:"-"`
}

func (e *Engine) PlaceBet(ctx context.Context, req PlaceBetRequest) (domain.Bet, error) {
	e.mu.Lock()
	defer e.mu.Unlock()

	if req.PlayerID == "" {
		req.PlayerID = e.cfg.DemoPlayerID
	}
	if req.IdempotencyKey != "" {
		if existing, err := e.store.GetBetByIdempotency(req.IdempotencyKey); err == nil {
			return existing, nil
		}
	}
	if !domain.ValidMarket(req.Market) {
		return domain.Bet{}, fmt.Errorf("invalid market")
	}
	if _, ok := domain.HorseByID(req.HorseID); !ok {
		return domain.Bet{}, fmt.Errorf("invalid horse")
	}
	stakeC := int64(req.Stake*100 + 0.5)
	if stakeC <= 0 {
		return domain.Bet{}, fmt.Errorf("stake must be > 0")
	}

	race, err := e.store.GetRace(req.RaceID)
	if err != nil {
		return domain.Bet{}, fmt.Errorf("race not found")
	}
	// Status is authoritative — scheduler flips to LOCKED; do not race wall-clock here.
	if race.Status != domain.StatusBettingOpen && race.Status != domain.StatusScheduled {
		return domain.Bet{}, fmt.Errorf("betting closed")
	}

	bets, _ := e.store.ListBetsByRace(race.ID)
	pools := pool.BuildAllPools(bets, race.TakeoutRate, domain.Horses)
	est := 0.0
	for _, mp := range pools {
		if mp.Market != req.Market {
			continue
		}
		for _, h := range mp.PerHorse {
			if h.HorseID == req.HorseID {
				horseAmt := h.AmountC + stakeC
				total := mp.TotalPoolC + stakeC
				_, dist := moneyDistributable(total, race.TakeoutRate)
				if horseAmt > 0 {
					est = float64(dist) / float64(horseAmt)
				}
			}
		}
	}

	betID := "bet-" + uuid.NewString()
	bet := domain.Bet{
		ID:                       betID,
		IdempotencyKey:           req.IdempotencyKey,
		PlayerID:                 req.PlayerID,
		RaceID:                   race.ID,
		HorseID:                  req.HorseID,
		Market:                   req.Market,
		StakeC:                   stakeC,
		CreatedAt:                time.Now().UTC(),
		Status:                   domain.BetAccepted,
		PotentialDividendAtPlace: est,
		SettlementStatus:         domain.SettlementPending,
		IsMock:                   req.IsMock,
	}

	if !req.IsMock {
		if _, err := e.rgs.EnsureSession(ctx, req.PlayerID); err != nil {
			return domain.Bet{}, err
		}
		if _, err := e.store.Debit(req.PlayerID, stakeC, "bet", betID); err != nil {
			return domain.Bet{}, err
		}
		ack, err := e.rgs.AcceptWager(ctx, rgs.WagerRequest{
			PlayerID: req.PlayerID, RaceID: race.ID, BetID: betID, StakeC: stakeC,
		})
		if err != nil {
			_, _ = e.store.Credit(req.PlayerID, stakeC, "bet_rollback", betID)
			return domain.Bet{}, err
		}
		bet.RGSTxnID = ack.TxnID
	}

	if err := e.store.InsertBet(bet); err != nil {
		if !req.IsMock {
			_, _ = e.store.Credit(req.PlayerID, stakeC, "bet_rollback", betID)
		}
		return domain.Bet{}, err
	}

	e.audit.Log(audit.BetAccepted, race.ID, bet.ID, req.PlayerID, fmt.Sprintf("market=%s horse=%s stake=%d mock=%v", req.Market, req.HorseID, stakeC, req.IsMock))
	e.emit("bet.accepted", bet)
	pools, _ = e.Pools(race.ID)
	e.emit("pool.updated", map[string]any{"raceId": race.ID, "pools": pools})
	return bet, nil
}

func moneyDistributable(total int64, rate float64) (int64, int64) {
	take := int64(float64(total) * rate)
	if take < 0 {
		take = 0
	}
	return take, total - take
}

func (e *Engine) Balance(playerID string) (int64, error) {
	if playerID == "" {
		playerID = e.cfg.DemoPlayerID
	}
	_ = e.store.EnsureWallet(playerID, e.cfg.StartingBalanceC)
	return e.store.GetBalance(playerID)
}

func (e *Engine) PlayerBets(playerID string) ([]domain.Bet, error) {
	if playerID == "" {
		playerID = e.cfg.DemoPlayerID
	}
	return e.store.ListBetsByPlayer(playerID, 50)
}

func (e *Engine) LockAndGenerate(ctx context.Context, raceID string) error {
	e.mu.Lock()
	defer e.mu.Unlock()
	return e.lockAndGenerateLocked(ctx, raceID)
}

func (e *Engine) lockAndGenerateLocked(ctx context.Context, raceID string) error {
	race, err := e.store.GetRace(raceID)
	if err != nil {
		return err
	}
	if race.Status != domain.StatusBettingOpen {
		return fmt.Errorf("race not open for lock")
	}
	race.Status = domain.StatusLocked
	if err := e.store.UpsertRace(race); err != nil {
		return err
	}
	e.audit.Log(audit.BettingLocked, race.ID, "", "", "")

	// Snapshot pools
	bets, err := e.store.ListBetsByRace(race.ID)
	if err != nil {
		return err
	}
	pools := pool.BuildAllPools(bets, race.TakeoutRate, domain.Horses)
	for _, mp := range pools {
		_ = e.store.SavePoolSnapshot(race.ID, mp)
	}
	e.emit("race.locked", map[string]any{"race": race, "pools": pools})

	// RNG — independent of pools
	res, err := e.rng.GenerateRaceResult(ctx, race, domain.Horses)
	if err != nil {
		return err
	}
	if race.Result != nil {
		return fmt.Errorf("result already set")
	}
	seed := res.Seed
	race.ResultSeed = &seed
	race.Result = &res
	now := time.Now().UTC()
	race.ResultAt = &now
	if err := e.store.UpsertRace(race); err != nil {
		return err
	}
	e.audit.Log(audit.RNGResultGenerated, race.ID, "", "", fmt.Sprintf("winner=%s seed=%d", res.Winner, res.Seed))
	e.emit("race.result", map[string]any{"raceId": race.ID, "result": res})
	return nil
}

func (e *Engine) StartRace(raceID string) error {
	e.mu.Lock()
	defer e.mu.Unlock()
	race, err := e.store.GetRace(raceID)
	if err != nil {
		return err
	}
	if race.Status != domain.StatusLocked {
		return fmt.Errorf("race not locked")
	}
	if race.Result == nil {
		return fmt.Errorf("missing result")
	}
	race.Status = domain.StatusRacing
	race.RaceStartAt = time.Now().UTC()
	if err := e.store.UpsertRace(race); err != nil {
		return err
	}
	e.audit.Log(audit.RaceStarted, race.ID, "", "", "")
	e.emit("race.started", race)
	return nil
}

func (e *Engine) FinishAndSettle(ctx context.Context, raceID string) error {
	e.mu.Lock()
	defer e.mu.Unlock()
	race, err := e.store.GetRace(raceID)
	if err != nil {
		return err
	}
	if race.Status != domain.StatusRacing && race.Status != domain.StatusLocked {
		if race.Status == domain.StatusSettled {
			return nil // idempotent
		}
		return fmt.Errorf("race not racing")
	}
	if race.Result == nil {
		return fmt.Errorf("missing result")
	}

	race.Status = domain.StatusFinished
	now := time.Now().UTC()
	if race.ResultAt == nil {
		race.ResultAt = &now
	}
	if err := e.store.UpsertRace(race); err != nil {
		return err
	}
	e.audit.Log(audit.RaceFinished, race.ID, "", "", "")
	e.emit("race.finished", race)

	bets, err := e.store.ListBetsByRace(race.ID)
	if err != nil {
		return err
	}

	for _, market := range domain.AllMarkets() {
		payouts, refundAll, _, _ := pool.SettleMarket(market, bets, *race.Result, race.TakeoutRate)
		for i := range bets {
			b := &bets[i]
			if b.Market != market || b.Status != domain.BetAccepted {
				continue
			}
			// Idempotent: skip already settled
			if b.SettlementStatus == domain.SettlementSettled || b.SettlementStatus == domain.SettlementRefunded {
				continue
			}
			if refundAll {
				b.Status = domain.BetRefunded
				b.SettlementStatus = domain.SettlementRefunded
				b.PayoutC = b.StakeC
				b.FinalDividend = 1
				if !b.IsMock {
					_, _ = e.store.Credit(b.PlayerID, b.StakeC, "refund", b.ID)
					_, _ = e.rgs.SettleWager(ctx, rgs.SettlementRequest{
						PlayerID: b.PlayerID, BetID: b.ID, RaceID: race.ID, PayoutC: b.StakeC,
					})
				}
			} else {
				pay := payouts[b.ID]
				b.PayoutC = pay
				if pay > 0 {
					b.FinalDividend = float64(pay) / float64(b.StakeC)
				}
				b.Status = domain.BetSettled
				b.SettlementStatus = domain.SettlementSettled
				if !b.IsMock {
					if pay > 0 {
						_, _ = e.store.Credit(b.PlayerID, pay, "payout", b.ID)
					}
					_, _ = e.rgs.SettleWager(ctx, rgs.SettlementRequest{
						PlayerID: b.PlayerID, BetID: b.ID, RaceID: race.ID, PayoutC: pay,
					})
				}
			}
			_ = e.store.UpdateBetSettlement(*b)
			e.audit.Log(audit.BetSettled, race.ID, b.ID, b.PlayerID, fmt.Sprintf("payout=%d status=%s", b.PayoutC, b.SettlementStatus))
			e.emit("bet.settled", *b)
		}
	}

	settled := time.Now().UTC()
	race.Status = domain.StatusSettled
	race.SettledAt = &settled
	if err := e.store.UpsertRace(race); err != nil {
		return err
	}
	e.audit.Log(audit.RaceSettled, race.ID, "", "", "")
	e.emit("race.settled", race)
	return nil
}

func (e *Engine) ResetDemo(ctx context.Context) error {
	e.mu.Lock()
	defer e.mu.Unlock()
	if err := e.store.ResetDemo(e.cfg.DemoPlayerID, e.cfg.StartingBalanceC); err != nil {
		return err
	}
	e.audit.Log(audit.DemoReset, "", "", e.cfg.DemoPlayerID, "")
	// recreate pipeline
	r, err := e.createRaceLocked(time.Now().UTC(), true)
	if err != nil {
		return err
	}
	if err := e.openBettingLocked(ctx, r); err != nil {
		return err
	}
	for i := 0; i < e.cfg.UpcomingRaces; i++ {
		anchor := r.BettingCloseAt.Add(e.cfg.RaceWindow + e.cfg.ResultWindow + time.Duration(i)*(e.cfg.BettingWindow+e.cfg.RaceWindow+e.cfg.ResultWindow))
		if _, err := e.createRaceLocked(anchor, false); err != nil {
			return err
		}
	}
	e.emit("demo.reset", map[string]string{"ok": "true"})
	return nil
}

func (e *Engine) emit(event string, payload any) {
	if e.bus != nil {
		e.bus.Broadcast(event, payload)
	}
}

// Tick advances race lifecycle based on clock. Safe to call frequently.
func (e *Engine) Tick(ctx context.Context) error {
	e.mu.Lock()
	defer e.mu.Unlock()

	now := time.Now().UTC()
	cur, err := e.currentRaceLocked()
	if err != nil {
		return e.EnsurePipelineUnlocked(ctx)
	}

	switch cur.Status {
	case domain.StatusBettingOpen:
		if !now.Before(cur.BettingCloseAt) {
			if err := e.lockAndGenerateLocked(ctx, cur.ID); err != nil {
				return err
			}
			if err := e.startRaceLocked(cur.ID); err != nil {
				return err
			}
		}
		return e.EnsurePipelineUnlocked(ctx)
	case domain.StatusLocked:
		if err := e.startRaceLocked(cur.ID); err != nil {
			return err
		}
		return nil
	case domain.StatusRacing:
		if now.Sub(cur.RaceStartAt) >= e.cfg.RaceWindow {
			if err := e.finishSettleLocked(ctx, cur.ID); err != nil {
				return err
			}
		}
		return nil
	case domain.StatusFinished:
		return e.finishSettleLocked(ctx, cur.ID)
	case domain.StatusSettled:
		// Hold result window before opening the next race.
		if cur.SettledAt != nil && now.Sub(*cur.SettledAt) >= e.cfg.ResultWindow {
			return e.EnsurePipelineUnlocked(ctx)
		}
		return nil
	default:
		return e.EnsurePipelineUnlocked(ctx)
	}
}

func (e *Engine) startRaceLocked(raceID string) error {
	race, err := e.store.GetRace(raceID)
	if err != nil {
		return err
	}
	if race.Status == domain.StatusRacing {
		return nil
	}
	if race.Status != domain.StatusLocked {
		return fmt.Errorf("not locked")
	}
	race.Status = domain.StatusRacing
	race.RaceStartAt = time.Now().UTC()
	if err := e.store.UpsertRace(race); err != nil {
		return err
	}
	e.audit.Log(audit.RaceStarted, race.ID, "", "", "")
	e.emit("race.started", race)
	return nil
}

func (e *Engine) finishSettleLocked(ctx context.Context, raceID string) error {
	// Temporarily release pattern: we're already locked; duplicate FinishAndSettle body
	race, err := e.store.GetRace(raceID)
	if err != nil {
		return err
	}
	if race.Status == domain.StatusSettled {
		return nil
	}
	if race.Result == nil {
		return fmt.Errorf("missing result")
	}
	if race.Status == domain.StatusRacing || race.Status == domain.StatusLocked || race.Status == domain.StatusFinished {
		now := time.Now().UTC()
		if race.Status != domain.StatusFinished && race.Status != domain.StatusSettled {
			race.Status = domain.StatusFinished
			if race.ResultAt == nil {
				race.ResultAt = &now
			}
			_ = e.store.UpsertRace(race)
			e.audit.Log(audit.RaceFinished, race.ID, "", "", "")
			e.emit("race.finished", race)
		}
		bets, err := e.store.ListBetsByRace(race.ID)
		if err != nil {
			return err
		}
		for _, market := range domain.AllMarkets() {
			payouts, refundAll, _, _ := pool.SettleMarket(market, bets, *race.Result, race.TakeoutRate)
			for i := range bets {
				b := &bets[i]
				if b.Market != market || b.Status != domain.BetAccepted {
					continue
				}
				if b.SettlementStatus == domain.SettlementSettled || b.SettlementStatus == domain.SettlementRefunded {
					continue
				}
				if refundAll {
					b.Status = domain.BetRefunded
					b.SettlementStatus = domain.SettlementRefunded
					b.PayoutC = b.StakeC
					b.FinalDividend = 1
					if !b.IsMock {
						_, _ = e.store.Credit(b.PlayerID, b.StakeC, "refund", b.ID)
						_, _ = e.rgs.SettleWager(ctx, rgs.SettlementRequest{PlayerID: b.PlayerID, BetID: b.ID, RaceID: race.ID, PayoutC: b.StakeC})
					}
				} else {
					pay := payouts[b.ID]
					b.PayoutC = pay
					if pay > 0 {
						b.FinalDividend = float64(pay) / float64(b.StakeC)
					}
					b.Status = domain.BetSettled
					b.SettlementStatus = domain.SettlementSettled
					if !b.IsMock && pay > 0 {
						_, _ = e.store.Credit(b.PlayerID, pay, "payout", b.ID)
					}
					if !b.IsMock {
						_, _ = e.rgs.SettleWager(ctx, rgs.SettlementRequest{PlayerID: b.PlayerID, BetID: b.ID, RaceID: race.ID, PayoutC: pay})
					}
				}
				_ = e.store.UpdateBetSettlement(*b)
				e.audit.Log(audit.BetSettled, race.ID, b.ID, b.PlayerID, fmt.Sprintf("payout=%d", b.PayoutC))
				e.emit("bet.settled", *b)
			}
		}
		settled := time.Now().UTC()
		race.Status = domain.StatusSettled
		race.SettledAt = &settled
		_ = e.store.UpsertRace(race)
		e.audit.Log(audit.RaceSettled, race.ID, "", "", "")
		e.emit("race.settled", race)
	}
	return nil
}

func (e *Engine) EnsurePipelineUnlocked(ctx context.Context) error {
	// caller holds e.mu
	active, err := e.store.ListRacesByStatus(
		domain.StatusBettingOpen, domain.StatusLocked, domain.StatusRacing, domain.StatusFinished, domain.StatusSettled,
	)
	if err != nil {
		return err
	}
	// Skip settled races whose result window has elapsed; hold while window active.
	for len(active) > 0 && active[0].Status == domain.StatusSettled {
		cur := active[0]
		if cur.SettledAt != nil && time.Now().UTC().Sub(*cur.SettledAt) < e.cfg.ResultWindow {
			return e.ensureUpcomingCountLocked()
		}
		active = active[1:]
	}
	if len(active) == 0 {
		scheduled, err := e.store.ListRacesByStatus(domain.StatusScheduled)
		if err != nil {
			return err
		}
		if len(scheduled) > 0 {
			if err := e.openBettingLocked(ctx, scheduled[0]); err != nil {
				return err
			}
		} else {
			r, err := e.createRaceLocked(time.Now().UTC(), true)
			if err != nil {
				return err
			}
			if err := e.openBettingLocked(ctx, r); err != nil {
				return err
			}
		}
	}
	return e.ensureUpcomingCountLocked()
}

func (e *Engine) ensureUpcomingCountLocked() error {
	scheduled, err := e.store.ListRacesByStatus(domain.StatusScheduled)
	if err != nil {
		return err
	}
	for len(scheduled) < e.cfg.UpcomingRaces {
		anchor := time.Now().UTC().Add(e.cfg.BettingWindow + e.cfg.RaceWindow + e.cfg.ResultWindow)
		if cur, err := e.currentRaceLocked(); err == nil {
			base := cur.BettingCloseAt.Add(e.cfg.RaceWindow + e.cfg.ResultWindow)
			for _, s := range scheduled {
				end := s.BettingOpenAt.Add(e.cfg.BettingWindow + e.cfg.RaceWindow + e.cfg.ResultWindow)
				if end.After(base) {
					base = end
				}
			}
			anchor = base
		}
		if _, err := e.createRaceLocked(anchor, false); err != nil {
			return err
		}
		scheduled, err = e.store.ListRacesByStatus(domain.StatusScheduled)
		if err != nil {
			return err
		}
	}
	return nil
}
