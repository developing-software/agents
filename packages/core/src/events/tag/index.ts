import type { ProviderType } from "../../git/provider/interface";

// --- tag namespaces ---
export type EnvTag = `env:${string}`;
export type ServiceTag = `service:${string}`;

// --- git refs ---
export type GitProviderTag = `git:provider:${ProviderType}`;
export type GitRepoTag = `git:repo:${ProviderType}:${string}`;
export type GitIssueTag = `git:issue:${number}`;
export type GitPrTag = `git:pr:${number}`;
export type GitWorkflowTag = `git:workflow:${string}`;
export type GitBranchTag = `git:branch:${string}`;
export type GitTriggerTag = `git:trigger:${string}`;
export type GitTag =
  | GitProviderTag
  | GitRepoTag
  | GitIssueTag
  | GitPrTag
  | GitWorkflowTag
  | GitBranchTag
  | GitTriggerTag;
export type ParsedGitTag =
  | { kind: "provider"; tag: GitProviderTag; provider: ProviderType }
  | { kind: "repo"; tag: GitRepoTag; provider: ProviderType; fullName: string }
  | { kind: "issue"; tag: GitIssueTag; number: number }
  | { kind: "pr"; tag: GitPrTag; number: number }
  | { kind: "workflow"; tag: GitWorkflowTag; id: string }
  | { kind: "branch"; tag: GitBranchTag; name: string }
  | { kind: "trigger"; tag: GitTriggerTag; name: string };

// --- plan refs ---
export type PlanTag = `plan:${string}`;
export type ScopeTag = `scope:${string}`;
export type TypeTag = `type:${string}`;
export type HarnessTag = `harness:${string}`;
export type ModelTag = `model:${string}`;

// --- check & metric ---
export type CheckTag = `check:${string}`;
export type MetricTag = `metric:${string}`;

// --- union of all valid tags ---
export type Tag =
  | EnvTag
  | ServiceTag
  | GitTag
  | PlanTag
  | ScopeTag
  | TypeTag
  | HarnessTag
  | ModelTag
  | CheckTag
  | MetricTag
  | (string & {});

// --- tag builders ---
const providerTypes = ["github", "gitlab", "bitbucket", "gitea", "forjero"] as const;

function isProviderType(value: string): value is ProviderType {
  return providerTypes.includes(value as ProviderType);
}

function parseRepoTag(tag: string): Extract<ParsedGitTag, { kind: "repo" }> | null {
  if (!tag.startsWith("git:repo:")) return null;

  const remainder = tag.slice("git:repo:".length);
  const separator = remainder.indexOf(":");
  if (separator < 0) return null;

  const provider = remainder.slice(0, separator);
  const fullName = remainder.slice(separator + 1);
  if (!isProviderType(provider) || !fullName) return null;

  return { kind: "repo", tag: tag as GitRepoTag, provider, fullName };
}

function parseNumericTag<K extends "issue" | "pr">(
  tag: string,
  kind: K,
): Extract<ParsedGitTag, { kind: K }> | null {
  const prefix = `git:${kind}:`;
  if (!tag.startsWith(prefix)) return null;

  const raw = tag.slice(prefix.length);
  const number = Number.parseInt(raw, 10);
  if (Number.isNaN(number)) return null;

  if (kind === "issue") {
    return { kind, tag: tag as GitIssueTag, number } as Extract<ParsedGitTag, { kind: K }>;
  }

  return { kind, tag: tag as GitPrTag, number } as Extract<ParsedGitTag, { kind: K }>;
}

function parse(tag: string): ParsedGitTag | null {
  if (tag.startsWith("git:provider:")) {
    const provider = tag.slice("git:provider:".length);
    return isProviderType(provider)
      ? { kind: "provider", tag: tag as GitProviderTag, provider }
      : null;
  }

  const repo = parseRepoTag(tag);
  if (repo) return repo;

  const issue = parseNumericTag(tag, "issue");
  if (issue) return issue;

  const pr = parseNumericTag(tag, "pr");
  if (pr) return pr;

  if (tag.startsWith("git:workflow:")) {
    const id = tag.slice("git:workflow:".length);
    return id ? { kind: "workflow", tag: tag as GitWorkflowTag, id } : null;
  }

  if (tag.startsWith("git:branch:")) {
    const name = tag.slice("git:branch:".length);
    return name ? { kind: "branch", tag: tag as GitBranchTag, name } : null;
  }

  if (tag.startsWith("git:trigger:")) {
    const name = tag.slice("git:trigger:".length);
    return name ? { kind: "trigger", tag: tag as GitTriggerTag, name } : null;
  }

  return null;
}

function find<K extends ParsedGitTag["kind"]>(
  tags: string[],
  kind: K,
): Extract<ParsedGitTag, { kind: K }> | null {
  return collect(tags, kind)[0] ?? null;
}

function list(tags: string[]): ParsedGitTag[] {
  return tags.map((tag) => parse(tag)).filter((tag): tag is ParsedGitTag => tag !== null);
}

function collect<K extends ParsedGitTag["kind"]>(
  tags: string[],
  kind: K,
): Array<Extract<ParsedGitTag, { kind: K }>> {
  return list(tags).filter((tag): tag is Extract<ParsedGitTag, { kind: K }> => tag.kind === kind);
}

export const Tags = {
  env: (name: string): EnvTag => `env:${name}`,
  Git: {
    provider: (provider: ProviderType): GitProviderTag => `git:provider:${provider}`,
    repo: (provider: ProviderType, fullName: string): GitRepoTag =>
      `git:repo:${provider}:${fullName}`,
    issue: (n: number): GitIssueTag => `git:issue:${n}`,
    pr: (n: number): GitPrTag => `git:pr:${n}`,
    workflow: (id: string | number): GitWorkflowTag => `git:workflow:${id}`,
    branch: (name: string): GitBranchTag => `git:branch:${name}`,
    trigger: (name: string): GitTriggerTag => `git:trigger:${name}`,
    is: (tag: string): tag is GitTag => tag.startsWith("git:"),
    parse,
    list,
    find,
    collect,
  },
  plan: (id: string): PlanTag => `plan:${id}`,
  scope: (label: string): ScopeTag => `scope:${label}`,
  type: (label: string): TypeTag => `type:${label}`,
  harness: (name: string): HarnessTag => `harness:${name}`,
  model: (m: string): ModelTag => `model:${m}`,
  check: (category: string, name: string, outcome: string): CheckTag =>
    `check:${category}/${name}:${outcome}`,
  metric: (key: string, value: string): MetricTag => `metric:${key}:${value}`,
} as const;
