# Horse Race — Pari-mutuel Demo

Continuous pool-betting horse racing MVP. **No real money.** Backend is authoritative; the frontend only visualizes races and places bets.

- **Frontend:** React + TypeScript + Vite + Tailwind
- **Backend:** Go engine (pools, MockRNG, MockRGS, SQLite, REST + WebSocket)

## Horses

Thunder, Shadow, Rocket, Blaze, Comet. Markets: `WIN`, `PLACE_2`, `PLACE_3`. Default takeout **4%**.

## Start backend

```bash
go run ./cmd/server
# binds 0.0.0.0:8080
```

| Variable | Default | Notes |
|----------|---------|--------|
| `BACKEND_PORT` | `8080` | |
| `BIND_ADDR` | `0.0.0.0` | |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | comma-separated; add your Tailscale origin if needed |
| `TAKEOUT_RATE` | `0.04` | |
| `MOCK_RNG` / `MOCK_RGS` / `MOCK_BETTORS` | `true` | |
| `DB_PATH` | `data/horse_race.db` | |
| `BETTING_WINDOW` / `RACE_WINDOW` / `RESULT_WINDOW` | `12s` / `7s` / `3s` | |

```bash
go test ./...
go build -o bin/server ./cmd/server
```

## Start frontend

```bash
npm install
npm run dev
# Vite binds 0.0.0.0:5173
```

API base URL (required for direct backend calls):

```bash
# default
VITE_API_BASE_URL=http://localhost:8080 npm run dev

# Tailscale / LAN example (use YOUR machine's IP — do not invent one)
VITE_API_BASE_URL=http://100.x.y.z:8080 npm run dev
```

WebSocket URL is derived from `VITE_API_BASE_URL` (`http`→`ws`, path `/api/ws`).

Also add the frontend origin to backend `CORS_ORIGINS` when using a non-localhost host.

```bash
npm run build
```

## Frontend architecture

```
src/services/api.ts       REST (getCurrentRace, placeBet, …)
src/services/realtime.ts  WebSocket events
src/hooks/usePariMutuelGame.ts
src/components/           track, pools, bet slip, my bets, …
src/game/raceAnimation.ts presentation-only motion from backend order
```

No fixed multipliers, no frontend RNG for results, no local settlement.

## API

- `GET /api/health`
- `GET /api/races` · `/current` · `/upcoming` · `/:id` · `/:id/pools` · `/:id/results`
- `POST /api/bets` · `GET /api/player/bets` · `GET /api/balance` · `POST /api/demo/reset`
- `WS /api/ws`

## Demo

Virtual balance **$1,000**. If the backend is down, the UI shows **BACKEND OFFLINE** and does not invent race results.
