package httpapi

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/FaiqAli-dot/horseRace/internal/config"
	"github.com/FaiqAli-dot/horseRace/internal/domain"
	"github.com/FaiqAli-dot/horseRace/internal/engine"
	"github.com/FaiqAli-dot/horseRace/internal/money"
	"github.com/FaiqAli-dot/horseRace/internal/transport/ws"
)

type Server struct {
	cfg config.Config
	eng *engine.Engine
	hub *ws.Hub
	mux *http.ServeMux
}

func New(cfg config.Config, eng *engine.Engine, hub *ws.Hub) *Server {
	s := &Server{cfg: cfg, eng: eng, hub: hub, mux: http.NewServeMux()}
	s.routes()
	return s
}

func (s *Server) Handler() http.Handler {
	return s.cors(s.mux)
}

func (s *Server) routes() {
	s.mux.HandleFunc("GET /api/health", s.handleHealth)
	s.mux.HandleFunc("GET /api/races", s.handleRaces)
	s.mux.HandleFunc("GET /api/races/current", s.handleCurrent)
	s.mux.HandleFunc("GET /api/races/upcoming", s.handleUpcoming)
	s.mux.HandleFunc("GET /api/races/{id}", s.handleRace)
	s.mux.HandleFunc("GET /api/races/{id}/pools", s.handlePools)
	s.mux.HandleFunc("GET /api/races/{id}/results", s.handleResults)
	s.mux.HandleFunc("POST /api/bets", s.handlePlaceBet)
	s.mux.HandleFunc("GET /api/bets", s.handlePlayerBets)
	s.mux.HandleFunc("GET /api/player/bets", s.handlePlayerBets)
	s.mux.HandleFunc("GET /api/balance", s.handleBalance)
	s.mux.HandleFunc("POST /api/demo/reset", s.handleReset)
	s.mux.HandleFunc("GET /api/ws", s.hub.Handle)
	s.mux.HandleFunc("GET /ws", s.hub.Handle)
}

func (s *Server) cors(next http.Handler) http.Handler {
	allow := map[string]bool{}
	for _, o := range s.cfg.CORSOrigins {
		allow[o] = true
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" && (len(allow) == 0 || allow[origin]) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Idempotency-Key")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, 200, map[string]any{
		"ok":      true,
		"service": "horse-race-backend",
		"time":    time.Now().UTC(),
		"env":     s.cfg.AppEnv,
	})
}

func raceDTO(race domain.Race) map[string]any {
	return map[string]any{
		"id":             race.ID,
		"raceNumber":     race.RaceNumber,
		"status":         race.Status,
		"scheduledAt":    race.ScheduledAt,
		"bettingOpenAt":  race.BettingOpenAt,
		"bettingCloseAt": race.BettingCloseAt,
		"raceStartAt":    race.RaceStartAt,
		"resultAt":       race.ResultAt,
		"settledAt":      race.SettledAt,
		"horses":         race.Horses,
		"takeoutRate":    race.TakeoutRate,
		"configVersion":  race.ConfigVersion,
		"result":         race.Result,
		"serverNow":      time.Now().UTC(),
	}
}

func (s *Server) handleRaces(w http.ResponseWriter, r *http.Request) {
	list, err := s.eng.ListRaces(30)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	out := make([]map[string]any, 0, len(list))
	for _, race := range list {
		out = append(out, raceDTO(race))
	}
	writeJSON(w, 200, map[string]any{"races": out})
}

func (s *Server) handleCurrent(w http.ResponseWriter, r *http.Request) {
	race, err := s.eng.CurrentRace()
	if err != nil {
		writeErr(w, 404, err.Error())
		return
	}
	pools, _ := s.eng.Pools(race.ID)
	writeJSON(w, 200, map[string]any{"race": raceDTO(race), "pools": pools})
}

func (s *Server) handleUpcoming(w http.ResponseWriter, r *http.Request) {
	list, err := s.eng.UpcomingRaces()
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	out := make([]map[string]any, 0, len(list))
	for _, race := range list {
		out = append(out, raceDTO(race))
	}
	writeJSON(w, 200, map[string]any{"races": out})
}

func (s *Server) handleRace(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	race, err := s.eng.GetRace(id)
	if err != nil {
		writeErr(w, 404, "race not found")
		return
	}
	pools, _ := s.eng.Pools(id)
	writeJSON(w, 200, map[string]any{"race": raceDTO(race), "pools": pools})
}

func (s *Server) handlePools(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	pools, err := s.eng.Pools(id)
	if err != nil {
		writeErr(w, 404, err.Error())
		return
	}
	writeJSON(w, 200, map[string]any{"raceId": id, "pools": pools})
}

func (s *Server) handleResults(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	race, err := s.eng.GetRace(id)
	if err != nil {
		writeErr(w, 404, "race not found")
		return
	}
	if race.Result == nil {
		writeJSON(w, 200, map[string]any{"raceId": id, "result": nil, "status": race.Status})
		return
	}
	writeJSON(w, 200, map[string]any{"raceId": id, "result": race.Result, "status": race.Status})
}

func (s *Server) handlePlaceBet(w http.ResponseWriter, r *http.Request) {
	var body engine.PlaceBetRequest
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeErr(w, 400, "invalid json")
		return
	}
	if key := r.Header.Get("Idempotency-Key"); key != "" && body.IdempotencyKey == "" {
		body.IdempotencyKey = key
	}
	bet, err := s.eng.PlaceBet(r.Context(), body)
	if err != nil {
		msg := err.Error()
		code := 400
		if strings.Contains(msg, "insufficient") {
			code = 402
		}
		writeErr(w, code, msg)
		return
	}
	bal, _ := s.eng.Balance(bet.PlayerID)
	writeJSON(w, 201, map[string]any{
		"betId":             bet.ID,
		"status":            bet.Status,
		"estimatedDividend": bet.PotentialDividendAtPlace,
		"stakeCents":        bet.StakeC,
		"stake":             money.CentsToDollars(bet.StakeC),
		"raceId":            bet.RaceID,
		"horseId":           bet.HorseID,
		"market":            bet.Market,
		"balanceCents":      bal,
		"balance":           money.CentsToDollars(bal),
	})
}

func (s *Server) handlePlayerBets(w http.ResponseWriter, r *http.Request) {
	player := r.URL.Query().Get("playerId")
	bets, err := s.eng.PlayerBets(player)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, map[string]any{"bets": bets})
}

func (s *Server) handleBalance(w http.ResponseWriter, r *http.Request) {
	player := r.URL.Query().Get("playerId")
	bal, err := s.eng.Balance(player)
	if err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	writeJSON(w, 200, map[string]any{
		"playerId":     s.cfg.DemoPlayerID,
		"balanceCents": bal,
		"balance":      money.CentsToDollars(bal),
	})
}

func (s *Server) handleReset(w http.ResponseWriter, r *http.Request) {
	if err := s.eng.ResetDemo(r.Context()); err != nil {
		writeErr(w, 500, err.Error())
		return
	}
	bal, _ := s.eng.Balance("")
	writeJSON(w, 200, map[string]any{"ok": true, "balance": money.CentsToDollars(bal)})
}
