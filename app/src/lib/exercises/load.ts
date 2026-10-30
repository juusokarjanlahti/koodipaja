import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";
import { z } from "zod";

export const LANGUAGE_EXTENSIONS: Record<string, string> = {
  python: ".py",
  javascript: ".js",
  typescript: ".ts",
  c: ".c",
  cpp: ".cpp",
  java: ".java",
  rust: ".rs",
};

const caseSchema = z.object({
  name: z.string().min(1),
  stdin: z.string().default(""),
  expected_stdout: z.string(),
  hidden: z.boolean().default(false),
});

export const exerciseMetaSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/, "id must be lowercase letters, digits and dashes"),
  title: z.string().min(1),
  language: z.enum(Object.keys(LANGUAGE_EXTENSIONS) as [string, ...string[]]),
  difficulty: z.number().int().min(1).max(5),
  topics: z.array(z.string()).default([]),
  output_match: z.enum(["lenient", "exact"]).default("lenient"),
  concepts: z.array(z.string()).default([]),
  requires: z.array(z.string()).default([]),
  time_limit_seconds: z.number().positive().default(2),
  memory_limit_mb: z.number().int().positive().default(64),
  cases: z.array(caseSchema).min(3),
});

export interface LoadedExercise {
  id: string;
  title: string;
  language: string;
  difficulty: number;
  topics: string[];
  outputMatch: "lenient" | "exact";
  concepts: string[];
  requires: string[];
  promptMarkdown: string;
  starterCode: string;
  timeLimitSeconds: number;
  memoryLimitMb: number;
  contentHash: string;
  cases: { name: string; stdin: string; expectedStdout: string; hidden: boolean }[];
}

/** Load and validate one exercise folder. Throws with a readable message on problems. */
export async function loadExercise(folder: string): Promise<LoadedExercise> {
  const rawYaml = await readFile(path.join(folder, "exercise.yaml"), "utf8");
  const parsed = exerciseMetaSchema.safeParse(parse(rawYaml));
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    throw new Error(`${folder}/exercise.yaml is invalid:\n  ${issues.join("\n  ")}`);
  }
  const meta = parsed.data;
  if (meta.id !== path.basename(folder)) {
    throw new Error(`${folder}: id "${meta.id}" does not match folder name`);
  }

  const ext = LANGUAGE_EXTENSIONS[meta.language];
  const promptMarkdown = await readFile(path.join(folder, "README.md"), "utf8");
  const starterCode = await readFile(path.join(folder, `starter${ext}`), "utf8");

  const contentHash = createHash("sha256")
    .update(rawYaml)
    .update("\0")
    .update(promptMarkdown)
    .update("\0")
    .update(starterCode)
    .digest("hex");

  return {
    id: meta.id,
    title: meta.title,
    language: meta.language,
    difficulty: meta.difficulty,
    topics: meta.topics,
    outputMatch: meta.output_match,
    concepts: meta.concepts,
    requires: meta.requires,
    promptMarkdown,
    starterCode,
    timeLimitSeconds: Math.ceil(meta.time_limit_seconds),
    memoryLimitMb: meta.memory_limit_mb,
    contentHash,
    cases: meta.cases.map((c) => ({
      name: c.name,
      stdin: c.stdin,
      expectedStdout: c.expected_stdout,
      hidden: c.hidden,
    })),
  };
}

/** Find every exercise folder under exercises/<language>/<id>. */
export async function findExerciseFolders(root: string): Promise<string[]> {
  const folders: string[] = [];
  for (const language of await readdir(root, { withFileTypes: true })) {
    if (!language.isDirectory()) continue;
    const languageDir = path.join(root, language.name);
    for (const entry of await readdir(languageDir, { withFileTypes: true })) {
      if (entry.isDirectory()) folders.push(path.join(languageDir, entry.name));
    }
  }
  return folders.sort();
}
