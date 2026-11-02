/**
 * What an exercise level means for the student (#93, docs/product/oppimispolku.md). Shown in
 * words instead of a 1-5 scale: the word says what the exercise is for, a number only invites
 * comparing yourself and avoiding "hard" ones. The numeric difficulty stays internal.
 */
export type Level = "perus" | "soveltava" | "haaste";

export const LEVELS: Record<Level, { label: string; meaning: string }> = {
  perus: { label: "Perus", meaning: "kurssin ydintaidot, jokaiselle" },
  soveltava: { label: "Soveltava", meaning: "yhdistelee opittua uudella tavalla" },
  haaste: { label: "Haaste", meaning: "vapaaehtoinen syventävä tehtävä" },
};
