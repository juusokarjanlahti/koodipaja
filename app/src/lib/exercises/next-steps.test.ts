import { describe, expect, it } from "vitest";
import { dependsOn, introducedIn, nextSteps, type ExerciseState, type PathExercise } from "./next-steps";

// A slice of the Python course (exercises/python, concepts and requires as in the repo).
const course: PathExercise[] = [
  { id: "01", title: "Tervehdys", concepts: ["print", "input", "f-merkkijono"], requires: [] },
  { id: "02", title: "Lukujen summa", concepts: ["tyyppimuunnos", "while", "if"], requires: ["print", "input", "f-merkkijono"] },
  { id: "03", title: "Kahden luvun summa", concepts: ["input", "tyyppimuunnos", "print"], requires: ["f-merkkijono"] },
  { id: "08", title: "Kertotaulu", concepts: ["for"], requires: ["print", "input", "tyyppimuunnos", "f-merkkijono"] },
  { id: "12", title: "Sanan kirjaimet", concepts: ["merkkijono"], requires: ["print", "input", "f-merkkijono"] },
  { id: "14", title: "Tähtikolmio", concepts: ["for"], requires: ["print", "input", "tyyppimuunnos"] },
];
const states = (entries: [string, ExerciseState][]) => new Map(entries);

describe("dependencies", () => {
  const introduced = introducedIn(course);
  it("come from the exercise that first teaches a concept", () => {
    expect(introduced.get("tyyppimuunnos")).toBe("02");
    expect(introduced.get("for")).toBe("08");
    expect(dependsOn(course[3], course[1], introduced)).toBe(true); // 08 needs int() from 02
    expect(dependsOn(course[4], course[1], introduced)).toBe(false); // 12 does not
    expect(dependsOn(course[5], course[3], introduced)).toBe(true); // 14 needs for from 08
  });
});

describe("nextSteps", () => {
  it("offers the next unsolved exercise once this one is solved", () => {
    const s = nextSteps(course, states([["01", "ratkaistu"], ["02", "ratkaistu"], ["03", "ratkaistu"]]), "02", 0);
    expect(s.next).toEqual({ id: "08", title: "Kertotaulu" });
    expect(s.skipTo).toBeNull();
    expect(s.review).toBeNull();
  });

  it("when stuck, skips to the first later exercise that does not need this one", () => {
    const s = nextSteps(course, states([["01", "ratkaistu"], ["02", "yritetty"]]), "02", 3);
    expect(s.skipTo).toEqual({ id: "12", title: "Sanan kirjaimet" });
    expect(s.review).toEqual({ id: "01", title: "Tervehdys", concepts: ["print", "input", "f-merkkijono"] });
  });

  it("is not stuck before a few failed submissions", () => {
    const s = nextSteps(course, states([["02", "yritetty"]]), "02", 2);
    expect(s.skipTo).toBeNull();
    expect(s.review).toBeNull();
  });

  it("after skipping, points back to the unfinished exercise, solved or stuck here", () => {
    const solvedHere = nextSteps(course, states([["01", "ratkaistu"], ["02", "yritetty"], ["12", "ratkaistu"]]), "12", 0);
    expect(solvedHere.comeBack).toEqual({ id: "02", title: "Lukujen summa" });

    const stuckHere = nextSteps(course, states([["01", "ratkaistu"], ["02", "yritetty"], ["12", "yritetty"]]), "12", 4);
    expect(stuckHere.comeBack).toEqual({ id: "02", title: "Lukujen summa" });
    // Review something solved that this exercise builds on, not the unfinished one.
    expect(stuckHere.review).toEqual({ id: "01", title: "Tervehdys", concepts: ["print", "input", "f-merkkijono"] });
  });

  it("wraps to an earlier unsolved exercise when every later one is solved", () => {
    const s = nextSteps(course, states([["01", "ratkaistu"], ["08", "ratkaistu"], ["12", "ratkaistu"], ["14", "ratkaistu"]]), "14", 0);
    expect(s.next).toEqual({ id: "02", title: "Lukujen summa" });
  });

  it("has nothing to skip to when everything later builds on this exercise", () => {
    const s = nextSteps(course, states([["01", "yritetty"]]), "01", 5);
    expect(s.skipTo).toBeNull();
    expect(s.review).toBeNull();
  });
});
