# DRAFT, NOT YET TESTED (see docs/adr/0005-kielet-ja-kaantajaversiot.md).
#
# Judge0 1.13.1 with current language versions. Build and use instead of the stock image
# for judge0-server and judge0-workers in docker-compose.yml, then load languages.sql.
#
#   docker build -t koodipaja/judge0:1.13.1-langs infra/judge0-languages
#
# Versions are pinned so builds are reproducible; bump them deliberately.
FROM judge0/judge0:1.13.1

ARG PYTHON_VERSION=3.13.1
ARG NODE_VERSION=22.12.0
ARG TYPESCRIPT_VERSION=5.7.2
ARG TYPES_NODE_VERSION=22.10.2
ARG JDK_URL=https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.5%2B11/OpenJDK21U-jdk_x64_linux_hotspot_21.0.5_11.tar.gz
ARG RUST_VERSION=1.83.0

USER root

# Python, built from source into its own prefix like Judge0's stock languages.
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends build-essential libssl-dev zlib1g-dev libffi-dev \
      libbz2-dev libreadline-dev libsqlite3-dev xz-utils curl ca-certificates; \
    curl -fsSL "https://www.python.org/ftp/python/${PYTHON_VERSION}/Python-${PYTHON_VERSION}.tar.xz" -o /tmp/py.tar.xz; \
    mkdir /tmp/py && tar -xf /tmp/py.tar.xz -C /tmp/py --strip-components=1; \
    cd /tmp/py && ./configure --prefix=/usr/local/python-${PYTHON_VERSION} && make -j"$(nproc)" && make install; \
    rm -rf /tmp/py /tmp/py.tar.xz

# Node.js with TypeScript and Node type definitions installed globally under its prefix.
RUN set -eux; \
    curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" -o /tmp/node.tar.xz; \
    mkdir -p /usr/local/node-${NODE_VERSION} && tar -xf /tmp/node.tar.xz -C /usr/local/node-${NODE_VERSION} --strip-components=1; \
    rm /tmp/node.tar.xz; \
    PATH=/usr/local/node-${NODE_VERSION}/bin:$PATH npm install -g typescript@${TYPESCRIPT_VERSION} @types/node@${TYPES_NODE_VERSION}

# OpenJDK 21 LTS (Temurin).
RUN set -eux; \
    curl -fsSL "${JDK_URL}" -o /tmp/jdk.tar.gz; \
    mkdir -p /usr/local/openjdk-21 && tar -xf /tmp/jdk.tar.gz -C /usr/local/openjdk-21 --strip-components=1; \
    rm /tmp/jdk.tar.gz

# Rust, installed system-wide so the isolate sandbox user can execute it.
RUN set -eux; \
    export RUSTUP_HOME=/usr/local/rustup CARGO_HOME=/usr/local/rust; \
    curl -fsSL https://sh.rustup.rs | sh -s -- -y --no-modify-path --profile minimal --default-toolchain ${RUST_VERSION}; \
    chmod -R a+rX /usr/local/rustup /usr/local/rust

USER judge0
