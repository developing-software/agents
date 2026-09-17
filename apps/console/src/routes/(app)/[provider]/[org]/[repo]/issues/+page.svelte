<script lang="ts">
  import { page } from '$app/state';
  import Issues from '$lib/features/git/views/Issues.svelte';
</script>

<svelte:head>
  <title>Issues — {page.params.org}/{page.params.repo}</title>
</svelte:head>

<Issues />
