import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["student", "teacher"]);
export const outputMatchMode = pgEnum("output_match_mode", ["lenient", "exact"]);
export const submissionStatus = pgEnum("submission_status", [
  "queued",
  "running",
  "done",
  "error",
]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  role: userRole("role").notNull().default("student"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const exercises = pgTable("exercises", {
  // The folder name in exercises/<language>/<id>, e.g. "01-tervehdys".
  id: text("id").primaryKey(),
  language: text("language").notNull(),
  title: text("title").notNull(),
  difficulty: integer("difficulty").notNull(),
  topics: text("topics").array().notNull().default([]),
  promptMarkdown: text("prompt_markdown").notNull(),
  starterCode: text("starter_code").notNull(),
  // "lenient" (default) or "exact", see docs/adr/0003-joustava-tulosteen-vertailu.md.
  outputMatch: outputMatchMode("output_match").notNull().default("lenient"),
  timeLimitSeconds: integer("time_limit_seconds").notNull(),
  memoryLimitMb: integer("memory_limit_mb").notNull(),
  contentHash: text("content_hash").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const testCases = pgTable(
  "test_cases",
  {
    id: serial("id").primaryKey(),
    exerciseId: text("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    name: text("name").notNull(),
    stdin: text("stdin").notNull(),
    expectedStdout: text("expected_stdout").notNull(),
    hidden: boolean("hidden").notNull().default(false),
  },
  (t) => [uniqueIndex("test_cases_exercise_position").on(t.exerciseId, t.position)],
);

export const submissions = pgTable(
  "submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    exerciseId: text("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    sourceCode: text("source_code").notNull(),
    status: submissionStatus("status").notNull().default("queued"),
    passedCount: integer("passed_count").notNull().default(0),
    totalCount: integer("total_count").notNull().default(0),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [index("submissions_user_exercise").on(t.userId, t.exerciseId, t.createdAt)],
);

export const submissionResults = pgTable(
  "submission_results",
  {
    id: serial("id").primaryKey(),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => submissions.id, { onDelete: "cascade" }),
    testCaseId: integer("test_case_id")
      .notNull()
      .references(() => testCases.id, { onDelete: "cascade" }),
    passed: boolean("passed").notNull(),
    // Judge0 status description, e.g. "Accepted", "Runtime Error (NZEC)".
    judgeStatus: text("judge_status").notNull(),
    stdout: text("stdout"),
    stderr: text("stderr"),
    timeMs: integer("time_ms"),
    memoryKb: integer("memory_kb"),
  },
  (t) => [index("submission_results_submission").on(t.submissionId)],
);

export type Exercise = typeof exercises.$inferSelect;
export type TestCase = typeof testCases.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
export type SubmissionResult = typeof submissionResults.$inferSelect;
export type User = typeof users.$inferSelect;
