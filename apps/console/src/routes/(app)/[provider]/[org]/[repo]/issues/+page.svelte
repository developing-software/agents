<script lang="ts">
  import type { PageProps } from './$types';
  import IssueList from '$lib/git/components/IssueList.svelte';

  let { data }: PageProps = $props();
</script>

<IssueList
  issues={data.issues}
/>
