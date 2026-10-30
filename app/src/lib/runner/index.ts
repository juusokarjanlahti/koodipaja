import { judge0ConfigFromEnv, runOnJudge0 } from "../judge0/client";
import { goJudgeConfigFromEnv, runOnGoJudge } from "./go-judge";
import type { Runner } from "./types";

export type RunnerKind = "go-judge" | "judge0";

export function runnerKind(env: string | undefined = process.env.RUNNER): RunnerKind {
  if (!env || env === "go-judge") return "go-judge";
  if (env === "judge0") return "judge0";
  throw new Error(`Unknown RUNNER "${env}". Use "go-judge" or "judge0".`);
}

/** The code runner selected with RUNNER (default go-judge, ADR 0006). */
export function runnerFromEnv(): Runner {
  if (runnerKind() === "judge0") {
    const config = judge0ConfigFromEnv();
    return (req) => runOnJudge0(config, req);
  }
  const config = goJudgeConfigFromEnv();
  return (req) => runOnGoJudge(config, req);
}

export * from "./types";
