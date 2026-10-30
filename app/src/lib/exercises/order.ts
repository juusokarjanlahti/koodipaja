// The order of exercises is defined in one place: the NN- prefix of the folder name,
// which is also the exercise id (CLAUDE.md). Ids without a prefix have no number.

export function exerciseNumber(id: string): number | null {
  const match = /^(\d+)-/.exec(id);
  return match ? Number(match[1]) : null;
}

/** "3. Kahden luvun summa", or just the title when the id has no number. */
export function numberedTitle(id: string, title: string): string {
  const n = exerciseNumber(id);
  return n === null ? title : `${n}. ${title}`;
}

/** First exercise in course order that the student has not solved yet. */
export function firstUnsolved<T extends { id: string }>(items: T[], solved: (id: string) => boolean): T | undefined {
  return items.find((ex) => !solved(ex.id));
}
