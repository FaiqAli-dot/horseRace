package ws

import (
	"encoding/json"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

type Hub struct {
	mu      sync.Mutex
	clients map[*websocket.Conn]struct{}
	up      websocket.Upgrader
}

func NewHub(origins []string) *Hub {
	allow := map[string]bool{}
	for _, o := range origins {
		allow[o] = true
	}
	return &Hub{
		clients: map[*websocket.Conn]struct{}{},
		up: websocket.Upgrader{
			CheckOrigin: func(r *http.Request) bool {
				if len(allow) == 0 {
					return true
				}
				origin := r.Header.Get("Origin")
				if origin == "" {
					return true
				}
				return allow[origin]
			},
		},
	}
}

type envelope struct {
	Event   string `json:"event"`
	Payload any    `json:"payload"`
}

func (h *Hub) Broadcast(event string, payload any) {
	b, err := json.Marshal(envelope{Event: event, Payload: payload})
	if err != nil {
		return
	}
	h.mu.Lock()
	defer h.mu.Unlock()
	for c := range h.clients {
		if err := c.WriteMessage(websocket.TextMessage, b); err != nil {
			_ = c.Close()
			delete(h.clients, c)
		}
	}
}

func (h *Hub) Handle(w http.ResponseWriter, r *http.Request) {
	c, err := h.up.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("ws upgrade: %v", err)
		return
	}
	h.mu.Lock()
	h.clients[c] = struct{}{}
	h.mu.Unlock()
	defer func() {
		h.mu.Lock()
		delete(h.clients, c)
		h.mu.Unlock()
		_ = c.Close()
	}()
	for {
		if _, _, err := c.ReadMessage(); err != nil {
			return
		}
	}
}
