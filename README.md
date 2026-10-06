# Horse Race — Pari-mutuel Demo

Continuous pool-betting horse racing MVP. **No real money.**

- **Frontend:** React + TypeScript + Vite + Tailwind (visualizes backend race results)
- **Backend:** Go authoritative engine (pools, RNG, settlement, SQLite, REST + WebSocket)

## Horses

Thunder, Shadow, Rocket, Blaze, Comet (5 runners). Markets: `WIN`, `PLACE_2`, `PLACE_3`. House takeout default **4%**.

## Start backend

```bash
# from repo root
go run ./cmd/server
# listens on 0.0.0.0:8080
```

Env (optional):

| Variable | Default | Notes |
|----------|---------|--------|
| `BACKEND_PORT` | `8080` | |
| `BIND_ADDR` | `0.0.0.0` | |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | comma-separated |
| `TAKEOUT_RATE` | `0.04` | |
| `MOCK_RNG` | `true` | |
| `MOCK_RGS` | `true` | |
| `MOCK_BETTORS` | `true` | simulated pool activity |
| `DB_PATH` | `data/horse_race.db` | SQLite |
| `BETTING_WINDOW` | `12s` | |
| `RACE_WINDOW` | `7s` | |
| `RESULT_WINDOW` | `3s` | |
| `RNG_SEED` | `0` | non-zero = deterministic MockRNG |

```bash
go test ./...
go build -o bin/server ./cmd/server
```

## Start frontend

```bash
npm install
npm run dev
# Vite proxies /api and /ws to :8080
# LAN:
npm run dev -- --host 0.0.0.0
```

Optional: `VITE_API_BASE=http://127.0.0.1:8080` if not using the proxy.

## Architecture

```
Game Engine
  ├── RNG interface → MockRNG (swap for RealRNG later)
  ├── RGS interface → MockRGS (swap for real wallet/RGS later)
  ├── Pool manager (pari-mutuel, cents)
  ├── Settlement (idempotent; zero-winning-pool → refund market)
  ├── Scheduler (betting → lock+RNG → race → settle → next)
  └── SQLite persistence + audit log
```

Backend locks bets, **then** asks RNG for the finishing order, persists it, then the frontend only animates that result.

## API (REST)

- `GET /api/health`
- `GET /api/races` · `/api/races/current` · `/api/races/upcoming` · `/api/races/:id`
- `GET /api/races/:id/pools` · `/api/races/:id/results`
- `POST /api/bets` · `GET /api/bets` · `GET /api/player/bets`
- `GET /api/balance` · `POST /api/demo/reset`
- WebSocket: `GET /api/ws` (events: `race.*`, `pool.updated`, `bet.accepted`, `bet.settled`, …)

## Demo note

Virtual balance starts at **$1,000**. Labelled demo / pari-mutuel throughout.
