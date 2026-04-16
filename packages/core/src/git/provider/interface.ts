export type ProviderType = "github" | "gitlab" | "bitbucket" | "gitea" | "forjero";

// ── Normalized resource shapes ────────────────────────────────────────────

export interface NormalizedRepo {
  providerId: string;
  fullName: string;
  owner: string;
  repo: string;
  private: boolean;
  defaultBranch: string;
  cloneUrl: string;
  topics: string[];
}

export interface NormalizedBranch {
  name: string;
  sha: string;
  protected: boolean;
}

export interface NormalizedCommit {
  sha: string;
  message: string;
  author: { name: string; email: string; date: Date };
  url: string;
  parents?: string[];
  stats?: { additions: number; deletions: number; total: number };
}

export interface NormalizedTreeEntry {
  type: "blob" | "tree";
  path: string;
  sha: string;
  size?: number;
}

export interface NormalizedBlob {
  path: string;
  sha: string;
  size: number;
  content: string;
  encoding: "utf8" | "base64";
}

export interface NormalizedIssue {
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  author: string;
  labels: string[];
  createdAt: Date;
  updatedAt: Date;
  url: string;
}

export interface NormalizedPullRequest {
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed" | "merged";
  author: string;
  headBranch: string;
  baseBranch: string;
  draft: boolean;
  mergeable: boolean | null;
  createdAt: Date;
  updatedAt: Date;
  url: string;
}

export interface NormalizedActionRun {
  id: string;
  name: string;
  status: "queued" | "in_progress" | "completed";
  conclusion?: "success" | "failure" | "cancelled" | "skipped";
  branch: string;
  sha: string;
  url: string;
  createdAt: Date;
}

export interface NormalizedAction {
  id: string;
  name: string;
  path: string;
  state: "active" | "disabled";
}

export type WebhookEventKind =
  | "push"
  | "pull_request"
  | "issue"
  | "release"
  | "installation"
  | "installation_repositories"
  | "repository"
  | "unknown";

export interface NormalizedWebhookEvent {
  kind: WebhookEventKind;
  action?: string;
  repoFullName?: string;
  actorLogin?: string;
  deliveryId?: string;
  payload: unknown;
}

export interface CommitFilesInput {
  fullName: string;
  files: Array<{ path: string; content: string }>;
  message: string;
  mode: "direct" | "pr";
  base?: string;
  branch?: string;
  prTitle?: string;
  prBody?: string;
}

export interface CommitFilesResult {
  mode: "direct" | "pr";
  branch: string;
  commitSha?: string;
  pr?: { number: number; url: string; branch: string };
}

// ── Grouped sub-interfaces ────────────────────────────────────────────────

export interface RepoOps {
  list(installationRef: string): Promise<NormalizedRepo[]>;
  get(fullName: string): Promise<NormalizedRepo>;
  getTree(
    fullName: string,
    ref: string,
    path?: string,
  ): Promise<NormalizedTreeEntry[]>;
  getBlob(fullName: string, ref: string, path: string): Promise<NormalizedBlob>;
  getCommits(
    fullName: string,
    ref: string,
    opts?: { page?: number; perPage?: number; path?: string },
  ): Promise<NormalizedCommit[]>;
  getCommit(fullName: string, sha: string): Promise<NormalizedCommit>;
  getInstallationToken(
    installationRef: string,
  ): Promise<{ token: string; expiresAt: Date }>;
}

export interface BranchOps {
  list(fullName: string): Promise<NormalizedBranch[]>;
  get(fullName: string, name: string): Promise<NormalizedBranch | null>;
  delete(fullName: string, name: string): Promise<void>;
  isReserved(name: string): boolean;
}

export interface IssueOps {
  list(
    fullName: string,
    opts?: {
      state?: "open" | "closed" | "all";
      page?: number;
      perPage?: number;
    },
  ): Promise<NormalizedIssue[]>;
  get(fullName: string, number: number): Promise<NormalizedIssue | null>;
  create(
    fullName: string,
    input: { title: string; body?: string; labels?: string[] },
  ): Promise<NormalizedIssue>;
  update(
    fullName: string,
    number: number,
    input: {
      title?: string;
      body?: string;
      state?: "open" | "closed";
      labels?: string[];
    },
  ): Promise<NormalizedIssue>;
  addLabels(fullName: string, number: number, labels: string[]): Promise<void>;
  removeLabel(fullName: string, number: number, label: string): Promise<void>;
}

export interface PullRequestOps {
  list(
    fullName: string,
    opts?: {
      state?: "open" | "closed" | "merged" | "all";
      page?: number;
      perPage?: number;
    },
  ): Promise<NormalizedPullRequest[]>;
  get(fullName: string, number: number): Promise<NormalizedPullRequest | null>;
  getDiff(fullName: string, number: number): Promise<string>;
  create(
    fullName: string,
    input: {
      title: string;
      head: string;
      base: string;
      body?: string;
      draft?: boolean;
    },
  ): Promise<NormalizedPullRequest>;
  merge(
    fullName: string,
    number: number,
    opts?: { method?: "squash" | "merge" | "rebase" },
  ): Promise<{ merged: boolean; message: string }>;
  close(fullName: string, number: number): Promise<void>;
}

export type DirEntryKind = "file" | "dir" | "symlink" | "submodule";

export interface NormalizedDirEntry {
  type: DirEntryKind;
  name: string;
  path: string;
  sha: string;
  size: number;
}

export interface ContentOps {
  readFile(
    fullName: string,
    path: string,
    ref?: string,
  ): Promise<{ content: string; sha: string } | null>;
  listDir(
    fullName: string,
    path: string,
    ref?: string,
  ): Promise<NormalizedDirEntry[] | null>;
  writeFile(
    fullName: string,
    input: {
      path: string;
      content: string;
      message: string;
      branch?: string;
      sha?: string;
    },
  ): Promise<void>;
  deleteFile(
    fullName: string,
    input: {
      path: string;
      message: string;
      sha: string;
      branch?: string;
    },
  ): Promise<void>;
  commitFiles(input: CommitFilesInput): Promise<CommitFilesResult>;
}

export interface ActionOps {
  list(fullName: string): Promise<NormalizedAction[]>;
  dispatch(
    fullName: string,
    input: { action: string; ref: string; inputs?: Record<string, string> },
  ): Promise<void>;
  listRuns(
    fullName: string,
    opts?: {
      action?: string;
      branch?: string;
      page?: number;
      perPage?: number;
    },
  ): Promise<NormalizedActionRun[]>;
}

export interface WebhookOps {
  verify(rawBody: string, signature: string): Promise<boolean>;
  parse(payload: unknown): NormalizedWebhookEvent;
}

// ── Top-level provider contract ───────────────────────────────────────────

export interface GitProvider {
  readonly type: ProviderType;
  readonly repos: RepoOps;
  readonly branches: BranchOps;
  readonly issues: IssueOps;
  readonly pulls: PullRequestOps;
  readonly content: ContentOps;
  readonly actions: ActionOps;
  readonly webhooks: WebhookOps;
}
