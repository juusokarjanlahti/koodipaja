import { describe, expect, it } from "vitest";
import { normaliseOutput, outputsMatch } from "./normalise";

describe("normaliseOutput", () => {
  it("ignores trailing newlines", () => {
    expect(normaliseOutput("Summa: 7\n\n")).toBe("Summa: 7");
  });

  it("ignores trailing spaces on each line", () => {
    expect(normaliseOutput("a  \nb\t\n")).toBe("a\nb");
  });

  it("treats CRLF like LF", () => {
    expect(normaliseOutput("a\r\nb\r\n")).toBe("a\nb");
  });

  it("keeps leading whitespace and inner blank lines", () => {
    expect(normaliseOutput("  a\n\nb")).toBe("  a\n\nb");
  });
});

describe("outputsMatch", () => {
  it("accepts output that differs only in trailing whitespace", () => {
    expect(outputsMatch("Hei, Aino!  \n", "Hei, Aino!")).toBe(true);
  });

  it("rejects a missing character", () => {
    expect(outputsMatch("Hei, Aino", "Hei, Aino!")).toBe(false);
  });

  it("rejects different leading whitespace", () => {
    expect(outputsMatch(" Summa: 7", "Summa: 7")).toBe(false);
  });
});
