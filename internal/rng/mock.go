package rng

import (
	"context"
	"math/rand"
	"sync"
	"time"

	"github.com/FaiqAli-dot/horseRace/internal/domain"
)

// MockRNG is a demo RNG. If Seed != 0, results are deterministic per (seed, raceNumber).
type MockRNG struct {
	Seed int64
	mu   sync.Mutex
}

func NewMock(seed int64) *MockRNG {
	return &MockRNG{Seed: seed}
}

func (m *MockRNG) GenerateRaceResult(_ context.Context, race domain.Race, horses []domain.Horse) (domain.RaceResult, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	ids := make([]string, len(horses))
	for i, h := range horses {
		ids[i] = h.ID
	}

	seed := m.Seed
	if seed == 0 {
		seed = time.Now().UnixNano()
	}
	// Mix race number so consecutive races differ under a fixed seed.
	r := rand.New(rand.NewSource(seed + race.RaceNumber*9973))
	r.Shuffle(len(ids), func(i, j int) { ids[i], ids[j] = ids[j], ids[i] })

	now := time.Now().UTC()
	res := domain.RaceResult{
		RaceID:    race.ID,
		Positions: ids,
		Winner:    ids[0],
		Second:    ids[1],
		Third:     ids[2],
		Seed:      seed + race.RaceNumber*9973,
		Generated: now,
	}
	return res, nil
}
