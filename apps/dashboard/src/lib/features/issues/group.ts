import type { Issue } from "@agents/core/issue";
import { STATUSES, color, label } from "./status";

export type By = "status" | "stage" | "assignee";

export type Group = { key: string; label: string; color?: string; items: Issue.Info[] };

/** Earliest planned start in a bucket, so stages and people line up chronologically. */
function first(items: Issue.Info[]) {
  const dates = items.map((issue) => issue.startDate).filter((date) => date !== null);
  return dates.length ? Math.min(...dates.map(Date.parse)) : Infinity;
}

function bucket(issues: Issue.Info[], by: By) {
  const out = new Map<string, { label: string; items: Issue.Info[] }>();
  for (const issue of issues) {
    const at = by === "stage" ? issue.stage : issue.assignee?.id;
    const name = by === "stage" ? issue.stage : issue.assignee?.name;
    const key = at ?? "none";
    const seen = out.get(key);
    if (seen) seen.items.push(issue);
    else
      out.set(key, { label: name ?? (by === "stage" ? "No stage" : "Unassigned"), items: [issue] });
  }
  return out;
}

/**
 * Client-side grouping for the board and the timeline — one `getIssues` feeds every view,
 * so switching how work is sliced never costs a round trip.
 */
export function group(issues: Issue.Info[], by: By): Group[] {
  if (by === "status")
    return STATUSES.map((status) => ({
      key: status,
      label: label(status),
      color: color(status),
      items: issues.filter((issue) => issue.status === status),
    }));

  // Unplaced work sorts by date like everything else — pinning it last would hide the
  // earliest thing on the board. With no dates at all, `first` is Infinity and it lands
  // at the end anyway.
  return [...bucket(issues, by)]
    .map(([key, group]) => ({ key, ...group }))
    .sort((a, b) => first(a.items) - first(b.items) || a.label.localeCompare(b.label));
}
