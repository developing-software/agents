<script lang="ts">
  import type { PageProps } from './$types';
  import IssueList from '$lib/github/IssueList.svelte';

  let { data }: PageProps = $props();
</script>

<IssueList
  issues={data.issues}
/>
