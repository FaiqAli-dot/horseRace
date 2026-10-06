package domain

import "time"

type RaceStatus string

const (
	StatusScheduled   RaceStatus = "SCHEDULED"
	StatusBettingOpen RaceStatus = "BETTING_OPEN"
	StatusLocked      RaceStatus = "LOCKED"
	StatusRacing      RaceStatus = "RACING"
	StatusFinished    RaceStatus = "FINISHED"
	StatusSettled     RaceStatus = "SETTLED"
	StatusCancelled   RaceStatus = "CANCELLED"
)

type Market string

const (
	MarketWin    Market = "WIN"
	MarketPlace2 Market = "PLACE_2"
	MarketPlace3 Market = "PLACE_3"
)

func AllMarkets() []Market {
	return []Market{MarketWin, MarketPlace2, MarketPlace3}
}

func ValidMarket(m Market) bool {
	switch m {
	case MarketWin, MarketPlace2, MarketPlace3:
		return true
	default:
		return false
	}
}

type BetStatus string

const (
	BetAccepted  BetStatus = "ACCEPTED"
	BetRejected  BetStatus = "REJECTED"
	BetSettled   BetStatus = "SETTLED"
	BetRefunded  BetStatus = "REFUNDED"
	BetCancelled BetStatus = "CANCELLED"
)

type SettlementStatus string

const (
	SettlementPending  SettlementStatus = "PENDING"
	SettlementSettled  SettlementStatus = "SETTLED"
	SettlementRefunded SettlementStatus = "REFUNDED"
	SettlementNoAction SettlementStatus = "NO_ACTION"
)

type Horse struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Number int    `json:"number"`
	Color  string `json:"color"`
}

var Horses = []Horse{
	{ID: "thunder", Name: "Thunder", Number: 1, Color: "#3b82f6"},
	{ID: "shadow", Name: "Shadow", Number: 2, Color: "#64748b"},
	{ID: "rocket", Name: "Rocket", Number: 3, Color: "#dc2626"},
	{ID: "blaze", Name: "Blaze", Number: 4, Color: "#ea580c"},
	{ID: "comet", Name: "Comet", Number: 5, Color: "#7c3aed"},
}

func HorseByID(id string) (Horse, bool) {
	for _, h := range Horses {
		if h.ID == id {
			return h, true
		}
	}
	return Horse{}, false
}

type RaceResult struct {
	RaceID    string    `json:"raceId"`
	Positions []string  `json:"positions"` // horse IDs, index 0 = 1st
	Winner    string    `json:"winner"`
	Second    string    `json:"second"`
	Third     string    `json:"third"`
	Seed      int64     `json:"seed,omitempty"`
	Generated time.Time `json:"generatedAt"`
}

func (r RaceResult) PlaceOf(horseID string) int {
	for i, id := range r.Positions {
		if id == horseID {
			return i + 1
		}
	}
	return 0
}

func (r RaceResult) WinnerForMarket(m Market) string {
	switch m {
	case MarketWin:
		return r.Winner
	case MarketPlace2:
		return r.Second
	case MarketPlace3:
		return r.Third
	default:
		return ""
	}
}

type HorsePoolSlice struct {
	HorseID     string  `json:"horseId"`
	AmountC     int64   `json:"amountCents"`
	Percentage  float64 `json:"percentage"`
	EstDividend float64 `json:"estimatedDividend"` // stake multiplier estimate; 0 if no money
}

type MarketPool struct {
	Market         Market           `json:"market"`
	TotalPoolC     int64            `json:"totalPoolCents"`
	TakeoutRate    float64          `json:"takeoutRate"`
	TakeoutC       int64            `json:"takeoutCents"`
	DistributableC int64            `json:"distributablePoolCents"`
	PerHorse       []HorsePoolSlice `json:"perHorse"`
}

type Race struct {
	ID             string      `json:"id"`
	RaceNumber     int64       `json:"raceNumber"`
	Status         RaceStatus  `json:"status"`
	ScheduledAt    time.Time   `json:"scheduledAt"`
	BettingOpenAt  time.Time   `json:"bettingOpenAt"`
	BettingCloseAt time.Time   `json:"bettingCloseAt"`
	RaceStartAt    time.Time   `json:"raceStartAt"`
	ResultAt       *time.Time  `json:"resultAt,omitempty"`
	SettledAt      *time.Time  `json:"settledAt,omitempty"`
	Horses         []Horse     `json:"horses"`
	TakeoutRate    float64     `json:"takeoutRate"`
	ConfigVersion  string      `json:"configVersion"`
	ResultSeed     *int64      `json:"resultSeed,omitempty"`
	Result         *RaceResult `json:"result,omitempty"`
}

type Bet struct {
	ID                       string           `json:"id"`
	IdempotencyKey           string           `json:"idempotencyKey,omitempty"`
	PlayerID                 string           `json:"playerId"`
	RaceID                   string           `json:"raceId"`
	HorseID                  string           `json:"horseId"`
	Market                   Market           `json:"market"`
	StakeC                   int64            `json:"stakeCents"`
	CreatedAt                time.Time        `json:"createdAt"`
	Status                   BetStatus        `json:"status"`
	PotentialDividendAtPlace float64          `json:"potentialDividendAtPlacement"`
	FinalDividend            float64          `json:"finalDividend"`
	PayoutC                  int64            `json:"payoutCents"`
	SettlementStatus         SettlementStatus `json:"settlementStatus"`
	IsMock                   bool             `json:"isMock"`
	RGSTxnID                 string           `json:"rgsTxnId,omitempty"`
}

type WalletTxn struct {
	ID        string    `json:"id"`
	PlayerID  string    `json:"playerId"`
	Type      string    `json:"type"` // credit|debit
	AmountC   int64     `json:"amountCents"`
	BalanceC  int64     `json:"balanceAfterCents"`
	RefType   string    `json:"refType"`
	RefID     string    `json:"refId"`
	CreatedAt time.Time `json:"createdAt"`
}

type AuditEvent struct {
	ID        string    `json:"id"`
	Type      string    `json:"type"`
	RaceID    string    `json:"raceId,omitempty"`
	BetID     string    `json:"betId,omitempty"`
	PlayerID  string    `json:"playerId,omitempty"`
	Detail    string    `json:"detail,omitempty"`
	CreatedAt time.Time `json:"createdAt"`
}
