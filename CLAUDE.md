# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# First-time setup
npm run install:all        # installs root (backend) + client deps

# Development (runs both servers concurrently)
npm run dev                # backend on :3001, Vite on :5173

# Production
npm run build              # builds client to client/dist/
npm start                  # serves API + built client on :3001
```

The backend uses `node --watch` in dev mode — no restart needed after editing `server.js`. Vite HMR handles client changes.

## Architecture

Two-process dev setup, single-process production:

**Backend** (`server.js`) — Express on port 3001
- Synchronous SQLite via `better-sqlite3`. Database file is `diy-tasks.db` in the project root (created on first run).
- `foreign_keys = ON` pragma is set; `materials` and `tools` cascade-delete when their parent task is deleted.
- All API routes are under `/api/`. The catch-all `GET *` serves `client/dist/index.html` for production SPA routing.
- Binds to `0.0.0.0` to be reachable from other devices on the LAN.

**Frontend** (`client/`) — React + Vite on port 5173
- In dev, Vite proxies `/api/*` → `http://localhost:3001` (configured in `vite.config.js`).
- `server.host: true` is set in `vite.config.js` so the dev server is reachable over the network.
- All state lives in `App.jsx`. No external state library. API calls are plain `fetch`.
- Tasks are always fetched/stored for the current date (ISO string `YYYY-MM-DD`). The list resets each day.

## Data model

**tasks** — one per job, date-scoped
- `time_rating` INTEGER 1–4. Labels and colours are defined in `TaskItem.jsx` and `AddTaskForm.jsx` / `EditTaskForm.jsx` — keep in sync if values change.
- No `cost_rating` in the UI; cost is derived from materials.

**materials** — child of task, `ON DELETE CASCADE`
- `estimated_cost REAL` — cost in GBP. Zero means free.
- `url TEXT` — optional purchase link, rendered as an external-link icon in the edit sheet.
- `total_cost` and `material_count` are aggregated via LEFT JOIN in `GET /api/tasks` and `PUT /api/tasks/:id`, so the task list always reflects live material totals without a separate fetch.

**tools** — child of task, `ON DELETE CASCADE`
- Name only; no cost (tools are assumed to be owned, not consumables).

## Key patterns

**Cost display on cards**: `total_cost` and `material_count` come from the server on every task fetch. The cost badge only shows when `material_count > 0`. Colour is computed dynamically by `costColor()` in `TaskItem.jsx` (green < £20, amber < £100, red ≥ £100).

**Materials/tools in edit sheet**: fetched fresh from `/api/tasks/:id/materials` and `/api/tasks/:id/tools` when the edit sheet opens. Add/delete operations hit the API immediately (no unsaved state for list items). Task fields (title, notes, time rating) still require an explicit Save.

**Bottom-sheet pattern**: `AddTaskForm` and `EditTaskForm` share CSS from `AddTaskForm.css`. `EditTaskForm.css` only adds styles for the materials/tools sections and the delete confirmation.

**Task ordering**: after any toggle or update the frontend re-sorts — incomplete first, completed last — without re-fetching from the server.

## Key design constraints

- All touch targets are at least 44×44px.
- Input `font-size` must stay ≥ 16px to prevent iOS auto-zoom.
- The checkbox `onClick` uses `e.stopPropagation()` to prevent the card's edit handler firing simultaneously.
- Delete is always two taps (edit sheet → confirm) — no single-tap delete anywhere in the UI.
