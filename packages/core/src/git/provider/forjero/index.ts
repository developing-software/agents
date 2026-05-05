import { VisibleError } from "../../../error";
import { isReservedBranch } from "../../branch";
import type { GitProvider, NormalizedWebhookEvent } from "../interface";
import {
  resolveInstallation,
  sdkFor,
  sdkForToken,
  splitFullName,
  unwrap,
  unwrapOrNull,
} from "./client";
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
import { verifyForjeroSignature } from "./webhook";

const PAT_TOKEN_TTL_MS = 365 * 24 * 60 * 60 * 1000;

export const forjeroProvider: GitProvider = {
  type: "forjero",

  repos: {
    async list(installationRef) {
      const sdk = sdkForToken(installationRef);
      const data = unwrap(await sdk.userCurrentListRepos({ limit: 50 }));
      return (data ?? []).map(mapRepo);
    },

    async get(fullName) {
      const { owner, repo } = splitFullName(fullName);
      const sdk = await sdkFor(fullName);
      const data = unwrap(await sdk.repoGet({ owner, repo }));
      return mapRepo(data);
    },

    async getTree(fullName, ref, path = "") {
      const { owner, repo } = splitFullName(fullName);
      const sdk = await sdkFor(fullName);
      const data = unwrap(
        await sdk.getTree({ owner, repo, sha: ref, recursive: true, per_page: 1000 }),
      );
      const entries = data?.tree ?? [];
      return entries
        .filter((e) => !!e.path && (!path || (e.path ?? "").startsWith(path)))
        .map(mapTreeEntry);
    },

    async getBlob(fullName, ref, path) {
      const { owner, repo } = splitFullName(fullName);
      const sdk = await sdkFor(fullName);
      const meta = unwrap(await sdk.repoGetContents({ owner, repo, filepath: path, ref }));
      if (!meta || meta.type !== "file") {
        throw new VisibleError("validation", "not_a_file", `${path} is not a file`);
      }
      return {
        path,
        sha: meta.sha ?? "",
        size: meta.size ?? 0,
        content: meta.content ?? "",
        encoding: meta.encoding === "base64" ? "base64" : "utf8",
      };
    },

    async getCommits(fullName, ref, opts) {
      const { owner, repo } = splitFullName(fullName);
      const sdk = await sdkFor(fullName);
      const data = unwrap(
        await sdk.repoGetAllCommits({
          owner,
          repo,
          sha: ref,
          page: opts?.page ?? 1,
          limit: opts?.perPage ?? 30,
          path: opts?.path,
        }),
      );
      return (data ?? []).map(mapCommit);
    },

    async getCommit(fullName, sha) {
      const { owner, repo } = splitFullName(fullName);
      const sdk = await sdkFor(fullName);
      const data = unwrap(await sdk.repoGetSingleCommit({ owner, repo, sha }));
      return mapCommit(data);
    },

    async getInstallationToken(installationRef) {
      // Forjero PATs don't rotate; treat the PAT as the bearer token directly.
      return {
        token: installationRef,
        expiresAt: new Date(Date.now() + PAT_TOKEN_TTL_MS),
      };
    },
  },

  branches: {
    async list(fullName) {
      const { owner, repo } = splitFullName(fullName);
      const sdk = await sdkFor(fullName);
      const data = unwrap(await sdk.repoListBranches({ owner, repo, limit: 50 }));
      return (data ?? []).map(mapBranch);
    },

    async get(fullName, name) {
      const { owner, repo } = splitFullName(fullName);
      const sdk = await sdkFor(fullName);
      const data = unwrapOrNull(await sdk.repoGetBranch({ owner, repo, branch: name }));
      return data ? mapBranch(data) : null;
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
      const sdk = await sdkFor(fullName);
      unwrap(await sdk.repoDeleteBranch({ owner, repo, branch: name }));
    },

    isReserved(name) {
      return isReservedBranch(name);
    },
  },

  issues: {
    async list(fullName, opts) {
      const { owner, repo } = splitFullName(fullName);
      const sdk = await sdkFor(fullName);
      const data = unwrap(
        await sdk.issueListIssues({
          owner,
          repo,
          type: "issues",
          state: opts?.state ?? "all",
          page: opts?.page ?? 1,
          limit: opts?.perPage ?? 50,
        }),
      );
      return (data ?? []).map(mapIssue);
    },

    async get(fullName, number) {
      const { owner, repo } = splitFullName(fullName);
      const sdk = await sdkFor(fullName);
      const data = unwrapOrNull(await sdk.issueGetIssue({ owner, repo, index: number }));
      return data ? mapIssue(data) : null;
    },

    async create(fullName, input) {
      const { owner, repo } = splitFullName(fullName);
      const sdk = await sdkFor(fullName);
      const data = unwrap(
        await sdk.issueCreateIssue({
          owner,
          repo,
          createIssueOption: {
            title: input.title,
            body: input.body,
          },
        }),
      );
      const created = mapIssue(data);
      if (input.labels?.length) {
        await this.addLabels(fullName, created.number, input.labels);
        const refreshed = await this.get(fullName, created.number);
        return refreshed ?? created;
      }
      return created;
    },

    async update(fullName, number, input) {
      const { owner, repo } = splitFullName(fullName);
      const sdk = await sdkFor(fullName);
      const data = unwrap(
        await sdk.issueEditIssue({
          owner,
          repo,
          index: number,
          editIssueOption: {
            title: input.title,
            body: input.body,
            state: input.state,
          },
        }),
      );
      const updated = mapIssue(data);
      if (input.labels) {
        unwrap(
          await sdk.issueReplaceLabels({
            owner,
            repo,
            index: number,
            issueLabelsOption: { labels: input.labels },
          }),
        );
        const refreshed = await this.get(fullName, number);
        return refreshed ?? updated;
      }
      return updated;
    },

    async addLabels(fullName, number, labels) {
      const { owner, repo } = splitFullName(fullName);
      const sdk = await sdkFor(fullName);
      unwrap(
        await sdk.issueAddLabel({
          owner,
          repo,
          index: number,
          issueLabelsOption: { labels },
        }),
      );
    },

    async removeLabel(fullName, number, label) {
      const { owner, repo } = splitFullName(fullName);
      const sdk = await sdkFor(fullName);
      const result = await sdk.issueRemoveLabel({
        owner,
        repo,
        index: number,
        identifier: label,
      });
      // 404 = label not present; tolerate quietly to match GitHub behavior.
      if (result.response?.status !== 404) unwrap(result);
    },
  },

  pulls: {
    async list(fullName, opts) {
      const { owner, repo } = splitFullName(fullName);
      const sdk = await sdkFor(fullName);
      const requestedState = opts?.state;
      const apiState =
        requestedState === "merged" || requestedState === "all" || !requestedState
          ? "all"
          : requestedState;
      const data = unwrap(
        await sdk.repoListPullRequests({
          owner,
          repo,
          state: apiState,
          page: opts?.page ?? 1,
          limit: opts?.perPage ?? 50,
        }),
      );
      const pulls = (data ?? []).map(mapPullRequest);
      if (requestedState === "merged") return pulls.filter((p) => p.state === "merged");
      return pulls;
    },

    async get(fullName, number) {
      const { owner, repo } = splitFullName(fullName);
      const sdk = await sdkFor(fullName);
      const data = unwrapOrNull(await sdk.repoGetPullRequest({ owner, repo, index: number }));
      return data ? mapPullRequest(data) : null;
    },

    async getDiff(fullName, number) {
      const { owner, repo } = splitFullName(fullName);
      const sdk = await sdkFor(fullName);
      const data = unwrap(
        await sdk.repoDownloadPullDiffOrPatch({
          owner,
          repo,
          index: number,
          diffType: "diff",
        }),
      );
      return typeof data === "string" ? data : String(data ?? "");
    },

    async create(fullName, input) {
      const { owner, repo } = splitFullName(fullName);
      const sdk = await sdkFor(fullName);
      const data = unwrap(
        await sdk.repoCreatePullRequest({
          owner,
          repo,
          createPullRequestOption: {
            title: input.title,
            head: input.head,
            base: input.base,
            body: input.body,
          },
        }),
      );
      return mapPullRequest(data);
    },

    async merge(fullName, number, opts) {
      const { owner, repo } = splitFullName(fullName);
      const sdk = await sdkFor(fullName);
      const method = opts?.method ?? "squash";
      const result = await sdk.repoMergePullRequest({
        owner,
        repo,
        index: number,
        mergePullRequestOption: { Do: method },
      });
      if (!result.response?.ok) {
        unwrap(result);
      }
      return { merged: true, message: "" };
    },

    async close(fullName, number) {
      const { owner, repo } = splitFullName(fullName);
      const sdk = await sdkFor(fullName);
      unwrap(
        await sdk.repoEditPullRequest({
          owner,
          repo,
          index: number,
          editPullRequestOption: { state: "closed" },
        }),
      );
    },
  },

  content: {
    async readFile(fullName, path, ref) {
      const { owner, repo } = splitFullName(fullName);
      const sdk = await sdkFor(fullName);
      const meta = unwrapOrNull(await sdk.repoGetContents({ owner, repo, filepath: path, ref }));
      if (!meta || meta.type !== "file") return null;
      const raw = meta.content
        ? meta.encoding === "base64"
          ? Buffer.from(meta.content, "base64").toString("utf8")
          : meta.content
        : "";
      return { content: raw, sha: meta.sha ?? "" };
    },

    async listDir(fullName, path, ref) {
      const { owner, repo } = splitFullName(fullName);
      const sdk = await sdkFor(fullName);
      const data = unwrapOrNull(await sdk.repoGetContentsList({ owner, repo, ref }));
      if (!data || !Array.isArray(data)) return null;
      const prefix = path.replace(/\/$/, "");
      const filtered = prefix
        ? data.filter((e) => (e.path ?? "").startsWith(prefix + "/") || e.path === prefix)
        : data;
      return filtered.map(mapDirEntry);
    },

    async writeFile(fullName, input) {
      const { owner, repo } = splitFullName(fullName);
      const sdk = await sdkFor(fullName);
      const content = Buffer.from(input.content).toString("base64");
      let sha = input.sha;
      if (!sha) {
        const existing = unwrapOrNull(
          await sdk.repoGetContents({ owner, repo, filepath: input.path, ref: input.branch }),
        );
        if (existing?.type === "file" && existing.sha) {
          sha = existing.sha;
        }
      }
      if (sha) {
        unwrap(
          await sdk.repoUpdateFile({
            owner,
            repo,
            filepath: input.path,
            updateFileOptions: {
              content,
              sha,
              branch: input.branch,
              message: input.message,
            },
          }),
        );
      } else {
        unwrap(
          await sdk.repoCreateFile({
            owner,
            repo,
            filepath: input.path,
            createFileOptions: {
              content,
              branch: input.branch,
              message: input.message,
            },
          }),
        );
      }
    },

    async deleteFile(fullName, input) {
      const { owner, repo } = splitFullName(fullName);
      const sdk = await sdkFor(fullName);
      unwrap(
        await sdk.repoDeleteFile({
          owner,
          repo,
          filepath: input.path,
          deleteFileOptions: {
            sha: input.sha,
            branch: input.branch,
            message: input.message,
          },
        }),
      );
    },

    async commitFiles(input) {
      const { owner, repo } = splitFullName(input.fullName);
      const sdk = await sdkFor(input.fullName);

      if (input.mode === "direct") {
        const branch = input.branch ?? input.base;
        for (const file of input.files) {
          await forjeroProvider.content.writeFile(input.fullName, {
            path: file.path,
            content: file.content,
            message: input.message,
            branch,
          });
        }
        return { mode: "direct", branch: branch ?? "" };
      }

      const base = input.base ?? "main";
      const branchName = input.branch ?? `console/edit-${Date.now()}`;
      unwrap(
        await sdk.repoCreateBranch({
          owner,
          repo,
          createBranchRepoOption: {
            new_branch_name: branchName,
            old_ref_name: base,
          },
        }),
      );
      for (const file of input.files) {
        await forjeroProvider.content.writeFile(input.fullName, {
          path: file.path,
          content: file.content,
          message: input.message,
          branch: branchName,
        });
      }
      const pr = unwrap(
        await sdk.repoCreatePullRequest({
          owner,
          repo,
          createPullRequestOption: {
            title: input.prTitle ?? input.message,
            body:
              input.prBody ??
              `Files changed:\n${input.files.map((f) => `- \`${f.path}\``).join("\n")}`,
            head: branchName,
            base,
          },
        }),
      );
      return {
        mode: "pr",
        branch: branchName,
        pr: {
          number: pr.number ?? 0,
          url: pr.html_url ?? pr.url ?? "",
          branch: branchName,
        },
      };
    },
  },

  actions: {
    async list(fullName) {
      const sdk = await sdkFor(fullName);
      const { owner, repo } = splitFullName(fullName);
      const data = unwrapOrNull(await sdk.repoGetContentsList({ owner, repo, ref: undefined }));
      if (!data || !Array.isArray(data)) return [];
      // Forjero stores Actions workflows under .forgejo/workflows/* (or .gitea/workflows/*).
      // The flat contents list returns top-level entries only, so we need a recursive walk.
      // Instead, list the workflows directory directly.
      const tries = [".forgejo/workflows", ".gitea/workflows", ".github/workflows"];
      for (const dir of tries) {
        const entries = await forjeroProvider.content.listDir(fullName, dir);
        if (entries) {
          return entries
            .filter((e) => e.type === "file" && /\.ya?ml$/i.test(e.name))
            .map((e) => mapAction(e.name));
        }
      }
      return [];
    },

    async dispatch(fullName, { action, ref, inputs }) {
      const { owner, repo } = splitFullName(fullName);
      const sdk = await sdkFor(fullName);
      unwrap(
        await sdk.dispatchWorkflow({
          owner,
          repo,
          workflowfilename: action,
          dispatchWorkflowOption: { ref, inputs },
        }),
      );
    },

    async listRuns(fullName, opts) {
      const { owner, repo } = splitFullName(fullName);
      const sdk = await sdkFor(fullName);
      const data = unwrap(
        await sdk.listActionRuns({
          owner,
          repo,
          page: opts?.page ?? 1,
          limit: opts?.perPage ?? 20,
          ref: opts?.branch ? `refs/heads/${opts.branch}` : undefined,
        }),
      );
      const runs = (data?.workflow_runs ?? []).map(mapActionRun);
      return opts?.action ? runs.filter((r) => r.name === opts.action) : runs;
    },
  },

  webhooks: {
    async verify(rawBody, signature) {
      const secret = process.env.FORJERO_WEBHOOK_SECRET;
      if (!secret) return true; // No secret configured: pass through (signature checked per-installation in route).
      try {
        return await verifyForjeroSignature(rawBody, signature, secret);
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

export { resolveInstallation, sdkFor, sdkForToken };
