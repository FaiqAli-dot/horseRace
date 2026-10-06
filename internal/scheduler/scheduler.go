package scheduler

import (
	"context"
	"log"
	"time"

	"github.com/FaiqAli-dot/horseRace/internal/engine"
)

type Scheduler struct {
	eng      *engine.Engine
	interval time.Duration
}

func New(eng *engine.Engine, interval time.Duration) *Scheduler {
	if interval <= 0 {
		interval = 200 * time.Millisecond
	}
	return &Scheduler{eng: eng, interval: interval}
}

func (s *Scheduler) Run(ctx context.Context) {
	t := time.NewTicker(s.interval)
	defer t.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-t.C:
			if err := s.eng.Tick(ctx); err != nil {
				log.Printf("scheduler tick: %v", err)
			}
		}
	}
}
