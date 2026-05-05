import { Webhooks } from "@octokit/webhooks";
import { ErrorCodes, VisibleError } from "../../../error";
import { isReservedBranch } from "../../branch";
import type { GitProvider, NormalizedWebhookEvent } from "../interface";
import { appClient, clientFor, createInstallationToken, splitFullName } from "./client";
import {
  mapAction,
  mapActionRun,
  mapBranch,
  mapCommit,
  mapDirEntry,
  mapIssue,
  mapPullRequest,
  mapRepo,
  mapTreeEntry,
  mapWebhookKind,
} from "./map";
import { registerGithubWebhookHandlers } from "./webhook";

let webhooksInstance: Webhooks | undefined;
function getWebhooks(): Webhooks {
  if (webhooksInstance) return webhooksInstance;
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    throw new VisibleError("internal", "internal_error", "GITHUB_WEBHOOK_SECRET is not configured");
  }
  webhooksInstance = new Webhooks({ secret });
  registerGithubWebhookHandlers(webhooksInstance);
  return webhooksInstance;
}

export const githubProvider: GitProvider = {
  type: "github",

  repos: {
    async list(installationRef) {
      const kit = await appClient(installationRef);
      const { data } = await kit.apps.listReposAccessibleToInstallation({ per_page: 100 });
      return data.repositories.map((r) => mapRepo(r));
    },

    async get(fullName) {
      const { owner, repo } = splitFullName(fullName);
      const kit = await clientFor(fullName);
      const { data } = await kit.rest.repos.get({ owner, repo });
      return mapRepo(data);
    },

    async getTree(fullName, ref, path = "") {
      const { owner, repo } = splitFullName(fullName);
      const kit = await clientFor(fullName);
      const { data } = await kit.rest.git.getTree({
        owner,
        repo,
        tree_sha: ref,
        recursive: "1",
      });
      return data.tree
        .filter(
          (entry): entry is typeof entry & { path: string } =>
            !!entry.path && (!path || entry.path.startsWith(path)),
        )
        .map(mapTreeEntry);
    },

    async getBlob(fullName, ref, path) {
      const { owner, repo } = splitFullName(fullName);
      const kit = await clientFor(fullName);
      const { data } = await kit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref,
      });
      if (Array.isArray(data) || data.type !== "file") {
        throw new VisibleError("validation", "not_a_file", `${path} is not a file`);
      }
      const file = data as { sha: string; size: number; content: string; encoding: string };
      return {
        path,
        sha: file.sha,
        size: file.size,
        content: file.content,
        encoding: file.encoding === "base64" ? "base64" : "utf8",
      };
    },

    async getCommits(fullName, ref, opts) {
      const { owner, repo } = splitFullName(fullName);
      const kit = await clientFor(fullName);
      const { data } = await kit.rest.repos.listCommits({
        owner,
        repo,
        sha: ref,
        per_page: opts?.perPage ?? 30,
        page: opts?.page ?? 1,
        path: opts?.path,
      });
      return data.map(mapCommit);
    },

    async getCommit(fullName, sha) {
      const { owner, repo } = splitFullName(fullName);
      const kit = await clientFor(fullName);
      const { data } = await kit.rest.repos.getCommit({ owner, repo, ref: sha });
      return mapCommit(data);
    },

    async getInstallationToken(installationRef) {
      return createInstallationToken(installationRef);
    },
  },

  branches: {
    async list(fullName) {
      const { owner, repo } = splitFullName(fullName);
      const kit = await clientFor(fullName);
      const { data } = await kit.rest.repos.listBranches({ owner, repo, per_page: 100 });
      return data.map(mapBranch);
    },

    async get(fullName, name) {
      const { owner, repo } = splitFullName(fullName);
      const kit = await clientFor(fullName);
      try {
        const { data } = await kit.rest.repos.getBranch({ owner, repo, branch: name });
        return {
          name: data.name,
          sha: data.commit.sha,
          protected: !!data.protected,
        };
      } catch (err) {
        if ((err as { status?: number }).status === 404) return null;
        throw err;
      }
    },

    async delete(fullName, name) {
      if (this.isReserved(name)) {
        throw new VisibleError(
          "validation",
          "branch_protected",
          `Branch "${name}" is reserved and cannot be deleted.`,
        );
      }
      const { owner, repo } = splitFullName(fullName);
      const kit = await clientFor(fullName);
      await kit.rest.git.deleteRef({ owner, repo, ref: `heads/${name}` });
    },

    isReserved(name) {
      return isReservedBranch(name);
    },
  },

  issues: {
    async list(fullName, opts) {
      const { owner, repo } = splitFullName(fullName);
      const kit = await clientFor(fullName);
      const { data } = await kit.rest.issues.listForRepo({
        owner,
        repo,
        state: opts?.state ?? "all",
        per_page: opts?.perPage ?? 100,
        page: opts?.page ?? 1,
      });
      return data.filter((i) => !i.pull_request).map(mapIssue);
    },

    async get(fullName, number) {
      const { owner, repo } = splitFullName(fullName);
      const kit = await clientFor(fullName);
      try {
        const { data } = await kit.rest.issues.get({ owner, repo, issue_number: number });
        return mapIssue(data);
      } catch (err) {
        if ((err as { status?: number }).status === 404) return null;
        throw err;
      }
    },

    async create(fullName, input) {
      const { owner, repo } = splitFullName(fullName);
      const kit = await clientFor(fullName);
      const { data } = await kit.rest.issues.create({
        owner,
        repo,
        title: input.title,
        body: input.body,
        labels: input.labels,
      });
      return mapIssue(data);
    },

    async update(fullName, number, input) {
      const { owner, repo } = splitFullName(fullName);
      const kit = await clientFor(fullName);
      const { data } = await kit.rest.issues.update({
        owner,
        repo,
        issue_number: number,
        title: input.title,
        body: input.body,
        state: input.state,
        labels: input.labels,
      });
      return mapIssue(data);
    },

    async addLabels(fullName, number, labels) {
      const { owner, repo } = splitFullName(fullName);
      const kit = await clientFor(fullName);
      await kit.rest.issues.addLabels({
        owner,
        repo,
        issue_number: number,
        labels,
      });
    },

    async removeLabel(fullName, number, label) {
      const { owner, repo } = splitFullName(fullName);
      const kit = await clientFor(fullName);
      await kit.rest.issues
        .removeLabel({
          owner,
          repo,
          issue_number: number,
          name: label,
        })
        .catch(() => {});
    },
  },

  pulls: {
    async list(fullName, opts) {
      const { owner, repo } = splitFullName(fullName);
      const kit = await clientFor(fullName);
      const requestedState = opts?.state;
      const apiState =
        requestedState === "merged" || requestedState === "all" || !requestedState
          ? "all"
          : requestedState;
      const { data } = await kit.rest.pulls.list({
        owner,
        repo,
        state: apiState,
        per_page: opts?.perPage ?? 100,
        page: opts?.page ?? 1,
      });
      const pulls = data.map(mapPullRequest);
      if (requestedState === "merged") return pulls.filter((p) => p.state === "merged");
      return pulls;
    },

    async get(fullName, number) {
      const { owner, repo } = splitFullName(fullName);
      const kit = await clientFor(fullName);
      try {
        const { data } = await kit.rest.pulls.get({ owner, repo, pull_number: number });
        return mapPullRequest(data);
      } catch (err) {
        if ((err as { status?: number }).status === 404) return null;
        throw err;
      }
    },

    async getDiff(fullName, number) {
      const { owner, repo } = splitFullName(fullName);
      const kit = await clientFor(fullName);
      const { data } = await kit.rest.pulls.get({
        owner,
        repo,
        pull_number: number,
        mediaType: { format: "diff" },
      });
      return data as unknown as string;
    },

    async create(fullName, input) {
      const { owner, repo } = splitFullName(fullName);
      const kit = await clientFor(fullName);
      const { data } = await kit.rest.pulls.create({
        owner,
        repo,
        title: input.title,
        head: input.head,
        base: input.base,
        body: input.body,
        draft: input.draft,
      });
      return mapPullRequest(data);
    },

    async merge(fullName, number, opts) {
      const { owner, repo } = splitFullName(fullName);
      const kit = await clientFor(fullName);
      const { data } = await kit.rest.pulls.merge({
        owner,
        repo,
        pull_number: number,
        merge_method: opts?.method ?? "squash",
      });
      return { merged: data.merged, message: data.message };
    },

    async close(fullName, number) {
      const { owner, repo } = splitFullName(fullName);
      const kit = await clientFor(fullName);
      await kit.rest.pulls.update({
        owner,
        repo,
        pull_number: number,
        state: "closed",
      });
    },
  },

  content: {
    async readFile(fullName, path, ref) {
      const { owner, repo } = splitFullName(fullName);
      const kit = await clientFor(fullName);
      try {
        const meta = await kit.rest.repos.getContent({ owner, repo, path, ref });
        if (Array.isArray(meta.data) || meta.data.type !== "file") return null;
        const raw = await kit.rest.repos.getContent({
          owner,
          repo,
          path,
          ref,
          mediaType: { format: "raw" },
        });
        return { content: raw.data as unknown as string, sha: meta.data.sha };
      } catch (err) {
        if ((err as { status?: number }).status === 404) return null;
        throw err;
      }
    },

    async listDir(fullName, path, ref) {
      const { owner, repo } = splitFullName(fullName);
      const kit = await clientFor(fullName);
      try {
        const { data } = await kit.rest.repos.getContent({ owner, repo, path, ref });
        if (!Array.isArray(data)) return null;
        return data.map(mapDirEntry);
      } catch (err) {
        if ((err as { status?: number }).status === 404) return null;
        throw err;
      }
    },

    async writeFile(fullName, input) {
      const { owner, repo } = splitFullName(fullName);
      const kit = await clientFor(fullName);
      let sha = input.sha;
      if (!sha) {
        try {
          const current = await kit.rest.repos.getContent({
            owner,
            repo,
            path: input.path,
            ref: input.branch,
          });
          if (!Array.isArray(current.data) && current.data.type === "file") {
            sha = current.data.sha;
          }
        } catch (err) {
          if ((err as { status?: number }).status !== 404) throw err;
        }
      }
      await kit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: input.path,
        message: input.message,
        content: Buffer.from(input.content).toString("base64"),
        branch: input.branch,
        sha,
      });
    },

    async deleteFile(fullName, input) {
      const { owner, repo } = splitFullName(fullName);
      const kit = await clientFor(fullName);
      await kit.rest.repos.deleteFile({
        owner,
        repo,
        path: input.path,
        message: input.message,
        sha: input.sha,
        branch: input.branch,
      });
    },

    async commitFiles(input) {
      const { owner, repo } = splitFullName(input.fullName);
      const kit = await clientFor(input.fullName);

      if (input.mode === "direct") {
        const branch = input.branch ?? input.base;
        for (const file of input.files) {
          await githubProvider.content.writeFile(input.fullName, {
            path: file.path,
            content: file.content,
            message: input.message,
            branch,
          });
        }
        return { mode: "direct", branch: branch ?? "" };
      }

      const base = input.base ?? "dev";
      const { data: baseRef } = await kit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${base}`,
      });
      const branchName = input.branch ?? `console/edit-${Date.now()}`;
      await kit.rest.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branchName}`,
        sha: baseRef.object.sha,
      });
      for (const file of input.files) {
        await githubProvider.content.writeFile(input.fullName, {
          path: file.path,
          content: file.content,
          message: input.message,
          branch: branchName,
        });
      }
      const { data: pr } = await kit.rest.pulls.create({
        owner,
        repo,
        title: input.prTitle ?? input.message,
        body:
          input.prBody ?? `Files changed:\n${input.files.map((f) => `- \`${f.path}\``).join("\n")}`,
        head: branchName,
        base,
      });
      return {
        mode: "pr",
        branch: branchName,
        pr: { number: pr.number, url: pr.html_url, branch: branchName },
      };
    },
  },

  actions: {
    async list(fullName) {
      const { owner, repo } = splitFullName(fullName);
      const kit = await clientFor(fullName);
      const { data } = await kit.rest.actions.listRepoWorkflows({ owner, repo, per_page: 50 });
      return data.workflows.map(mapAction);
    },

    async dispatch(fullName, { action, ref, inputs }) {
      const { owner, repo } = splitFullName(fullName);
      const kit = await clientFor(fullName);
      await kit.rest.actions.createWorkflowDispatch({
        owner,
        repo,
        workflow_id: action,
        ref,
        inputs,
      });
    },

    async listRuns(fullName, opts) {
      const { owner, repo } = splitFullName(fullName);
      const kit = await clientFor(fullName);
      if (opts?.action) {
        const { data } = await kit.rest.actions.listWorkflowRuns({
          owner,
          repo,
          workflow_id: opts.action,
          branch: opts.branch,
          per_page: opts.perPage ?? 20,
          page: opts.page ?? 1,
        });
        return data.workflow_runs.map(mapActionRun);
      }
      const { data } = await kit.rest.actions.listWorkflowRunsForRepo({
        owner,
        repo,
        branch: opts?.branch,
        per_page: opts?.perPage ?? 20,
        page: opts?.page ?? 1,
      });
      return data.workflow_runs.map(mapActionRun);
    },
  },

  webhooks: {
    async verify(rawBody, signature) {
      try {
        return await getWebhooks().verify(rawBody, signature);
      } catch {
        return false;
      }
    },

    parse(payload): NormalizedWebhookEvent {
      const p = (payload ?? {}) as {
        action?: string;
        repository?: { full_name?: string };
        sender?: { login?: string };
      };
      return {
        kind: mapWebhookKind(payload),
        action: p.action,
        repoFullName: p.repository?.full_name,
        actorLogin: p.sender?.login,
        payload,
      };
    },
  },
};

export function verifyAndReceive(params: {
  id: string;
  name: string;
  rawBody: string;
  signature: string;
}): Promise<void> {
  return getWebhooks()
    .verifyAndReceive({
      id: params.id,
      name: params.name as Parameters<Webhooks["verifyAndReceive"]>[0]["name"],
      payload: params.rawBody,
      signature: params.signature,
    })
    .catch((error) => {
      if (error instanceof Error && error.message.toLowerCase().includes("signature")) {
        throw new VisibleError(
          "authentication",
          ErrorCodes.Authentication.UNAUTHORIZED,
          "Invalid webhook signature",
        );
      }
      throw error;
    });
}
