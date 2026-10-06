package money

import "math"

// All monetary values are integer cents.

func DollarsToCents(d float64) int64 {
	return int64(math.Round(d * 100))
}

func CentsToDollars(c int64) float64 {
	return float64(c) / 100
}

// TakeoutCents returns floor(total * rate) in cents.
func TakeoutCents(totalC int64, rate float64) int64 {
	if totalC <= 0 || rate <= 0 {
		return 0
	}
	return int64(math.Floor(float64(totalC) * rate))
}

func Distributable(totalC int64, rate float64) (takeoutC, distC int64) {
	takeoutC = TakeoutCents(totalC, rate)
	distC = totalC - takeoutC
	if distC < 0 {
		distC = 0
	}
	return takeoutC, distC
}

// ProportionalPayout returns floor(winningStake / totalWinning * distributable).
func ProportionalPayout(winningStakeC, totalWinningStakeC, distributableC int64) int64 {
	if winningStakeC <= 0 || totalWinningStakeC <= 0 || distributableC <= 0 {
		return 0
	}
	// Use integer math: (winning * dist) / totalWinning
	return (winningStakeC * distributableC) / totalWinningStakeC
}

// EstimatedDividend returns estimated return multiplier for a unit stake
// (distributable / horsePool). 0 if horsePool is 0.
func EstimatedDividend(distributableC, horsePoolC int64) float64 {
	if horsePoolC <= 0 || distributableC <= 0 {
		return 0
	}
	return float64(distributableC) / float64(horsePoolC)
}
