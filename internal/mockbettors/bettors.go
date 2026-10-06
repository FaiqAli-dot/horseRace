package mockbettors

import (
	"context"
	"math/rand"
	"time"

	"github.com/FaiqAli-dot/horseRace/internal/domain"
	"github.com/FaiqAli-dot/horseRace/internal/engine"
)

type Runner struct {
	eng      *engine.Engine
	enabled  bool
	interval time.Duration
}

func New(eng *engine.Engine, enabled bool) *Runner {
	return &Runner{eng: eng, enabled: enabled, interval: 900 * time.Millisecond}
}

func (r *Runner) Run(ctx context.Context) {
	if !r.enabled {
		return
	}
	t := time.NewTicker(r.interval)
	defer t.Stop()
	rng := rand.New(rand.NewSource(time.Now().UnixNano()))
	stakes := []float64{0.5, 1, 1, 2, 5}
	markets := domain.AllMarkets()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			race, err := r.eng.CurrentRace()
			if err != nil || race.Status != domain.StatusBettingOpen {
				continue
			}
			if rng.Float64() > 0.7 {
				continue
			}
			h := domain.Horses[rng.Intn(len(domain.Horses))]
			m := markets[rng.Intn(len(markets))]
			stake := stakes[rng.Intn(len(stakes))]
			_, _ = r.eng.PlaceBet(ctx, engine.PlaceBetRequest{
				RaceID:   race.ID,
				HorseID:  h.ID,
				Market:   m,
				Stake:    stake,
				PlayerID: "mock-bettor",
				IsMock:   true,
			})
		}
	}
}
