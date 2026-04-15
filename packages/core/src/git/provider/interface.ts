export type ProviderType = "github" | "gitlab" | "bitbucket" | "gitea";

export interface NormalizedRepo {
  providerId: string;   // provider's own ID
  fullName: string;   // "org/repo"
  private: boolean;
  defaultBranch: string;
  cloneUrl: string;   // https clone URL (includes token for auth)
  topics: string[];
}

export interface NormalizedWebhookEvent {
  kind: "push" | "pull_request" | "issue" | "release" | "installation";
  action?: string;
  repoFullName: string;
  actorLogin: string;
  payload: unknown;
}

export interface NormalizedCommit {
  sha: string;
  message: string;
  author: { name: string; email: string; date: Date };
  url: string;
}

export interface NormalizedTreeEntry {
  type: "blob" | "tree";
  path: string;
  sha: string;
  size?: number;
}

export interface GitProvider {
  readonly type: ProviderType;

  // ── Repo operations ──────────────────────────────────────
  listRepos(installationId: string): Promise<NormalizedRepo[]>;
  getRepo(fullName: string): Promise<NormalizedRepo>;
  getTree(fullName: string, ref: string, path?: string): Promise<NormalizedTreeEntry[]>;
  getBlob(fullName: string, ref: string, path: string): Promise<{ content: string; encoding: "utf8" | "base64" }>;
  getCommits(fullName: string, ref: string, opts?: { page?: number; perPage?: number }): Promise<NormalizedCommit[]>;

  // ── Webhooks ─────────────────────────────────────────────
  verifyWebhook(rawBody: string, signature: string): Promise<boolean>;
  parseWebhookEvent(payload: unknown): NormalizedWebhookEvent;

  // ── Installation/token lifecycle ─────────────────────────
  getInstallationToken(installationId: string): Promise<{ token: string; expiresAt: Date }>;
}
