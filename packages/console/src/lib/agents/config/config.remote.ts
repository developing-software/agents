import { command, query, getRequestEvent } from '$app/server';
import { error } from '@sveltejs/kit';
import { z } from 'zod';
import { generateText } from 'ai';
import { Repository } from '@agents/core/repository/index';
import { AgentDiscovery } from '@agents/core/agent';
import { GithubContent } from '@agents/core/github/repo/content';
import { createModel } from '$lib/agents/ai/model';

const repoInput = z.object({ organization: z.string(), repoName: z.string() });

const fileInput = repoInput.extend({ path: z.string().min(1) });

const saveInput = repoInput.extend({
  path: z.string().min(1),
  content: z.string(),
});

const feedbackInput = repoInput.extend({
  agentsMdContent: z.string(),
  contextFiles: z.array(z.object({ path: z.string(), content: z.string() })),
  chatHistory: z.array(z.object({ role: z.enum(['user', 'assistant']), text: z.string() })),
});

function getApiKey(): string | undefined {
  return getRequestEvent().platform?.env?.ANTHROPIC_API_KEY;
}

function detectLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  if (!ext) return 'text';
  const map: Record<string, string> = {
    ts: 'typescript',
    js: 'javascript',
    svelte: 'svelte',
    md: 'markdown',
    json: 'json',
    yml: 'yaml',
    yaml: 'yaml',
    toml: 'toml',
    css: 'css',
    html: 'html',
    sh: 'bash',
  };
  return map[ext] ?? ext;
}

export const getAgentsMdFiles = query(repoInput, async ({ organization, repoName }) => {
  const repo = await Repository.findByFullName(`${organization}/${repoName}`);
  if (!repo) error(404, `Repository ${organization}/${repoName} not found`);

  const agentFiles = await AgentDiscovery.findAgentFiles(repo);

  const files = await Promise.all(
    agentFiles.map(async (file) => ({
      path: file.path,
      sha: file.sha,
      content: (await AgentDiscovery.readFile(repo, file.path)) ?? '',
    })),
  );

  return files.sort((a, b) => a.path.localeCompare(b.path));
});

export const getRepoTree = query(
  repoInput.extend({ path: z.string().optional() }),
  async ({ organization, repoName, path }) => {
    const repo = await Repository.findByFullName(`${organization}/${repoName}`);
    if (!repo) error(404, `Repository ${organization}/${repoName} not found`);

    const entries = await GithubContent.listDir(repo, path ?? '');
    if (!entries) return [];

    return entries
      .filter((entry) => entry.type === 'dir' || entry.type === 'file')
      .sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'dir' ? -1 : 1;
      })
      .map((entry) => {
        const type: 'dir' | 'file' = entry.type === 'dir' ? 'dir' : 'file';
        return {
          name: entry.name,
          path: entry.path,
          type,
          size: entry.size,
        };
      });
  },
);

export const getFileContent = query(fileInput, async ({ organization, repoName, path }) => {
  const repo = await Repository.findByFullName(`${organization}/${repoName}`);
  if (!repo) error(404, `Repository ${organization}/${repoName} not found`);

  const content = await GithubContent.readFile(repo, path);
  if (content == null) return null;

  return {
    path,
    content,
    size: Buffer.byteLength(content, 'utf8'),
    language: detectLanguage(path),
  };
});

export const saveAgentsMdFile = command(saveInput, async ({ organization, repoName, path, content }) => {
  const repo = await Repository.findByFullName(`${organization}/${repoName}`);
  if (!repo) error(404, `Repository ${organization}/${repoName} not found`);

  if (!(path === 'AGENTS.md' || path.endsWith('/AGENTS.md'))) {
    error(400, 'Only AGENTS.md files can be saved from this editor');
  }

  const tree = await GithubContent.getTree(repo);
  const existing = tree.find((entry) => entry.type === 'blob' && entry.path === path);

  await GithubContent.writeFile(
    repo,
    path,
    content,
    `Update ${path} from console config editor`,
    undefined,
    existing?.sha,
  );

  return { ok: true };
});

export const getConfigFeedback = command(
  feedbackInput,
  async ({ organization, repoName, agentsMdContent, contextFiles, chatHistory }) => {
    const repo = await Repository.findByFullName(`${organization}/${repoName}`);
    if (!repo) error(404, `Repository ${organization}/${repoName} not found`);

    const historyText = chatHistory
      .slice(-8)
      .map((m) => `${m.role.toUpperCase()}: ${m.text}`)
      .join('\n\n');

    const contextText = contextFiles
      .slice(0, 10)
      .map((file) => `### ${file.path}\n\n${file.content.slice(0, 10000)}`)
      .join('\n\n');

    const prompt = `You are reviewing agent configuration for ${organization}/${repoName}.

Current AGENTS.md content:
${agentsMdContent}

Additional context files:
${contextText || '(none)'}

Recent chat:
${historyText || '(none)'}

Provide concise, concrete guidance. Focus on:
1) unclear or conflicting instructions
2) missing operational details
3) opportunities to improve reliability and safety
4) suggested edits with exact wording where useful`;

    const result = await generateText({
      model: createModel(getApiKey(), 'claude-haiku-4-5-20251001'),
      prompt,
    });

    return { text: result.text };
  },
);
