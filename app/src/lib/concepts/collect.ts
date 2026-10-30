/**
 * Which concept cards belong to a student's cheat sheet (#69): every concept taught by an
 * exercise the student has submitted at least once, ordered by when it was first met.
 * Pure function so the rule is unit tested; the database query feeds it.
 */
export interface SubmissionFact {
  exerciseId: string;
  firstSubmittedAt: Date;
  passed: boolean;
}

export interface ExerciseConcepts {
  id: string;
  title: string;
  concepts: string[];
}

export interface CollectedConcept {
  conceptId: string;
  learnedIn: { exerciseId: string; title: string };
  firstSeenAt: Date;
  passed: boolean;
}

export function collectConcepts(facts: SubmissionFact[], exercises: ExerciseConcepts[]): CollectedConcept[] {
  const byId = new Map(exercises.map((e) => [e.id, e]));
  const collected = new Map<string, CollectedConcept>();
  const ordered = [...facts].sort((a, b) => a.firstSubmittedAt.getTime() - b.firstSubmittedAt.getTime());
  for (const fact of ordered) {
    const exercise = byId.get(fact.exerciseId);
    if (!exercise) continue;
    for (const conceptId of exercise.concepts) {
      const existing = collected.get(conceptId);
      if (!existing) {
        collected.set(conceptId, {
          conceptId,
          learnedIn: { exerciseId: exercise.id, title: exercise.title },
          firstSeenAt: fact.firstSubmittedAt,
          passed: fact.passed,
        });
      } else if (fact.passed && !existing.passed) {
        existing.passed = true;
      }
    }
  }
  return [...collected.values()];
}
