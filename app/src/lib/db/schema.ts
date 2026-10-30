import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
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
  // Only dev-login users have an email; LTI users are identified by lti_identities.
  email: text("email").unique(),
  displayName: text("display_name"),
  role: userRole("role").notNull().default("student"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// LTI 1.3 platforms (one row per Moodle registration), see docs/specs/lti-launch.md.
export const ltiPlatforms = pgTable(
  "lti_platforms",
  {
    id: serial("id").primaryKey(),
    issuer: text("issuer").notNull(),
    clientId: text("client_id").notNull(),
    authLoginUrl: text("auth_login_url").notNull(),
    authTokenUrl: text("auth_token_url").notNull(),
    jwksUrl: text("jwks_url").notNull(),
    deploymentIds: text("deployment_ids").array().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("lti_platforms_issuer_client").on(t.issuer, t.clientId)],
);

// A user as known to a platform: the platform's opaque user id (sub). No email.
export const ltiIdentities = pgTable(
  "lti_identities",
  {
    platformId: integer("platform_id")
      .notNull()
      .references(() => ltiPlatforms.id, { onDelete: "cascade" }),
    sub: text("sub").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.platformId, t.sub] })],
);

// Single-use OIDC login state and nonce, valid for a few minutes.
export const ltiLaunchStates = pgTable("lti_launch_states", {
  state: text("state").primaryKey(),
  nonce: text("nonce").notNull(),
  platformId: integer("platform_id")
    .notNull()
    .references(() => ltiPlatforms.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

// A course on a platform (LTI context).
export const courses = pgTable(
  "courses",
  {
    id: serial("id").primaryKey(),
    platformId: integer("platform_id")
      .notNull()
      .references(() => ltiPlatforms.id, { onDelete: "cascade" }),
    contextId: text("context_id").notNull(),
    title: text("title"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("courses_platform_context").on(t.platformId, t.contextId)],
);

// The user's role on a course, as the platform last reported it.
export const courseMemberships = pgTable(
  "course_memberships",
  {
    courseId: integer("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: userRole("role").notNull(),
    lastLaunchAt: timestamp("last_launch_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.courseId, t.userId] })],
);

export const gradeSyncStatus = pgEnum("grade_sync_status", ["idle", "pending", "sent", "failed"]);

// A Moodle activity (LTI resource link): which exercise it opens and where its grade goes.
export const ltiResourceLinks = pgTable(
  "lti_resource_links",
  {
    id: serial("id").primaryKey(),
    platformId: integer("platform_id")
      .notNull()
      .references(() => ltiPlatforms.id, { onDelete: "cascade" }),
    resourceLinkId: text("resource_link_id").notNull(),
    courseId: integer("course_id").references(() => courses.id, { onDelete: "set null" }),
    // Null when the target link is not an exercise page.
    exerciseId: text("exercise_id").references(() => exercises.id, { onDelete: "set null" }),
    // AGS line item URL; null when the activity does not accept grades.
    lineItemUrl: text("line_item_url"),
    agsScopes: text("ags_scopes").array().notNull().default([]),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("lti_resource_links_platform_link").on(t.platformId, t.resourceLinkId)],
);

// A user who launched from a resource link, and the state of their grade in the platform.
export const ltiGradeSyncs = pgTable(
  "lti_grade_syncs",
  {
    resourceLinkId: integer("resource_link_id")
      .notNull()
      .references(() => ltiResourceLinks.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // The platform's user id (sub) the score is sent for.
    platformUserId: text("platform_user_id").notNull(),
    status: gradeSyncStatus("status").notNull().default("idle"),
    scoreGiven: integer("score_given"),
    scoreMaximum: integer("score_maximum"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.resourceLinkId, t.userId] })],
);

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
  // Concept cards this exercise teaches (concepts/<language>/<id>), for the cheat sheet (#69).
  concepts: text("concepts").array().notNull().default([]),
  // Concepts the exercise uses but does not teach (docs/specs/next-exercise.md).
  requires: text("requires").array().notNull().default([]),
  timeLimitSeconds: integer("time_limit_seconds").notNull(),
  memoryLimitMb: integer("memory_limit_mb").notNull(),
  contentHash: text("content_hash").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Concept cards: the student's automatically built cheat sheet (#69).
export const concepts = pgTable(
  "concepts",
  {
    language: text("language").notNull(),
    id: text("id").notNull(),
    title: text("title").notNull(),
    topic: text("topic").notNull(),
    position: integer("position").notNull(),
    explanationMarkdown: text("explanation_markdown").notNull(),
    exampleCode: text("example_code").notNull(),
    exampleStdin: text("example_stdin").notNull().default(""),
    exampleStdout: text("example_stdout").notNull(),
    contentHash: text("content_hash").notNull(),
  },
  (t) => [primaryKey({ columns: [t.language, t.id] })],
);

// The student's own short notes on a concept card. Visible only to that student.
export const conceptNotes = pgTable(
  "concept_notes",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    language: text("language").notNull(),
    conceptId: text("concept_id").notNull(),
    note: text("note").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.language, t.conceptId] })],
);

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
export type Concept = typeof concepts.$inferSelect;
export type LtiPlatform = typeof ltiPlatforms.$inferSelect;
