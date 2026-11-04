/**
 * Fills the public demo course with three weeks of history (#127, docs/specs/demo-history.md).
 *
 *   DEMO_MODE=true npm run seed-demo
 *
 * EVERYTHING THIS WRITES IS INVENTED: the students, their names, their code and the teacher.
 * No real person's data is used. The code is the exercises' own model, wrong and accepted
 * answers plus two hand-written ones (lib/demo/history.ts), and every variant is run through
 * the real runner and grading, so the results always match the tests.
 *
 * Safe to run again: it first removes everything an earlier seed wrote (students and teacher
 * with a "seed-" id on the demo platform, the course's approvals), then writes it all anew.
 * Visitors' own demo users are left alone (the nightly reset is #129). Times are relative to
 * now, so a nightly run keeps the demo looking current.
 *
 * Refuses to run without DEMO_MODE=true or when the database knows a real LTI platform,
 * so it cannot be run against a production database by accident.
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { and, asc, eq, inArray, isNull, like } from "drizzle-orm";
import { closeDb, getDb, schema } from "../src/lib/db";
import { demoModeEnabled } from "../src/lib/demo/mode";
import { DEMO_CODE, planDemoHistory, type PlanExercise, type Variant } from "../src/lib/demo/history";
import { DEMO_ISSUER, ensureDemoCourse, isRealPlatform } from "../src/lib/demo/setup";
import { applyApproval, evaluateCase, type CaseOutcome } from "../src/lib/grading/evaluate";
import { WRONG_ANSWER } from "../src/lib/grading/status";
import { runnerFromEnv, type RunResult } from "../src/lib/runner";

const LANGUAGE = "python";
const exercisesRoot = path.resolve(process.cwd(), "../exercises", LANGUAGE);
const MINUTE_MS = 60_000;

async function listFiles(dir: string): Promise<string[]> {
  return (await readdir(dir).catch(() => [] as string[])).filter((f) => f.endsWith(".py")).sort();
}

async function variantCode(exerciseId: string, variant: Variant): Promise<string> {
  const demo = DEMO_CODE[variant];
  if (demo) {
    if (demo.exerciseId !== exerciseId) throw new Error(`${variant} belongs to ${demo.exerciseId}, not ${exerciseId}`);
    return demo.code;
  }
  const file = variant === "solution" ? "solution.py" : variant;
  return readFile(path.join(exercisesRoot, exerciseId, file), "utf8");
}

/** Runs async jobs a few at a time. */
async function inParallel<T, R>(items: T[], limit: number, job: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await job(items[i]);
      }
    }),
  );
  return results;
}

async function main() {
  const started = Date.now();
  if (!demoModeEnabled()) {
    console.error("seed-demo: refusing to run without DEMO_MODE=true (it writes invented demo data).");
    process.exit(1);
  }
  const db = getDb();
  const real = (await db.select({ issuer: schema.ltiPlatforms.issuer }).from(schema.ltiPlatforms)).filter((p) =>
    isRealPlatform(p.issuer),
  );
  if (real.length > 0) {
    console.error(
      `seed-demo: refusing to run: this database has real LTI platforms (${real.map((p) => p.issuer).join(", ")}).`,
    );
    process.exit(1);
  }

  // The course's exercises as the app knows them (imported), with their folders' variants.
  const rows = await db
    .select({ id: schema.exercises.id, outputMatch: schema.exercises.outputMatch, timeLimit: schema.exercises.timeLimitSeconds, memory: schema.exercises.memoryLimitMb })
    .from(schema.exercises)
    .where(and(eq(schema.exercises.language, LANGUAGE), isNull(schema.exercises.retiredAt)))
    .orderBy(asc(schema.exercises.id));
  if (rows.length === 0) throw new Error("No Python exercises in the database. Run npm run import-exercises first.");
  const planExercises: PlanExercise[] = await Promise.all(
    rows.map(async (ex) => ({
      id: ex.id,
      wrong: await listFiles(path.join(exercisesRoot, ex.id, "wrong")),
      accepted: await listFiles(path.join(exercisesRoot, ex.id, "accepted")),
    })),
  );
  const plan = planDemoHistory(planExercises);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const cases = new Map<string, (typeof schema.testCases.$inferSelect)[]>();
  for (const ex of rows) {
    cases.set(
      ex.id,
      await db.select().from(schema.testCases).where(eq(schema.testCases.exerciseId, ex.id)).orderBy(asc(schema.testCases.position)),
    );
  }

  // Every distinct (exercise, variant) runs once through the real runner.
  const run = runnerFromEnv();
  const distinct = [...new Set(plan.submissions.map((s) => `${s.exerciseId}\u0000${s.variant}`))];
  const runs = new Map<string, { testCaseId: number; position: number; result: RunResult; outcome: CaseOutcome }[]>();
  const jobs = distinct.flatMap((key) => {
    const [exerciseId] = key.split("\u0000");
    return cases.get(exerciseId)!.map((tc) => ({ key, tc }));
  });
  const codes = new Map<string, string>();
  for (const key of distinct) {
    const [exerciseId, variant] = key.split("\u0000");
    codes.set(key, await variantCode(exerciseId, variant));
  }
  const results = await inParallel(jobs, 4, async ({ key, tc }) => {
    const exercise = byId.get(tc.exerciseId)!;
    const result = await run({
      sourceCode: codes.get(key)!,
      language: LANGUAGE,
      stdin: tc.stdin,
      cpuTimeLimitSeconds: exercise.timeLimit,
      memoryLimitMb: exercise.memory,
    });
    return { key, tc, result, outcome: evaluateCase(result, tc.expectedStdout, exercise.outputMatch) };
  });
  for (const r of results) {
    const list = runs.get(r.key) ?? [];
    list.push({ testCaseId: r.tc.id, position: r.tc.position, result: r.result, outcome: r.outcome });
    runs.set(r.key, list);
  }
  for (const list of runs.values()) list.sort((a, b) => a.position - b.position);

  // The story only works if the variants grade as the plan assumes.
  for (const [key, list] of runs) {
    const [exerciseId, variant] = key.split("\u0000");
    const allPass = list.every((c) => c.outcome.passed);
    const shouldPass = variant === "solution" || variant.startsWith("accepted/");
    if (shouldPass !== allPass && !(variant in DEMO_CODE)) {
      throw new Error(`${exerciseId}/${variant} ${allPass ? "passed" : "failed"} in the runner; the plan expects the opposite.`);
    }
    if (variant in DEMO_CODE && (allPass || list.some((c) => !c.outcome.passed && c.outcome.judgeStatus !== WRONG_ANSWER))) {
      throw new Error(`${exerciseId}/${variant} must fail with wrong answers only (it is approved or grouped).`);
    }
  }

  const now = Date.now();
  const ago = (minutes: number) => new Date(now - minutes * MINUTE_MS);
  const courseId = await ensureDemoCourse();
  const [platform] = await db
    .select({ id: schema.ltiPlatforms.id })
    .from(schema.ltiPlatforms)
    .where(eq(schema.ltiPlatforms.issuer, DEMO_ISSUER));
  const links = await db
    .select({ id: schema.ltiResourceLinks.id, exerciseId: schema.ltiResourceLinks.exerciseId })
    .from(schema.ltiResourceLinks)
    .where(eq(schema.ltiResourceLinks.courseId, courseId));
  const linkOf = new Map(links.map((l) => [l.exerciseId, l.id]));

  await db.transaction(async (tx) => {
    // 1. Remove an earlier seed. Users cascade to their submissions, requests and grade rows.
    const old = await tx
      .select({ userId: schema.ltiIdentities.userId })
      .from(schema.ltiIdentities)
      .where(and(eq(schema.ltiIdentities.platformId, platform.id), like(schema.ltiIdentities.sub, "seed-%")));
    if (old.length > 0) await tx.delete(schema.users).where(inArray(schema.users.id, old.map((o) => o.userId)));
    await tx.delete(schema.approvalEvents).where(eq(schema.approvalEvents.courseId, courseId));
    await tx.delete(schema.approvedOutputs).where(eq(schema.approvedOutputs.courseId, courseId));

    // 2. The teacher and the students.
    const people = [{ ...plan.teacher, role: "teacher" as const }, ...plan.students.map((s) => ({ ...s, role: "student" as const }))];
    const created = await tx
      .insert(schema.users)
      .values(people.map((p) => ({ displayName: p.name, role: p.role, createdAt: ago(22 * 24 * 60) })))
      .returning({ id: schema.users.id });
    const userIds = created.map((u) => u.id);
    await tx.insert(schema.ltiIdentities).values(people.map((p, i) => ({ platformId: platform.id, sub: p.sub, userId: userIds[i] })));
    await tx.insert(schema.courseMemberships).values(
      people.map((p, i) => ({ courseId, userId: userIds[i], role: p.role, lastLaunchAt: ago(60 * (i + 1)) })),
    );
    const teacherId = userIds[0];
    const studentId = (s: number) => userIds[s + 1];

    // 3. Approvals first, so grading below applies them as the real re-evaluation would.
    const approved = new Map<string, Set<string>>(); // exerciseId -> approved hashes
    for (const a of plan.approvals) {
      const failing = runs.get(`${a.exerciseId}\u0000${a.variant}`)!.filter((c) => !c.outcome.passed);
      for (const c of failing) {
        await tx.insert(schema.approvedOutputs).values({
          courseId,
          exerciseId: a.exerciseId,
          casePosition: c.position,
          outputHash: c.outcome.outputHash!,
          outputSample: c.outcome.stdout,
          approvedBy: teacherId,
          reason: a.reason,
          createdAt: ago(a.minutesAgo),
        });
        approved.set(a.exerciseId, (approved.get(a.exerciseId) ?? new Set()).add(c.outcome.outputHash!));
      }
    }

    // 4. Submissions and their per-case results.
    const best = new Map<string, { passed: number; total: number; last: number }>(); // student/exercise
    const latestSubmission = new Map<string, { id: string; minutesAgo: number }[]>();
    const submissionRows = plan.submissions.map((s) => {
      const outcomes = runs
        .get(`${s.exerciseId}\u0000${s.variant}`)!
        .map((c) => ({ ...c, outcome: applyApproval(c.outcome, approved.get(s.exerciseId) ?? new Set()) }));
      return { plan: s, outcomes, passed: outcomes.filter((c) => c.outcome.passed).length };
    });
    const inserted = await tx
      .insert(schema.submissions)
      .values(
        submissionRows.map((r) => ({
          userId: studentId(r.plan.student),
          exerciseId: r.plan.exerciseId,
          sourceCode: codes.get(`${r.plan.exerciseId}\u0000${r.plan.variant}`)!,
          status: "done" as const,
          passedCount: r.passed,
          totalCount: r.outcomes.length,
          createdAt: ago(r.plan.minutesAgo),
          finishedAt: new Date(now - r.plan.minutesAgo * MINUTE_MS + 2_000),
        })),
      )
      .returning({ id: schema.submissions.id });
    const resultRows = submissionRows.flatMap((r, i) => {
      const key = `${r.plan.student}/${r.plan.exerciseId}`;
      const prev = best.get(key);
      best.set(key, {
        passed: Math.max(prev?.passed ?? 0, r.passed),
        total: r.outcomes.length,
        last: Math.min(prev?.last ?? Infinity, r.plan.minutesAgo),
      });
      latestSubmission.set(key, [...(latestSubmission.get(key) ?? []), { id: inserted[i].id, minutesAgo: r.plan.minutesAgo }]);
      return r.outcomes.map((c) => ({
        submissionId: inserted[i].id,
        testCaseId: c.testCaseId,
        passed: c.outcome.passed,
        judgeStatus: c.outcome.judgeStatus,
        stdout: c.outcome.stdout,
        stderr: c.outcome.stderr,
        timeMs: c.result.timeMs,
        memoryKb: c.result.memoryKb,
        outputHash: c.outcome.outputHash,
      }));
    });
    for (let i = 0; i < resultRows.length; i += 1_000) {
      await tx.insert(schema.submissionResults).values(resultRows.slice(i, i + 1_000));
    }

    // 5. Approval log, help requests (each tied to the student's latest submission before asking).
    const submissionBefore = (student: number, exerciseId: string, minutesAgo: number) =>
      (latestSubmission.get(`${student}/${exerciseId}`) ?? [])
        .filter((x) => x.minutesAgo >= minutesAgo)
        .sort((a, b) => a.minutesAgo - b.minutesAgo)[0]?.id ?? null;
    for (const a of plan.approvals) {
      const submissionId = submissionBefore(a.student, a.exerciseId, a.minutesAgo);
      for (const c of runs.get(`${a.exerciseId}\u0000${a.variant}`)!.filter((x) => !x.outcome.passed)) {
        await tx.insert(schema.approvalEvents).values({
          courseId,
          exerciseId: a.exerciseId,
          casePosition: c.position,
          outputHash: c.outcome.outputHash!,
          action: "approve",
          actorId: teacherId,
          submissionId,
          reason: a.reason,
          createdAt: ago(a.minutesAgo),
        });
      }
    }
    if (plan.helpRequests.length > 0) {
      await tx.insert(schema.helpRequests).values(
        plan.helpRequests.map((r) => ({
          userId: studentId(r.student),
          exerciseId: r.exerciseId,
          courseId,
          submissionId: submissionBefore(r.student, r.exerciseId, r.minutesAgo),
          kind: r.kind,
          message: r.message,
          status: r.reply ? ("answered" as const) : ("open" as const),
          reply: r.reply?.text ?? null,
          createdAt: ago(r.minutesAgo),
          answeredAt: r.reply ? ago(r.reply.minutesAgo) : null,
        })),
      );
    }

    // 6. Grade transfers: sent for everything tried, except a few failed ones (Moodle is never called).
    const failed = new Set(
      plan.failedGradeStudents.map((s) => {
        const mine = [...best.entries()].filter(([k]) => k.startsWith(`${s}/`));
        return mine.sort((a, b) => a[1].last - b[1].last)[0][0];
      }),
    );
    const gradeRows = [...best.entries()].map(([key, b]) => {
      const [student, exerciseId] = key.split("/");
      const isFailed = failed.has(key);
      return {
        resourceLinkId: linkOf.get(exerciseId)!,
        userId: studentId(Number(student)),
        platformUserId: plan.students[Number(student)].sub,
        status: isFailed ? ("failed" as const) : ("sent" as const),
        scoreGiven: isFailed ? null : b.passed,
        scoreMaximum: isFailed ? null : b.total,
        attempts: isFailed ? 5 : 1,
        lastError: isFailed ? "Moodle ei vastannut (HTTP 503). Yritetty 5 kertaa." : null,
        sentAt: isFailed ? null : ago(b.last - 1),
        updatedAt: ago(b.last - 1),
      };
    });
    await tx.insert(schema.ltiGradeSyncs).values(gradeRows);
  });

  console.log(
    `seed-demo: ${plan.students.length} students, ${plan.submissions.length} submissions ` +
      `(${distinct.length} variants, ${jobs.length} runs), ${plan.helpRequests.length} help requests ` +
      `on course ${courseId} in ${((Date.now() - started) / 1000).toFixed(1)} s.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
