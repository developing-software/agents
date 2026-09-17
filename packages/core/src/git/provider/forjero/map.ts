import type {
  ActionRun,
  Branch,
  Commit,
  ContentsResponse,
  GitEntry,
  Issue,
  PullRequest,
  Repository as ForjeroRepository,
  User,
} from "forjero-sdk";
import type {
  NormalizedAction,
  NormalizedActionRun,
  NormalizedBranch,
  NormalizedCommit,
  NormalizedDirEntry,
  NormalizedIssue,
  NormalizedPullRequest,
  NormalizedRepo,
  NormalizedTreeEntry,
  WebhookEventKind,
} from "../interface";

function ownerLogin(user: User | undefined, fullName: string | undefined): string {
  if (user?.login) return user.login;
  if (fullName) return fullName.split("/")[0] ?? "";
  return "";
}

export function mapRepo(data: ForjeroRepository): NormalizedRepo {
  const fullName = data.full_name ?? "";
  const [ownerFromName, repoFromName] = fullName.split("/");
  return {
    providerId: String(data.id ?? ""),
    fullName,
    owner: ownerLogin(data.owner, fullName) || (ownerFromName ?? ""),
    repo: data.name ?? repoFromName ?? "",
    private: !!data.private,
    defaultBranch: data.default_branch ?? "main",
    cloneUrl: data.clone_url ?? "",
    topics: data.topics ?? [],
  };
}

export function mapBranch(data: Branch): NormalizedBranch {
  return {
    name: data.name ?? "",
    sha: data.commit?.id ?? "",
    protected: !!data.protected,
  };
}

export function mapCommit(data: Commit): NormalizedCommit {
  const author = data.commit?.author;
  return {
    sha: data.sha ?? "",
    message: data.commit?.message ?? "",
    author: {
      name: author?.name ?? "",
      email: author?.email ?? "",
      date: author?.date ? new Date(author.date) : new Date(0),
    },
    url: data.html_url ?? data.url ?? "",
    parents: data.parents?.map((p) => p.sha ?? "").filter(Boolean),
    stats: data.stats
      ? {
          additions: data.stats.additions ?? 0,
          deletions: data.stats.deletions ?? 0,
          total: data.stats.total ?? 0,
        }
      : undefined,
  };
}

export function mapTreeEntry(entry: GitEntry): NormalizedTreeEntry {
  return {
    type: entry.type === "tree" ? "tree" : "blob",
    path: entry.path ?? "",
    sha: entry.sha ?? "",
    size: entry.size,
  };
}

export function mapDirEntry(entry: ContentsResponse): NormalizedDirEntry {
  const t = entry.type;
  const kind: NormalizedDirEntry["type"] =
    t === "dir" || t === "symlink" || t === "submodule" ? t : "file";
  return {
    type: kind,
    name: entry.name ?? "",
    path: entry.path ?? "",
    sha: entry.sha ?? "",
    size: entry.size ?? 0,
  };
}

export function mapIssue(data: Issue): NormalizedIssue {
  return {
    number: data.number ?? 0,
    title: data.title ?? "",
    body: data.body ?? null,
    state: data.state === "closed" ? "closed" : "open",
    author: ownerLogin(data.user, undefined),
    labels: (data.labels ?? []).map((l) => l.name ?? ""),
    createdAt: data.created_at ? new Date(data.created_at) : new Date(0),
    updatedAt: data.updated_at ? new Date(data.updated_at) : new Date(0),
    url: data.html_url ?? data.url ?? "",
  };
}

export function mapPullRequest(data: PullRequest): NormalizedPullRequest {
  const merged = !!data.merged || !!data.merged_at;
  return {
    number: data.number ?? 0,
    title: data.title ?? "",
    body: data.body ?? null,
    state: merged ? "merged" : data.state === "closed" ? "closed" : "open",
    author: ownerLogin(data.user, undefined),
    headBranch: data.head?.ref ?? "",
    baseBranch: data.base?.ref ?? "",
    draft: !!data.draft,
    mergeable: typeof data.mergeable === "boolean" ? data.mergeable : null,
    createdAt: data.created_at ? new Date(data.created_at) : new Date(0),
    updatedAt: data.updated_at ? new Date(data.updated_at) : new Date(0),
    url: data.html_url ?? data.url ?? "",
  };
}

export function mapAction(workflowFile: string): NormalizedAction {
  return {
    id: workflowFile,
    name: workflowFile,
    path: `.forgejo/workflows/${workflowFile}`,
    state: "active",
  };
}

export function mapActionRun(data: ActionRun): NormalizedActionRun {
  const status: NormalizedActionRun["status"] = (() => {
    const s = data.status;
    if (s === "waiting" || s === "blocked") return "queued";
    if (s === "running") return "in_progress";
    return "completed";
  })();
  const conclusion = ((): NormalizedActionRun["conclusion"] => {
    const s = data.status;
    if (s === "success" || s === "failure" || s === "cancelled" || s === "skipped") return s;
    return undefined;
  })();
  return {
    id: String(data.id ?? ""),
    name: data.title ?? data.workflow_id ?? "",
    status,
    conclusion,
    branch: data.prettyref ?? "",
    sha: data.commit_sha ?? "",
    url: data.html_url ?? "",
    createdAt: data.created ? new Date(data.created) : new Date(0),
  };
}

export function mapWebhookKindFromEvent(eventName: string | undefined): WebhookEventKind {
  switch (eventName) {
    case "push":
      return "push";
    case "pull_request":
    case "pull_request_assign":
    case "pull_request_label":
    case "pull_request_milestone":
    case "pull_request_comment":
    case "pull_request_review":
    case "pull_request_review_request":
    case "pull_request_sync":
      return "pull_request";
    case "issues":
    case "issue_assign":
    case "issue_label":
    case "issue_milestone":
    case "issue_comment":
      return "issue";
    case "release":
      return "release";
    case "repository":
      return "repository";
    default:
      return "unknown";
  }
}

export function mapWebhookKind(payload: unknown): WebhookEventKind {
  if (!payload || typeof payload !== "object") return "unknown";
  const p = payload as {
    action?: string;
    ref?: string;
    commits?: unknown;
    pull_request?: unknown;
    issue?: unknown;
    release?: unknown;
    repository?: unknown;
  };
  if ("commits" in p && "ref" in p) return "push";
  if ("pull_request" in p) return "pull_request";
  if ("issue" in p) return "issue";
  if ("release" in p) return "release";
  if ("repository" in p && p.action) return "repository";
  return "unknown";
}
