import { describe, expect, it } from "vitest";
import {
  APPROVED_EXERCISE,
  DEMO_CODE,
  planDemoHistory,
  rng,
  SAME_ANSWER_EXERCISE,
  STUCK_EXERCISE,
  type PlanExercise,
} from "./history";

// The 15 Python exercises in course order, with two wrong answers each and a few accepted ones.
const exercises: PlanExercise[] = Array.from({ length: 15 }, (_, i) => {
  const id = [
    "01-tervehdys", "02-kahden-luvun-summa", "03-suurempi-luku", "04-lukujen-summa", STUCK_EXERCISE,
    "06-ikaryhma", APPROVED_EXERCISE, "08-kertotaulu", "09-lahtolaskenta", SAME_ANSWER_EXERCISE,
    "11-suurin-luku", "12-sanan-kirjaimet", "13-salasana", "14-tahtikolmio", "15-ostoslista",
  ][i];
  return { id, wrong: ["a.py", "b.py"], accepted: i % 3 === 0 ? ["ok.py"] : [] };
});
const plan = planDemoHistory(exercises);

/** For each student and exercise: the variants they sent, oldest first. */
function triesOf(student: number, exerciseId: string): string[] {
  return plan.submissions
    .filter((s) => s.student === student && s.exerciseId === exerciseId)
    .sort((a, b) => b.minutesAgo - a.minutesAgo)
    .map((s) => s.variant);
}
const passes = (variant: string) => variant === "solution" || variant.startsWith("accepted/");
function solved(student: number): string[] {
  return exercises.map((e) => e.id).filter((id) => triesOf(student, id).some(passes));
}

describe("planDemoHistory", () => {
  it("is deterministic", () => {
    expect(planDemoHistory(exercises)).toEqual(plan);
    expect(planDemoHistory([...exercises].reverse())).toEqual(plan);
  });

  it("has 25 clearly invented students and a teacher", () => {
    expect(plan.students).toHaveLength(25);
    expect(new Set(plan.students.map((s) => s.name)).size).toBe(25);
    expect(new Set(plan.students.map((s) => s.sub)).size).toBe(25);
    expect(plan.students.every((s) => s.sub.startsWith("seed-"))).toBe(true);
    expect(plan.teacher.sub).toBe("seed-opettaja");
  });

  it("spreads three weeks into the past and nothing into the future", () => {
    const minutes = plan.submissions.map((s) => s.minutesAgo);
    expect(Math.min(...minutes)).toBeGreaterThan(0);
    expect(Math.max(...minutes)).toBeLessThanOrEqual(22 * 24 * 60);
    expect(Math.max(...minutes)).toBeGreaterThan(19 * 24 * 60);
    for (const r of plan.helpRequests) {
      expect(r.minutesAgo).toBeGreaterThan(0);
      if (r.reply) expect(r.reply.minutesAgo).toBeLessThan(r.minutesAgo);
    }
  });

  it("has students ahead, in the middle, behind and not started", () => {
    const counts = plan.students.map((_, s) => solved(s).length);
    expect(counts.filter((n) => n === 15).length).toBeGreaterThanOrEqual(4);
    expect(counts.filter((n) => n >= 7 && n <= 12).length).toBeGreaterThanOrEqual(10);
    expect(counts.filter((n) => n >= 2 && n <= 3).length).toBeGreaterThanOrEqual(3);
    expect(plan.students.filter((_, s) => !plan.submissions.some((x) => x.student === s))).toHaveLength(2);
  });

  it("has three students stuck on the same exercise after many tries, two asking for help", () => {
    const stuck = plan.students
      .map((_, s) => s)
      .filter((s) => triesOf(s, STUCK_EXERCISE).length >= 4 && !triesOf(s, STUCK_EXERCISE).some(passes));
    expect(stuck).toHaveLength(3);
    const asks = plan.helpRequests.filter((r) => r.exerciseId === STUCK_EXERCISE && r.kind === "apu" && !r.reply);
    expect(asks.map((r) => r.student).every((s) => stuck.includes(s))).toBe(true);
    expect(asks).toHaveLength(2);
  });

  it("has 4-5 open 'my answer is right' requests on the same answer", () => {
    const group = plan.helpRequests.filter((r) => r.exerciseId === SAME_ANSWER_EXERCISE && r.kind === "kiista" && !r.reply);
    expect(group.length).toBeGreaterThanOrEqual(4);
    expect(group.length).toBeLessThanOrEqual(5);
    for (const r of group) expect(triesOf(r.student, SAME_ANSWER_EXERCISE).at(-1)).toBe("demo/same-answer");
    expect(DEMO_CODE["demo/same-answer"].exerciseId).toBe(SAME_ANSWER_EXERCISE);
  });

  it("has one earlier approval with a reason, answered on the student's request", () => {
    expect(plan.approvals).toHaveLength(1);
    const [approval] = plan.approvals;
    expect(approval.reason.length).toBeGreaterThan(10);
    expect(triesOf(approval.student, approval.exerciseId)).toContain(approval.variant);
    const request = plan.helpRequests.find((r) => r.student === approval.student && r.exerciseId === approval.exerciseId);
    expect(request?.reply?.text).toBe(approval.reason);
  });

  it("has an answered help request and a few failed grade transfers among students with submissions", () => {
    expect(plan.helpRequests.filter((r) => r.kind === "apu" && r.reply)).toHaveLength(1);
    expect(plan.failedGradeStudents.length).toBeGreaterThanOrEqual(2);
    for (const s of plan.failedGradeStudents) expect(plan.submissions.some((x) => x.student === s)).toBe(true);
  });

  it("refuses exercises it cannot tell its story with", () => {
    expect(() => planDemoHistory(exercises.filter((e) => e.id !== SAME_ANSWER_EXERCISE))).toThrow(/10-keskiarvo/);
  });
});

describe("rng", () => {
  it("repeats for the same seed and stays in [0, 1)", () => {
    const a = rng(1);
    const b = rng(1);
    const values = Array.from({ length: 100 }, () => a());
    expect(values).toEqual(Array.from({ length: 100 }, () => b()));
    expect(values.every((v) => v >= 0 && v < 1)).toBe(true);
  });
});
