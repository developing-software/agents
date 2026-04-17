<script lang="ts">
  import PullRequests from '$lib/features/git/views/PullRequests.svelte';
</script>

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
