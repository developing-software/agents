// --- tag namespaces ---
export type EnvTag = `env:${string}`
export type ServiceTag = `service:${string}`

// --- gh refs ---
export type GhRefTag = `gh:${string}`
export type GhRepoTag = `gh:repo:${string}`
export type GhIssueTag = `gh:issue:${number}`
export type GhPrTag = `gh:pr:${number}`
export type GhRunTag = `gh:run:${number}`
export type GhBranchTag = `gh:branch:${string}`
export type GhTag = GhRepoTag | GhIssueTag | GhPrTag | GhRunTag | GhBranchTag
// -- metrics
//    metric:${metric_name}:${metric_value}
export type MetricTag = `metric:${string}:${string}`

// --- union of all valid tags ---
export type EventTag = EnvTag | ServiceTag | GhTag | MetricTag | (string & {})

export const OriginType = ["api", "webhook", "action", "console", "cli", "cron"] as const;
export type OriginType = (typeof OriginType)[number];

// --- tag builders ---
export const Tags = {
  env: (name: string): EnvTag => `env:${name}`,
  ghRepo: (nameWithOwner: string): GhRepoTag => `gh:repo:${nameWithOwner}`,
  ghIssue: (n: number): GhIssueTag => `gh:issue:${n}`,
  ghPr: (n: number): GhPrTag => `gh:pr:${n}`,
  ghRun: (n: number): GhRunTag => `gh:run:${n}`,
  metric: (name: string, value: string): MetricTag => `metric:${name}:${value}`,
  ghBranch: (name: string): GhBranchTag => `gh:branch:${name}`,
} as const;
