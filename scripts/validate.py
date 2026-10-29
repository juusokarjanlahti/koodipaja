#!/usr/bin/env python3
"""Validate exercises in the Koodipaja exercise library.

For every exercise folder this checks that:
  * exercise.yaml is well-formed and its id matches the folder name
  * there are at least 3 test cases and at least 2 wrong solutions
  * the reference solution matches every case EXACTLY
  * every wrong/ solution fails at least one case (under the exercise's output_match mode)
  * every accepted/ solution passes every case (under the exercise's output_match mode)

Output comparison follows docs/adr/0003-joustava-tulosteen-vertailu.md and MUST stay
identical to app/src/lib/grading/normalise.ts. Shared vectors live in
scripts/output-match-cases.json and are checked with --self-test.

Usage:
    python3 scripts/validate.py                  # self-test + all exercises
    python3 scripts/validate.py <exercise-dir>   # one or more exercises
    python3 scripts/validate.py --self-test      # comparison rules only
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
import unicodedata
from dataclasses import dataclass
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
EXERCISES = ROOT / "exercises"
MATCH_CASES = Path(__file__).resolve().parent / "output-match-cases.json"

RUNNERS = {
    "python": {"ext": ".py", "cmd": [sys.executable, "-I"]},
}

REQUIRED_FIELDS = {"id", "title", "language", "difficulty", "cases"}
OUTPUT_MATCH_MODES = {"lenient", "exact"}
MIN_CASES = 3
MIN_WRONG = 2

# A number may carry a minus sign only when not preceded by a letter, digit or dot,
# so "Summa: -4" gives -4 but "5-3" gives 5 and 3. Words are runs of letters.
TOKEN_RE = re.compile(r"(?<![^\W_])(?<!\.)-?[0-9]+(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?|[^\W\d_]+")


# --- Output comparison (keep in sync with normalise.ts) ---------------------------

def normalise(text: str) -> str:
    lines = [line.rstrip() for line in text.replace("\r\n", "\n").split("\n")]
    return "\n".join(lines).rstrip("\n")


def lenient_tokens(text: str) -> list[str]:
    return TOKEN_RE.findall(unicodedata.normalize("NFC", text).lower())


def compare(actual: str, expected: str, mode: str = "lenient") -> str:
    """Return "exact", "lenient" or "fail"."""
    if normalise(actual) == normalise(expected):
        return "exact"
    if mode == "lenient" and lenient_tokens(actual) == lenient_tokens(expected):
        return "lenient"
    return "fail"


def self_test() -> list[str]:
    errors = []
    for case in json.loads(MATCH_CASES.read_text(encoding="utf-8")):
        got = compare(case["actual"], case["expected"], "lenient")
        if got != case["result"]:
            errors.append(f"output-match '{case['note']}': expected {case['result']}, got {got}")
        if case["result"] != "exact" and compare(case["actual"], case["expected"], "exact") != "fail":
            errors.append(f"output-match '{case['note']}': exact mode should fail")
    return errors


# --- Running solutions ----------------------------------------------------------------

@dataclass
class CaseResult:
    name: str
    outcome: str  # "exact", "lenient", "fail"
    detail: str = ""


def run_case(cmd: list[str], source: Path, case: dict, timeout: float, mode: str) -> CaseResult:
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
        return CaseResult(name, "fail", "timeout")
    if proc.returncode != 0:
        last = (proc.stderr.strip().splitlines() or ["(no stderr)"])[-1]
        return CaseResult(name, "fail", f"exit {proc.returncode}: {last}")
    expected = case.get("expected_stdout", "")
    outcome = compare(proc.stdout, expected, mode)
    detail = "" if outcome != "fail" else f"expected {normalise(expected)!r}, got {normalise(proc.stdout)!r}"
    return CaseResult(name, outcome, detail)


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

    mode = meta.get("output_match", "lenient")
    if mode not in OUTPUT_MATCH_MODES:
        return errors + [f"{meta_path}: output_match must be one of {sorted(OUTPUT_MATCH_MODES)}"]

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

    def run_all(source: Path, run_mode: str) -> list[CaseResult]:
        return [run_case(runner["cmd"], source, c, timeout, run_mode) for c in cases]

    solution = folder / f"solution{runner['ext']}"
    if not solution.exists():
        errors.append(f"{folder}: missing {solution.name}")
    else:
        # The reference solution defines the expected output, so it must match exactly.
        for result in run_all(solution, "exact"):
            if result.outcome != "exact":
                errors.append(f"{solution}: does not match case '{result.name}' exactly: {result.detail}")

    wrong = sorted((folder / "wrong").glob(f"*{runner['ext']}"))
    if len(wrong) < MIN_WRONG:
        errors.append(f"{folder}: needs at least {MIN_WRONG} wrong solutions, has {len(wrong)}")
    for source in wrong:
        if all(r.outcome != "fail" for r in run_all(source, mode)):
            errors.append(
                f"{source}: wrong solution passes every case "
                f"(tests too weak, or it is only a formatting difference: move it to accepted/)"
            )

    for source in sorted((folder / "accepted").glob(f"*{runner['ext']}")):
        for result in run_all(source, mode):
            if result.outcome == "fail":
                errors.append(f"{source}: should be accepted but fails case '{result.name}': {result.detail}")

    return errors


def main(argv: list[str]) -> int:
    rule_errors = self_test()
    if rule_errors:
        print("FAIL  output comparison self-test")
        for err in rule_errors:
            print(f"      - {err}")
        return 1
    print("ok    output comparison self-test")
    if argv == ["--self-test"]:
        return 0

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
