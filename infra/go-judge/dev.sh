#!/usr/bin/env bash
# Run a real go-judge sandbox for local development and CI (ADR 0006).
#
#   sudo ./infra/go-judge/dev.sh            # foreground, listens on 127.0.0.1:5050
#   sudo ./infra/go-judge/dev.sh --print-env # only print the env vars the app needs
#
# Downloads a pinned, checksum-verified go-judge release, then bind-mounts this machine's
# toolchains (Python, Node, TypeScript, GCC, Java, Rust) into the sandbox read-only. The
# toolchains are found from PATH, so the same script works locally and in GitHub Actions.
# Production uses the Docker image in infra/go-judge/Dockerfile instead.
#
# Needs root: go-judge creates cgroups and namespaces for every run.
set -euo pipefail

VERSION="1.13.3"
SHA256="509782f8959987256d99ac6dc8062ec593d776f291401c8e0c28bdc48dcd1880"
ADDR="${GO_JUDGE_ADDR:-127.0.0.1:5050}"
TOKEN="${GO_JUDGE_AUTH_TOKEN:-localtoken}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WORK="${GO_JUDGE_DEV_DIR:-${TMPDIR:-/tmp}/koodipaja-go-judge}"
TOOLBIN="$WORK/toolbin"
SANDBOX_BIN="/opt/koodipaja/bin"

TOOLS="/opt/koodipaja/tools"
TYPES_IN_SANDBOX=""
[[ -x "$ROOT/app/node_modules/typescript/bin/tsc" ]] && TYPES_IN_SANDBOX="$TOOLS/node_modules/@types"
ENV_LINES="GO_JUDGE_URL=http://$ADDR
GO_JUDGE_AUTH_TOKEN=$TOKEN
GO_JUDGE_PATH=$SANDBOX_BIN:/usr/local/bin:/usr/bin:/bin
GO_JUDGE_TS_TYPE_ROOTS=$TYPES_IN_SANDBOX"
# --print-env has no side effects, so it is safe while go-judge is running.
if [[ "${1:-}" == "--print-env" ]]; then echo "$ENV_LINES"; exit 0; fi

mkdir -p "$WORK"
BIN="$WORK/go-judge-$VERSION"
if [[ ! -x "$BIN" ]]; then
  echo "Downloading go-judge $VERSION ..." >&2
  curl -fsSL -o "$BIN.tmp" "https://github.com/criyle/go-judge/releases/download/v$VERSION/go-judge_${VERSION}_linux_amd64"
  echo "$SHA256  $BIN.tmp" | sha256sum -c - >&2
  chmod +x "$BIN.tmp" && mv "$BIN.tmp" "$BIN"
fi

# Toolchain links: name -> executable inside the sandbox. Toolchains outside the default
# mounts (/bin, /lib, /usr) are bind-mounted read-only under /opt/koodipaja/tools/<label>,
# because their host paths (e.g. /root/.rustup) may not be readable by the sandbox user.
rm -rf "$TOOLBIN" && mkdir -p "$TOOLBIN"
declare -A EXTRA=()   # host dir -> sandbox dir
link() {
  local name="$1" real="$2" prefix="$3" label="$4"
  [[ -x "$real" ]] || { echo "warning: $name not found, skipping" >&2; return; }
  case "$real" in
    /usr/*|/bin/*|/lib/*|/lib64/*) ln -s "$real" "$TOOLBIN/$name" ;;
    *) EXTRA["$prefix"]="$TOOLS/$label"; ln -s "$TOOLS/$label/${real#"$prefix"/}" "$TOOLBIN/$name" ;;
  esac
}
resolve() { command -v "$1" >/dev/null && readlink -f "$(command -v "$1")" || true; }
prefix() { dirname "$(dirname "$1")"; }  # /opt/node22/bin/node -> /opt/node22

for tool in python3 node gcc g++ javac java jar; do
  real="$(resolve "$tool")"
  [[ -n "$real" ]] && link "$tool" "$real" "$(prefix "$real")" "$tool"
done
if command -v rustc >/dev/null; then
  sysroot="$(rustc --print sysroot)"
  link rustc "$sysroot/bin/rustc" "$sysroot" rust
fi
if [[ -x "$ROOT/app/node_modules/typescript/bin/tsc" ]]; then
  link tsc "$ROOT/app/node_modules/typescript/bin/tsc" "$ROOT/app/node_modules" node_modules
fi
# The JDK reads its configuration from /etc at a fixed path.
[[ -d /etc/java-21-openjdk ]] && EXTRA["/etc/java-21-openjdk"]="/etc/java-21-openjdk"

{
  echo "mount:"
  for dir in /bin /lib /lib64 /usr /etc/ld.so.cache /etc/alternatives; do
    [[ -e "$dir" ]] && printf '  - type: bind\n    source: %s\n    target: %s\n    readonly: true\n' "$dir" "$dir"
  done
  for dir in "${!EXTRA[@]}"; do
    printf '  - type: bind\n    source: %s\n    target: %s\n    readonly: true\n' "$dir" "${EXTRA[$dir]}"
  done
  printf '  - type: bind\n    source: %s\n    target: %s\n    readonly: true\n' "$TOOLBIN" "$SANDBOX_BIN"
  for dev in null urandom random zero full; do
    printf '  - type: bind\n    source: /dev/%s\n    target: /dev/%s\n' "$dev" "$dev"
  done
  cat <<'YAML'
  - type: tmpfs
    target: /w
    data: size=128m,nr_inodes=4k
  - type: tmpfs
    target: /tmp
    data: size=128m,nr_inodes=4k
proc: true
symLink:
  - linkPath: /dev/fd
    target: /proc/self/fd
  - linkPath: /dev/stdin
    target: /proc/self/fd/0
  - linkPath: /dev/stdout
    target: /proc/self/fd/1
  - linkPath: /dev/stderr
    target: /proc/self/fd/2
maskPath:
  - /sys/firmware
  - /proc/acpi
  - /proc/kcore
  - /proc/keys
  - /proc/latency_stats
  - /proc/timer_list
  - /proc/sched_debug
  - /proc/scsi
workDir: /w
hostName: koodipaja
domainName: koodipaja
uid: 1536
gid: 1536
YAML
} > "$WORK/mount.yaml"

echo "go-judge $VERSION on http://$ADDR (mounts: $WORK/mount.yaml). Set for the app:" >&2
echo "$ENV_LINES" >&2
exec "$BIN" -http-addr "$ADDR" -auth-token "$TOKEN" -mount-conf "$WORK/mount.yaml" -silent
