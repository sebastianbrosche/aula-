import type { Db } from "./db/client.ts";
import { AppError } from "./errors.ts";

export const ADULT_ROLES = [
  "teacher",
  "guardian",
  "school_admin",
  "super_admin",
] as const;

export type Role = (typeof ADULT_ROLES)[number] | "student";

export type Locale = "en" | "pt-PT";

export const DEFAULT_LOCALE: Locale = "en";

export type Actor = {
  id: string;
  role: Role;
  schoolId: string | null;
  locale: Locale;
  email: string | null;
  displayName: string;
  firstName: string;
};

export type Ctx = {
  db: Db;
  now: () => number;
};

export function requireActor(actor: Actor | null): Actor {
  if (!actor) {
    throw new AppError("unauthenticated", 401);
  }
  return actor;
}

export function requireAdult(actor: Actor | null): Actor {
  const current = requireActor(actor);
  if (current.role === "student") {
    throw new AppError("forbidden", 403);
  }
  return current;
}

export function requireRole(
  actor: Actor | null,
  roles: readonly Role[],
): Actor {
  const current = requireAdult(actor);
  if (!roles.includes(current.role)) {
    throw new AppError("forbidden", 403);
  }
  return current;
}
