# go-judge with current language versions (ADR 0006). UNTESTED DRAFT: it could not be
# built in the environment where it was written (Docker Hub blocked). The same toolchain
# layout is tested in CI through infra/go-judge/dev.sh.
#
#   docker compose build go-judge
#
# Debian trixie provides Python 3.13, OpenJDK 21 and GCC 14. Node.js 22 LTS and Rust stable
# come from their official distributions. Everything lands under /usr, which go-judge
# bind-mounts read-only into every sandbox (mount.yaml).
FROM debian:trixie-slim

ARG GO_JUDGE_VERSION=1.13.3
ARG GO_JUDGE_SHA256=509782f8959987256d99ac6dc8062ec593d776f291401c8e0c28bdc48dcd1880
ARG NODE_VERSION=22.23.4
ARG TYPESCRIPT_VERSION=5.9.3
ARG TYPES_NODE_VERSION=22.20.5

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      ca-certificates curl xz-utils \
      python3 \
      gcc g++ libc6-dev \
      openjdk-21-jdk-headless \
 && rm -rf /var/lib/apt/lists/*

# Node.js 22 LTS, verified against the release's SHASUMS256.
RUN set -eux; \
    file="node-v${NODE_VERSION}-linux-x64.tar.xz"; \
    curl -fsSLO "https://nodejs.org/dist/v${NODE_VERSION}/${file}"; \
    curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/SHASUMS256.txt" | grep " ${file}\$" | sha256sum -c -; \
    tar -xJf "$file" -C /usr/local --strip-components=1 --no-same-owner; \
    rm "$file"; \
    npm install -g "typescript@${TYPESCRIPT_VERSION}" "@types/node@${TYPES_NODE_VERSION}"; \
    npm cache clean --force

# Rust stable, installed system-wide so the sandbox user can read it.
ENV RUSTUP_HOME=/usr/local/rustup CARGO_HOME=/usr/local/cargo
RUN set -eux; \
    curl -fsSL https://sh.rustup.rs | sh -s -- -y --profile minimal --default-toolchain stable --no-modify-path; \
    ln -s "$(/usr/local/cargo/bin/rustc --print sysroot)/bin/rustc" /usr/local/bin/rustc; \
    chmod -R a+rX /usr/local/rustup

RUN set -eux; \
    curl -fsSL -o /usr/local/bin/go-judge \
      "https://github.com/criyle/go-judge/releases/download/v${GO_JUDGE_VERSION}/go-judge_${GO_JUDGE_VERSION}_linux_amd64"; \
    echo "${GO_JUDGE_SHA256}  /usr/local/bin/go-judge" | sha256sum -c -; \
    chmod +x /usr/local/bin/go-judge

COPY mount.yaml /etc/go-judge/mount.yaml

EXPOSE 5050
# The auth token comes from GO_JUDGE_AUTH_TOKEN (docker-compose.yml).
CMD ["sh", "-c", "exec go-judge -http-addr 0.0.0.0:5050 -auth-token \"$GO_JUDGE_AUTH_TOKEN\" -mount-conf /etc/go-judge/mount.yaml -release"]
