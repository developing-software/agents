// Shared utility functions for plan rendering
import type { Plan } from "@agents/core/plan/index";

export type PlanStatus =
  | "draft"
  | "review"
  | "approved"
  | "implementing"
  | "completed"
  | "rejected";
export type AuthorType = "human" | "llm";

/**
 * Canonical shape for a plan in the console UI. Mirrors the core `Plan.Info`
 * so components don't fall out of sync when the schema changes.
 */
export type PlanItem = Plan.Info;

export function statusDotColor(status: string): string {
  switch (status) {
    case "draft":
      return "var(--color-dim)";
    case "review":
      return "var(--color-warning)";
    case "approved":
      return "var(--color-accent)";
    case "implementing":
      return "var(--color-accent)";
    case "completed":
      return "var(--color-success)";
    case "rejected":
      return "var(--color-danger)";
    default:
      return "var(--color-dim)";
  }
}

export function statusBadgeStyle(status: string): string {
  const color = statusDotColor(status);
  return `background: color-mix(in srgb, ${color} 12%, transparent); color: ${color}; border: 1px solid color-mix(in srgb, ${color} 25%, transparent);`;
}

export function authorBadgeStyle(authorType: string): string {
  switch (authorType) {
    case "human":
      return "background: color-mix(in srgb, var(--color-accent) 10%, transparent); color: var(--color-accent); border: 1px solid color-mix(in srgb, var(--color-accent) 25%, transparent);";
    case "llm":
      return "background: color-mix(in srgb, var(--color-merged) 10%, transparent); color: var(--color-merged); border: 1px solid color-mix(in srgb, var(--color-merged) 25%, transparent);";
    default:
      return "background: var(--color-elevated); color: var(--color-dim); border: 1px solid var(--color-border);";
  }
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export const PLAN_STATUSES: PlanStatus[] = [
  "draft",
  "review",
  "approved",
  "implementing",
  "completed",
  "rejected",
];
