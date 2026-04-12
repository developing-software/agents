export type PlanRun = {
  id: string;
  agent: string;
  model: string | null;
  prNumber: number | null;
  prState: string | null;
  prUrl: string | null;
  runUrl: string | null;
  cost_usd: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  turns: number | null;
  durationMs: number | null;
  linesAdded: number | null;
  linesRemoved: number | null;
  checks: Array<{ category: string; name: string; outcome: string }>;
  tags: string[];
  timeCreated: string;
};

export type ReviewResult = {
  agent: string;
  prNumber: number;
  scores: { adherence: number; quality: number; completeness: number };
  verdict: string;
  suggestions?: string[];
  eventId?: string;
};

export type CompareRanking = {
  rank: number;
  agent: string;
  prNumber: number;
  scores: { adherence: number; quality: number; completeness: number };
  note?: string;
};

export type CompareResult = {
  rankings: CompareRanking[];
  winner: { agent: string; prNumber: number };
  reasoning: string;
};
