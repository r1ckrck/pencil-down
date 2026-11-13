# Running Pencil Down

What the app needs to build and run in production. Packaging (image, compose, hostname, auth) lives on the server.

## Build

From the repo root, with Node 24 and pnpm (corepack):

```
cd app
pnpm install --frozen-lockfile
pnpm build
```

- `pnpm build` runs `scripts/sync-content.ts` first: it copies `content/**/images` into `app/public/content/`, so `content/` must be present at build time.
- Output is Next's standalone bundle in `app/.next/standalone/`. It does **not** include static assets; assemble the runtime folder as below.
- Copy with symlinks preserved (`cp -a`, `rsync -a`, or Docker `COPY`): the bundle's `node_modules` is pnpm's symlinked layout, and following the links (e.g. BSD `cp -r`) breaks module resolution.

## Runtime folder

```
<runtime>/
├── server.js            ← app/.next/standalone/.  (whole folder, incl. node_modules/)
├── .next/static/        ← app/.next/static/
├── public/              ← app/public/             (includes public/content/ from the build)
└── content/             ← repo content/           (JSON pool read at runtime)
```

## Run

```
cd <runtime>
node server.js
```

| Variable | Value | Why |
|---|---|---|
| `NODE_ENV` | `production` | |
| `PORT` | `3000` | HTTP port |
| `HOSTNAME` | `0.0.0.0` | Listen on all interfaces inside a container |
| `PENCIL_DATA_DIR` | persistent folder, e.g. `/data` | SQLite `pencil-down.db` (WAL) and `photos/`; created on first run. The only state the app keeps |
| `PENCIL_CONTENT_DIR` | `<runtime>/content` | Question pool; read-only |
| `NODE_OPTIONS` | `--max-old-space-size=256` | Heap cap; keeps RSS ~320 MB across back-to-back 3-hour exams. Pair with a 512 MB memory limit |

- Health: `GET /api/health` → `200 {"ok":true,…}`. Inside a container use `127.0.0.1`, not `localhost` (Node listens on IPv4 `0.0.0.0`).
- Run with `umask 002` so `photos/` and its files are group-writable. SQLite creates `pencil-down.db*` as 0644 regardless of umask; `chmod g+w` them once if another host user must write them.
- Single user, no app-level auth: put it behind an auth gate.
- Back up `PENCIL_DATA_DIR` (or use Settings → Export, which downloads the database and photos as one archive).

## Check before deploying

`.forgejo/workflows/check.yml` runs on every push to `main`: content validation, unit tests, type check, production build.
