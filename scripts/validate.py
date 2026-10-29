#!/usr/bin/env python3
"""Validate exercises in the Koodipaja exercise library.

For every exercise folder this checks that:
  * exercise.yaml is well-formed and its id matches the folder name
  * there are at least 3 test cases and at least 2 wrong solutions
  * the reference solution passes every case
  * every wrong solution fails at least one case

Output is compared with the same normalisation the app uses: trailing whitespace
on each line and trailing newlines are ignored.

Usage:
    python3 scripts/validate.py                  # all exercises
    python3 scripts/validate.py <exercise-dir>   # one or more exercises
"""

from __future__ import annotations

import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
EXERCISES = ROOT / "exercises"

RUNNERS = {
    "python": {"ext": ".py", "cmd": [sys.executable, "-I"]},
}

REQUIRED_FIELDS = {"id", "title", "language", "difficulty", "cases"}
MIN_CASES = 3
MIN_WRONG = 2


@dataclass
class CaseResult:
    name: str
    passed: bool
    detail: str = ""


def normalise(text: str) -> str:
    lines = [line.rstrip() for line in text.replace("\r\n", "\n").split("\n")]
    return "\n".join(lines).rstrip("\n")


def run_case(cmd: list[str], source: Path, case: dict, timeout: float) -> CaseResult:
    name = case.get("name", "?")
    try:
        proc = subprocess.run(
            [*cmd, str(source)],
            input=case.get("stdin", ""),
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=source.parent,
        )
    except subprocess.TimeoutExpired:
        return CaseResult(name, False, "timeout")
    if proc.returncode != 0:
        last = (proc.stderr.strip().splitlines() or ["(no stderr)"])[-1]
        return CaseResult(name, False, f"exit {proc.returncode}: {last}")
    expected = normalise(case.get("expected_stdout", ""))
    actual = normalise(proc.stdout)
    if actual != expected:
        return CaseResult(name, False, f"expected {expected!r}, got {actual!r}")
    return CaseResult(name, True)


def validate(folder: Path) -> list[str]:
    errors: list[str] = []
    meta_path = folder / "exercise.yaml"
    if not meta_path.exists():
        return [f"{folder}: missing exercise.yaml"]

    try:
        meta = yaml.safe_load(meta_path.read_text(encoding="utf-8"))
    except yaml.YAMLError as exc:
        return [f"{meta_path}: invalid YAML: {exc}"]

    missing = REQUIRED_FIELDS - set(meta or {})
    if missing:
        return [f"{meta_path}: missing fields {sorted(missing)}"]

    if meta["id"] != folder.name:
        errors.append(f"{meta_path}: id {meta['id']!r} != folder name {folder.name!r}")

    runner = RUNNERS.get(meta["language"])
    if runner is None:
        return errors + [f"{meta_path}: unsupported language {meta['language']!r}"]

    cases = meta["cases"] or []
    if len(cases) < MIN_CASES:
        errors.append(f"{meta_path}: needs at least {MIN_CASES} cases, has {len(cases)}")

    for required in ("README.md", f"starter{runner['ext']}"):
        if not (folder / required).exists():
            errors.append(f"{folder}: missing {required}")

    timeout = float(meta.get("time_limit_seconds", 2))
    solution = folder / f"solution{runner['ext']}"
    if not solution.exists():
        errors.append(f"{folder}: missing {solution.name}")
    else:
        for result in (run_case(runner["cmd"], solution, c, timeout) for c in cases):
            if not result.passed:
                errors.append(f"{solution}: fails case '{result.name}': {result.detail}")

    wrong = sorted((folder / "wrong").glob(f"*{runner['ext']}"))
    if len(wrong) < MIN_WRONG:
        errors.append(f"{folder}: needs at least {MIN_WRONG} wrong solutions, has {len(wrong)}")
    for source in wrong:
        results = [run_case(runner["cmd"], source, c, timeout) for c in cases]
        if all(r.passed for r in results):
            errors.append(f"{source}: wrong solution passes every case (tests too weak)")

    return errors


def main(argv: list[str]) -> int:
    if argv:
        folders = [Path(arg).resolve() for arg in argv]
    else:
        folders = sorted(p.parent for p in EXERCISES.glob("*/*/exercise.yaml"))

    if not folders:
        print("No exercises found.")
        return 1

    failed = 0
    for folder in folders:
        errors = validate(folder)
        label = folder.relative_to(ROOT) if folder.is_relative_to(ROOT) else folder
        if errors:
            failed += 1
            print(f"FAIL  {label}")
            for err in errors:
                print(f"      - {err}")
        else:
            print(f"ok    {label}")

    print(f"\n{len(folders) - failed}/{len(folders)} exercises valid")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
