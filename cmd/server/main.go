package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"github.com/FaiqAli-dot/horseRace/internal/audit"
	"github.com/FaiqAli-dot/horseRace/internal/config"
	"github.com/FaiqAli-dot/horseRace/internal/engine"
	"github.com/FaiqAli-dot/horseRace/internal/mockbettors"
	"github.com/FaiqAli-dot/horseRace/internal/rgs"
	"github.com/FaiqAli-dot/horseRace/internal/rng"
	"github.com/FaiqAli-dot/horseRace/internal/scheduler"
	"github.com/FaiqAli-dot/horseRace/internal/storage/sqlite"
	"github.com/FaiqAli-dot/horseRace/internal/transport/httpapi"
	"github.com/FaiqAli-dot/horseRace/internal/transport/ws"
)

func main() {
	cfg := config.Load()
	if err := os.MkdirAll(filepath.Dir(cfg.DBPath), 0o755); err != nil {
		log.Fatalf("mkdir data: %v", err)
	}

	store, err := sqlite.Open(cfg.DBPath)
	if err != nil {
		log.Fatalf("db: %v", err)
	}
	defer store.Close()

	hub := ws.NewHub(cfg.CORSOrigins)
	auditor := audit.New(store.InsertAudit)

	rngImpl := rng.NewMock(cfg.RNGSeed)
	rgsImpl := rgs.NewMock()
	if !cfg.MockRNG {
		log.Println("MOCK_RNG=false but only MockRNG is shipped; using MockRNG")
	}
	if !cfg.MockRGS {
		log.Println("MOCK_RGS=false but only MockRGS is shipped; using MockRGS")
	}

	eng := engine.New(cfg, store, rngImpl, rgsImpl, auditor, hub)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	if err := eng.Bootstrap(ctx); err != nil {
		log.Fatalf("bootstrap: %v", err)
	}

	go scheduler.New(eng, 200*time.Millisecond).Run(ctx)
	go mockbettors.New(eng, cfg.MockBettors).Run(ctx)

	api := httpapi.New(cfg, eng, hub)
	srv := &http.Server{
		Addr:              cfg.Addr(),
		Handler:           api.Handler(),
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		log.Printf("horse-race backend listening on %s (CORS=%v takeout=%.2f)", cfg.Addr(), cfg.CORSOrigins, cfg.TakeoutRate)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %v", err)
		}
	}()

	sig := make(chan os.Signal, 1)
	signal.Notify(sig, syscall.SIGINT, syscall.SIGTERM)
	<-sig
	cancel()
	shutdownCtx, c2 := context.WithTimeout(context.Background(), 5*time.Second)
	defer c2()
	_ = srv.Shutdown(shutdownCtx)
}
