import type { Issue } from "@agents/core/issue";
import { sorted } from "#lib/utils/sort.ts";

/** Mirrored from core, type-only — `satisfies` fails the build if a key is renamed there. */
type Key = NonNullable<Parameters<typeof Issue.list>[0]["sort"]>[number];

export const sort = sorted([
  "title",
  "status",
  "stage",
  "assignee",
  "startDate",
  "dueDate",
  "timeCreated",
] as const satisfies readonly Exclude<Key, `-${string}`>[]);
