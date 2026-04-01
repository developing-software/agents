<script lang="ts">
  import type { PageProps } from './$types';
  import PullRequestList from '$lib/github/PullRequestList.svelte';

  let { data }: PageProps = $props();
</script>

<div class="mb-4">
  <span class="text-sm font-medium" style="color: var(--color-text);">Pull Requests</span>
</div>

<PullRequestList
  organization={data.organization}
  repoName={data.repoName}
  pulls={data.pulls}
/>
