-- DRAFT, NOT YET TESTED (see docs/adr/0005-kielet-ja-kaantajaversiot.md).
-- Current language versions for Judge0 1.13.1, matching infra/judge0-languages/Dockerfile.
-- Load into Judge0's own database:
--   docker compose exec -T judge0-db psql -U judge0 -d judge0 < infra/judge0-languages/languages.sql
-- Then tell the app which ids to use (.env):
--   JUDGE0_LANGUAGE_IDS={"python":1001,"javascript":1002,"typescript":1003,"java":1006,"rust":1007}
-- C and C++ keep Judge0's stock GCC 9.2 (ids 50 and 54) for now.
--
-- Build and run commands mirror scripts/validate.py and app/scripts/fake-judge0.mjs.
-- In compile_cmd, %s is replaced by Judge0 with optional compiler options.

INSERT INTO languages (id, name, compile_cmd, run_cmd, source_file, is_archived) VALUES
  (1001, 'Python (3.13.1)', NULL,
   '/usr/local/python-3.13.1/bin/python3 -I script.py', 'script.py', false),
  (1002, 'JavaScript (Node.js 22.12.0)', NULL,
   '/usr/local/node-22.12.0/bin/node script.js', 'script.js', false),
  (1003, 'TypeScript (5.7.2, Node.js 22.12.0)',
   '/usr/local/node-22.12.0/bin/node /usr/local/node-22.12.0/lib/node_modules/typescript/bin/tsc --target es2022 --module commonjs --strict --skipLibCheck --types node --typeRoots /usr/local/node-22.12.0/lib/node_modules/@types %s script.ts',
   '/usr/local/node-22.12.0/bin/node script.js', 'script.ts', false),
  (1006, 'Java (OpenJDK 21.0.5)',
   '/usr/local/openjdk-21/bin/javac -encoding UTF-8 %s Main.java',
   '/usr/local/openjdk-21/bin/java Main', 'Main.java', false),
  (1007, 'Rust (1.83.0)',
   '/usr/local/rust/bin/rustc -O --edition 2021 %s -o main main.rs',
   './main', 'main.rs', false)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, compile_cmd = EXCLUDED.compile_cmd, run_cmd = EXCLUDED.run_cmd,
  source_file = EXCLUDED.source_file, is_archived = EXCLUDED.is_archived;
