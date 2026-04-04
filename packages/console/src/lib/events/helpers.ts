// Shared utility functions for event rendering

import { AgentEvent } from "@agents/core/events/agent";

export type EventMetrics = AgentEvent.Completed.Metrics;

// ── Formatters ──────────────────────────────────────────────────────────

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}s`;
  const m = Math.floor(s / 60);
  const rem = Math.round(s % 60);
  return rem > 0 ? `${m}m ${rem}s` : `${m}m`;
}

export function formatCost(v: number): string {
  return `$${v.toFixed(2)}`;
}

export function formatTokens(v: number): string {
  return v.toLocaleString();
}

export function formatTokensCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Display helpers ─────────────────────────────────────────────────────

export function eventDotColor(type: string): string {
  if (type.startsWith("agent.")) return "var(--color-accent)";
  if (type.startsWith("tests.")) return "var(--color-success)";
  if (type.startsWith("lint.")) return "var(--color-merged)";
  if (type.startsWith("github.issues.")) return "var(--color-success)";
  if (type.startsWith("github.pull_request.")) return "var(--color-merged)";
  if (type === "github.push") return "var(--color-dim)";
  return "var(--color-warning)";
}

export function originBadgeStyle(origin: string): string {
  switch (origin) {
    case "action":
      return "background: color-mix(in srgb, var(--color-accent) 15%, transparent); color: var(--color-accent);";
    case "cli":
      return "background: color-mix(in srgb, var(--color-warning) 12%, transparent); color: var(--color-warning);";
    case "console":
      return "background: color-mix(in srgb, var(--color-merged) 12%, transparent); color: var(--color-merged);";
    default:
      return "background: var(--color-elevated); color: var(--color-muted);";
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

export function typePrefix(type: string): string {
  const dot = type.indexOf(".");
  return dot === -1 ? type : type.slice(0, dot);
}

// Tag utilities — re-exported from shared $lib/tag module
export {
  tagCategoryStyle,
  otherTags,
  envTag,
  serviceTag,
  branchTag,
  workflowRef,
  issueRef,
  prRef,
  triggerTag,
} from "$lib/ui/tag/tag-helpers";

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function extractMetrics(data: Record<string, unknown>): EventMetrics | null {
  return AgentEvent.Completed.parse(data).agent.metrics;
}

export function formatMetricValue(name: string, value: number): string {
  if (name === "cost_usd") return `$${value.toFixed(3)}`;
  if (name === "tokens") return value.toLocaleString();
  return String(value);
}

export function flattenChecks(
  raw: Record<string, Record<string, { outcome: string }>> | undefined,
): Array<{ category: string; name: string; outcome: string }> {
  if (!raw) return [];
  const result: Array<{ category: string; name: string; outcome: string }> = [];
  for (const [category, names] of Object.entries(raw)) {
    for (const [name, checkData] of Object.entries(names)) {
      result.push({ category, name, outcome: checkData.outcome });
    }
  }
  return result;
}
