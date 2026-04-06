import { STATUS_EMOJI, type RunRow } from "../types";

/** Reverse lookup: emoji -> status key */
const EMOJI_TO_STATUS = Object.fromEntries(Object.entries(STATUS_EMOJI).map(([k, v]) => [v, k]));

/**
 * Parse a duration string back to seconds.
 * "4m" -> 240, "2m 15s" -> 135, "45s" -> 45, "---" -> null
 */
function parseDuration(str: string): number | null {
  if (!str || str === "---") return null;
  const mMatch = str.match(/(\d+)m(?:\s+(\d+)s)?/);
  if (mMatch) return parseInt(mMatch[1]!, 10) * 60 + parseInt(mMatch[2] ?? "0", 10);
  const sMatch = str.match(/(\d+)s/);
  if (sMatch) return parseInt(sMatch[1]!, 10);
  return null;
}

/**
 * Parse a cost string back to USD.
 * "$4.52" -> 4.52, "$0.0045" -> 0.0045, "---" -> null
 */
function parseCost(str: string): number | null {
  if (!str || str === "---") return null;
  const cleaned = str.replace(/[$*]/g, "");
  const value = parseFloat(cleaned);
  return Number.isNaN(value) ? null : value;
}

/**
 * Parse a lines string back to added/removed.
 * "+120 -30" -> { added: 120, removed: 30 }, "---" -> null
 */
function parseLines(str: string): { added: number; removed: number } | null {
  if (!str || str === "---") return null;
  const match = str.match(/\+(\d+)\s+-(\d+)/);
  if (!match) return null;
  return { added: parseInt(match[1]!, 10), removed: parseInt(match[2]!, 10) };
}

/**
 * Parse table row strings into RunRow objects.
 */
function parseTableRows(rawRows: string): RunRow[] {
  return rawRows
    .trim()
    .split("\n")
    .filter((r) => r.startsWith("|") && !r.includes("**Total**"))
    .map((row) => {
      const cells = row
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean);

      // Expected: # | Agent | Model | Status | Cost | Duration | Lines
      if (cells.length < 7) return null;

      const agent = cells[1] ?? "";
      const model = cells[2] && cells[2] !== "---" ? cells[2] : null;
      const statusEmoji = cells[3] ?? "";
      const costUsd = parseCost(cells[4] ?? "");
      const durationSeconds = parseDuration(cells[5] ?? "");
      const lines = parseLines(cells[6] ?? "");
      const status = EMOJI_TO_STATUS[statusEmoji] ?? "other";

      return {
        agent,
        model,
        status,
        costUsd,
        durationSeconds,
        linesAdded: lines?.added ?? null,
        linesRemoved: lines?.removed ?? null,
      } satisfies RunRow;
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);
}

/**
 * Parse existing run rows from a comment body.
 * Prefers the collapsible "All N runs" section (full history),
 * falling back to the main table.
 * Returns empty array on failure.
 */
export function parseExistingRuns(body: string): RunRow[] {
  try {
    // When >5 runs exist the full history lives in the collapsible
    const detailsMatch = body.match(
      /<summary>All \d+ runs<\/summary>\n\n([\s\S]+?)\n\n<\/details>/,
    );
    if (detailsMatch?.[1]) {
      const tableMatch = detailsMatch[1].match(/\| #.*?\n\|[-|: ]+\n((?:\|.*\n?)*)/s);
      if (tableMatch?.[1]) return parseTableRows(tableMatch[1]);
    }

    // Fall back to the main table
    const tableMatch = body.match(/\| #.*?\n\|[-|: ]+\n((?:\|.*\n?)*)/s);
    if (!tableMatch?.[1]) return [];
    return parseTableRows(tableMatch[1]);
  } catch {
    return [];
  }
}
