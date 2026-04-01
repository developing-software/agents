<script lang="ts">
  import { statusBadgeStyle, authorBadgeStyle, relativeTime } from './plan-helpers';
  import Markdown from '$lib/Markdown.svelte';
  import TagList from '$lib/tag/TagList.svelte';

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

<div class="body">
  <Markdown source={plan.body} />
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

  .body {
    padding: 12px 16px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 4px;
  }
</style>
