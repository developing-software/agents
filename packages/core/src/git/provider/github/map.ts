import type { RestEndpointMethodTypes } from "@octokit/rest";
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

type RepoGetData = RestEndpointMethodTypes["repos"]["get"]["response"]["data"];
type InstallationRepo =
  RestEndpointMethodTypes["apps"]["listReposAccessibleToInstallation"]["response"]["data"]["repositories"][number];
type TreeEntry = RestEndpointMethodTypes["git"]["getTree"]["response"]["data"]["tree"][number];
type ContentItem = Extract<
  RestEndpointMethodTypes["repos"]["getContent"]["response"]["data"],
  unknown[]
>[number];
type BranchSummary = RestEndpointMethodTypes["repos"]["listBranches"]["response"]["data"][number];
type CommitListItem = RestEndpointMethodTypes["repos"]["listCommits"]["response"]["data"][number];
type CommitDetail = RestEndpointMethodTypes["repos"]["getCommit"]["response"]["data"];
type IssueItem = RestEndpointMethodTypes["issues"]["listForRepo"]["response"]["data"][number];
type IssueDetail = RestEndpointMethodTypes["issues"]["get"]["response"]["data"];
type PullListItem = RestEndpointMethodTypes["pulls"]["list"]["response"]["data"][number];
type PullDetail = RestEndpointMethodTypes["pulls"]["get"]["response"]["data"];
type WorkflowItem =
  RestEndpointMethodTypes["actions"]["listRepoWorkflows"]["response"]["data"]["workflows"][number];
type WorkflowRun =
  RestEndpointMethodTypes["actions"]["listWorkflowRuns"]["response"]["data"]["workflow_runs"][number];

export function mapRepo(data: RepoGetData | InstallationRepo): NormalizedRepo {
  const [ownerFromName, repoFromName] = data.full_name.split("/") as [string, string];
  return {
    providerId: String(data.id),
    fullName: data.full_name,
    owner: data.owner?.login ?? ownerFromName,
    repo: repoFromName,
    private: data.private,
    defaultBranch: data.default_branch ?? "main",
    cloneUrl: data.clone_url ?? "",
    topics: data.topics ?? [],
  };
}

export function mapTreeEntry(entry: TreeEntry): NormalizedTreeEntry {
  return {
    type: entry.type === "tree" ? "tree" : "blob",
    path: entry.path ?? "",
    sha: entry.sha ?? "",
    size: entry.size,
    isSymlink: entry.mode === "120000",
  };
}

export function mapDirEntry(entry: ContentItem): NormalizedDirEntry {
  const kind: NormalizedDirEntry["type"] =
    entry.type === "dir" || entry.type === "symlink" || entry.type === "submodule"
      ? entry.type
      : "file";
  return {
    type: kind,
    name: entry.name,
    path: entry.path,
    sha: entry.sha,
    size: entry.size,
  };
}

export function mapBranch(data: BranchSummary): NormalizedBranch {
  return {
    name: data.name,
    sha: data.commit?.sha ?? "",
    protected: !!data.protected,
  };
}

export function mapCommit(data: CommitListItem | CommitDetail): NormalizedCommit {
  const author = data.commit.author;
  const stats = "stats" in data ? data.stats : undefined;
  return {
    sha: data.sha,
    message: data.commit.message,
    author: {
      name: author?.name ?? "",
      email: author?.email ?? "",
      date: author?.date ? new Date(author.date) : new Date(0),
    },
    url: data.html_url ?? "",
    parents: data.parents?.map((p) => p.sha),
    stats: stats
      ? {
          additions: stats.additions ?? 0,
          deletions: stats.deletions ?? 0,
          total: stats.total ?? 0,
        }
      : undefined,
  };
}

export function mapIssue(data: IssueItem | IssueDetail): NormalizedIssue {
  return {
    number: data.number,
    title: data.title,
    body: data.body ?? null,
    state: data.state === "closed" ? "closed" : "open",
    author: data.user?.login ?? "",
    labels: (data.labels ?? []).map((l) => (typeof l === "string" ? l : (l?.name ?? ""))),
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    url: data.html_url,
  };
}

export function mapPullRequest(data: PullListItem | PullDetail): NormalizedPullRequest {
  const mergedFlag = "merged" in data ? !!data.merged : !!data.merged_at;
  const mergeable = "mergeable" in data ? (data.mergeable ?? null) : null;
  return {
    number: data.number,
    title: data.title,
    body: data.body ?? null,
    state: mergedFlag ? "merged" : data.state === "closed" ? "closed" : "open",
    author: data.user?.login ?? "",
    headBranch: data.head.ref,
    baseBranch: data.base.ref,
    draft: !!data.draft,
    mergeable,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at),
    url: data.html_url,
  };
}

export function mapAction(data: WorkflowItem): NormalizedAction {
  return {
    id: String(data.id),
    name: data.name,
    path: data.path,
    state:
      data.state === "disabled_manually" || data.state === "disabled_inactivity"
        ? "disabled"
        : "active",
  };
}

export function mapActionRun(data: WorkflowRun): NormalizedActionRun {
  const status: NormalizedActionRun["status"] =
    data.status === "queued" || data.status === "in_progress" ? data.status : "completed";
  const conclusion = ((): NormalizedActionRun["conclusion"] => {
    const c = data.conclusion;
    if (c === "success" || c === "failure" || c === "cancelled" || c === "skipped") return c;
    return undefined;
  })();
  return {
    id: String(data.id),
    name: data.name ?? "",
    status,
    conclusion,
    branch: data.head_branch ?? "",
    sha: data.head_sha,
    url: data.html_url,
    createdAt: new Date(data.created_at),
  };
}

export function mapWebhookKind(payload: unknown): WebhookEventKind {
  if (!payload || typeof payload !== "object") return "unknown";
  const p = payload as {
    action?: string;
    ref?: string;
    commits?: unknown;
    repositories_added?: unknown;
    repositories_removed?: unknown;
  };
  if ("commits" in p && "ref" in p) return "push";
  if ("pull_request" in p) return "pull_request";
  if ("issue" in p) return "issue";
  if ("release" in p) return "release";
  if ("repositories_added" in p || "repositories_removed" in p) return "installation_repositories";
  if ("installation" in p) return "installation";
  if ("repository" in p && p.action) return "repository";
  return "unknown";
}
