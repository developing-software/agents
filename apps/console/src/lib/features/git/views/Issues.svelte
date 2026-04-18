<script lang="ts">
  import QueryLoader from '$lib/ui/QueryLoader.svelte';
  import IssueList from '../components/IssueList.svelte';
  import { listIssues } from '../api/git.remote';
  import { repoContext } from '../context.svelte';

  const repo = repoContext.get();
  const query = $derived(listIssues({ organization: repo.organization, repoName: repo.repoName }));
</script>

<QueryLoader {query}>
  {#snippet children(issues)}
    <IssueList {issues} />
  {/snippet}
</QueryLoader>
