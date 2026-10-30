import { describe, expect, it } from "vitest";
import { collectConcepts } from "./collect";

const exercises = [
  { id: "01-tervehdys", title: "Tervehdys", concepts: ["print", "input"] },
  { id: "02-lukujen-summa", title: "Lukujen summa", concepts: ["tyyppimuunnos", "while", "print"] },
  { id: "03-x", title: "X", concepts: ["for"] },
];
const d = (s: string) => new Date(`2026-10-${s}T10:00:00Z`);

describe("collectConcepts", () => {
  it("collects concepts of attempted exercises in the order they were first met", () => {
    const result = collectConcepts(
      [
        { exerciseId: "02-lukujen-summa", firstSubmittedAt: d("02"), passed: false },
        { exerciseId: "01-tervehdys", firstSubmittedAt: d("01"), passed: true },
      ],
      exercises,
    );
    expect(result.map((c) => c.conceptId)).toEqual(["print", "input", "tyyppimuunnos", "while"]);
  });

  it("credits a shared concept to the exercise where it was first met", () => {
    const result = collectConcepts(
      [
        { exerciseId: "01-tervehdys", firstSubmittedAt: d("01"), passed: false },
        { exerciseId: "02-lukujen-summa", firstSubmittedAt: d("02"), passed: true },
      ],
      exercises,
    );
    const print = result.find((c) => c.conceptId === "print");
    expect(print?.learnedIn.exerciseId).toBe("01-tervehdys");
    expect(print?.passed).toBe(true);
  });

  it("ignores exercises never submitted and unknown exercises", () => {
    const result = collectConcepts([{ exerciseId: "missing", firstSubmittedAt: d("01"), passed: true }], exercises);
    expect(result).toEqual([]);
  });
});
