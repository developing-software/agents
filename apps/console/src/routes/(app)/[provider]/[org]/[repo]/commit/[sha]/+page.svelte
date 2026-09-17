<script lang="ts">
  import { page } from '$app/state';
</script>

<svelte:head>
  <title>Commit {page.params.sha?.slice(0, 7)} — {page.params.org}/{page.params.repo}</title>
</svelte:head>
