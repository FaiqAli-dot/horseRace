package config

import (
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	AppEnv           string
	Port             string
	BindAddr         string
	CORSOrigins      []string
	DBPath           string
	MockRNG          bool
	MockRGS          bool
	MockBettors      bool
	MockPlayer       bool
	TakeoutRate      float64
	DemoPlayerID     string
	StartingBalanceC int64
	BettingWindow    time.Duration
	RaceWindow       time.Duration
	ResultWindow     time.Duration
	UpcomingRaces    int
	RNGSeed          int64  // 0 = nondeterministic
	ZeroWinPolicy    string // "refund_market"
}

func Load() Config {
	return Config{
		AppEnv:           getenv("APP_ENV", "development"),
		Port:             getenv("BACKEND_PORT", "8080"),
		BindAddr:         getenv("BIND_ADDR", "0.0.0.0"),
		CORSOrigins:      splitCSV(getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")),
		DBPath:           getenv("DB_PATH", "data/horse_race.db"),
		MockRNG:          getenvBool("MOCK_RNG", true),
		MockRGS:          getenvBool("MOCK_RGS", true),
		MockBettors:      getenvBool("MOCK_BETTORS", true),
		MockPlayer:       getenvBool("MOCK_PLAYER", true),
		TakeoutRate:      getenvFloat("TAKEOUT_RATE", 0.04),
		DemoPlayerID:     getenv("DEMO_PLAYER_ID", "demo-player"),
		StartingBalanceC: getenvInt64("STARTING_BALANCE_CENTS", 100000),
		BettingWindow:    getenvDuration("BETTING_WINDOW", 12*time.Second),
		RaceWindow:       getenvDuration("RACE_WINDOW", 7*time.Second),
		ResultWindow:     getenvDuration("RESULT_WINDOW", 3*time.Second),
		UpcomingRaces:    int(getenvInt64("UPCOMING_RACES", 2)),
		RNGSeed:          getenvInt64("RNG_SEED", 0),
		ZeroWinPolicy:    getenv("ZERO_WIN_POLICY", "refund_market"),
	}
}

func (c Config) Addr() string { return c.BindAddr + ":" + c.Port }

func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func getenvBool(k string, def bool) bool {
	v := os.Getenv(k)
	if v == "" {
		return def
	}
	b, err := strconv.ParseBool(v)
	if err != nil {
		return def
	}
	return b
}

func getenvFloat(k string, def float64) float64 {
	v := os.Getenv(k)
	if v == "" {
		return def
	}
	f, err := strconv.ParseFloat(v, 64)
	if err != nil {
		return def
	}
	return f
}

func getenvInt64(k string, def int64) int64 {
	v := os.Getenv(k)
	if v == "" {
		return def
	}
	n, err := strconv.ParseInt(v, 10, 64)
	if err != nil {
		return def
	}
	return n
}

func getenvDuration(k string, def time.Duration) time.Duration {
	v := os.Getenv(k)
	if v == "" {
		return def
	}
	d, err := time.ParseDuration(v)
	if err != nil {
		return def
	}
	return d
}

func splitCSV(s string) []string {
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}
