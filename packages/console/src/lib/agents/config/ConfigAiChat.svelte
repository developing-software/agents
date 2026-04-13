<script lang="ts">
  import { TextareaAutosize, useMutationObserver } from 'runed';
  import Markdown from '$lib/ui/Markdown.svelte';
  import type { ConfigChatContext, ConfigChatMessage } from './config-types';

  let {
    organization,
    repoName,
    context,
  }: {
    organization: string;
    repoName: string;
    context: ConfigChatContext;
  } = $props();

  let messages = $state<ConfigChatMessage[]>([]);
  let inputValue = $state('');
  let loading = $state(false);
  let error = $state<string | null>(null);
  let textareaEl: HTMLTextAreaElement | undefined = $state();
  let messagesEl: HTMLElement | undefined = $state();

  new TextareaAutosize({
    element: () => textareaEl,
    input: () => inputValue,
    maxHeight: 220,
  });

  useMutationObserver(
    () => messagesEl,
    () => {
      if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
    },
    { childList: true, subtree: true, characterData: true },
  );

  function nowIso() {
    return new Date().toISOString();
  }

  async function send(rawText?: string) {
    const text = (rawText ?? inputValue).trim();
    if (!text || loading) return;

    error = null;
    inputValue = '';

    const historyPayload = [
      ...messages.map((m) => ({ role: m.role, text: m.text })),
      { role: 'user' as const, text },
    ];

    const userMessage: ConfigChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text,
      time: nowIso(),
    };

    messages = [...messages, userMessage];

    const assistantId = crypto.randomUUID();
    messages = [...messages, { id: assistantId, role: 'assistant', text: '', time: nowIso() }];

    loading = true;

    try {
      const response = await fetch(`/gh/${organization}/${repoName}/agents/config/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          chatHistory: historyPayload,
          context,
        }),
      });

      if (!response.ok) {
        throw new Error(`AI request failed (${response.status})`);
      }

      if (!response.body) {
        throw new Error('No response stream');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        while (true) {
          const split = buffer.indexOf('\n\n');
          if (split < 0) break;

          const eventBlock = buffer.slice(0, split).trim();
          buffer = buffer.slice(split + 2);

          const dataLine = eventBlock
            .split('\n')
            .find((line) => line.startsWith('data:'));

          if (!dataLine) continue;
          const payload = JSON.parse(dataLine.slice(5).trim()) as {
            type: 'chunk' | 'done' | 'error';
            text?: string;
            message?: string;
          };

          if (payload.type === 'chunk' && payload.text) {
            messages = messages.map((m) =>
              m.id === assistantId ? { ...m, text: `${m.text}${payload.text}` } : m,
            );
          }

          if (payload.type === 'error') {
            error = payload.message ?? 'AI request failed';
          }
        }
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'AI request failed';
    } finally {
      loading = false;
    }
  }

  function clearHistory() {
    messages = [];
    error = null;
  }

  function reviewCurrentFile() {
    void send('Review this AGENTS.md file and call out concrete fixes.');
  }

  function suggestImprovements() {
    void send('Suggest improvements for this AGENTS.md and provide exact replacement snippets.');
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  }
</script>

<section class="chat-card">
  <header class="chat-header">
    <div class="title">Config AI Chat</div>
    <div class="header-actions">
      <button type="button" class="btn" onclick={reviewCurrentFile} disabled={loading}>Review File</button>
      <button type="button" class="btn" onclick={suggestImprovements} disabled={loading}>Suggest</button>
      <button type="button" class="btn" onclick={clearHistory} disabled={loading || messages.length === 0}>Clear</button>
    </div>
  </header>

  <div class="messages" bind:this={messagesEl}>
    {#if messages.length === 0}
      <div class="empty">Ask about agent setup, missing constraints, or better instruction wording.</div>
    {:else}
      {#each messages as message (message.id)}
        <article class="message" class:message-user={message.role === 'user'}>
          <div class="role">{message.role === 'user' ? 'You' : 'AI'}</div>
          <div class="bubble">
            {#if message.role === 'assistant'}
              <Markdown source={message.text || '...'} />
            {:else}
              {message.text}
            {/if}
          </div>
        </article>
      {/each}
    {/if}

    {#if loading}
      <div class="typing">AI is responding...</div>
    {/if}
  </div>

  {#if error}
    <div class="error">{error}</div>
  {/if}

  <div class="input-wrap">
    <textarea
      bind:this={textareaEl}
      bind:value={inputValue}
      onkeydown={handleKeydown}
      placeholder="Ask for feedback on AGENTS.md, context files, or repo structure..."
      rows={1}
      disabled={loading}
    ></textarea>
    <button type="button" class="send" onclick={() => send()} disabled={loading || !inputValue.trim()}>
      Send
    </button>
  </div>
</section>

<style>
  .chat-card {
    height: 100%;
    min-height: 0;
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-surface);
    display: flex;
    flex-direction: column;
  }

  .chat-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
    border-bottom: 1px solid var(--color-border);
    padding: 8px;
  }

  .title {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    color: var(--color-text);
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 5px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .btn {
    border: 1px solid var(--color-border);
    background: var(--color-bg);
    color: var(--color-muted);
    border-radius: 4px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    padding: 3px 7px;
    cursor: pointer;
  }

  .messages {
    min-height: 0;
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px;
  }

  .empty {
    font-size: 12px;
    color: var(--color-dim);
    line-height: 1.5;
    margin-top: 10px;
  }

  .message {
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-width: 95%;
  }

  .message-user {
    align-self: flex-end;
    align-items: flex-end;
  }

  .role {
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: var(--color-dim);
  }

  .bubble {
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-elevated);
    color: var(--color-text);
    padding: 8px 10px;
    font-size: 12px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .message-user .bubble {
    background: color-mix(in srgb, var(--color-accent) 9%, var(--color-surface));
  }

  .typing {
    font-size: 11px;
    color: var(--color-dim);
  }

  .error {
    margin: 0 10px 8px;
    border: 1px solid color-mix(in srgb, var(--color-danger) 20%, transparent);
    background: color-mix(in srgb, var(--color-danger) 8%, transparent);
    color: var(--color-danger);
    border-radius: 6px;
    padding: 8px;
    font-size: 12px;
  }

  .input-wrap {
    border-top: 1px solid var(--color-border);
    padding: 8px;
    display: flex;
    gap: 8px;
    align-items: flex-end;
  }

  textarea {
    flex: 1;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background: var(--color-bg);
    color: var(--color-text);
    font-size: 12px;
    line-height: 1.5;
    padding: 8px 9px;
    resize: none;
    min-height: 34px;
    outline: none;
  }

  textarea:focus {
    border-color: var(--color-accent);
  }

  .send {
    border: 1px solid var(--color-accent);
    background: var(--color-accent);
    color: white;
    border-radius: 6px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    padding: 7px 11px;
    cursor: pointer;
  }

  .send:disabled,
  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
