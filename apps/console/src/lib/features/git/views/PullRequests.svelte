<script lang="ts">
  import QueryLoader from '$lib/ui/QueryLoader.svelte';
  import PullRequestList from '../components/PullRequestList.svelte';
  import { listPullRequests } from '../api/git.remote';
  import { repoContext } from '../context.svelte';

  const repo = repoContext.get();
  const query = $derived(listPullRequests({ organization: repo.organization, repoName: repo.repoName }));
</script>

<QueryLoader {query}>
  {#snippet children(pulls)}
    <PullRequestList {pulls} />
  {/snippet}
</QueryLoader>
