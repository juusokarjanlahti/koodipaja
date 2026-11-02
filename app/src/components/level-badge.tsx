import { LEVELS, type Level } from "@/lib/exercises/levels";

// The level word carries the meaning; the style only helps scanning (WCAG 1.4.1).
const LEVEL_STYLE: Record<Level, string> = {
  perus: "border border-field text-text",
  soveltava: "border-2 border-text text-text",
  haaste: "bg-action text-action-text",
};

export function LevelBadge({ level, as: Tag = "span" }: { level: Level; as?: "span" | "dt" }) {
  return <Tag className={`w-fit px-1.5 text-xs font-bold ${LEVEL_STYLE[level]}`}>{LEVELS[level].label}</Tag>;
}
