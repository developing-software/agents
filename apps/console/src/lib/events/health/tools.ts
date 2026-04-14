/**
 * Health tool registry.
 *
 * Each entry describes how to present a single `category/name` check on the
 * health page: the tile it renders in the dashboard, the glyph on the check
 * card header, and a parser that can pull a single "headline" number out of
 * the free-form summary string emitted by the check.
 *
 * This registry is a plain array so other projects can extend it:
 *
 *   import { HEALTH_TOOLS } from "$lib/events/health/tools";
 *   HEALTH_TOOLS.push({ id: "myorg/custom", ... });
 *
 * Unknown checks fall back to a generic tile.
 */

export interface ToolHeadline {
  /** Big value shown in the tile. */
  value: string;
  /** Small label under the value. */
  unit?: string;
  /** Trend hint: 'up' | 'down' | 'flat' | undefined. */
  trend?: "up" | "down" | "flat";
}

export interface ToolDef {
  /** Matcher key: "category/name" or just "category" for a wildcard. */
  id: string;
  /** Display label shown as the tile heading. */
  label: string;
  /** Terminal-style glyph prefix (e.g. "▲", "◇"). Kept small & monochrome. */
  glyph?: string;
  /** Short one-line description shown as a tooltip-ish hint on the tile. */
  hint?: string;
  /**
   * Extract a headline value from the summary string. If it returns null the
   * tile shows the raw summary instead.
   */
  headline?: (summary: string | null) => ToolHeadline | null;
}

/** Pull the first number out of a summary string, if any. */
function firstNumber(s: string | null): string | null {
  if (!s) return null;
  const m = s.match(/-?\d+(?:\.\d+)?/);
  return m ? m[0] : null;
}

/** Extract "X.Y%" style. */
function firstPercent(s: string | null): string | null {
  if (!s) return null;
  const m = s.match(/(-?\d+(?:\.\d+)?)\s*%/);
  return m ? `${m[1]}%` : null;
}

export const HEALTH_TOOLS: ToolDef[] = [
  {
    id: "fallow/health",
    label: "Hotspots",
    glyph: "▲",
    hint: "Files that churn and resist change",
    headline: (s) => {
      const n = firstNumber(s);
      return n ? { value: n, unit: "hotspots" } : null;
    },
  },
  {
    id: "fallow/dead-code",
    label: "Dead code",
    glyph: "◌",
    hint: "Unused files, exports, types & cycles",
    headline: (s) => {
      const n = firstNumber(s);
      return n ? { value: n, unit: "issues" } : null;
    },
  },
  {
    id: "fallow/dupes",
    label: "Duplication",
    glyph: "◊",
    hint: "Code copied across files",
    headline: (s) => {
      const pct = firstPercent(s);
      if (pct) return { value: pct, unit: "of LOC" };
      const n = firstNumber(s);
      return n ? { value: n, unit: "clones" } : null;
    },
  },
  // --- Extension points for other projects ---------------------------
  // Projects can push ToolDef entries for their own category/name pairs
  // before the page renders. Example:
  // {
  //   id: "lighthouse/perf",
  //   label: "Lighthouse",
  //   glyph: "◉",
  //   headline: (s) => {
  //     const n = firstNumber(s);
  //     return n ? { value: n, unit: "score" } : null;
  //   },
  // }
];

/** Look up a tool def for a check, falling back to category-only matches. */
export function getToolDef(category: string, name: string): ToolDef | null {
  const full = `${category}/${name}`;
  return (
    HEALTH_TOOLS.find((t) => t.id === full) ?? HEALTH_TOOLS.find((t) => t.id === category) ?? null
  );
}
