<script lang="ts">
  import Markdown from "$lib/ui/Markdown.svelte";
  import { getConfigFeedback } from "./config.remote";
  import type { EditorFile, ContextFile, ChatMessage } from "./config-types";

  interface Props {
    organization: string;
    repoName: string;
    activeFile: EditorFile | null;
    contextFiles: ContextFile[];
  }

  let { organization, repoName, activeFile, contextFiles }: Props = $props();

  let messages = $state<ChatMessage[]>([]);
  let inputText = $state("");
  let sending = $state(false);
  let error = $state<string | null>(null);
  let chatEndEl = $state<HTMLElement | null>(null);

  function clearChat() {
    messages = [];
    error = null;
  }

  async function send(question: string) {
    if (!question.trim() || sending) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: question.trim(),
    };
    messages = [...messages, userMsg];
    inputText = "";
    sending = true;
    error = null;

    // Scroll to bottom
    setTimeout(() => chatEndEl?.scrollIntoView({ behavior: "smooth" }), 50);

    try {
      const result = await getConfigFeedback({
        organization,
        repoName,
        agentsMdPath: activeFile?.path ?? "AGENTS.md",
        agentsMdContent: activeFile?.draftContent ?? activeFile?.content ?? "",
        contextFiles: contextFiles.map((f) => ({ path: f.path, content: f.content })),
        chatHistory: messages.slice(0, -1).map((m) => ({
          role: m.role,
          content: m.content,
        })),
        question: userMsg.content,
      });

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: result.content,
      };
      messages = [...messages, assistantMsg];
    } catch (e) {
      error = e instanceof Error ? e.message : "Request failed";
      // Remove the user message on error
      messages = messages.slice(0, -1);
    } finally {
      sending = false;
      setTimeout(() => chatEndEl?.scrollIntoView({ behavior: "smooth" }), 50);
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(inputText);
    }
  }

  function quickSend(template: string) {
    send(template);
  }
</script>

<div class="chat-panel">
  <!-- Header -->
  <div class="chat-header">
    <span class="chat-title">AI Assistant</span>
    {#if messages.length > 0}
      <button class="clear-btn" onclick={clearChat} title="Clear chat">Clear</button>
    {/if}
  </div>

  <!-- Messages -->
  <div class="chat-messages">
    {#if messages.length === 0}
      <div class="chat-welcome">
        <div class="welcome-icon">◈</div>
        <p class="welcome-text">Ask about agent configuration, request a review, or get improvement suggestions.</p>
        <div class="quick-actions">
          <button
            class="quick-btn"
            onclick={() => quickSend("Review my AGENTS.md and identify any issues or gaps.")}
            disabled={sending || !activeFile}
          >Review this file</button>
          <button
            class="quick-btn"
            onclick={() => quickSend("Suggest specific improvements to make this AGENTS.md more effective.")}
            disabled={sending || !activeFile}
          >Suggest improvements</button>
          <button
            class="quick-btn"
            onclick={() => quickSend("What sections should every AGENTS.md file include?")}
            disabled={sending}
          >What should I include?</button>
        </div>
      </div>
    {:else}
      {#each messages as msg (msg.id)}
        <div class="message" class:user={msg.role === "user"} class:assistant={msg.role === "assistant"}>
          <span class="msg-role">{msg.role === "user" ? "You" : "AI"}</span>
          {#if msg.role === "assistant"}
            <div class="msg-body">
              <Markdown source={msg.content} />
            </div>
          {:else}
            <div class="msg-body msg-user-text">{msg.content}</div>
          {/if}
        </div>
      {/each}

      {#if sending}
        <div class="message assistant">
          <span class="msg-role">AI</span>
          <div class="msg-body msg-thinking">
            <span>·</span><span>·</span><span>·</span>
          </div>
        </div>
      {/if}

      {#if error}
        <div class="chat-error">
          <span class="error-icon">!</span>
          {error}
        </div>
      {/if}
    {/if}
    <div bind:this={chatEndEl}></div>
  </div>

  <!-- Input -->
  <div class="chat-input-wrap">
    {#if !activeFile}
      <p class="no-file-hint">Load an AGENTS.md file to start chatting.</p>
    {:else}
      <div class="input-row">
        <textarea
          class="chat-input"
          placeholder="Ask anything about your agent config…"
          bind:value={inputText}
          onkeydown={handleKeydown}
          disabled={sending}
          rows={2}
        ></textarea>
        <button
          class="send-btn"
          onclick={() => send(inputText)}
          disabled={sending || !inputText.trim()}
          title="Send (Enter)"
        >
          {sending ? "…" : "↑"}
        </button>
      </div>
      <p class="input-hint">Enter to send · Shift+Enter for newline</p>
    {/if}
  </div>
</div>

<style>
  /* ------------------------------------------------------------------ */
  /* Panel                                                               */
  /* ------------------------------------------------------------------ */
  .chat-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 5px;
    overflow: hidden;
  }

  /* ------------------------------------------------------------------ */
  /* Header                                                              */
  /* ------------------------------------------------------------------ */
  .chat-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 7px 10px;
    background: var(--color-elevated);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .chat-title {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-dim);
  }

  .clear-btn {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
    background: transparent;
    border: none;
    cursor: pointer;
    padding: 2px 6px;
    border-radius: 3px;
    transition: color 0.1s;
  }

  .clear-btn:hover {
    color: var(--color-text);
  }

  /* ------------------------------------------------------------------ */
  /* Messages area                                                       */
  /* ------------------------------------------------------------------ */
  .chat-messages {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  /* ------------------------------------------------------------------ */
  /* Welcome state                                                       */
  /* ------------------------------------------------------------------ */
  .chat-welcome {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 24px 12px;
    text-align: center;
  }

  .welcome-icon {
    font-size: 22px;
    color: var(--color-dim);
    line-height: 1;
  }

  .welcome-text {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-muted);
    margin: 0;
    line-height: 1.5;
    max-width: 240px;
  }

  .quick-actions {
    display: flex;
    flex-direction: column;
    gap: 6px;
    width: 100%;
  }

  .quick-btn {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-muted);
    background: var(--color-elevated);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 6px 10px;
    cursor: pointer;
    text-align: left;
    transition: border-color 0.1s, color 0.1s;
    line-height: 1.4;
  }

  .quick-btn:hover:not(:disabled) {
    border-color: var(--color-accent);
    color: var(--color-accent);
  }

  .quick-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  /* ------------------------------------------------------------------ */
  /* Messages                                                            */
  /* ------------------------------------------------------------------ */
  .message {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .msg-role {
    font-family: "JetBrains Mono", monospace;
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .message.user .msg-role {
    color: var(--color-accent);
  }

  .message.assistant .msg-role {
    color: var(--color-dim);
  }

  .msg-body {
    font-size: 12px;
    line-height: 1.55;
  }

  .msg-user-text {
    font-family: "JetBrains Mono", monospace;
    color: var(--color-text);
    white-space: pre-wrap;
    word-break: break-word;
  }

  /* ------------------------------------------------------------------ */
  /* Thinking indicator                                                  */
  /* ------------------------------------------------------------------ */
  .msg-thinking {
    display: flex;
    align-items: center;
    gap: 3px;
    color: var(--color-dim);
    font-family: "JetBrains Mono", monospace;
    font-size: 16px;
  }

  .msg-thinking span {
    animation: thinking 1.2s ease-in-out infinite;
  }

  .msg-thinking span:nth-child(2) { animation-delay: 0.2s; }
  .msg-thinking span:nth-child(3) { animation-delay: 0.4s; }

  @keyframes thinking {
    0%, 80%, 100% { opacity: 0.2; }
    40% { opacity: 1; }
  }

  /* ------------------------------------------------------------------ */
  /* Error                                                               */
  /* ------------------------------------------------------------------ */
  .chat-error {
    display: flex;
    align-items: flex-start;
    gap: 6px;
    padding: 8px 10px;
    background: color-mix(in srgb, var(--color-error, #e06c75) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-error, #e06c75) 25%, transparent);
    border-radius: 4px;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-error, #e06c75);
    line-height: 1.4;
  }

  .error-icon {
    font-weight: 700;
    flex-shrink: 0;
  }

  /* ------------------------------------------------------------------ */
  /* Input area                                                          */
  /* ------------------------------------------------------------------ */
  .chat-input-wrap {
    padding: 8px;
    border-top: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .no-file-hint {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
    margin: 0;
    text-align: center;
    padding: 4px;
  }

  .input-row {
    display: flex;
    align-items: flex-end;
    gap: 6px;
  }

  .chat-input {
    flex: 1;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    line-height: 1.5;
    padding: 6px 8px;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    color: var(--color-text);
    outline: none;
    resize: none;
    transition: border-color 0.1s;
  }

  .chat-input:focus {
    border-color: var(--color-accent);
  }

  .chat-input::placeholder {
    color: var(--color-dim);
  }

  .chat-input:disabled {
    opacity: 0.7;
  }

  .send-btn {
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-accent);
    color: var(--color-bg);
    border: none;
    border-radius: 4px;
    font-size: 16px;
    cursor: pointer;
    flex-shrink: 0;
    transition: opacity 0.1s;
    line-height: 1;
  }

  .send-btn:hover:not(:disabled) {
    opacity: 0.85;
  }

  .send-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .input-hint {
    font-family: "JetBrains Mono", monospace;
    font-size: 9px;
    color: var(--color-dim);
    margin: 4px 0 0;
    text-align: right;
  }
</style>
