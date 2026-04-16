<script lang="ts">
  import type { PageProps } from './$types';
  import BranchList from '$lib/git/components/BranchList.svelte';

  let { data }: PageProps = $props();
</script>

<div class="page-header">
  <span class="page-title">Branches</span>
</div>

<BranchList
  branches={data.branches}
/>

<style>
  .page-header {
    margin-bottom: 16px;
  }
  .page-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text);
  }
</style>
