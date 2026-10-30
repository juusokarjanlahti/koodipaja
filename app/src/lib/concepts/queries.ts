import { and, eq, sql } from "drizzle-orm";
import { getDb, schema } from "../db";
import { collectConcepts } from "./collect";
import { CONCEPT_TOPICS } from "./load";

export interface CheatsheetCard {
  language: string;
  id: string;
  title: string;
  topic: string;
  topicLabel: string;
  explanationMarkdown: string;
  exampleCode: string;
  exampleStdin: string;
  exampleStdout: string;
  learnedIn: { exerciseId: string; title: string };
  passed: boolean;
  note: string;
}

/** The student's cheat sheet: concept cards from every exercise they have submitted. */
export async function getCheatsheet(userId: string): Promise<CheatsheetCard[]> {
  const db = getDb();

  const facts = await db
    .select({
      exerciseId: schema.submissions.exerciseId,
      firstSubmittedAt: sql<Date>`min(${schema.submissions.createdAt})`.mapWith((v) => new Date(v)),
      passed: sql<boolean>`bool_or(${schema.submissions.status} = 'done' and ${schema.submissions.totalCount} > 0 and ${schema.submissions.passedCount} = ${schema.submissions.totalCount})`,
    })
    .from(schema.submissions)
    .where(eq(schema.submissions.userId, userId))
    .groupBy(schema.submissions.exerciseId);
  if (facts.length === 0) return [];

  const [exercises, concepts, notes] = await Promise.all([
    db
      .select({ id: schema.exercises.id, title: schema.exercises.title, language: schema.exercises.language, concepts: schema.exercises.concepts })
      .from(schema.exercises),
    db.select().from(schema.concepts),
    db.select().from(schema.conceptNotes).where(eq(schema.conceptNotes.userId, userId)),
  ]);

  const languageOf = new Map(exercises.map((e) => [e.id, e.language]));
  const conceptByKey = new Map(concepts.map((c) => [`${c.language}/${c.id}`, c]));
  const noteByKey = new Map(notes.map((n) => [`${n.language}/${n.conceptId}`, n.note]));

  return collectConcepts(facts, exercises).flatMap((collected) => {
    const language = languageOf.get(collected.learnedIn.exerciseId) ?? "python";
    const key = `${language}/${collected.conceptId}`;
    const concept = conceptByKey.get(key);
    if (!concept) return [];
    return [
      {
        language,
        id: concept.id,
        title: concept.title,
        topic: concept.topic,
        topicLabel: CONCEPT_TOPICS[concept.topic as keyof typeof CONCEPT_TOPICS] ?? concept.topic,
        explanationMarkdown: concept.explanationMarkdown,
        exampleCode: concept.exampleCode,
        exampleStdin: concept.exampleStdin,
        exampleStdout: concept.exampleStdout,
        learnedIn: collected.learnedIn,
        passed: collected.passed,
        note: noteByKey.get(key) ?? "",
      },
    ];
  });
}

export const MAX_NOTE_LENGTH = 500;

/** Save or (when empty) delete a student's note on a concept card. */
export async function saveNote(userId: string, language: string, conceptId: string, note: string): Promise<void> {
  const db = getDb();
  const trimmed = note.trim();
  if (trimmed === "") {
    await db
      .delete(schema.conceptNotes)
      .where(
        and(
          eq(schema.conceptNotes.userId, userId),
          eq(schema.conceptNotes.language, language),
          eq(schema.conceptNotes.conceptId, conceptId),
        ),
      );
    return;
  }
  await db
    .insert(schema.conceptNotes)
    .values({ userId, language, conceptId, note: trimmed })
    .onConflictDoUpdate({
      target: [schema.conceptNotes.userId, schema.conceptNotes.language, schema.conceptNotes.conceptId],
      set: { note: trimmed, updatedAt: new Date() },
    });
}
