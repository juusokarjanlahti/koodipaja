import { Queue, QueueEvents } from "bullmq";
import { Redis } from "ioredis";
import { requireEnv } from "../env";
import type { RunRequest } from "../runner/types";
import { redisConnection } from "../queue";
import type { RunOutput } from "./output";

export const RUN_QUEUE = "runs";
const RUN_TIMEOUT_MS = 30_000;

const g = globalThis as unknown as {
  koodipajaRunQueue?: Queue<RunRequest, RunOutput>;
  koodipajaRunEvents?: QueueEvents;
  koodipajaRedis?: Redis;
};

function runQueue(): Queue<RunRequest, RunOutput> {
  g.koodipajaRunQueue ??= new Queue<RunRequest, RunOutput>(RUN_QUEUE, {
    connection: redisConnection(),
    defaultJobOptions: {
      attempts: 1,
      // Student code stays in Redis only briefly; runs are never stored elsewhere.
      removeOnComplete: { age: 60 },
      removeOnFail: { age: 60 },
    },
  });
  return g.koodipajaRunQueue;
}

function runEvents(): QueueEvents {
  g.koodipajaRunEvents ??= new QueueEvents(RUN_QUEUE, { connection: redisConnection() });
  return g.koodipajaRunEvents;
}

/** Enqueue a run and wait for the worker to execute it on Judge0. */
export async function runViaQueue(request: RunRequest): Promise<RunOutput> {
  const events = runEvents();
  await events.waitUntilReady();
  const job = await runQueue().add("run", request);
  return job.waitUntilFinished(events, RUN_TIMEOUT_MS);
}

/** INCR with expiry for the rate limiter. */
export async function redisIncr(key: string, ttlSeconds: number): Promise<number> {
  g.koodipajaRedis ??= new Redis(requireEnv("REDIS_URL"), { maxRetriesPerRequest: 2 });
  const count = await g.koodipajaRedis.incr(key);
  if (count === 1) await g.koodipajaRedis.expire(key, ttlSeconds);
  return count;
}
