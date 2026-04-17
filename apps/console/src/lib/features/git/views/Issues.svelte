<script lang="ts">
  import QueryLoader from '$lib/ui/QueryLoader.svelte';
  import IssueList from '../components/IssueList.svelte';
  import { listIssues } from '../api/git.remote';
  import { repoContext } from '../context.svelte';

  const { organization, repoName } = repoContext.get();
  const query = listIssues({ organization, repoName });
</script>

<QueryLoader {query}>
  {#snippet children(issues)}
    <IssueList {issues} />
  {/snippet}
</QueryLoader>
