import { describe, expect, it } from "vitest";
import { explainError } from "./explain";

const tb = (line: number, err: string) =>
  `Traceback (most recent call last):\n  File "/box/script.py", line ${line}, in <module>\n${err}\n`;

describe("explainError", () => {
  it.each([
    ['TypeError: can only concatenate str (not "int") to str', "str-int-concat"],
    ["TypeError: unsupported operand type(s) for +: 'int' and 'str'", "str-int-concat"],
    ["TypeError: '>' not supported between instances of 'str' and 'int'", "str-int-compare"],
    ["ValueError: invalid literal for int() with base 10: 'kolme'", "int-invalid-literal"],
    ["ValueError: could not convert string to float: '3,5'", "float-invalid"],
    ["NameError: name 'nimi' is not defined", "name-error"],
    ["EOFError: EOF when reading a line", "eof"],
    ["ZeroDivisionError: division by zero", "zero-division"],
    ["IndexError: list index out of range", "index-error"],
    ["KeyError: 'banaani'", "key-error"],
    ["AttributeError: 'int' object has no attribute 'upper'", "attribute-error"],
    ["IndentationError: expected an indented block after 'if' statement on line 2", "indentation"],
    ["SyntaxError: expected ':'", "syntax-colon"],
    ["SyntaxError: '(' was never closed", "syntax-unclosed"],
    ["SyntaxError: unterminated string literal (detected at line 1)", "syntax-unclosed"],
    ["SyntaxError: invalid syntax", "syntax-generic"],
  ])("%s -> %s", (err, id) => {
    expect(explainError(tb(3, err))?.id).toBe(id);
  });

  it("fills in the offending value and the line number", () => {
    const e = explainError(tb(4, "ValueError: invalid literal for int() with base 10: 'kolme'"));
    expect(e?.text).toContain("'kolme'");
    expect(e?.line).toBe(4);
  });

  it("uses the innermost frame for the line", () => {
    const stderr =
      'Traceback (most recent call last):\n  File "/box/script.py", line 9, in <module>\n    main()\n' +
      '  File "/box/script.py", line 2, in main\n    print(x)\nNameError: name \'x\' is not defined\n';
    expect(explainError(stderr)?.line).toBe(2);
  });

  it("returns null for unknown errors, empty input and other languages", () => {
    expect(explainError(tb(1, "RecursionError: maximum recursion depth exceeded"))).toBeNull();
    expect(explainError("")).toBeNull();
    expect(explainError(tb(1, "ZeroDivisionError"), "java")).toBeNull();
  });
});
