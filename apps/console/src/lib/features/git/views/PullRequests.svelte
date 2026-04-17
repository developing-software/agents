<script lang="ts">
  import QueryLoader from '$lib/ui/QueryLoader.svelte';
  import PullRequestList from '../components/PullRequestList.svelte';
  import { listPullRequests } from '../api/git.remote';
  import { repoContext } from '../context.svelte';

  const { organization, repoName } = repoContext.get();
  const query = listPullRequests({ organization, repoName });
</script>

<QueryLoader {query}>
  {#snippet children(pulls)}
    <PullRequestList {pulls} />
  {/snippet}
</QueryLoader>
