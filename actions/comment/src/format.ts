/**
 * Format a USD cost value.
 * null -> "---", zero -> "$0.00", < $0.01 -> 4 decimals, >= $0.01 -> 2 decimals.
 */
export function formatCost(usd: number | null): string {
  if (usd == null) return "---";
  if (usd === 0) return "$0.00";
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

/**
 * Format a per-token-type cost (USD).
 * Returns "---" when the value cannot be computed.
 */
export function formatTokenCost(usd: number | null): string {
  if (usd == null) return "---";
  if (usd === 0) return "$0.00";
  if (usd < 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}

/**
 * Format a duration.
 * null -> "---", < 60s -> "Xs", >= 60s -> "Xm Ys".
 */
export function formatDuration(seconds: number | null): string {
  if (seconds == null) return "---";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

/**
 * Format a number with comma separators.
 */
export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

/**
 * Format lines added/removed.
 * Returns "---" when both are null.
 */
export function formatLines(added: number | null, removed: number | null): string {
  if (added == null && removed == null) return "---";
  return `+${added ?? 0} -${removed ?? 0}`;
}
