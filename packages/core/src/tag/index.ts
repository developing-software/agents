// --- tag namespaces ---
export type EnvTag = `env:${string}`;
export type ServiceTag = `service:${string}`;

// --- gh refs ---
export type GhRefTag = `gh:${string}`;
export type GhRepoTag = `gh:repo:${string}`;
export type GhIssueTag = `gh:issue:${number}`;
export type GhPrTag = `gh:pr:${number}`;
export type GhRunTag = `gh:run:${number}`;
export type GhBranchTag = `gh:branch:${string}`;
export type GhTag = GhRepoTag | GhIssueTag | GhPrTag | GhRunTag | GhBranchTag;

// --- plan refs ---
export type PlanTag = `plan:${string}`;
export type ScopeTag = `scope:${string}`;
export type TypeTag = `type:${string}`;
export type HarnessTag = `harness:${string}`;

// --- union of all valid tags ---
export type Tag = EnvTag | ServiceTag | GhTag | PlanTag | ScopeTag | TypeTag | HarnessTag | (string & {});

// --- tag builders ---
export const Tags = {
  env: (name: string): EnvTag => `env:${name}`,
  ghRepo: (nameWithOwner: string): GhRepoTag => `gh:repo:${nameWithOwner}`,
  ghIssue: (n: number): GhIssueTag => `gh:issue:${n}`,
  ghPr: (n: number): GhPrTag => `gh:pr:${n}`,
  ghRun: (n: number): GhRunTag => `gh:run:${n}`,
  ghBranch: (name: string): GhBranchTag => `gh:branch:${name}`,
  plan: (id: string): PlanTag => `plan:${id}`,
  scope: (label: string): ScopeTag => `scope:${label}`,
  type: (label: string): TypeTag => `type:${label}`,
  harness: (name: string): HarnessTag => `harness:${name}`,
} as const;
