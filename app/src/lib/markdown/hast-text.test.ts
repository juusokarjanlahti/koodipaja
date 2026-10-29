import { describe, expect, it } from "vitest";
import { hastText } from "./hast-text";

describe("hastText", () => {
  it("joins nested text nodes", () => {
    const node = {
      type: "element" as const,
      tagName: "pre",
      properties: {},
      children: [
        {
          type: "element" as const,
          tagName: "code",
          properties: {},
          children: [{ type: "text" as const, value: "Mikä on nimesi?\nAino\n" }],
        },
      ],
    };
    expect(hastText(node)).toBe("Mikä on nimesi?\nAino\n");
  });

  it("returns an empty string for missing nodes", () => {
    expect(hastText(undefined)).toBe("");
  });
});
