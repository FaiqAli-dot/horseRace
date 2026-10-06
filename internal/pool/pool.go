package pool

import (
	"github.com/FaiqAli-dot/horseRace/internal/domain"
	"github.com/FaiqAli-dot/horseRace/internal/money"
)

// BuildMarketPool aggregates stakes for one market on a race.
func BuildMarketPool(market domain.Market, stakesByHorse map[string]int64, takeoutRate float64, horses []domain.Horse) domain.MarketPool {
	var total int64
	for _, amt := range stakesByHorse {
		total += amt
	}
	takeoutC, distC := money.Distributable(total, takeoutRate)

	per := make([]domain.HorsePoolSlice, 0, len(horses))
	for _, h := range horses {
		amt := stakesByHorse[h.ID]
		pct := 0.0
		if total > 0 {
			pct = float64(amt) / float64(total) * 100
		}
		per = append(per, domain.HorsePoolSlice{
			HorseID:     h.ID,
			AmountC:     amt,
			Percentage:  pct,
			EstDividend: money.EstimatedDividend(distC, amt),
		})
	}

	return domain.MarketPool{
		Market:         market,
		TotalPoolC:     total,
		TakeoutRate:    takeoutRate,
		TakeoutC:       takeoutC,
		DistributableC: distC,
		PerHorse:       per,
	}
}

// AggregateStakes returns map[market]map[horseID]cents from bets.
func AggregateStakes(bets []domain.Bet) map[domain.Market]map[string]int64 {
	out := map[domain.Market]map[string]int64{}
	for _, m := range domain.AllMarkets() {
		out[m] = map[string]int64{}
	}
	for _, b := range bets {
		if b.Status != domain.BetAccepted && b.Status != domain.BetSettled && b.Status != domain.BetRefunded {
			continue
		}
		if out[b.Market] == nil {
			out[b.Market] = map[string]int64{}
		}
		out[b.Market][b.HorseID] += b.StakeC
	}
	return out
}

func BuildAllPools(bets []domain.Bet, takeoutRate float64, horses []domain.Horse) []domain.MarketPool {
	agg := AggregateStakes(bets)
	pools := make([]domain.MarketPool, 0, len(domain.AllMarkets()))
	for _, m := range domain.AllMarkets() {
		pools = append(pools, BuildMarketPool(m, agg[m], takeoutRate, horses))
	}
	return pools
}

// SettleMarket computes payouts for accepted bets in a market.
// If winning horse has zero bets, returns refundAll=true (no fabricated payouts).
func SettleMarket(
	market domain.Market,
	bets []domain.Bet,
	result domain.RaceResult,
	takeoutRate float64,
) (payouts map[string]int64, refundAll bool, distributableC int64, totalWinningC int64) {
	winningHorse := result.WinnerForMarket(market)
	payouts = map[string]int64{}

	var totalPool, winPool int64
	for _, b := range bets {
		if b.Market != market || b.Status != domain.BetAccepted {
			continue
		}
		totalPool += b.StakeC
		if b.HorseID == winningHorse {
			winPool += b.StakeC
		}
	}

	_, dist := money.Distributable(totalPool, takeoutRate)
	distributableC = dist
	totalWinningC = winPool

	if totalPool == 0 {
		return payouts, false, 0, 0
	}
	if winPool == 0 {
		// No winning stakes — refund market (configurable policy).
		return payouts, true, dist, 0
	}

	for _, b := range bets {
		if b.Market != market || b.Status != domain.BetAccepted {
			continue
		}
		if b.HorseID != winningHorse {
			payouts[b.ID] = 0
			continue
		}
		payouts[b.ID] = money.ProportionalPayout(b.StakeC, winPool, dist)
	}
	return payouts, false, dist, winPool
}
