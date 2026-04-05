export const COMMENT_MARKER = "<!-- dev-agents -->";
export const VISIBLE_RUNS_LIMIT = 5;

export type CommentPhase = "progress" | "summary";

/** Status emoji mapping */
export const STATUS_EMOJI: Record<string, string> = {
  success: ":white_check_mark:",
  failed: ":x:",
  failure: ":x:",
  timed_out: ":stopwatch:",
  cancelled: ":no_entry_sign:",
  needs_human: ":bust_in_silhouette:",
  running: ":hourglass_flowing_sand:",
};

export interface ProgressInputs {
  agent: string;
  model: string | null;
  runUrl: string;
  branch: string | null;
}

export interface RunRow {
  agent: string;
  model: string | null;
  status: string;
  costUsd: number | null;
  durationSeconds: number | null;
  linesAdded: number | null;
  linesRemoved: number | null;
}

export interface AgentData {
  name: string;
  sessionId: string | null;
  status: string | null;
  metrics: {
    tokens: {
      input: number | null;
      output: number | null;
      reasoning: number | null;
      cache_read: number | null;
      cache_creation: number | null;
    };
    turns: number | null;
    cost_usd: number | null;
    model: string | null;
  } | null;
  pricing: {
    heuristic: string;
    model: string;
    provider: string;
    cost: Record<string, number | undefined>;
    cost_usd: number | null;
  } | null;
}

export interface DiffData {
  linesAdded: number;
  linesRemoved: number;
}

export interface PrData {
  url: string;
  number: number | null;
}

export interface CheckData {
  outcome: string;
}

export interface ResultsData {
  agent: AgentData | null;
  diff: DiffData | null;
  pr: PrData | null;
  checks: Record<string, Record<string, CheckData>> | null;
}
