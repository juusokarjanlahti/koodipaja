import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "yaml";
import { z } from "zod";
import { LANGUAGE_EXTENSIONS } from "../exercises/load";

export const CONCEPT_TOPICS = {
  "tulostus-ja-syote": "Tulostus ja syöte",
  tietotyypit: "Tietotyypit",
  ehdot: "Ehdot",
  silmukat: "Silmukat",
  listat: "Listat",
  funktiot: "Funktiot",
  sanakirjat: "Sanakirjat",
  tiedostot: "Tiedostot",
} as const;

const conceptSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  topic: z.enum(Object.keys(CONCEPT_TOPICS) as [keyof typeof CONCEPT_TOPICS, ...(keyof typeof CONCEPT_TOPICS)[]]),
  order: z.number().int(),
  example_stdin: z.string().default(""),
  example_stdout: z.string(),
});

export interface LoadedConcept {
  language: string;
  id: string;
  title: string;
  topic: string;
  position: number;
  explanationMarkdown: string;
  exampleCode: string;
  exampleStdin: string;
  exampleStdout: string;
  contentHash: string;
}

/** Load one concept card from concepts/<language>/<id>. */
export async function loadConcept(folder: string): Promise<LoadedConcept> {
  const language = path.basename(path.dirname(folder));
  const ext = LANGUAGE_EXTENSIONS[language];
  if (!ext) throw new Error(`${folder}: unsupported language ${language}`);
  const rawYaml = await readFile(path.join(folder, "concept.yaml"), "utf8");
  const parsed = conceptSchema.safeParse(parse(rawYaml));
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    throw new Error(`${folder}/concept.yaml is invalid:\n  ${issues.join("\n  ")}`);
  }
  const meta = parsed.data;
  if (meta.id !== path.basename(folder)) throw new Error(`${folder}: id "${meta.id}" does not match folder name`);
  const explanationMarkdown = await readFile(path.join(folder, "README.md"), "utf8");
  const exampleCode = await readFile(path.join(folder, `example${ext}`), "utf8");
  const contentHash = createHash("sha256").update(rawYaml).update("\0").update(explanationMarkdown).update("\0").update(exampleCode).digest("hex");
  return {
    language,
    id: meta.id,
    title: meta.title,
    topic: meta.topic,
    position: meta.order,
    explanationMarkdown,
    exampleCode,
    exampleStdin: meta.example_stdin,
    exampleStdout: meta.example_stdout,
    contentHash,
  };
}

export async function findConceptFolders(root: string): Promise<string[]> {
  const folders: string[] = [];
  for (const language of await readdir(root, { withFileTypes: true }).catch(() => [])) {
    if (!language.isDirectory()) continue;
    for (const entry of await readdir(path.join(root, language.name), { withFileTypes: true })) {
      if (entry.isDirectory()) folders.push(path.join(root, language.name, entry.name));
    }
  }
  return folders.sort();
}
