<script lang="ts">
  import type { PageProps } from './$types';
  import BranchList from '$lib/github/BranchList.svelte';

  let { data }: PageProps = $props();
</script>

<div class="mb-4">
  <span class="text-sm font-medium" style="color: var(--color-text);">Branches</span>
</div>

<BranchList
  organization={data.organization}
  repoName={data.repoName}
  branches={data.branches}
/>
