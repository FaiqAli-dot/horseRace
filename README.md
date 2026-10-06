# Horse Race — Demo Betting Game

Mobile-first frontend MVP of a virtual horse racing betting game. Entirely offline: mock RNG, local balance, no backend, no real money.

## Stack

- React + TypeScript + Vite
- Tailwind CSS v4
- Framer Motion (countdown, result, photo-finish flourishes)

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

To expose the dev server on your LAN / Tailscale interface:

```bash
npm run dev -- --host 0.0.0.0
```

Production build:

```bash
npm run build
npm run preview
```

## How to play

1. Select one of six horses (Thunder, Rocket, Shadow, Blaze, Storm, Comet).
2. Choose a bet amount (quick picks or custom).
3. Tap **PLACE BET** — balance deducts immediately.
4. Watch countdown → race (~5–8s). Finish order is decided **before** the animation by `src/game/mockRaceEngine.ts`.
5. Collect simulated payout if your horse finishes 1st / 2nd / 3rd, then **RACE AGAIN**.

Labelled **DEMO MODE · VIRTUAL BALANCE** throughout. Starting balance: **$1,000.00**.

## Architecture notes

| Path | Role |
|------|------|
| `src/game/mockRaceEngine.ts` | Predetermines race result + animation plan |
| `src/game/payout.ts` | Place × multiplier × bet |
| `src/game/raceTypes.ts` | Shared contracts (swap engine for API later) |
| `src/data/horses.ts` | Six horses + multipliers |
| `src/hooks/useRace.ts` | Game state machine & session history |

UI components never invent race outcomes — they only render engine output.
