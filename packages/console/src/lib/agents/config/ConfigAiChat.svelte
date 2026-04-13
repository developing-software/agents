<script lang="ts">
  import Markdown from '$lib/ui/Markdown.svelte';
  import type { ChatMessage, ContextFile } from './config-types';
  import { getConfigFeedback } from './config.remote';

  let {
    organization,
    repoName,
    agentsMdPath,
    agentsMdContent,
    contextFiles,
  }: {
    organization: string;
    repoName: string;
    agentsMdPath: string;
    agentsMdContent: string;
    contextFiles: ContextFile[];
  } = $props();

  let messages = $state<ChatMessage[]>([]);
  let inputText = $state('');
  let loading = $state(false);
  let error = $state<string | null>(null);
  let messagesEl = $state<HTMLDivElement>();

  function scrollToBottom() {
    if (messagesEl) {
      requestAnimationFrame(() => {
        messagesEl!.scrollTop = messagesEl!.scrollHeight;
      });
    }
  }

  function makeId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: makeId(),
      role: 'user',
      content: text.trim(),
      timestamp: Date.now(),
    };
    messages = [...messages, userMsg];
    inputText = '';
    error = null;
    loading = true;
    scrollToBottom();

    try {
      const chatHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const result = await getConfigFeedback({
        organization,
        repoName,
        agentsMdContent,
        agentsMdPath,
        contextFiles: contextFiles.map((f) => ({ path: f.path, content: f.content })),
        messages: chatHistory,
      });

      const assistantMsg: ChatMessage = {
        id: makeId(),
        role: 'assistant',
        content: result.response,
        timestamp: Date.now(),
      };
      messages = [...messages, assistantMsg];
    } catch (err: unknown) {
      error = err instanceof Error ? err.message : 'Failed to get response';
    } finally {
      loading = false;
      scrollToBottom();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputText);
    }
  }

  function handleReview() {
    sendMessage('Review this AGENTS.md file and provide feedback on its clarity, completeness, and effectiveness for guiding AI agents.');
  }

  function handleSuggest() {
    sendMessage('Suggest specific improvements to this AGENTS.md file. Focus on making instructions clearer, adding missing context, and improving agent guardrails.');
  }

  function clearChat() {
    messages = [];
    error = null;
  }
</script>

<div class="chat-container">
  <div class="chat-header">
    <span class="chat-title">AI Assistant</span>
    {#if messages.length > 0}
      <button type="button" class="clear-btn" onclick={clearChat}>Clear</button>
    {/if}
  </div>

  <div class="chat-messages" bind:this={messagesEl}>
    {#if messages.length === 0}
      <div class="chat-welcome">
        <p class="welcome-text">Ask questions about your agent config or get AI-powered feedback.</p>
        <div class="quick-actions">
          <button type="button" class="quick-btn" onclick={handleReview}>
            <span class="quick-icon">&#9998;</span>
            Review this file
          </button>
          <button type="button" class="quick-btn" onclick={handleSuggest}>
            <span class="quick-icon">&#9889;</span>
            Suggest improvements
          </button>
        </div>
      </div>
    {:else}
      {#each messages as msg (msg.id)}
        <div class="chat-msg" class:msg-user={msg.role === 'user'} class:msg-assistant={msg.role === 'assistant'}>
          <span class="msg-role">{msg.role === 'user' ? 'You' : 'AI'}</span>
          <div class="msg-content">
            {#if msg.role === 'assistant'}
              <Markdown source={msg.content} />
            {:else}
              <p>{msg.content}</p>
            {/if}
          </div>
        </div>
      {/each}
    {/if}

    {#if loading}
      <div class="chat-msg msg-assistant">
        <span class="msg-role">AI</span>
        <div class="msg-content">
          <span class="typing-indicator">
            <span class="dot"></span>
            <span class="dot"></span>
            <span class="dot"></span>
          </span>
        </div>
      </div>
    {/if}

    {#if error}
      <div class="error-msg">{error}</div>
    {/if}
  </div>

  <div class="chat-input-area">
    {#if contextFiles.length > 0}
      <div class="context-indicator">
        <span class="ctx-count">{contextFiles.length} file{contextFiles.length === 1 ? '' : 's'} in context</span>
      </div>
    {/if}
    <div class="input-row">
      <textarea
        class="chat-input"
        placeholder="Ask about your agent config..."
        bind:value={inputText}
        onkeydown={handleKeydown}
        rows="2"
        disabled={loading}
      ></textarea>
      <button
        type="button"
        class="send-btn"
        onclick={() => sendMessage(inputText)}
        disabled={loading || !inputText.trim()}
      >&#8593;</button>
    </div>
  </div>
</div>

<style>
  .chat-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
  }

  .chat-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 10px;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .chat-title {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-muted);
  }

  .clear-btn {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    background: none;
    border: none;
    color: var(--color-dim);
    cursor: pointer;
    padding: 2px 6px;
  }
  .clear-btn:hover { color: var(--color-muted); }

  .chat-messages {
    flex: 1;
    overflow-y: auto;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .chat-welcome {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 8px 0;
  }

  .welcome-text {
    font-size: 12px;
    color: var(--color-dim);
    line-height: 1.5;
  }

  .quick-actions {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .quick-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    padding: 8px 10px;
    background: var(--color-elevated);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    color: var(--color-muted);
    cursor: pointer;
    text-align: left;
    transition: all 0.1s;
  }
  .quick-btn:hover {
    color: var(--color-text);
    border-color: var(--color-border-bright);
    background: var(--color-hover);
  }

  .quick-icon {
    font-size: 13px;
    flex-shrink: 0;
  }

  .chat-msg {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .msg-role {
    font-family: "JetBrains Mono", monospace;
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-dim);
  }

  .msg-content {
    font-size: 12px;
    line-height: 1.5;
    color: var(--color-text);
  }
  .msg-user .msg-content {
    background: var(--color-elevated);
    border-radius: 4px;
    padding: 6px 10px;
  }
  .msg-user .msg-content p {
    margin: 0;
    white-space: pre-wrap;
  }
  .msg-assistant .msg-content {
    padding: 2px 0;
  }

  .typing-indicator {
    display: inline-flex;
    gap: 3px;
    padding: 4px 0;
  }
  .dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--color-dim);
    animation: bounce 1.2s infinite;
  }
  .dot:nth-child(2) { animation-delay: 0.15s; }
  .dot:nth-child(3) { animation-delay: 0.3s; }

  @keyframes bounce {
    0%, 80%, 100% { opacity: 0.3; }
    40% { opacity: 1; }
  }

  .error-msg {
    font-size: 11px;
    color: var(--color-danger);
    padding: 4px 8px;
    background: var(--color-danger-dim);
    border-radius: 3px;
  }

  .chat-input-area {
    border-top: 1px solid var(--color-border);
    padding: 8px;
    flex-shrink: 0;
  }

  .context-indicator {
    padding: 2px 0 6px;
  }

  .ctx-count {
    font-family: "JetBrains Mono", monospace;
    font-size: 9px;
    color: var(--color-accent);
    background: var(--color-accent-dim);
    padding: 2px 6px;
    border-radius: 8px;
  }

  .input-row {
    display: flex;
    gap: 4px;
    align-items: flex-end;
  }

  .chat-input {
    flex: 1;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    padding: 6px 8px;
    background: var(--color-elevated);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    color: var(--color-text);
    outline: none;
    resize: none;
    line-height: 1.5;
    transition: border-color 0.1s;
  }
  .chat-input::placeholder { color: var(--color-dim); }
  .chat-input:focus { border-color: var(--color-accent); }
  .chat-input:disabled { opacity: 0.5; }

  .send-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-accent);
    border: none;
    border-radius: 4px;
    color: white;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    flex-shrink: 0;
    transition: opacity 0.1s;
  }
  .send-btn:disabled {
    opacity: 0.3;
    cursor: default;
  }
  .send-btn:hover:not(:disabled) {
    opacity: 0.85;
  }
</style>
