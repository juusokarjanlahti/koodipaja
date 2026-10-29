import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { findExerciseFolders, loadExercise } from "./load";

const repoExercises = path.resolve(__dirname, "../../../../exercises");

async function makeExercise(yaml: string, id = "01-test") {
  const root = await mkdtemp(path.join(tmpdir(), "koodipaja-"));
  const folder = path.join(root, "python", id);
  await mkdir(folder, { recursive: true });
  await writeFile(path.join(folder, "exercise.yaml"), yaml);
  await writeFile(path.join(folder, "README.md"), "# Test\n");
  await writeFile(path.join(folder, "starter.py"), "# start\n");
  return folder;
}

const validYaml = `id: 01-test
title: Test
language: python
difficulty: 1
cases:
  - { name: a, stdin: "1\\n", expected_stdout: "1\\n" }
  - { name: b, stdin: "2\\n", expected_stdout: "2\\n" }
  - { name: c, expected_stdout: "x\\n", hidden: true }
`;

describe("loadExercise", () => {
  it("loads every exercise in the repository", async () => {
    const folders = await findExerciseFolders(repoExercises);
    expect(folders.length).toBeGreaterThanOrEqual(2);
    for (const folder of folders) {
      const ex = await loadExercise(folder);
      expect(ex.cases.length).toBeGreaterThanOrEqual(3);
      expect(ex.promptMarkdown.length).toBeGreaterThan(0);
    }
  });

  it("applies defaults for stdin and hidden", async () => {
    const ex = await loadExercise(await makeExercise(validYaml));
    expect(ex.cases[2]).toEqual({ name: "c", stdin: "", expectedStdout: "x\n", hidden: true });
    expect(ex.cases[0].hidden).toBe(false);
    expect(ex.timeLimitSeconds).toBe(2);
    expect(ex.outputMatch).toBe("lenient");
  });

  it("produces a stable content hash", async () => {
    const a = await loadExercise(await makeExercise(validYaml));
    const b = await loadExercise(await makeExercise(validYaml));
    expect(a.contentHash).toBe(b.contentHash);
  });

  it("reads output_match: exact", async () => {
    const ex = await loadExercise(await makeExercise(validYaml.replace("difficulty: 1", "difficulty: 1\noutput_match: exact")));
    expect(ex.outputMatch).toBe("exact");
  });

  it("rejects an unknown output_match", async () => {
    const yaml = validYaml.replace("difficulty: 1", "difficulty: 1\noutput_match: fuzzy");
    await expect(loadExercise(await makeExercise(yaml))).rejects.toThrow(/output_match/);
  });

  it("rejects an id that does not match the folder", async () => {
    await expect(loadExercise(await makeExercise(validYaml, "02-other"))).rejects.toThrow(
      /does not match folder name/,
    );
  });

  it("rejects too few cases with a readable message", async () => {
    const yaml = validYaml.split("\n").slice(0, 6).join("\n");
    await expect(loadExercise(await makeExercise(yaml))).rejects.toThrow(/cases/);
  });
});
