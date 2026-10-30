import { describe, expect, it } from "vitest";
import { buildProgress, cellLabel, percent } from "./progress";

const students = [
  { id: "b", name: "Bertta" },
  { id: "a", name: "Aino" },
  { id: "o", name: "Östen" },
];
const exercises = [
  { id: "01", title: "Tervehdys", language: "python" },
  { id: "02", title: "Summa", language: "python" },
];

describe("buildProgress", () => {
  const rows = [
    { userId: "b", exerciseId: "01", solved: true, attempts: 2 },
    { userId: "b", exerciseId: "02", solved: true, attempts: 1 },
    { userId: "a", exerciseId: "01", solved: false, attempts: 3 },
  ];

  it("gives every student a cell per exercise and counts solve rates", () => {
    const p = buildProgress(students, exercises, rows);
    expect(p.students.map((s) => s.name)).toEqual(["Aino", "Bertta", "Östen"]);
    expect(p.students[0].cells).toEqual([
      { state: "yritetty", attempts: 3 },
      { state: "ei-aloitettu", attempts: 0 },
    ]);
    expect(p.students[1].solvedCount).toBe(2);
    expect(p.exercises.map((e) => [e.solvedCount, e.solveRate])).toEqual([
      [1, 1 / 3],
      [1, 1 / 3],
    ]);
  });

  it("sorts the students falling behind first, then by name", () => {
    const p = buildProgress(students, exercises, rows, "ratkaistu");
    expect(p.students.map((s) => s.name)).toEqual(["Aino", "Östen", "Bertta"]);
  });

  it("handles a course without students", () => {
    expect(buildProgress([], exercises, []).exercises[0].solveRate).toBeNull();
  });
});

describe("labels", () => {
  it("say the state in words, not only colour", () => {
    expect(cellLabel({ state: "ratkaistu", attempts: 4 })).toBe("Ratkaistu");
    expect(cellLabel({ state: "yritetty", attempts: 3 })).toBe("Yritetty (3)");
    expect(cellLabel({ state: "ei-aloitettu", attempts: 0 })).toBe("Ei aloitettu");
    expect(percent(1 / 3)).toBe("33 %");
    expect(percent(null)).toBe("–");
  });
});
