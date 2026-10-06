package rng

import (
	"context"

	"github.com/FaiqAli-dot/horseRace/internal/domain"
)

// RNG produces an immutable finishing order for a race.
// Real RGS/RNG adapters implement this without changing pool/settlement code.
type RNG interface {
	GenerateRaceResult(ctx context.Context, race domain.Race, horses []domain.Horse) (domain.RaceResult, error)
}
