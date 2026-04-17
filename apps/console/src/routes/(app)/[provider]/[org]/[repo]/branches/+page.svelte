<script lang="ts">
  import BranchList from '$lib/features/git/components/BranchList.svelte';
  import { listBranchDetails } from '$lib/features/git/api/branches.remote';
  import { repoContext } from '$lib/features/git/context.svelte';

  const { organization, repoName } = repoContext.get();
  const branchesQuery = listBranchDetails({ organization, repoName });
</script>

<div class="page-header">
  <span class="page-title">Branches</span>
</div>

{#if branchesQuery.loading && !branchesQuery.current}
  <p class="loading-text">Loading branches...</p>
{:else if branchesQuery.error}
  <p class="error-text">Failed to load branches</p>
{:else if branchesQuery.current}
  <BranchList branches={branchesQuery.current.branches} />
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
