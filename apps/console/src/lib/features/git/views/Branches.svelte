<script lang="ts">
  import QueryLoader from '$lib/ui/QueryLoader.svelte';
  import BranchList from '../components/BranchList.svelte';
  import { listBranchDetails } from '../api/branches.remote';
  import { repoContext } from '../context.svelte';

  const repo = repoContext.get();
  const query = $derived(listBranchDetails({ organization: repo.organization, repoName: repo.repoName }));
</script>

<QueryLoader {query}>
  {#snippet children(data)}
    <BranchList branches={data.branches} />
  {/snippet}
</QueryLoader>
