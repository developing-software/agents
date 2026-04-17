<script lang="ts">
  import PullRequestList from '$lib/features/git/components/PullRequestList.svelte';
  import { listPullRequests } from '$lib/features/git/api/git.remote';
  import { repoContext } from '$lib/features/git/context.svelte';

  const { organization, repoName } = repoContext.get();
  const pullsQuery = listPullRequests({ organization, repoName });
</script>

<div class="page-header">
  <span class="page-title">Pull Requests</span>
</div>

{#if pullsQuery.loading && !pullsQuery.current}
  <p class="loading-text">Loading pull requests...</p>
{:else if pullsQuery.error}
  <p class="error-text">Failed to load pull requests</p>
{:else if pullsQuery.current}
  <PullRequestList pulls={pullsQuery.current} />
{/if}

<style>
  .page-header {
    margin-bottom: 16px;
  }
  .page-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text);
  }
</style>
