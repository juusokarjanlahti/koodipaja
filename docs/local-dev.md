# Local development

## Quickstart (Docker)

Needs Docker with Compose v2 and Node.js 22+. On Windows, use WSL 2 with Docker Desktop's
WSL integration and run everything inside WSL.

```bash
./scripts/dev-setup.sh       # once; safe to run again
cd app && npm run dev:all    # web + worker, Ctrl+C stops both
```

Open <http://localhost:3000>, log in with any email address (development login) and open an
exercise.

`dev-setup.sh` creates `.env` (Docker) and `app/.env.local` (app) with random secrets,
builds the go-judge sandbox image, starts Postgres, Redis and go-judge
(`docker compose up -d --build --wait`), installs dependencies, migrates the database and
imports the exercises. CI runs exactly this on every pull request (`quickstart` workflow),
including the sandbox probes and the Playwright flows.

Every npm script in `app/` reads `app/.env.local`; variables already set in the
environment win.

| Command (in `app/`) | What it does |
|---|---|
| `npm run dev:all` | Development server and worker together |
| `npm run import-exercises` | Re-import exercises after editing `exercises/` |
| `npm run runner-check` | Every exercise and the sandbox security probes through go-judge |
| `npm run e2e` | Playwright flows against the running app |
| `docker compose stop` (repo root) | Stop the containers; data stays in Docker volumes |

## The code sandbox: go-judge (ADR 0006)

Student code runs in [go-judge](https://github.com/criyle/go-judge). Every run gets its own
namespaces (no network, read-only toolchains, a 128 MiB work directory) and cgroup limits for
CPU time, memory and processes. go-judge works with **both cgroup v1 and v2**, so modern
Ubuntu and Debian need no kernel changes. The Compose service disables swap for the
container (`memswap_limit`), otherwise memory limits do not hold on cgroup v2.

### Without Docker: `infra/go-judge/dev.sh`

Runs a real sandbox directly on your machine (Linux), using the compilers on your PATH:

```bash
sudo env "PATH=$PATH" ./infra/go-judge/dev.sh          # keep running in a terminal
./infra/go-judge/dev.sh --print-env >> app/.env.local  # once: tell the app where it is
```

The script downloads a pinned go-judge release, verifies its checksum and bind-mounts your
toolchains read-only into the sandbox. With rustup, also pass
`RUSTUP_HOME="$HOME/.rustup" CARGO_HOME="$HOME/.cargo"` to `sudo env`. Postgres and Redis
can then come from Docker (`docker compose up -d db redis`) or from the system.

### Check the sandbox

```bash
cd app && npm run runner-check
```

Runs every exercise's reference, wrong and accepted solutions through the sandbox and
probes the sandbox: no network, no host files, read-only system directories, process,
memory and time limits.

## Moodle (LTI 1.3)

`dev-setup.sh` already generates `LTI_PRIVATE_KEY`. Follow
[product/moodle-lti.md](product/moodle-lti.md); `tools/moodle/lti-setup.php` prepares a
local test Moodle in one command. The e2e tests run the whole flow against a fake platform,
so no Moodle is needed for CI.

## Without any sandbox

`app/scripts/fake-judge0.mjs` implements the small part of the Judge0 API the app uses and
runs code **without any sandbox** (`RUNNER=judge0`, `JUDGE0_URL=http://127.0.0.1:2358`).
It exists only for quick UI work on machines where go-judge cannot run. Never expose it to a
network.

## Legacy: Judge0 (ADR 0005)

Judge0 is no longer developed (last code change April 2024) and needs cgroup v1. It is
still available with `docker compose --profile judge0 up -d` and `RUNNER=judge0`; see
`infra/judge0.conf.example` and `infra/judge0-smoke.sh`.
