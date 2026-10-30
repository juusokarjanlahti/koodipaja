# Local development

## Requirements

- Docker with Compose v2 (Postgres, Redis, go-judge image), or Postgres and Redis installed
  locally
- Node.js 22+
- Python 3.10+ with `pyyaml` (exercise validation)
- Compilers for the languages you work on: Python, GCC, OpenJDK 21, Rust. Validation and
  the local sandbox use the ones on your PATH.

## Start the infrastructure

```bash
cp .env.example .env            # change the passwords and GO_JUDGE_AUTH_TOKEN
docker compose up -d            # Postgres, Redis and go-judge
```

## The code sandbox: go-judge (ADR 0006)

Student code runs in [go-judge](https://github.com/criyle/go-judge). Every run gets its own
namespaces (no network, read-only toolchains, a 128 MiB work directory) and cgroup limits for
CPU time, memory and processes. go-judge works with **both cgroup v1 and v2**, so modern
Ubuntu and Debian need no kernel changes.

### Without Docker: `infra/go-judge/dev.sh`

Runs a real sandbox directly on your machine, using the compilers on your PATH:

```bash
sudo env "PATH=$PATH" ./infra/go-judge/dev.sh          # keep running in a terminal
./infra/go-judge/dev.sh --print-env >> app/.env.local  # once: tell the app where it is
```

The script downloads a pinned go-judge release, verifies its checksum and bind-mounts your
toolchains read-only into the sandbox. With rustup, also pass
`RUSTUP_HOME="$HOME/.rustup" CARGO_HOME="$HOME/.cargo"` to `sudo env`.

### Check the sandbox

```bash
cd app && npm run runner-check
```

Runs every exercise's reference, wrong and accepted solutions through the sandbox and
probes the sandbox: no network, no host files, read-only system directories, process,
memory and time limits. CI runs the same check on every pull request.

## Without any sandbox

`app/scripts/fake-judge0.mjs` implements the small part of the Judge0 API the app uses and
runs code **without any sandbox** (`RUNNER=judge0`, `JUDGE0_URL=http://127.0.0.1:2358`).
It exists only for quick UI work on machines where go-judge cannot run. Never expose it to a
network.

## Legacy: Judge0 (ADR 0005)

Judge0 is no longer developed (last code change April 2024) and needs cgroup v1. It is
still available with `docker compose --profile judge0 up -d` and `RUNNER=judge0`; see
`infra/judge0.conf.example` and `infra/judge0-smoke.sh`.
