<script lang="ts">
  import type { PageProps } from './$types';
  import IssueList from '$lib/github/IssueList.svelte';

  let { data }: PageProps = $props();
</script>

<div class="mb-4">
  <span class="text-sm font-medium" style="color: var(--color-text);">Issues</span>
</div>

<IssueList
  organization={data.organization}
  repoName={data.repoName}
  issues={data.issues}
/>
