// Grade sync status for administrators (docs/specs/lti-grades.md).
//
//   npm run lti:grades              # grades that are pending or failed
//   npm run lti:grades -- --all     # every grade target
//   npm run lti:grades -- --retry   # queue the failed ones again
import { parseArgs } from "node:util";
import { and, eq, inArray } from "drizzle-orm";
import { closeDb, getDb, schema } from "../src/lib/db";
import { getGradeQueue } from "../src/lib/lti/grade-sync";

const { values } = parseArgs({ options: { all: { type: "boolean" }, retry: { type: "boolean" } } });

async function main() {
  const rows = await getDb()
    .select({
      userId: schema.ltiGradeSyncs.userId,
      name: schema.users.displayName,
      exerciseId: schema.ltiResourceLinks.exerciseId,
      course: schema.courses.title,
      status: schema.ltiGradeSyncs.status,
      score: schema.ltiGradeSyncs.scoreGiven,
      max: schema.ltiGradeSyncs.scoreMaximum,
      lastError: schema.ltiGradeSyncs.lastError,
      updatedAt: schema.ltiGradeSyncs.updatedAt,
    })
    .from(schema.ltiGradeSyncs)
    .innerJoin(schema.users, eq(schema.users.id, schema.ltiGradeSyncs.userId))
    .innerJoin(schema.ltiResourceLinks, eq(schema.ltiResourceLinks.id, schema.ltiGradeSyncs.resourceLinkId))
    .leftJoin(schema.courses, eq(schema.courses.id, schema.ltiResourceLinks.courseId))
    .where(values.all ? undefined : and(inArray(schema.ltiGradeSyncs.status, ["pending", "failed"])));

  for (const r of rows) {
    const score = r.score === null ? "" : ` ${r.score}/${r.max}`;
    console.log(
      `${r.status.padEnd(7)} ${r.updatedAt.toISOString()} ${r.course ?? "-"} / ${r.exerciseId ?? "-"} / ${r.name ?? r.userId}${score}${r.lastError ? `\n        ${r.lastError}` : ""}`,
    );
  }
  console.log(`${rows.length} row(s)`);

  if (values.retry) {
    const failed = rows.filter((r) => r.status === "failed" && r.exerciseId);
    for (const r of failed) await getGradeQueue().add("sync", { userId: r.userId, exerciseId: r.exerciseId! });
    console.log(`queued ${failed.length} failed grade(s) again`);
    await getGradeQueue().close();
  }
  await closeDb();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
