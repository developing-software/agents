import type { RequestHandler } from './$types';
import { generateText } from 'ai';
import { Repository } from '@agents/core/repository/index';
import { createModel } from '$lib/agents/ai/model';
import type { ConfigChatContext } from '$lib/agents/config/config-types';

function streamSse(text: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const chunks = text.match(/.{1,120}/gs) ?? [];
      for (const chunk of chunks) {
        const payload = JSON.stringify({ type: 'chunk', text: chunk });
        controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        await new Promise((resolve) => setTimeout(resolve, 15));
      }

      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
      controller.close();
    },
  });
}

export const POST: RequestHandler = async ({ request, params, locals, platform }) => {
  if (!locals.userID) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { message, chatHistory, context } = (await request.json()) as {
    message: string;
    chatHistory: Array<{ role: 'user' | 'assistant'; text: string }>;
    context: ConfigChatContext;
  };

  const { organization, repo: repoName } = params;

  const repoEntity = await Repository.findByFullName(`${organization}/${repoName}`);
  if (!repoEntity) {
    return new Response('Repository not found', { status: 404 });
  }

  const history = chatHistory
    .slice(-10)
    .map((m) => `${m.role.toUpperCase()}: ${m.text}`)
    .join('\n\n');

  const contextFiles = context.contextFiles
    .slice(0, 10)
    .map((f) => `### ${f.path}\n${f.content.slice(0, 8000)}`)
    .join('\n\n');

  const prompt = `You are a configuration assistant for repository ${organization}/${repoName}.

Current AGENTS.md path: ${context.currentFilePath}
Current AGENTS.md content:
${context.currentFileContent}

Selected context files:
${contextFiles || '(none)'}

Repository path sample (${Math.min(context.repoPaths.length, 500)} entries):
${context.repoPaths.slice(0, 500).join('\n')}

Agent discovery metadata:
- .agents exists: ${context.discovery.agentsFolderExists}
- .claude files: ${context.discovery.claudeFiles.join(', ') || '(none)'}
- AGENTS.md files: ${context.discovery.agentFilePaths.join(', ') || '(none)'}

Recent chat:
${history || '(none)'}

User request:
${message}

Respond with practical, concrete guidance. When suggesting edits, include exact text snippets.`;

  try {
    const result = await generateText({
      model: createModel(platform?.env?.ANTHROPIC_API_KEY, 'claude-haiku-4-5-20251001'),
      prompt,
    });

    return new Response(streamSse(result.text), {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI request failed';
    return new Response(
      `data: ${JSON.stringify({ type: 'error', message })}\n\n`,
      {
        status: 500,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      },
    );
  }
};
