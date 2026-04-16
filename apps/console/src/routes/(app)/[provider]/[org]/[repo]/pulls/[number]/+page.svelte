<script lang="ts">
  import type { PageProps } from './$types';
  import { Tags } from '@agents/core/events/tag';
  import Events from '$lib/events/repository/Feed.svelte';

  let { data }: PageProps = $props();

  const base = $derived(`/${data.provider}/${data.organization}/${data.repoName}`);
</script>

<div class="header">
  <a href="{base}/pulls" class="back">← Pull Requests</a>
  <span class="title">PR #{data.number} — Activity</span>
</div>

<Events
  filterTags={[Tags.Git.pr(data.number)]}
  emptyText="No events for this pull request"
/>

<style>
  .header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }

  .back {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-dim);
    text-decoration: none;
    flex-shrink: 0;
  }

  .back:hover {
    color: var(--color-muted);
  }

  .title {
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    color: var(--color-text);
  }
</style>
