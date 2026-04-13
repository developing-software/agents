import { command, query, getRequestEvent } from "$app/server";
import { z } from "zod";
import { streamText } from "ai";
import { Repository } from "@agents/core/repository/index";
import { AgentDiscovery } from "@agents/core/agent/discovery";
import { GithubContent } from "@agents/core/github/repo/content";
import { createModel } from "../ai/model";

function getApiKey(): string | undefined {
  return getRequestEvent().platform?.env?.ANTHROPIC_API_KEY;
}

// -- Queries --

export const getAgentsMdFiles = query(
  z.object({
    organization: z.string(),
    repoName: z.string(),
  }),
  async ({ organization, repoName }) => {
    const repo = await Repository.findByFullName(`${organization}/${repoName}`);
    if (!repo) return [];

    const repoRef = { installationId: repo.installationId, owner: organization, repo: repoName };
    const agentFiles = await AgentDiscovery.findAgentFiles(repoRef);

    const results = await Promise.all(
      agentFiles.map(async (file) => {
        const content = await AgentDiscovery.readFile(repoRef, file.path);
        return { path: file.path, sha: file.sha, content: content ?? "" };
      }),
    );

    return results;
  },
);

export const getRepoTree = query(
  z.object({
    organization: z.string(),
    repoName: z.string(),
    path: z.string().default(""),
  }),
  async ({ organization, repoName, path }) => {
    const repo = await Repository.findByFullName(`${organization}/${repoName}`);
    if (!repo) return [];

    const repoRef = { installationId: repo.installationId, owner: organization, repo: repoName };
    const entries = await GithubContent.listDir(repoRef, path || ".");
    if (!entries) return [];

    return entries
      .map((e) => ({
        name: e.name,
        path: e.path,
        type: e.type === "dir" ? ("dir" as const) : ("file" as const),
      }))
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  },
);

export const getFileContent = query(
  z.object({
    organization: z.string(),
    repoName: z.string(),
    path: z.string(),
  }),
  async ({ organization, repoName, path }) => {
    const repo = await Repository.findByFullName(`${organization}/${repoName}`);
    if (!repo) return null;

    const repoRef = { installationId: repo.installationId, owner: organization, repo: repoName };
    const content = await GithubContent.readFile(repoRef, path);
    return content;
  },
);

// -- Commands --

export const saveAgentsMdFile = command(
  z.object({
    organization: z.string(),
    repoName: z.string(),
    path: z.string(),
    content: z.string(),
    sha: z.string(),
  }),
  async ({ organization, repoName, path, content, sha }) => {
    const repo = await Repository.findByFullName(`${organization}/${repoName}`);
    if (!repo) throw new Error("Repository not found");

    const repoRef = { installationId: repo.installationId, owner: organization, repo: repoName };
    await GithubContent.writeFile(
      repoRef,
      path,
      content,
      `Update ${path} via console`,
      repo.defaultBranch ?? undefined,
      sha,
    );
    return { success: true };
  },
);

export const getConfigFeedback = command(
  z.object({
    organization: z.string(),
    repoName: z.string(),
    agentsMdContent: z.string(),
    agentsMdPath: z.string(),
    contextFiles: z.array(
      z.object({
        path: z.string(),
        content: z.string(),
      }),
    ),
    messages: z.array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      }),
    ),
  }),
  async ({ organization, repoName, agentsMdContent, agentsMdPath, contextFiles, messages }) => {
    const systemPrompt = buildSystemPrompt(
      organization,
      repoName,
      agentsMdPath,
      agentsMdContent,
      contextFiles,
    );

    const result = await streamText({
      model: createModel(getApiKey()),
      system: systemPrompt,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    });

    let text = "";
    for await (const chunk of result.textStream) {
      text += chunk;
    }
    return { response: text };
  },
);

function buildSystemPrompt(
  organization: string,
  repoName: string,
  agentsMdPath: string,
  agentsMdContent: string,
  contextFiles: Array<{ path: string; content: string }>,
): string {
  let prompt = `You are an expert assistant helping configure AI agents for the repository "${organization}/${repoName}".

You are reviewing and helping improve the AGENTS.md configuration file. AGENTS.md files provide instructions, context, and guardrails for AI coding agents working in a repository.

## Current AGENTS.md file: ${agentsMdPath}

\`\`\`markdown
${agentsMdContent}
\`\`\`
`;

  if (contextFiles.length > 0) {
    prompt += `\n## Context files from the repository\n\n`;
    for (const file of contextFiles) {
      const ext = file.path.split(".").pop() ?? "";
      prompt += `### ${file.path}\n\n\`\`\`${ext}\n${file.content}\n\`\`\`\n\n`;
    }
  }

  prompt += `
## Your role

- Answer questions about the AGENTS.md file and how agents will interpret it
- Suggest improvements to make agent instructions clearer, more specific, or more effective
- When asked to review, provide concrete, actionable feedback
- Consider the repository context (files provided) when making suggestions
- Keep responses concise and focused on practical improvements
- Format suggestions as markdown when appropriate`;

  return prompt;
}
