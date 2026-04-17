<script lang="ts">
  import QueryLoader from '$lib/ui/QueryLoader.svelte';
  import BranchList from '../components/BranchList.svelte';
  import { listBranchDetails } from '../api/branches.remote';
  import { repoContext } from '../context.svelte';

  const { organization, repoName } = repoContext.get();
  const query = listBranchDetails({ organization, repoName });
</script>

<QueryLoader {query}>
  {#snippet children(data)}
    <BranchList branches={data.branches} />
  {/snippet}
</QueryLoader>
