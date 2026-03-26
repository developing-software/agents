import { GitHub } from "../client";
import { z } from "zod";

export namespace GithubWorkflow {
  export interface RepoRef {
    installationId: number;
    owner: string;
    repo: string;
  }

  export const Info = z.object({
    id: z.number(),
    name: z.string(),
    path: z.string(),
    state: z.string(),
  });
  export type Info = z.infer<typeof Info>;

  export async function list(repo: RepoRef): Promise<Info[]> {
    const octokit = await GitHub.appClient(repo.installationId);
    const { data } = await octokit.rest.actions.listRepoWorkflows({
      owner: repo.owner,
      repo: repo.repo,
      per_page: 50,
    });
    return data.workflows.map(serialize);
  }

  export async function dispatch(
    repo: RepoRef,
    workflowId: string,
    ref: string,
    inputs?: Record<string, string>,
  ): Promise<void> {
    const octokit = await GitHub.appClient(repo.installationId);
    await octokit.rest.actions.createWorkflowDispatch({
      owner: repo.owner,
      repo: repo.repo,
      workflow_id: workflowId,
      ref,
      inputs,
    });
  }

  function serialize(wf: { id: number; name: string; path: string; state: string }): Info {
    return {
      id: wf.id,
      name: wf.name,
      path: wf.path,
      state: wf.state,
    };
  }

  export namespace Run {
    export const Info = z.object({
      id: z.number(),
      status: z.string().nullable(),
      conclusion: z.string().nullable(),
      headBranch: z.string().nullable(),
      commitMessage: z.string(),
      actor: z.string(),
      createdAt: z.string(),
      htmlUrl: z.string(),
    });
    export type Info = z.infer<typeof Info>;

    export async function list(repo: RepoRef, workflowId: number): Promise<Info[]> {
      const octokit = await GitHub.appClient(repo.installationId);
      const { data } = await octokit.rest.actions.listWorkflowRuns({
        owner: repo.owner,
        repo: repo.repo,
        workflow_id: workflowId,
        per_page: 20,
      });
      return data.workflow_runs.map(serialize);
    }

    function serialize(run: {
      id: number;
      status?: string | null;
      conclusion?: string | null;
      head_branch?: string | null;
      head_commit?: { message?: string } | null;
      actor?: { login: string } | null;
      created_at: string;
      html_url: string;
    }): Info {
      return {
        id: run.id,
        status: run.status ?? null,
        conclusion: run.conclusion ?? null,
        headBranch: run.head_branch ?? null,
        commitMessage: run.head_commit?.message?.split("\n")[0] ?? "",
        actor: run.actor?.login ?? "unknown",
        createdAt: run.created_at,
        htmlUrl: run.html_url,
      };
    }
  }
}
