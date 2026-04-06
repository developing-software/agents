import { formatCost, formatDuration, formatLines } from "../format";
import {
  COMMENT_MARKER,
  STATUS_EMOJI,
  VISIBLE_RUNS_LIMIT,
  type ResultsData,
  type RunRow,
} from "../types";
import { parseExistingRuns } from "./history";
import { buildChecksSection, buildTokenBreakdown } from "./sections";

const TABLE_HEADER = [
  "| # | Agent | Model | Status | Cost | Duration | Lines |",
  "|---|-------|-------|--------|------|----------|-------|",
];

/** Build table row strings for a slice of runs, numbered from startIndex. */
function buildTableRows(runs: RunRow[], startIndex: number): string[] {
  return runs.map((run, i) => {
    const icon = STATUS_EMOJI[run.status] ?? ":grey_question:";
    return `| ${startIndex + i} | ${run.agent} | ${run.model ?? "---"} | ${icon} | ${formatCost(run.costUsd)} | ${formatDuration(run.durationSeconds)} | ${formatLines(run.linesAdded, run.linesRemoved)} |`;
  });
}

/**
 * Build the complete comment body for the "summary" phase.
 * Parses existing comment to extract previous runs and prepends the new one.
 */
export function buildSummaryBody(params: {
  results: ResultsData;
  existingBody: string | null;
  runUrl: string;
  consoleUrl: string | null;
  eventId: string | null;
}): string {
  const { results, existingBody, runUrl, consoleUrl, eventId } = params;

  // Build the new run row from results
  const agent = results.agent;
  const newRun: RunRow = {
    agent: agent?.name ?? "agent",
    model: agent?.metrics?.model ?? null,
    status: agent?.status ?? "success",
    costUsd: agent?.metrics?.cost_usd ?? agent?.pricing?.cost_usd ?? null,
    durationSeconds: null, // Duration is workflow-level, not available in agent data
    linesAdded: results.diff?.linesAdded ?? null,
    linesRemoved: results.diff?.linesRemoved ?? null,
  };

  // Parse existing runs and prepend the new one (newest first)
  const previousRuns = existingBody ? parseExistingRuns(existingBody) : [];
  const allRuns: RunRow[] = [newRun, ...previousRuns];

  // Compute total cost
  const totalCost = allRuns.reduce((sum, r) => sum + (r.costUsd ?? 0), 0);
  const showTotal = allRuns.length > 1;
  const totalRow = showTotal ? `| **Total** | | | | **${formatCost(totalCost)}** | | |` : "";

  // Visible runs in main table
  const visibleRuns = allRuns.slice(0, VISIBLE_RUNS_LIMIT);
  const hasMore = allRuns.length > VISIBLE_RUNS_LIMIT;

  const lines: string[] = [
    COMMENT_MARKER,
    "## Agent Run Summary",
    "",
    ...TABLE_HEADER,
    ...buildTableRows(visibleRuns, 1),
    ...(totalRow ? [totalRow] : []),
    "",
  ];

  // Collapsible full history when > VISIBLE_RUNS_LIMIT
  if (hasMore) {
    lines.push(
      "<details>",
      `<summary>All ${allRuns.length} runs</summary>`,
      "",
      ...TABLE_HEADER,
      ...buildTableRows(allRuns, 1),
      ...(totalRow ? [totalRow] : []),
      "",
      "</details>",
      "",
    );
  }

  // Token breakdown for the latest run
  if (agent) {
    const tokenSection = buildTokenBreakdown(agent);
    if (tokenSection) {
      lines.push(tokenSection, "");
    }
  }

  // Checks section
  if (results.checks) {
    const checksSection = buildChecksSection(results.checks);
    if (checksSection) {
      lines.push(checksSection, "");
    }
  }

  // Footer links
  const footerParts: string[] = [];
  if (runUrl) footerParts.push(`[View run](${runUrl})`);
  if (results.pr?.url) footerParts.push(`[PR](${results.pr.url})`);
  if (consoleUrl && eventId) footerParts.push(`[Console](${consoleUrl}/events/${eventId})`);
  if (footerParts.length > 0) {
    lines.push(footerParts.join(" · "));
  }

  return lines.join("\n");
}
