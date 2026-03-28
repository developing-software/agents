<script lang="ts">
  import type { PageProps } from './$types';
  import Events from '$lib/events/Events.svelte';

  let { data }: PageProps = $props();
</script>

<div class="header">
  <a href="/gh/{data.organization}/{data.repoName}/pulls" class="back">← Pull Requests</a>
  <span class="title">PR #{data.number} — Activity</span>
</div>

<Events
  organization={data.organization}
  repoName={data.repoName}
  filterTags={[`gh:pr:${data.number}`]}
  emptyText="No events for this pull request"
/>

<style>
  .header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
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
