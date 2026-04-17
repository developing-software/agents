<script lang="ts">
  import IssueList from '$lib/features/git/components/IssueList.svelte';
  import { listIssues } from '$lib/features/git/api/git.remote';
  import { repoContext } from '$lib/features/git/context.svelte';

  const { organization, repoName } = repoContext.get();
  const issuesQuery = listIssues({ organization, repoName });
</script>

{#if issuesQuery.loading && !issuesQuery.current}
  <p class="loading-text">Loading issues...</p>
{:else if issuesQuery.error}
  <p class="error-text">Failed to load issues</p>
{:else if issuesQuery.current}
  <IssueList issues={issuesQuery.current} />
{/if}
