<script lang="ts">
  import { page } from '$app/state';
  import PullRequests from '$lib/features/git/views/PullRequests.svelte';
</script>

<svelte:head>
  <title>Pull Requests — {page.params.org}/{page.params.repo}</title>
</svelte:head>

<div class="page-header">
  <span class="page-title">Pull Requests</span>
</div>

<PullRequests />

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
