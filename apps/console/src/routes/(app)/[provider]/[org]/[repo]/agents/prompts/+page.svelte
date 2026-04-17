<script lang="ts">
  import type { PageProps } from './$types';
  import EmptyState from '$lib/ui/EmptyState.svelte';

  let { data }: PageProps = $props();

  let expandedName = $state<string | null>(null);

  function toggle(name: string) {
    expandedName = expandedName === name ? null : name;
  }
</script>

<svelte:head>
  <title>Prompts — {data.organization}/{data.repoName}</title>
</svelte:head>

<h2 class="page-heading">Prompts</h2>

{#if data.prompts.length === 0}
  <EmptyState icon="prompts" title="No prompts found" description="Add prompt files in .agents/prompts/ to configure agent behavior." />
{:else}
  <div class="prompt-list">
    {#each data.prompts as prompt (prompt.name)}
      {@const isExpanded = expandedName === prompt.name}
      <div class="prompt-item" class:prompt-expanded={isExpanded}>
        <button
          type="button"
          class="prompt-row"
          onclick={() => toggle(prompt.name)}
        >
          <span class="prompt-name">{prompt.name}</span>
          <span class="prompt-path">{prompt.path}</span>
          <span class="expand-icon">{isExpanded ? '−' : '+'}</span>
        </button>
        {#if isExpanded}
          <pre class="prompt-content">{prompt.content}</pre>
        {/if}
      </div>
    {/each}
  </div>
{/if}

<style>
  .page-heading {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--color-dim);
    margin: 0 0 14px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .page-heading::after {
    content: '';
    flex: 1;
    border-top: 1px solid var(--color-border);
  }

  .empty {
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    color: var(--color-dim);
    margin: 8px 0 0;
  }

  .prompt-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .prompt-item {
    border: 1px solid var(--color-border);
    border-radius: 5px;
    background: var(--color-surface);
  }

  .prompt-expanded {
    border-color: color-mix(in srgb, var(--color-accent) 30%, var(--color-border));
  }

  .prompt-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    width: 100%;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
  }

  .prompt-row:hover {
    background: color-mix(in srgb, var(--color-text) 3%, transparent);
    border-radius: 4px;
  }

  .prompt-name {
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text);
  }

  .prompt-path {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
    flex: 1;
  }

  .expand-icon {
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    color: var(--color-muted);
    flex-shrink: 0;
  }

  .prompt-content {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-muted);
    padding: 12px 14px;
    margin: 0;
    white-space: pre-wrap;
    word-break: break-word;
    border-top: 1px solid var(--color-border);
    line-height: 1.5;
    background: var(--color-bg);
    border-radius: 0 0 4px 4px;
  }
</style>
