import type { Element, ElementContent } from "hast";

/** Plain text of a hast node, e.g. the contents of a <pre><code> block. */
export function hastText(node: Element | ElementContent | undefined): string {
  if (!node) return "";
  if (node.type === "text") return node.value;
  if ("children" in node) return node.children.map(hastText).join("");
  return "";
}
