# DIY Today

A simple daily DIY task manager. Plan jobs, track materials and costs, and work through your to-do list day by day.

## Setup

```bash
npm run install:all
npm run build
npm start
```

The app runs on port **3001**. Open `http://<your-server-ip>:3001` in a browser.

## Development

```bash
npm run dev
```

Runs the backend on `:3001` and the Vite dev server on `:5173` concurrently. Both support hot reload.

## Updating (on your server)

```bash
git pull origin main
npm run install:all
npm run build
pm2 restart all
```

The database (`diy-tasks.db`) is never touched by a code update — your data is safe. Schema changes are applied automatically on startup.

## Stack

- **Backend** — Node.js + Express + SQLite (`better-sqlite3`)
- **Frontend** — React + Vite
- **Database** — `diy-tasks.db` in the project root (created on first run)

## Data

Tasks are organised into **today** and **backlog**. Each task can have:
- Time rating (1–4)
- Priority
- Materials with costs (in GBP) and purchase links
- Tools required
- Category

## Docker

Every push to `main` builds `ghcr.io/petheridge/diy-today:latest` (plus a short-SHA tag) via GitHub Actions.

```bash
docker compose up -d   # uses docker-compose.yml in this repo
```

The SQLite database lives in `./data/diy-tasks.db` on the host (mounted at `/data`). The container runs as uid 1000, so the `data` folder must be writable by uid 1000. To move an existing install, stop the old app and copy its `diy-tasks.db` into `./data/` before starting the container.

`DB_PATH` sets the database location (default: `diy-tasks.db` next to `server.js`, so non-Docker installs are unchanged).
