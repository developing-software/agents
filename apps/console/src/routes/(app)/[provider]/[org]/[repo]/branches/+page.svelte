<script lang="ts">
  import { page } from '$app/state';
  import Branches from '$lib/features/git/views/Branches.svelte';
</script>

<svelte:head>
  <title>Branches — {page.params.org}/{page.params.repo}</title>
</svelte:head>

<div class="page-header">
  <span class="page-title">Branches</span>
</div>

<Branches />

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
