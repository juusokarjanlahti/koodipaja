/**
 * The demo course's three weeks of history (#127, docs/specs/demo-history.md), as a plan.
 *
 * EVERYTHING HERE IS INVENTED. The names are made up from programming words so that no one
 * can mistake them for real people, and no submission was written by a real student.
 *
 * The plan says only who submitted which code variant of which exercise and when (minutes
 * before "now"). It holds no results: scripts/seed-demo.ts runs every variant through the
 * real runner and grading, so what the teacher sees always matches the tests.
 * The plan is deterministic: the same exercises give the same plan on every run.
 */

/** "solution", "wrong/<file>", "accepted/<file>" from the exercise folder, or a key of DEMO_CODE. */
export type Variant = string;

export interface PlanExercise {
  id: string;
  /** File names in wrong/ and accepted/, sorted. */
  wrong: string[];
  accepted: string[];
}

export interface PlannedStudent {
  sub: string;
  name: string;
}

export interface PlannedSubmission {
  student: number;
  exerciseId: string;
  variant: Variant;
  minutesAgo: number;
}

export interface PlannedHelpRequest {
  student: number;
  exerciseId: string;
  kind: "apu" | "kiista";
  message: string | null;
  minutesAgo: number;
  /** Answered requests: the teacher's reply. */
  reply?: { text: string; minutesAgo: number };
}

/** A teacher approval of every failing output of one variant (#50). */
export interface PlannedApproval {
  exerciseId: string;
  variant: Variant;
  /** Whose submission the decision was made on. */
  student: number;
  reason: string;
  minutesAgo: number;
}

export interface DemoPlan {
  teacher: PlannedStudent;
  students: PlannedStudent[];
  submissions: PlannedSubmission[];
  helpRequests: PlannedHelpRequest[];
  approvals: PlannedApproval[];
  /** Students whose grade transfer for their latest exercise failed (#99). */
  failedGradeStudents: number[];
}

// The exercises the story is told around. The plan throws if one of them is renamed.
export const STUCK_EXERCISE = "05-parillinen-vai-pariton";
export const APPROVED_EXERCISE = "07-lampotilamuunnos";
export const SAME_ANSWER_EXERCISE = "10-keskiarvo";
const BEHIND_HELP_EXERCISE = "03-suurempi-luku";

/**
 * Hand-written answers a real course would see, graded for real like the rest.
 * same-answer: right average, but printed as 2.0 instead of 2.00, so 4 of 5 cases fail.
 * spelled-unit: right conversion, unit written out; the teacher approved it.
 */
export const DEMO_CODE: Record<string, { exerciseId: string; code: string }> = {
  "demo/same-answer": {
    exerciseId: SAME_ANSWER_EXERCISE,
    code: `summa = 0
maara = 0
while True:
    luku = int(input())
    if luku == 0:
        break
    summa += luku
    maara += 1
if maara == 0:
    print("Ei lukuja")
else:
    print("Keskiarvo:", round(summa / maara, 2))
`,
  },
  "demo/spelled-unit": {
    exerciseId: APPROVED_EXERCISE,
    code: `celsius = float(input())
fahrenheit = celsius * 9 / 5 + 32
print(round(fahrenheit, 1), "astetta Fahrenheitia")
`,
  },
};

const FIRST_NAMES = [
  "Aino", "Eero", "Helmi", "Ilmari", "Juho", "Kerttu", "Lauri", "Milla", "Noora", "Oskari",
  "Pihla", "Riku", "Saana", "Topias", "Unna", "Veeti", "Wilma", "Aleksi", "Elli", "Hugo",
  "Iida", "Kasper", "Lumi", "Niilo", "Siiri",
];
const SURNAMES = [
  "Silmukka", "Muuttuja", "Lista", "Ehtolause", "Funktio", "Merkkijono", "Taulukko", "Sanakirja",
  "Kokonaisluku", "Liukuluku", "Totuusarvo", "Rekursio", "Moduuli", "Parametri", "Indeksi", "Vakio",
  "Monikko", "Kommentti", "Syöte", "Tuloste", "Ehto", "Toisto", "Arvo", "Avain", "Pino",
];

const APPROVAL_REASON = "Yksikön saa kirjoittaa auki. Tehtävässä tärkeintä on oikea muunnos ja pyöristys.";

const MINUTE = 1;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const COURSE_DAYS = 21;

/** Small seeded PRNG (mulberry32), so the plan never depends on Math.random. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Step = { exerciseId: string; variants: Variant[] };

/**
 * 25 students: 5 ahead (all done), 12 in the middle (5 of them sent the same answer to
 * 10-keskiarvo and say it is right), 3 behind, 3 stuck on 05 and 2 who have not started.
 */
export function planDemoHistory(exercises: PlanExercise[], seed = 127): DemoPlan {
  const random = rng(seed);
  const pick = <T>(items: T[]): T => items[Math.floor(random() * items.length)];
  const between = (lo: number, hi: number) => lo + random() * (hi - lo);

  const ordered = [...exercises].sort((a, b) => a.id.localeCompare(b.id));
  const index = new Map(ordered.map((ex, i) => [ex.id, i]));
  for (const id of [STUCK_EXERCISE, APPROVED_EXERCISE, SAME_ANSWER_EXERCISE, BEHIND_HELP_EXERCISE]) {
    if (!index.has(id)) throw new Error(`The demo history needs the exercise ${id}; update lib/demo/history.ts.`);
  }
  const at = (id: string) => ordered[index.get(id)!];

  /** 0-2 failed tries, then a passing answer (usually the model solution, sometimes an accepted variant). */
  const solve = (ex: PlanExercise): Step => {
    const tries = random() < 0.5 ? 0 : random() < 0.7 ? 1 : 2;
    const variants: Variant[] = [];
    for (let i = 0; i < tries && ex.wrong.length > 0; i++) variants.push(`wrong/${pick(ex.wrong)}`);
    variants.push(ex.accepted.length > 0 && random() < 0.3 ? `accepted/${pick(ex.accepted)}` : "solution");
    return { exerciseId: ex.id, variants };
  };
  const fail = (ex: PlanExercise, tries: number): Step => ({
    exerciseId: ex.id,
    variants: Array.from({ length: tries }, (_, i) => `wrong/${ex.wrong[i % ex.wrong.length]}`),
  });

  const students: PlannedStudent[] = FIRST_NAMES.map((first, i) => ({
    sub: `seed-${String(i + 1).padStart(2, "0")}`,
    name: `${first} ${SURNAMES[i]}`,
  }));
  const submissions: PlannedSubmission[] = [];
  const helpRequests: PlannedHelpRequest[] = [];
  const approvals: PlannedApproval[] = [];
  const latest = new Map<string, number>(); // `${student}/${exercise}` -> minutesAgo of the last try

  /** Spreads a student's steps evenly from `startDays` to `endDays` ago, a few minutes per try. */
  const schedule = (student: number, steps: Step[], startDays: number, endDays: number) => {
    steps.forEach((step, i) => {
      const share = steps.length === 1 ? 1 : i / (steps.length - 1);
      let minutesAgo = Math.round((startDays - (startDays - endDays) * share) * DAY + between(-2, 2) * HOUR);
      minutesAgo = Math.max(minutesAgo, step.variants.length * 15 + 30);
      for (const variant of step.variants) {
        submissions.push({ student, exerciseId: step.exerciseId, variant, minutesAgo });
        latest.set(`${student}/${step.exerciseId}`, minutesAgo);
        minutesAgo -= Math.round(between(3, 15));
      }
    });
  };
  const lastTry = (student: number, exerciseId: string) => latest.get(`${student}/${exerciseId}`)!;

  // 0-4: ahead, every exercise done. Student 1 wrote the unit out on 07 and the teacher approved it.
  for (let s = 0; s <= 4; s++) {
    const steps = ordered.map((ex) =>
      s === 1 && ex.id === APPROVED_EXERCISE ? { exerciseId: ex.id, variants: ["demo/spelled-unit"] } : solve(ex),
    );
    schedule(s, steps, between(COURSE_DAYS - 1, COURSE_DAYS), between(1, 6));
  }
  const approvedAt = lastTry(1, APPROVED_EXERCISE);
  helpRequests.push({
    student: 1,
    exerciseId: APPROVED_EXERCISE,
    kind: "kiista",
    message: "Kirjoitin yksikön auki, koska en löytänyt astemerkkiä näppäimistöltä. Käykö tämä?",
    minutesAgo: approvedAt - 5,
    reply: { text: APPROVAL_REASON, minutesAgo: approvedAt - 5 * HOUR },
  });
  approvals.push({
    exerciseId: APPROVED_EXERCISE,
    variant: "demo/spelled-unit",
    student: 1,
    reason: APPROVAL_REASON,
    minutesAgo: approvedAt - 5 * HOUR,
  });

  // 5-9: solved 01-09, then sent the same answer to 10 and say it is right.
  const sameAnswerMessages = [
    "Keskiarvo on oikein, tulostan vain 2.0 enkä 2.00.",
    "Mielestäni vastaukseni on oikein, luku on sama.",
    null,
    "Pyöristin kahteen desimaaliin round-funktiolla, miksei tämä mene läpi?",
    "Sama keskiarvo kuin esimerkissä.",
  ];
  const sameIndex = index.get(SAME_ANSWER_EXERCISE)!;
  for (let s = 5; s <= 9; s++) {
    const steps = ordered.slice(0, sameIndex).map(solve);
    const same = at(SAME_ANSWER_EXERCISE);
    steps.push({
      exerciseId: same.id,
      variants: [...(random() < 0.5 ? [`wrong/${pick(same.wrong)}`] : []), "demo/same-answer"],
    });
    schedule(s, steps, between(COURSE_DAYS - 3, COURSE_DAYS - 1), between(0.2, 2.5));
    helpRequests.push({
      student: s,
      exerciseId: same.id,
      kind: "kiista",
      message: sameAnswerMessages[s - 5],
      minutesAgo: lastTry(s, same.id) - Math.round(between(2, 20)),
    });
  }

  // 10-16: the middle, 7-12 exercises done; the next one tried once.
  for (let s = 10; s <= 16; s++) {
    const done = 7 + Math.floor(random() * 6);
    const steps = ordered.slice(0, done).map(solve);
    if (done < ordered.length) steps.push(fail(ordered[done], 1));
    schedule(s, steps, between(COURSE_DAYS - 4, COURSE_DAYS - 1), between(0.5, 3));
  }

  // 17-19: behind, 2-3 exercises done a week ago or more.
  for (let s = 17; s <= 19; s++) {
    const done = s === 18 ? 2 : 2 + Math.floor(random() * 2);
    const steps = ordered.slice(0, done).map(solve);
    steps.push(fail(ordered[done], s === 18 ? 2 : 1));
    schedule(s, steps, between(COURSE_DAYS - 6, COURSE_DAYS - 3), between(8, 12));
  }
  helpRequests.push({
    student: 18,
    exerciseId: BEHIND_HELP_EXERCISE,
    kind: "apu",
    message: "Miksi ohjelmani sanoo, että 9 on suurempi kuin 10?",
    minutesAgo: lastTry(18, BEHIND_HELP_EXERCISE) - 10,
    reply: {
      text: "Vertaat nyt tekstejä, ja tekstinä \"9\" tulee aakkosissa \"10\":n jälkeen. Muuta syötteet ensin luvuiksi int()-funktiolla.",
      minutesAgo: lastTry(18, BEHIND_HELP_EXERCISE) - 20 * HOUR,
    },
  });

  // 20-22: stuck on 05 after many tries in the last days; two of them asked for help.
  const stuck = at(STUCK_EXERCISE);
  const stuckIndex = index.get(STUCK_EXERCISE)!;
  const stuckMessages = [
    "Kokeilin monella tavalla, mutta negatiivinen pariton ei vieläkään mene läpi. Mistä kannattaisi aloittaa?",
    "En ymmärrä, miksi nolla tulostuu parittomaksi.",
  ];
  for (let s = 20; s <= 22; s++) {
    const steps = ordered.slice(0, stuckIndex).map(solve);
    steps.push(fail(stuck, 4 + Math.floor(random() * 3)));
    schedule(s, steps, between(COURSE_DAYS - 5, COURSE_DAYS - 2), between(0.1, 1.5));
    if (s < 22) {
      helpRequests.push({
        student: s,
        exerciseId: stuck.id,
        kind: "apu",
        message: stuckMessages[s - 20],
        minutesAgo: lastTry(s, stuck.id) - Math.round(between(2, 30)),
      });
    }
  }
  // 23-24: enrolled, not started.

  return {
    teacher: { sub: "seed-opettaja", name: "Kaisa Koodari (vastuuopettaja)" },
    students,
    submissions,
    helpRequests: helpRequests.map((r) => ({
      ...r,
      minutesAgo: Math.max(r.minutesAgo, 2),
      ...(r.reply ? { reply: { ...r.reply, minutesAgo: Math.max(r.reply.minutesAgo, 1) } } : {}),
    })),
    approvals,
    failedGradeStudents: [6, 12, 15],
  };
}

