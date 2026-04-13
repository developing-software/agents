import { command, query, getRequestEvent } from "$app/server";
import { z } from "zod";
import { Repository } from "@agents/core/repository/index";
import { AgentDiscovery } from "@agents/core/agent";
import { GithubContent } from "@agents/core/github/repo/content";
import { generateText } from "ai";
import { createModel } from "../ai/model";
import { error } from "@sveltejs/kit";

function getApiKey(): string | undefined {
  return getRequestEvent().platform?.env?.ANTHROPIC_API_KEY;
}

// -- Queries --

export const getAgentsMdFiles = query(
  z.object({ organization: z.string(), repoName: z.string() }),
  async ({ organization, repoName }) => {
    const repo = await Repository.findByFullName(`${organization}/${repoName}`);
    if (!repo) error(404, "Repository not found");

    const repoRef = { installationId: repo.installationId, owner: organization, repo: repoName };
    const agentFiles = await AgentDiscovery.findAgentFiles(repoRef);

    const filesWithContent = await Promise.all(
      agentFiles.map(async (f) => {
        const content = await AgentDiscovery.readFile(repoRef, f.path);
        return { path: f.path, sha: f.sha, content: content ?? "" };
      }),
    );

    return filesWithContent;
  },
);

export const getRepoTree = query(
  z.object({ organization: z.string(), repoName: z.string() }),
  async ({ organization, repoName }) => {
    const repo = await Repository.findByFullName(`${organization}/${repoName}`);
    if (!repo) error(404, "Repository not found");

    const repoRef = { installationId: repo.installationId, owner: organization, repo: repoName };
    const tree = await GithubContent.getTree(repoRef);

    return tree.map((entry) => ({
      path: entry.path,
      type: entry.type === "blob" ? ("file" as const) : ("dir" as const),
    }));
  },
);

export const getFileContent = query(
  z.object({ organization: z.string(), repoName: z.string(), path: z.string() }),
  async ({ organization, repoName, path }) => {
    const repo = await Repository.findByFullName(`${organization}/${repoName}`);
    if (!repo) error(404, "Repository not found");

    const repoRef = { installationId: repo.installationId, owner: organization, repo: repoName };
    const content = await GithubContent.readFile(repoRef, path);
    return { content: content ?? null };
  },
);

// -- Commands --

export const saveAgentsMdFile = command(
  z.object({
    organization: z.string(),
    repoName: z.string(),
    path: z.string(),
    content: z.string(),
    mode: z.enum(["direct", "pr"]).default("pr"),
  }),
  async ({ organization, repoName, path, content, mode }) => {
    const repo = await Repository.findByFullName(`${organization}/${repoName}`);
    if (!repo) throw new Error("Repository not found");

    const repoRef = { installationId: repo.installationId, owner: organization, repo: repoName };
    const result = await GithubContent.commitFiles({
      repo: repoRef,
      files: [{ path, content }],
      message: `docs: update ${path}`,
      mode,
    });

    return result;
  },
);

export const getConfigFeedback = command(
  z.object({
    organization: z.string(),
    repoName: z.string(),
    agentsMdPath: z.string(),
    agentsMdContent: z.string(),
    contextFiles: z.array(z.object({ path: z.string(), content: z.string() })),
    chatHistory: z.array(
      z.object({ role: z.enum(["user", "assistant"]), content: z.string() }),
    ),
    question: z.string(),
  }),
  async ({
    organization,
    repoName,
    agentsMdPath,
    agentsMdContent,
    contextFiles,
    chatHistory,
    question,
  }) => {
    const system = buildSystemPrompt(
      organization,
      repoName,
      agentsMdPath,
      agentsMdContent,
      contextFiles,
    );

    const result = await generateText({
      model: createModel(getApiKey()),
      system,
      messages: [
        ...chatHistory.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        { role: "user" as const, content: question },
      ],
    });

    return { content: result.text };
  },
);

function buildSystemPrompt(
  organization: string,
  repoName: string,
  agentsMdPath: string,
  agentsMdContent: string,
  contextFiles: Array<{ path: string; content: string }>,
): string {
  const lines = [
    `You are an AI assistant helping to review and improve agent configuration files for the GitHub repository ${organization}/${repoName}.`,
    ``,
    `You have access to the current AGENTS.md file at \`${agentsMdPath}\`:`,
    ``,
    "```markdown",
    agentsMdContent || "(empty file)",
    "```",
  ];

  if (contextFiles.length > 0) {
    lines.push(``, `## Additional Context Files`);
    for (const file of contextFiles) {
      const ext = file.path.split(".").pop() ?? "";
      lines.push(
        ``,
        `### \`${file.path}\``,
        `\`\`\`${ext}`,
        file.content.slice(0, 4000),
        "```",
      );
    }
  }

  lines.push(
    ``,
    `Your role:`,
    `- Answer questions about agent configuration concisely`,
    `- Identify gaps or issues in the AGENTS.md`,
    `- Suggest specific, actionable improvements with examples`,
    `- Explain how changes in the codebase affect agent behavior`,
    ``,
    `Be concise. Use markdown for formatting. Focus on practical improvements.`,
  );

  return lines.join("\n");
}
