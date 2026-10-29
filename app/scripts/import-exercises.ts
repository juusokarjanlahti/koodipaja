/**
 * Import exercises from ../exercises into the database.
 *
 *   npm run import-exercises
 *
 * Idempotent: unchanged exercises (same content hash) are skipped. A changed exercise
 * has its test cases replaced inside one transaction. Exercises removed from Git are
 * NOT deleted, because students may have submissions for them; they are reported.
 */
import path from "node:path";
import { eq, notInArray } from "drizzle-orm";
import { closeDb, getDb, schema } from "../src/lib/db";
import { findExerciseFolders, loadExercise } from "../src/lib/exercises/load";

const root = path.resolve(process.cwd(), process.argv[2] ?? "../exercises");

async function main() {
  const db = getDb();
  const folders = await findExerciseFolders(root);
  const ids: string[] = [];
  let created = 0;
  let updated = 0;
  let unchanged = 0;

  for (const folder of folders) {
    const ex = await loadExercise(folder);
    ids.push(ex.id);

    const [existing] = await db
      .select({ contentHash: schema.exercises.contentHash })
      .from(schema.exercises)
      .where(eq(schema.exercises.id, ex.id));

    if (existing?.contentHash === ex.contentHash) {
      unchanged++;
      continue;
    }

    await db.transaction(async (tx) => {
      const values = {
        id: ex.id,
        language: ex.language,
        title: ex.title,
        difficulty: ex.difficulty,
        topics: ex.topics,
        outputMatch: ex.outputMatch,
        promptMarkdown: ex.promptMarkdown,
        starterCode: ex.starterCode,
        timeLimitSeconds: ex.timeLimitSeconds,
        memoryLimitMb: ex.memoryLimitMb,
        contentHash: ex.contentHash,
        updatedAt: new Date(),
      };
      await tx
        .insert(schema.exercises)
        .values(values)
        .onConflictDoUpdate({ target: schema.exercises.id, set: values });
      await tx.delete(schema.testCases).where(eq(schema.testCases.exerciseId, ex.id));
      await tx.insert(schema.testCases).values(
        ex.cases.map((c, position) => ({ exerciseId: ex.id, position, ...c })),
      );
    });

    if (existing) updated++;
    else created++;
    console.log(`${existing ? "updated" : "created"}  ${ex.id}`);
  }

  const orphans = ids.length
    ? await db
        .select({ id: schema.exercises.id })
        .from(schema.exercises)
        .where(notInArray(schema.exercises.id, ids))
    : [];
  for (const o of orphans) console.warn(`warning: ${o.id} is in the database but not in Git`);

  console.log(`\n${created} created, ${updated} updated, ${unchanged} unchanged`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(closeDb);
