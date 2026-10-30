export const LANGUAGE_LABELS: Record<string, string> = {
  python: "Python",
  javascript: "JavaScript",
  typescript: "TypeScript",
  c: "C",
  cpp: "C++",
  java: "Java",
  rust: "Rust",
};

// Python is the pilot course; other languages follow as examples of the same exercise.
export const LANGUAGE_ORDER = ["python", "javascript", "typescript", "java", "c", "cpp", "rust"];

export function languageRank(language: string): number {
  const i = LANGUAGE_ORDER.indexOf(language);
  return i === -1 ? LANGUAGE_ORDER.length : i;
}
