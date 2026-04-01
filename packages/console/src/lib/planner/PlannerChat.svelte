<script lang="ts">
  import type { Chat } from '@ai-sdk/svelte';
  import { renderToolResult, scopeColor, typeColor, statusColor } from './tool-renderers';

  let {
    chat,
    organization,
    repoName,
  }: {
    chat: Chat;
    organization: string;
    repoName: string;
  } = $props();

  const suggestions = [
    'Triage the open issues',
    'List open issues',
    'Show existing plans',
    'Create a plan for the open issues',
  ];

  function sendSuggestion(text: string) {
    chat.append({ role: 'user', content: text });
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      chat.handleSubmit();
    }
  }

  function isStreaming() {
    return chat.status === 'submitted' || chat.status === 'streaming';
  }
</script>

<div class="planner">
  <div class="header">
    <span class="title">Planner</span>
    <span class="subtitle">{organization}/{repoName}</span>
  </div>

  <div class="messages">
    {#if chat.messages.length === 0}
      <div class="empty">
        <p class="empty-label">Ask the planner to triage issues or draft a plan.</p>
        <div class="suggestions">
          {#each suggestions as suggestion (suggestion)}
            <button
              type="button"
              class="suggestion"
              onclick={() => sendSuggestion(suggestion)}
            >{suggestion}</button>
          {/each}
        </div>
      </div>
    {:else}
      {#each chat.messages as message (message.id)}
        <div class="message" class:message-user={message.role === 'user'} class:message-assistant={message.role === 'assistant'}>
          <span class="role">{message.role === 'user' ? 'You' : 'Planner'}</span>
          <div class="content">
            {#each message.parts as part}
              {#if part.type === 'text'}
                <p class="text">{part.text}</p>
              {:else if part.type === 'tool-invocation'}
                {@const inv = part}
                <div class="tool-call">
                  <span class="tool-name">{inv.toolName}</span>
                  {#if inv.state === 'partial-call' || inv.state === 'call'}
                    <span class="tool-status">running…</span>
                  {:else if inv.state === 'result'}
                    {@const rendered = renderToolResult(inv.toolName, inv.result)}
                    {#if rendered.kind === 'issues'}
                      {@const issues = rendered.data as Array<{ number: number; title: string; state: string; labels: string[] }>}
                      <div class="result-card">
                        <span class="result-label">{rendered.summary}</span>
                        <div class="issue-list">
                          {#each issues as issue (issue.number)}
                            <div class="issue-row">
                              <span class="issue-num">#{issue.number}</span>
                              <span class="issue-title">{issue.title}</span>
                              <span class="issue-state" class:state-open={issue.state === 'open'} class:state-closed={issue.state === 'closed'}>{issue.state}</span>
                            </div>
                          {/each}
                        </div>
                      </div>
                    {:else if rendered.kind === 'issue'}
                      {@const issue = rendered.data as { number: number; title: string; state: string; labels: string[]; body?: string | null }}
                      <div class="result-card">
                        <div class="issue-row">
                          <span class="issue-num">#{issue.number}</span>
                          <span class="issue-title">{issue.title}</span>
                          <span class="issue-state" class:state-open={issue.state === 'open'} class:state-closed={issue.state === 'closed'}>{issue.state}</span>
                        </div>
                        {#if issue.labels.length > 0}
                          <div class="label-row">
                            {#each issue.labels as label (label)}
                              <span class="label-pill">{label}</span>
                            {/each}
                          </div>
                        {/if}
                        {#if issue.body}
                          <p class="issue-body">{issue.body.slice(0, 300)}{issue.body.length > 300 ? '…' : ''}</p>
                        {/if}
                      </div>
                    {:else if rendered.kind === 'triage'}
                      {@const triage = rendered.data as { issueNumber: number; type: string; scope: string; actionable: boolean }}
                      <div class="result-card">
                        <span class="result-label">Triaged #{triage.issueNumber}</span>
                        <div class="triage-row">
                          <span class="badge" style="background:{typeColor(triage.type)}">{triage.type}</span>
                          <span class="badge" style="background:{scopeColor(triage.scope)}">{triage.scope}</span>
                          {#if !triage.actionable}
                            <span class="badge badge-muted">not actionable</span>
                          {/if}
                        </div>
                      </div>
                    {:else if rendered.kind === 'plan'}
                      {@const plan = rendered.data as { id: string; title: string }}
                      <div class="result-card">
                        <span class="result-label">{rendered.summary}</span>
                        {#if plan.id}
                          <a
                            href="/gh/{organization}/{repoName}/plans/{plan.id}"
                            class="plan-link"
                          >View plan →</a>
                        {/if}
                      </div>
                    {:else if rendered.kind === 'plans'}
                      {@const plans = rendered.data as Array<{ id: string; title: string; status: string }>}
                      <div class="result-card">
                        <span class="result-label">{rendered.summary}</span>
                        <div class="plan-list">
                          {#each plans as plan (plan.id)}
                            <div class="plan-row">
                              <span class="badge" style="background:{statusColor(plan.status)}">{plan.status}</span>
                              <a href="/gh/{organization}/{repoName}/plans/{plan.id}" class="plan-title">{plan.title}</a>
                            </div>
                          {/each}
                        </div>
                      </div>
                    {:else if rendered.kind === 'file'}
                      {@const file = rendered.data as { path: string; content?: string; error?: string }}
                      <div class="result-card">
                        <span class="result-label">{rendered.summary}</span>
                        {#if file.content}
                          <pre class="file-preview">{file.content.slice(0, 500)}{file.content.length > 500 ? '\n…' : ''}</pre>
                        {/if}
                      </div>
                    {:else if rendered.kind === 'tree'}
                      {@const entries = rendered.data as Array<{ path: string }>}
                      <div class="result-card">
                        <span class="result-label">{rendered.summary}</span>
                        <div class="tree-list">
                          {#each entries.slice(0, 20) as entry (entry.path)}
                            <span class="tree-path">{entry.path}</span>
                          {/each}
                          {#if entries.length > 20}
                            <span class="tree-more">+{entries.length - 20} more</span>
                          {/if}
                        </div>
                      </div>
                    {:else}
                      <div class="result-card">
                        <span class="result-label">{rendered.summary}</span>
                      </div>
                    {/if}
                  {/if}
                </div>
              {/if}
            {/each}
          </div>
        </div>
      {/each}

      {#if isStreaming()}
        <div class="message message-assistant">
          <span class="role">Planner</span>
          <div class="content">
            <span class="thinking">thinking…</span>
          </div>
        </div>
      {/if}
    {/if}
  </div>

  <div class="input-area">
    <textarea
      class="input"
      bind:value={chat.input}
      placeholder="Ask the planner something…"
      rows="3"
      onkeydown={handleKeydown}
      disabled={isStreaming()}
    ></textarea>
    <div class="input-actions">
      {#if isStreaming()}
        <button type="button" class="btn-stop" onclick={() => chat.stop()}>Stop</button>
      {:else}
        <button
          type="button"
          class="btn-send"
          onclick={() => chat.handleSubmit()}
          disabled={!chat.input.trim()}
        >Send</button>
      {/if}
    </div>
  </div>
</div>

<style>
  .planner {
    display: flex;
    flex-direction: column;
    height: calc(100vh - 100px);
    gap: 0;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
  }

  .title {
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text);
  }

  .subtitle {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-dim);
  }

  .messages {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding-bottom: 16px;
  }

  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding-top: 60px;
  }

  .empty-label {
    font-size: 13px;
    color: var(--color-muted);
  }

  .suggestions {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    justify-content: center;
  }

  .suggestion {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    padding: 5px 12px;
    border-radius: 4px;
    border: 1px solid var(--color-border);
    background: var(--color-elevated);
    color: var(--color-muted);
    cursor: pointer;
    transition: color 0.1s, border-color 0.1s;
  }

  .suggestion:hover {
    color: var(--color-text);
    border-color: var(--color-accent);
  }

  .message {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .role {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    font-weight: 600;
    color: var(--color-dim);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .message-user .role { color: var(--color-accent); }

  .content {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .text {
    font-size: 13px;
    color: var(--color-text);
    white-space: pre-wrap;
    margin: 0;
    line-height: 1.6;
  }

  .tool-call {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px 10px;
    background: var(--color-elevated);
    border: 1px solid var(--color-border);
    border-radius: 4px;
  }

  .tool-name {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-accent);
  }

  .tool-status {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
  }

  .result-card {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .result-label {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-muted);
  }

  .issue-list, .plan-list, .tree-list {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .issue-row, .plan-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
  }

  .issue-num {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
    flex-shrink: 0;
  }

  .issue-title, .plan-title {
    color: var(--color-text);
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .plan-title {
    text-decoration: none;
    color: var(--color-accent);
  }

  .plan-title:hover { text-decoration: underline; }

  .issue-state {
    font-family: "JetBrains Mono", monospace;
    font-size: 9px;
    padding: 1px 5px;
    border-radius: 3px;
    flex-shrink: 0;
  }

  .state-open { background: color-mix(in srgb, var(--color-success) 15%, transparent); color: var(--color-success); }
  .state-closed { background: color-mix(in srgb, var(--color-dim) 15%, transparent); color: var(--color-dim); }

  .label-row {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .label-pill {
    font-family: "JetBrains Mono", monospace;
    font-size: 9px;
    padding: 1px 6px;
    border-radius: 3px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    color: var(--color-muted);
  }

  .issue-body {
    font-size: 11px;
    color: var(--color-muted);
    margin: 0;
    white-space: pre-wrap;
    line-height: 1.5;
  }

  .triage-row {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }

  .badge {
    font-family: "JetBrains Mono", monospace;
    font-size: 9px;
    padding: 2px 7px;
    border-radius: 3px;
    color: var(--color-muted);
    border: 1px solid var(--color-border);
  }

  .badge-muted {
    background: transparent;
    color: var(--color-dim);
  }

  .plan-link {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-accent);
    text-decoration: none;
  }
  .plan-link:hover { text-decoration: underline; }

  .file-preview {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-muted);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 3px;
    padding: 6px 8px;
    overflow-x: auto;
    white-space: pre;
    margin: 0;
    max-height: 200px;
    overflow-y: auto;
  }

  .tree-path {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-muted);
    display: block;
  }

  .tree-more {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
  }

  .thinking {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-dim);
  }

  .input-area {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding-top: 12px;
    border-top: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .input {
    font-family: inherit;
    font-size: 13px;
    background: var(--color-elevated);
    border: 1px solid var(--color-border);
    color: var(--color-text);
    border-radius: 4px;
    padding: 8px 10px;
    outline: none;
    resize: none;
    transition: border-color 0.1s;
  }

  .input:focus { border-color: var(--color-accent); }
  .input:disabled { opacity: 0.5; }
  .input::placeholder { color: var(--color-dim); }

  .input-actions {
    display: flex;
    justify-content: flex-end;
  }

  .btn-send, .btn-stop {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    padding: 4px 14px;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    transition: opacity 0.1s;
  }

  .btn-send {
    background: var(--color-accent);
    color: #fff;
  }
  .btn-send:disabled { opacity: 0.4; cursor: default; }
  .btn-send:not(:disabled):hover { opacity: 0.85; }

  .btn-stop {
    background: var(--color-elevated);
    border: 1px solid var(--color-border);
    color: var(--color-muted);
  }
  .btn-stop:hover { color: var(--color-text); }
</style>
