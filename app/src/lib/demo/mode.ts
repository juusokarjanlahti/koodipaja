/**
 * Public demo (docs/specs/demo-mode.md). Separate from DEV_LOGIN on purpose: DEV_LOGIN trusts
 * any email and is never on in production, while demo users are always created by the server.
 */
export function demoModeEnabled(): boolean {
  return process.env.DEMO_MODE === "true";
}

export const DEMO_ROLES = ["student", "teacher"] as const;
export type DemoRole = (typeof DEMO_ROLES)[number];

export function parseDemoRole(value: unknown): DemoRole | null {
  return DEMO_ROLES.find((role) => role === value) ?? null;
}

/** "Demo-opiskelija 7F3A": tells visitors apart without asking for a name. */
export function demoDisplayName(role: DemoRole, userId: string): string {
  const suffix = userId.replace(/-/g, "").slice(0, 4).toUpperCase();
  return `${role === "teacher" ? "Demo-opettaja" : "Demo-opiskelija"} ${suffix}`;
}
