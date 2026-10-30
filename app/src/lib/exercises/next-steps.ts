/**
 * What to suggest after an exercise: the next one when it is solved, a way forward when
 * the student is stuck. No AI: it follows the exercise order and the concepts each
 * exercise teaches (`concepts`) and uses without teaching (`requires`), both decided by
 * the exercise author. See docs/specs/next-exercise.md.
 */

export type PathExercise = { id: string; title: string; concepts: string[]; requires: string[] };
export type ExerciseState = "ratkaistu" | "yritetty";
export type Link = { id: string; title: string };

export type NextSteps = {
  /** The next unsolved exercise after this one (or before, when every later one is solved). */
  next: Link | null;
  /** Shown when stuck: a later exercise that does not need what this one teaches. */
  skipTo: Link | null;
  /** An earlier exercise left unfinished, e.g. skipped to get here. */
  comeBack: Link | null;
  /** Shown when stuck: an earlier exercise that taught something this one needs. */
  review: (Link & { concepts: string[] }) | null;
};

/** Failed submissions of the same exercise before suggesting another way forward. */
export const STUCK_AFTER_FAILED = 3;

/** Concept id -> the first exercise (in order) that teaches it. */
export function introducedIn(exercises: PathExercise[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const e of exercises) for (const c of e.concepts) if (!map.has(c)) map.set(c, e.id);
  return map;
}

/** Whether `later` needs something `earlier` is the first to teach. */
export function dependsOn(later: PathExercise, earlier: PathExercise, introduced: Map<string, string>): boolean {
  return [...later.concepts, ...later.requires].some((c) => introduced.get(c) === earlier.id);
}

const link = (e: PathExercise): Link => ({ id: e.id, title: e.title });

export function nextSteps(
  exercises: PathExercise[],
  states: Map<string, ExerciseState>,
  currentId: string,
  failedAttempts: number,
): NextSteps {
  const i = exercises.findIndex((e) => e.id === currentId);
  if (i === -1) return { next: null, skipTo: null, comeBack: null, review: null };
  const current = exercises[i];
  const solved = (e: PathExercise) => states.get(e.id) === "ratkaistu";
  const introduced = introducedIn(exercises);

  const later = exercises.slice(i + 1);
  const earlier = exercises.slice(0, i);
  const next = later.find((e) => !solved(e)) ?? earlier.find((e) => !solved(e)) ?? null;
  const comeBack = earlier.find((e) => states.get(e.id) === "yritetty") ?? null;

  const isSolved = solved(current);
  const stuck = !isSolved && failedAttempts >= STUCK_AFTER_FAILED;
  let skipTo: PathExercise | null = null;
  let review: NextSteps["review"] = null;
  if (stuck) {
    skipTo = later.find((e) => !solved(e) && !dependsOn(e, current, introduced)) ?? null;
    // The closest earlier exercise that taught something this one needs; solved ones first,
    // since redoing what already worked is the review.
    const needs = [...current.concepts, ...current.requires];
    const teachers = earlier
      .map((e) => ({ e, concepts: needs.filter((c) => introduced.get(c) === e.id) }))
      .filter((t) => t.concepts.length > 0 && t.e.id !== comeBack?.id)
      .reverse();
    const pick = teachers.find((t) => solved(t.e)) ?? teachers[0];
    if (pick) review = { ...link(pick.e), concepts: pick.concepts };
  }

  return {
    next: next ? link(next) : null,
    skipTo: skipTo ? link(skipTo) : null,
    comeBack: comeBack && comeBack.id !== current.id ? link(comeBack) : null,
    review,
  };
}
