package rgs

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
)

// Session represents a player wallet session at an RGS.
type Session struct {
	ID       string
	PlayerID string
}

type WagerRequest struct {
	SessionID string
	PlayerID  string
	RaceID    string
	BetID     string
	StakeC    int64
}

type WagerAck struct {
	TxnID  string
	Status string
}

type SettlementRequest struct {
	SessionID string
	PlayerID  string
	BetID     string
	RaceID    string
	PayoutC   int64
}

type SettlementAck struct {
	TxnID  string
	Status string
}

// RGS abstracts remote gaming / wallet operations.
type RGS interface {
	EnsureSession(ctx context.Context, playerID string) (Session, error)
	AcceptWager(ctx context.Context, req WagerRequest) (WagerAck, error)
	SettleWager(ctx context.Context, req SettlementRequest) (SettlementAck, error)
}

// MockRGS is an in-memory adapter for MVP demos.
type MockRGS struct {
	mu       sync.Mutex
	sessions map[string]Session
	wagers   map[string]WagerAck
	settles  map[string]SettlementAck
}

func NewMock() *MockRGS {
	return &MockRGS{
		sessions: map[string]Session{},
		wagers:   map[string]WagerAck{},
		settles:  map[string]SettlementAck{},
	}
}

func (m *MockRGS) EnsureSession(_ context.Context, playerID string) (Session, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if s, ok := m.sessions[playerID]; ok {
		return s, nil
	}
	s := Session{ID: "sess-" + uuid.NewString(), PlayerID: playerID}
	m.sessions[playerID] = s
	return s, nil
}

func (m *MockRGS) AcceptWager(_ context.Context, req WagerRequest) (WagerAck, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if ack, ok := m.wagers[req.BetID]; ok {
		return ack, nil // idempotent
	}
	if req.StakeC <= 0 {
		return WagerAck{}, fmt.Errorf("invalid stake")
	}
	ack := WagerAck{TxnID: "wtxn-" + uuid.NewString(), Status: "ACCEPTED"}
	m.wagers[req.BetID] = ack
	_ = time.Now()
	return ack, nil
}

func (m *MockRGS) SettleWager(_ context.Context, req SettlementRequest) (SettlementAck, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if ack, ok := m.settles[req.BetID]; ok {
		return ack, nil // idempotent
	}
	ack := SettlementAck{TxnID: "stxn-" + uuid.NewString(), Status: "SETTLED"}
	m.settles[req.BetID] = ack
	return ack, nil
}
