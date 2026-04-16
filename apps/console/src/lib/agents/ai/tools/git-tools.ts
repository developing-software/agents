import { tool } from "ai";
import { z } from "zod";
import { getProvider } from "@agents/core/git";
import type { ProviderType } from "@agents/core/git";

export type RepoContext = {
  source: ProviderType | string;
  fullName: string;
};

const MAX_TOOL_OUTPUT_CHARS = 30_000;

function truncate(text: string, limit = MAX_TOOL_OUTPUT_CHARS): string {
  if (text.length <= limit) return text;
  return text.slice(0, limit) + "\n\n... [truncated — output too long]";
}

export function gitTools(ctx: RepoContext) {
  const provider = getProvider(ctx.source);

  return {
    listIssues: tool({
      description: "List issues for this repository. Returns number, title, state, and labels.",
      inputSchema: z.object({
        state: z.enum(["open", "closed", "all"]).default("open").describe("Filter by issue state"),
      }),
      execute: async ({ state }) => {
        const issues = await provider.issues.list(ctx.fullName, { state });
        return truncate(JSON.stringify(issues));
      },
    }),

    getIssue: tool({
      description: "Get full details of a specific issue including body and comments",
      inputSchema: z.object({
        number: z.number().describe("Issue number"),
      }),
      execute: async ({ number }) => {
        const issue = await provider.issues.get(ctx.fullName, number);
        return truncate(JSON.stringify(issue));
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
        if (add?.length) await provider.issues.addLabels(ctx.fullName, number, add);
        if (remove?.length) {
          for (const label of remove)
            await provider.issues.removeLabel(ctx.fullName, number, label);
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
          const entries = await provider.content.listDir(ctx.fullName, path);
          return truncate(JSON.stringify(entries ?? []));
        }
        const repoInfo = await provider.repos.get(ctx.fullName);
        const tree = await provider.repos.getTree(ctx.fullName, repoInfo.defaultBranch);
        const paths = tree.filter((e) => e.type === "blob").map((e) => e.path);
        return truncate(paths.join("\n"));
      },
    }),

    readFile: tool({
      description: "Read a file from the repository",
      inputSchema: z.object({
        path: z.string().describe("File path relative to repo root"),
      }),
      execute: async ({ path }) => {
        const file = await provider.content.readFile(ctx.fullName, path);
        return truncate(file?.content ?? "File not found");
      },
    }),
  };
}
