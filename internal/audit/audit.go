package audit

import (
	"log"
	"sync"
	"time"

	"github.com/FaiqAli-dot/horseRace/internal/domain"
	"github.com/google/uuid"
)

const (
	RaceCreated        = "RACE_CREATED"
	BettingOpened      = "BETTING_OPENED"
	BetAccepted        = "BET_ACCEPTED"
	BettingLocked      = "BETTING_LOCKED"
	RNGResultGenerated = "RNG_RESULT_GENERATED"
	RaceStarted        = "RACE_STARTED"
	RaceFinished       = "RACE_FINISHED"
	BetSettled         = "BET_SETTLED"
	RaceSettled        = "RACE_SETTLED"
	DemoReset          = "DEMO_RESET"
)

type Logger struct {
	mu      sync.Mutex
	events  []domain.AuditEvent
	persist func(domain.AuditEvent) error
}

func New(persist func(domain.AuditEvent) error) *Logger {
	return &Logger{persist: persist, events: make([]domain.AuditEvent, 0, 256)}
}

func (l *Logger) Log(typ, raceID, betID, playerID, detail string) domain.AuditEvent {
	ev := domain.AuditEvent{
		ID:        "aud-" + uuid.NewString(),
		Type:      typ,
		RaceID:    raceID,
		BetID:     betID,
		PlayerID:  playerID,
		Detail:    detail,
		CreatedAt: time.Now().UTC(),
	}
	l.mu.Lock()
	l.events = append(l.events, ev)
	if len(l.events) > 5000 {
		l.events = l.events[len(l.events)-4000:]
	}
	l.mu.Unlock()
	if l.persist != nil {
		_ = l.persist(ev)
	}
	log.Printf("AUDIT %s race=%s bet=%s player=%s %s", typ, raceID, betID, playerID, detail)
	return ev
}

func (l *Logger) Recent(n int) []domain.AuditEvent {
	l.mu.Lock()
	defer l.mu.Unlock()
	if n <= 0 || n > len(l.events) {
		n = len(l.events)
	}
	out := make([]domain.AuditEvent, n)
	copy(out, l.events[len(l.events)-n:])
	return out
}
