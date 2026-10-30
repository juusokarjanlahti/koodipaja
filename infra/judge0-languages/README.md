# Judge0 with current language versions (draft)

Judge0 CE 1.13.1, the latest release, ships compilers from 2020 (Python 3.8, Node.js 12,
TypeScript 3.7, OpenJDK 13, Rust 1.40). This folder builds a Judge0 image with current
versions. See `docs/adr/0005-kielet-ja-kaantajaversiot.md`.

**Status: draft, not yet built or tested.** This environment cannot pull from Docker Hub.

## Try it (on a machine with cgroup v1, see docs/local-dev.md)

```bash
docker build -t koodipaja/judge0:1.13.1-langs infra/judge0-languages
# In docker-compose.yml, use koodipaja/judge0:1.13.1-langs for judge0-server and judge0-workers
docker compose up -d
docker compose exec -T judge0-db psql -U judge0 -d judge0 < infra/judge0-languages/languages.sql
echo 'JUDGE0_LANGUAGE_IDS={"python":1001,"javascript":1002,"typescript":1003,"java":1006,"rust":1007}' >> .env
```

## Verify

1. `curl -H "X-Auth-Token: $JUDGE0_AUTH_TOKEN" localhost:2358/languages` lists ids 1001–1007.
2. Run the app's end-to-end check against real Judge0: start the app and worker, then
   `npm run smoke` in `app/`. Every language's reference solution must pass and every
   wrong solution must be caught.

Things most likely to need adjustment: whether the isolate sandbox can read the new
prefixes, Java's memory limit inside isolate, and the TypeScript compile time limit.
