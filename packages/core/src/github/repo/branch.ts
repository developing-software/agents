import { GitHub } from "../client";
import { VisibleError } from "../../error";
import { z } from "zod";

export namespace GithubBranch {
  export interface RepoRef {
    installationId: number;
    owner: string;
    repo: string;
    defaultBranch?: string | null;
  }

  // Reserved branch names that should never be deletable via this UI,
  // regardless of GitHub's `protected` flag.
  export const RESERVED_NAMES = new Set([
    "main",
    "master",
    "dev",
    "develop",
    "development",
    "prod",
    "production",
    "staging",
    "stage",
    "preview",
    "release",
    "releases",
    "trunk",
    "default",
    "stable",
    "canary",
    "next",
    "qa",
    "uat",
    "hotfix",
  ]);

  export const RESERVED_PATTERNS: RegExp[] = [/^release\/.+/i, /^hotfix\/.+/i, /^env\/.+/i];

  export function isReserved(name: string): boolean {
    const n = name.toLowerCase();
    if (RESERVED_NAMES.has(n)) return true;
    return RESERVED_PATTERNS.some((re) => re.test(name));
  }

  // Branch prefixes used by dispatched agents. Must stay in sync with
  // AgentWorkflow.Agents in packages/core/src/agent/workflow.ts. Duplicated
  // here (rather than imported) to avoid a circular dependency — agent/
  // already imports from github/.
  // Naming convention from actions/git/branch/action.yml:
  //   {prefix}/issue-{N}-{runId}  or  {prefix}/run-{runId}
  export const AGENT_PREFIXES = ["claude", "opencode", "codex"] as const;
  export type AgentPrefix = (typeof AGENT_PREFIXES)[number];

  /** Returns the agent prefix if the branch was created by a dispatched agent. */
  export function detectAgent(name: string): AgentPrefix | null {
    const slash = name.indexOf("/");
    if (slash <= 0) return null;
    const prefix = name.slice(0, slash);
    const rest = name.slice(slash + 1);
    if (!(AGENT_PREFIXES as readonly string[]).includes(prefix)) return null;
    // Must match issue-{N}-*, run-*, or plan-* shape to avoid false
    // positives on user branches that happen to start with "claude/".
    if (!/^(issue-\d+-|run-|plan-).+/i.test(rest)) return null;
    return prefix as AgentPrefix;
  }

  export function isAgent(name: string): boolean {
    return detectAgent(name) !== null;
  }

  export type ProtectedReason = "default" | "github" | "reserved" | null;
  export function protectedReason(b: {
    name: string;
    protected: boolean;
    isDefault: boolean;
  }): ProtectedReason {
    if (b.isDefault) return "default";
    if (b.protected) return "github";
    if (isReserved(b.name)) return "reserved";
    return null;
  }

  export const Info = z.object({
    name: z.string(),
    protected: z.boolean(),
    reserved: z.boolean(),
    isDefault: z.boolean(),
    agent: z.string().nullable(),
    sha: z.string(),
    lastCommitDate: z.string().nullable(),
    lastCommitAuthor: z.string().nullable(),
    lastCommitMessage: z.string().nullable(),
  });
  export type Info = z.infer<typeof Info>;

  /**
   * List branches with commit metadata in a single GraphQL round-trip.
   * Protected flag is merged in from REST listBranches (GraphQL's
   * branchProtectionRule requires admin read, which we may not have).
   *
   * TODO: v1 caps at 100 branches. Add pagination via pageInfo.hasNextPage
   * for repos that exceed that.
   */
  export async function list(repo: RepoRef): Promise<Info[]> {
    const octokit = await GitHub.appClient(repo.installationId);

    const gql = `
      query($owner: String!, $repo: String!) {
        repository(owner: $owner, name: $repo) {
          defaultBranchRef { name }
          refs(refPrefix: "refs/heads/", first: 100,
               orderBy: { field: TAG_COMMIT_DATE, direction: DESC }) {
            nodes {
              name
              target {
                ... on Commit {
                  oid
                  committedDate
                  messageHeadline
                  author { name user { login } }
                }
              }
            }
          }
        }
      }
    `;

    const [gqlRes, restRes] = await Promise.all([
      octokit.graphql(gql, { owner: repo.owner, repo: repo.repo }) as Promise<{
        repository: {
          defaultBranchRef: { name: string } | null;
          refs: {
            nodes: Array<{
              name: string;
              target: {
                oid?: string;
                committedDate?: string;
                messageHeadline?: string;
                author?: { name?: string | null; user?: { login?: string | null } | null };
              } | null;
            }>;
          };
        };
      }>,
      octokit.rest.repos.listBranches({
        owner: repo.owner,
        repo: repo.repo,
        per_page: 100,
      }),
    ]);

    const defaultBranch = gqlRes.repository.defaultBranchRef?.name ?? null;
    const protectedSet = new Set(restRes.data.filter((b) => b.protected).map((b) => b.name));

    return gqlRes.repository.refs.nodes.map((n) => {
      const name = n.name;
      const target = n.target ?? null;
      return {
        name,
        protected: protectedSet.has(name),
        reserved: isReserved(name),
        isDefault: name === defaultBranch,
        agent: detectAgent(name),
        sha: target?.oid ?? "",
        lastCommitDate: target?.committedDate ?? null,
        lastCommitAuthor: target?.author?.user?.login ?? target?.author?.name ?? null,
        lastCommitMessage: target?.messageHeadline ?? null,
      };
    });
  }

  /** Delete a single branch. Throws VisibleError for reserved/default. */
  export async function remove(repo: RepoRef, branchName: string): Promise<void> {
    if (isReserved(branchName)) {
      throw new VisibleError(
        "validation",
        "branch_protected",
        `Branch "${branchName}" is reserved and cannot be deleted.`,
      );
    }
    if (repo.defaultBranch && branchName === repo.defaultBranch) {
      throw new VisibleError(
        "validation",
        "branch_protected",
        `Branch "${branchName}" is the default branch and cannot be deleted.`,
      );
    }
    const octokit = await GitHub.appClient(repo.installationId);
    await octokit.rest.git.deleteRef({
      owner: repo.owner,
      repo: repo.repo,
      ref: `heads/${branchName}`,
    });
  }

  /** Bulk delete with per-row result. */
  export async function removeMany(
    repo: RepoRef,
    names: string[],
  ): Promise<{ name: string; ok: boolean; error?: string }[]> {
    const results: { name: string; ok: boolean; error?: string }[] = [];
    for (const name of names) {
      try {
        await remove(repo, name);
        results.push({ name, ok: true });
      } catch (e) {
        results.push({ name, ok: false, error: (e as Error).message });
      }
    }
    return results;
  }
}
