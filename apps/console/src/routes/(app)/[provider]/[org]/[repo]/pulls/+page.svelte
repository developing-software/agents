<script lang="ts">
  import type { PageProps } from './$types';
  import PullRequestList from '$lib/git/components/PullRequestList.svelte';

  let { data }: PageProps = $props();
</script>

<div class="page-header">
  <span class="page-title">Pull Requests</span>
</div>

<PullRequestList
  pulls={data.pulls}
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
