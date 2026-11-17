import type { Issue } from "@agents/core/issue";
import { toDay, today } from "@agents/ui/day";

/** Pipeline order — the board's column order, and the picker's menu order. */
export const STATUSES = ["backlog", "planned", "active", "blocked", "done"] as const;

const meta: Record<Issue.Status, { label: string; color: string }> = {
  backlog: { label: "Backlog", color: "var(--dim)" },
  planned: { label: "Planned", color: "var(--pending)" },
  active: { label: "Active", color: "var(--progress)" },
  blocked: { label: "Blocked", color: "var(--danger)" },
  done: { label: "Done", color: "var(--done)" },
};

export const label = (status: Issue.Status) => meta[status].label;

export const color = (status: Issue.Status) => meta[status].color;

/** The lifecycle the record header steps through; blocked stalls on Active's step. */
export const FLOW = ["backlog", "planned", "active", "done"] as const;

export const step = (status: Issue.Status) => (status === "blocked" ? 2 : FLOW.indexOf(status));

const moves: Partial<Record<Issue.Status, { to: Issue.Status; label: string }>> = {
  backlog: { to: "planned", label: "Plan" },
  planned: { to: "active", label: "Start" },
  active: { to: "done", label: "Mark done" },
  blocked: { to: "active", label: "Unblock" },
};

/** The header's one primary action, a single step along `FLOW`; done has none. */
export const next = (status: Issue.Status) => moves[status];

/** Past its due day in the zone with work outstanding; due today isn't late until the day ends. */
export const late = (issue: Issue.Info, zone: string) =>
  issue.status !== "done" && !!issue.dueDate && toDay(issue.dueDate, zone) < today(zone);
