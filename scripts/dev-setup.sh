#!/usr/bin/env bash
# One-time local setup: secrets, Postgres + Redis + go-judge in Docker, dependencies,
# database and exercises. Safe to run again (keeps existing secrets and data).
#
#   ./scripts/dev-setup.sh
#   cd app && npm run dev:all        # then open http://localhost:3000
#
# Needs: Docker with Compose v2, Node.js 22+, Python 3 (exercise validation only).
# On Windows, run it inside WSL 2 with Docker Desktop's WSL integration.
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$PWD"

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
die() { printf '\nERROR: %s\n' "$*" >&2; exit 1; }

say "1/5 Checking tools"
command -v docker >/dev/null || die "Docker is not installed (https://docs.docker.com/engine/install/)."
docker compose version >/dev/null 2>&1 || die "Docker Compose v2 is missing ('docker compose')."
docker info >/dev/null 2>&1 || die "Docker is not running, or this user may not use it (try: sudo usermod -aG docker \$USER, then log in again)."
command -v node >/dev/null || die "Node.js is not installed (22 or newer: https://nodejs.org)."
node_major="$(node -p 'process.versions.node.split(".")[0]')"
[ "$node_major" -ge 22 ] || die "Node.js 22 or newer is needed, found $(node -v)."
echo "docker $(docker version --format '{{.Server.Version}}'), node $(node -v)"

secret() { node -e 'console.log(require("crypto").randomBytes(32).toString("hex"))'; }

say "2/5 Secrets (.env for Docker, app/.env.local for the app)"
if [ ! -f .env ]; then
  db_password="$(secret)"
  judge_token="$(secret)"
  sed -e "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$db_password/" \
      -e "s#^DATABASE_URL=.*#DATABASE_URL=postgres://koodipaja:$db_password@127.0.0.1:5432/koodipaja#" \
      -e "s/^GO_JUDGE_AUTH_TOKEN=.*/GO_JUDGE_AUTH_TOKEN=$judge_token/" \
      -e "s/^SESSION_SECRET=.*/SESSION_SECRET=$(secret)/" \
      .env.example > .env
  echo "created .env"
else
  echo ".env exists, keeping it"
fi
if [ ! -f app/.env.local ]; then
  cp .env app/.env.local
  # Tool key for Moodle (LTI 1.3), same format as `npm run lti:keygen`.
  node -e 'const { privateKey } = require("crypto").generateKeyPairSync("rsa", { modulusLength: 2048 });
    console.log(`LTI_PRIVATE_KEY="${privateKey.export({ type: "pkcs8", format: "pem" }).toString().trim().replace(/\n/g, "\\n")}"`)' >> app/.env.local
  # The template's empty LTI_PRIVATE_KEY= line would shadow the generated one.
  sed -i.bak '/^LTI_PRIVATE_KEY=$/d' app/.env.local && rm -f app/.env.local.bak
  echo "created app/.env.local"
else
  echo "app/.env.local exists, keeping it"
fi

say "3/5 Starting Postgres, Redis and the go-judge sandbox (first build takes a few minutes)"
docker compose up -d --build --wait db redis go-judge

say "4/5 Installing app dependencies"
(cd app && npm ci --no-audit --no-fund)

say "5/5 Database and exercises"
(cd app && npm run db:migrate && npm run import-exercises)

cat <<EOF

Ready. Start the app and the worker:

  cd app && npm run dev:all

Then open http://localhost:3000, log in with any email address (development login)
and open an exercise. Stop with Ctrl+C; 'docker compose stop' stops the containers.

Optional: check that every exercise passes in the sandbox:  cd app && npm run runner-check
EOF
