<script lang="ts">
  import { statusBadgeStyle, authorBadgeStyle, relativeTime } from './plan-helpers';
  import Markdown from '$lib/ui/Markdown.svelte';
  import TagList from '$lib/ui/tag/TagList.svelte';

  let {
    plan,
  }: {
    plan: {
      id: string;
      title: string;
      body: string;
      status: string;
      authorType: string;
      tags: string[];
      data: Record<string, unknown>;
      source: string | null;
      sourceId: string | null;
      createdBy: string | null;
      timeCreated: string;
      timeUpdated: string;
    };
  } = $props();

  const COLLAPSED_HEIGHT = 480;

  let contentHeight = $state(0);
  let expanded = $state(false);
  const overflows = $derived(contentHeight > COLLAPSED_HEIGHT + 4);
</script>

<div class="meta">
  <span class="badge" style={statusBadgeStyle(plan.status)}>{plan.status}</span>
  <span class="badge" style={authorBadgeStyle(plan.authorType)}>{plan.authorType}</span>
  <span class="plan-id">{plan.id}</span>
  <span style="color: var(--color-dim);">&middot;</span>
  <span class="time">{relativeTime(plan.timeCreated)}</span>
  {#if plan.timeUpdated !== plan.timeCreated}
    <span class="time">updated {relativeTime(plan.timeUpdated)}</span>
  {/if}
</div>

{#if plan.tags.length > 0}
  <div class="plan-tags">
    <TagList tags={plan.tags} />
  </div>
{/if}

<div class="body-wrap">
  <div
    class="body"
    class:body-collapsed={!expanded && overflows}
    style:max-height={!expanded && overflows ? `${COLLAPSED_HEIGHT}px` : null}
  >
    <div class="body-inner" bind:offsetHeight={contentHeight}>
      <Markdown source={plan.body} />
    </div>
  </div>
  {#if overflows}
    <button
      type="button"
      class="toggle-btn"
      onclick={() => { expanded = !expanded; }}
    >
      {expanded ? 'view less' : 'view more'}
    </button>
  {/if}
</div>

<style>
  .meta {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    margin-bottom: 16px;
  }

  .badge {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 3px;
    line-height: 1.6;
    text-transform: capitalize;
  }

  .plan-id {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
  }

  .time {
    font-size: 11px;
    color: var(--color-dim);
  }

  .plan-tags {
    margin-bottom: 16px;
  }

  .body-wrap {
    display: flex;
    flex-direction: column;
    align-items: stretch;
  }

  .body {
    padding: 12px 16px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    overflow: hidden;
  }

  .body-collapsed {
    -webkit-mask-image: linear-gradient(180deg, #000 0, #000 calc(100% - 80px), transparent 100%);
    mask-image: linear-gradient(180deg, #000 0, #000 calc(100% - 80px), transparent 100%);
  }

  .toggle-btn {
    align-self: center;
    margin-top: 8px;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    padding: 4px 14px;
    border-radius: 4px;
    border: 1px solid color-mix(in srgb, var(--color-accent) 35%, transparent);
    background: color-mix(in srgb, var(--color-accent) 8%, transparent);
    color: var(--color-accent);
    cursor: pointer;
    transition: background 0.1s, border-color 0.1s;
  }

  .toggle-btn:hover {
    background: color-mix(in srgb, var(--color-accent) 18%, transparent);
    border-color: var(--color-accent);
  }
</style>
