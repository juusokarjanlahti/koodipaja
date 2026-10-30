#!/usr/bin/env python3
"""Export Koodipaja exercises as Moodle CodeRunner questions (Moodle XML).

Teachers can import the file into a Moodle question bank (Question bank > Import > Moodle
XML) and use the open exercise library inside CodeRunner, without Koodipaja itself.

    python3 scripts/export_coderunner.py                       # all exportable exercises
    python3 scripts/export_coderunner.py --language python -o koodipaja-python.xml
    python3 scripts/export_coderunner.py --answers answers.json # also write test answers

Mapping:
  * Assignment README (Markdown)  -> question text (Markdown format)
  * starter code                  -> answer preload, solution -> sample answer
  * visible / hidden test cases   -> SHOW / HIDE test cases; the first visible is the example
  * output_match: exact           -> CodeRunner EqualityGrader
  * output_match: lenient, Python -> a template grader implementing the same word-and-number
                                     comparison as the platform (ADR 0003)
  * output_match: lenient, others -> NearEqualityGrader (ignores case and extra spaces, but
                                     not punctuation or line breaks: a documented difference)

Languages without a standard Jobe language (TypeScript, Rust) are skipped.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from xml.sax.saxutils import escape

import yaml

ROOT = Path(__file__).resolve().parent.parent
EXERCISES = ROOT / "exercises"
LANGUAGES = {name: spec for name, spec in json.loads((ROOT / "infra" / "languages.json").read_text()).items() if not name.startswith("$")}

# Koodipaja language -> CodeRunner built-in question type.
CODERUNNER_TYPES = {
    "python": "python3",
    "c": "c_program",
    "cpp": "cpp_program",
    "java": "java_program",
    "javascript": "nodejs",
}
CATEGORY = "$course$/top/Koodipaja"

# Per-test template grader for lenient Python questions (ADR 0003). Runs the student's
# program with the test's stdin and compares only words (case-insensitive) and numbers.
# The comparison MUST stay identical to scripts/validate.py; the token regex is the same.
LENIENT_PYTHON_TEMPLATE = r'''import json, re, subprocess, sys, unicodedata

student_answer = """{{ STUDENT_ANSWER | e('py') }}"""
# The exact stdin travels JSON-encoded in the test's "extra" field, because trailing
# blank lines in the plain stdin field do not survive import (they can be meaningful).
test_stdin = json.loads("""{{ TEST.extra | e('py') }}""" or "null")
if test_stdin is None:
    test_stdin = json.loads("""{{ TEST.stdin | json_encode | e('py') }}""")
expected = json.loads("""{{ TEST.expected | json_encode | e('py') }}""")

TOKEN_RE = re.compile(r"(?<![^\W_])(?<!\.)-?[0-9]+(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?|[^\W\d_]+")

def normalise(text):
    lines = [line.rstrip() for line in text.replace("\r\n", "\n").split("\n")]
    return "\n".join(lines).rstrip("\n")

def tokens(text):
    return TOKEN_RE.findall(unicodedata.normalize("NFC", text).lower())

with open("prog.py", "w", encoding="utf-8") as f:
    f.write(student_answer)
try:
    result = subprocess.run([sys.executable, "prog.py"], input=test_stdin, capture_output=True,
                            text=True, timeout={{ QUESTION.cputimelimitsecs | default(3) }})
    got = result.stdout
    error = result.stderr if result.returncode != 0 else ""
except subprocess.TimeoutExpired:
    got, error = "", "Aikaraja ylittyi: ohjelma ei päättynyt ajoissa."

if error:
    fraction, note = 0.0, "\n" + error
elif normalise(got) == normalise(expected):
    fraction, note = 1.0, ""
elif tokens(got) == tokens(expected):
    fraction, note = 1.0, "\n(Läpi pienellä muotoilueroilla: välimerkit, kirjainkoko tai rivitys.)"
else:
    fraction, note = 0.0, ""
print(json.dumps({"fraction": fraction, "got": got + note}))
'''


def cdata(text: str) -> str:
    return "<![CDATA[" + text.replace("]]>", "]]]]><![CDATA[>") + "]]>"


def text_el(tag: str, value: str, fmt: str | None = None, raw: bool = False) -> str:
    attr = f' format="{fmt}"' if fmt else ""
    body = cdata(value) if not raw and value else escape(value)
    return f"<{tag}{attr}><text>{body}</text></{tag}>"


def testcase_xml(case: dict, example: bool, exact_stdin_in_extra: bool) -> str:
    display = "HIDE" if case.get("hidden") else "SHOW"
    extra = json.dumps(case.get("stdin", ""), ensure_ascii=False) if exact_stdin_in_extra else ""
    return (
        f'<testcase testtype="0" useasexample="{1 if example else 0}" hiderestiffail="0" mark="1.0000000">'
        f"{text_el('testcode', '')}"
        f"{text_el('stdin', case.get('stdin', ''))}"
        f"{text_el('expected', case.get('expected_stdout', ''))}"
        f"{text_el('extra', extra)}"
        f"{text_el('display', display, raw=True)}"
        "</testcase>"
    )


def question_xml(folder: Path, meta: dict) -> str:
    lang = meta["language"]
    spec = LANGUAGES[lang]
    readme = (folder / "README.md").read_text(encoding="utf-8")
    starter = (folder / f"starter{spec['ext']}").read_text(encoding="utf-8")
    solution = (folder / f"solution{spec['ext']}").read_text(encoding="utf-8")
    mode = meta.get("output_match", "lenient")

    lenient_python = lang == "python" and mode == "lenient"
    if mode == "exact":
        grader, template = "EqualityGrader", ""
    elif lenient_python:
        grader, template = "TemplateGrader", LENIENT_PYTHON_TEMPLATE
    else:
        grader, template = "NearEqualityGrader", ""

    first_visible = next((i for i, c in enumerate(meta["cases"]) if not c.get("hidden")), 0)
    cases = "".join(testcase_xml(c, i == first_visible, lenient_python) for i, c in enumerate(meta["cases"]))
    licence = (
        "\n\n---\n*Koodipaja-tehtäväkirjasto, CC BY 4.0. "
        f"Lähde: https://github.com/juusokarjanlahti/koodipaja/tree/main/exercises/{lang}/{meta['id']}*"
    )
    fields = [
        text_el("name", f"{meta['id']} {meta['title']}", raw=True),
        text_el("questiontext", readme + licence, fmt="markdown"),
        text_el("generalfeedback", "", fmt="html"),
        "<defaultgrade>1.0000000</defaultgrade><penalty>0.0000000</penalty><hidden>0</hidden>",
        f"<idnumber>koodipaja-{escape(meta['id'])}</idnumber>",
        f"<coderunnertype>{CODERUNNER_TYPES[lang]}</coderunnertype>",
        "<prototypetype>0</prototypetype><allornothing>1</allornothing>",
        # Practice without penalties: attempts never lower the grade (visio.md, principle 1).
        "<penaltyregime>0</penaltyregime><precheck>1</precheck><showsource>0</showsource>",
        "<answerboxlines>18</answerboxlines><answerboxcolumns>100</answerboxcolumns>",
        f"<answerpreload>{cdata(starter)}</answerpreload>",
        "<globalextra></globalextra><useace>1</useace><resultcolumns></resultcolumns>",
        f"<template>{cdata(template) if template else ''}</template>",
        f"<iscombinatortemplate>{0 if template else ''}</iscombinatortemplate>",
        "<allowmultiplestdins></allowmultiplestdins>",
        f"<answer>{cdata(solution)}</answer>",
        "<validateonsave>1</validateonsave><testsplitterre></testsplitterre>",
        "<language></language><acelang></acelang><sandbox></sandbox>",
        f"<grader>{grader}</grader>",
        f"<cputimelimitsecs>{int(meta.get('time_limit_seconds', 2))}</cputimelimitsecs>",
        "<memlimitmb></memlimitmb><sandboxparams></sandboxparams><templateparams></templateparams>",
        "<hoisttemplateparams>1</hoisttemplateparams><extractcodefromjson>1</extractcodefromjson>",
        "<templateparamslang>None</templateparamslang><templateparamsevalpertry>0</templateparamsevalpertry>",
        "<templateparamsevald>{}</templateparamsevald><twigall>0</twigall><uiplugin></uiplugin>",
        "<uiparameters></uiparameters><attachments>0</attachments><attachmentsrequired>0</attachmentsrequired>",
        "<maxfilesize>10240</maxfilesize><filenamesregex></filenamesregex><filenamesexplain></filenamesexplain>",
        "<displayfeedback>1</displayfeedback><giveupallowed>0</giveupallowed><prototypeextra></prototypeextra>",
        f"<testcases>{cases}</testcases>",
    ]
    return '<question type="coderunner">' + "".join(fields) + "</question>"


def category_xml(path: str) -> str:
    return f'<question type="category"><category><text>{escape(path)}</text></category></question>'


def load_exercises(language: str | None):
    for meta_path in sorted(EXERCISES.glob("*/*/exercise.yaml")):
        meta = yaml.safe_load(meta_path.read_text(encoding="utf-8"))
        if language and meta["language"] != language:
            continue
        yield meta_path.parent, meta


def answers_for(folder: Path, meta: dict) -> dict:
    """Wrong and accepted solutions, for testing the exported questions in a real Moodle.

    accepted/ solutions are only expected to pass where the export keeps the platform's
    lenient comparison (Python). Elsewhere NearEqualityGrader is stricter about punctuation
    and line breaks; those are reported as known differences, not failures.
    """
    ext = LANGUAGES[meta["language"]]["ext"]
    read = lambda d: {p.name: p.read_text(encoding="utf-8") for p in sorted((folder / d).glob(f"*{ext}"))}
    keeps_lenient = meta["language"] == "python" or meta.get("output_match", "lenient") == "exact"
    accepted = read("accepted")
    return {
        "wrong": read("wrong"),
        "accepted": accepted if keeps_lenient else {},
        "known_differences": [] if keeps_lenient else sorted(accepted),
    }


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--language", help="only this language (e.g. python)")
    parser.add_argument("-o", "--output", default="-", help="output file (default: stdout)")
    parser.add_argument("--answers", help="also write wrong/accepted solutions as JSON, keyed by question idnumber")
    args = parser.parse_args(argv)

    by_language: dict[str, list[str]] = {}
    answers: dict[str, dict] = {}
    skipped = []
    for folder, meta in load_exercises(args.language):
        if meta["language"] not in CODERUNNER_TYPES:
            skipped.append(meta["id"])
            continue
        by_language.setdefault(meta["language"], []).append(question_xml(folder, meta))
        answers[f"koodipaja-{meta['id']}"] = answers_for(folder, meta)

    parts = ['<?xml version="1.0" encoding="UTF-8"?>', "<quiz>"]
    for language, questions in by_language.items():
        parts.append(category_xml(f"{CATEGORY}/{language}"))
        parts.extend(questions)
    parts.append("</quiz>\n")
    xml = "\n".join(parts)

    if args.output == "-":
        sys.stdout.write(xml)
    else:
        Path(args.output).write_text(xml, encoding="utf-8")
    if args.answers:
        Path(args.answers).write_text(json.dumps(answers, ensure_ascii=False, indent=1), encoding="utf-8")

    count = sum(len(q) for q in by_language.values())
    print(f"exported {count} questions" + (f", skipped {len(skipped)} (no Jobe language): {', '.join(skipped)}" if skipped else ""), file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
