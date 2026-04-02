import { tool } from "ai";
import { z } from "zod";
import { GithubIssue } from "@agents/core/github/repo/issue";
import { GithubContent } from "@agents/core/github/repo/content";
import { GitHub } from "@agents/core/github/client";

export type RepoContext = {
  installationId: number;
  owner: string;
  repo: string;
};

export function githubTools(ctx: RepoContext) {
  return {
    listIssues: tool({
      description: "List issues for this repository. Returns number, title, state, and labels.",
      inputSchema: z.object({
        state: z.enum(["open", "closed", "all"]).default("open").describe("Filter by issue state"),
      }),
      execute: async () => {
        return GithubIssue.list(ctx);
      },
    }),

    getIssue: tool({
      description: "Get full details of a specific issue including body and comments",
      inputSchema: z.object({
        number: z.number().describe("Issue number"),
      }),
      execute: async ({ number }) => {
        return GithubIssue.get(ctx, number);
      },
    }),

    labelIssue: tool({
      description: "Add or remove labels on an issue",
      inputSchema: z.object({
        number: z.number().describe("Issue number"),
        add: z.array(z.string()).optional().describe("Labels to add"),
        remove: z.array(z.string()).optional().describe("Labels to remove"),
      }),
      execute: async ({ number, add, remove }) => {
        const octokit = await GitHub.appClient(ctx.installationId);
        if (add?.length) {
          await octokit.rest.issues.addLabels({
            owner: ctx.owner,
            repo: ctx.repo,
            issue_number: number,
            labels: add,
          });
        }
        if (remove?.length) {
          for (const label of remove) {
            await octokit.rest.issues.removeLabel({
              owner: ctx.owner,
              repo: ctx.repo,
              issue_number: number,
              name: label,
            }).catch(() => {});
          }
        }
        return { number, added: add ?? [], removed: remove ?? [] };
      },
    }),

    getRepoTree: tool({
      description: "Get the repository file tree structure for understanding codebase layout",
      inputSchema: z.object({
        path: z.string().optional().describe("Subdirectory path, or omit for root"),
      }),
      execute: async ({ path }) => {
        if (path) {
          const entries = await GithubContent.listDir(ctx, path);
          return entries ?? [];
        }
        const tree = await GithubContent.getTree(ctx);
        return tree.filter((e) => e.type === "blob").map((e) => e.path);
      },
    }),

    readFile: tool({
      description: "Read a file from the repository",
      inputSchema: z.object({
        path: z.string().describe("File path relative to repo root"),
      }),
      execute: async ({ path }) => {
        const content = await GithubContent.readFile(ctx, path);
        return content ?? "File not found";
      },
    }),
  };
}
