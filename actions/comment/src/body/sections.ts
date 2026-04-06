import { formatNumber, formatTokenCost } from "../format";
import type { AgentData, CheckData } from "../types";

const CHECK_EMOJI: Record<string, string> = {
  success: ":white_check_mark: pass",
  failure: ":x: fail",
  cancelled: ":no_entry_sign: cancelled",
  skipped: ":fast_forward: skipped",
};

/**
 * Build a collapsible token breakdown section for the latest run.
 * Returns null if no token data is available.
 */
export function buildTokenBreakdown(agent: AgentData): string | null {
  const metrics = agent.metrics;
  if (!metrics?.tokens) return null;

  const { tokens } = metrics;
  const input = tokens.input ?? 0;
  const output = tokens.output ?? 0;
  const cacheRead = tokens.cache_read ?? 0;
  const cacheWrite = tokens.cache_creation ?? 0;

  // If all zero, skip
  if (input === 0 && output === 0 && cacheRead === 0 && cacheWrite === 0) return null;

  // Calculate per-type cost using pricing data
  const cost = agent.pricing?.cost as Record<string, number | undefined> | undefined;
  const perM = (count: number, pricePerM: number | undefined): string => {
    if (pricePerM == null) return "---";
    return formatTokenCost((count / 1_000_000) * pricePerM);
  };

  const rows = [
    `| Input | ${formatNumber(input)} | ${perM(input, cost?.input)} |`,
    `| Output | ${formatNumber(output)} | ${perM(output, cost?.output)} |`,
    `| Cache reads | ${formatNumber(cacheRead)} | ${perM(cacheRead, cost?.cache_read)} |`,
    `| Cache writes | ${formatNumber(cacheWrite)} | ${perM(cacheWrite, cost?.cache_write)} |`,
  ].join("\n");

  // Cache hit rate = reads / (reads + writes + input)
  const totalPrompt = cacheRead + cacheWrite + input;
  const cacheHitRate = totalPrompt > 0 ? Math.round((cacheRead / totalPrompt) * 100) : 0;

  const meta = [
    metrics.model ? `Model: ${metrics.model}` : null,
    metrics.turns ? `${metrics.turns} turns` : null,
    cacheRead > 0 ? `${cacheHitRate}% cache hit rate` : null,
    agent.pricing ? `Pricing: ${agent.pricing.heuristic} (${agent.pricing.provider})` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return [
    "<details>",
    "<summary>Token breakdown</summary>",
    "",
    "| Type | Tokens | Cost |",
    "|------|--------|------|",
    rows,
    "",
    ...(meta ? [meta] : []),
    "",
    "</details>",
  ].join("\n");
}

/**
 * Build a collapsible checks section.
 * Returns null if no checks data is available.
 */
export function buildChecksSection(
  checks: Record<string, Record<string, CheckData>>,
): string | null {
  const rows: string[] = [];
  let passed = 0;
  let total = 0;

  for (const [category, categoryChecks] of Object.entries(checks)) {
    for (const [name, data] of Object.entries(categoryChecks)) {
      total++;
      if (data.outcome === "success") passed++;
      const emoji = CHECK_EMOJI[data.outcome] ?? data.outcome;
      rows.push(`| ${category}/${name} | ${emoji} |`);
    }
  }

  if (rows.length === 0) return null;

  const summaryText =
    passed === total ? `Checks (${passed}/${total} passed)` : `Checks (${passed}/${total} passed)`;

  return [
    "<details>",
    `<summary>${summaryText}</summary>`,
    "",
    "| Check | Result |",
    "|-------|--------|",
    ...rows,
    "",
    "</details>",
  ].join("\n");
}
