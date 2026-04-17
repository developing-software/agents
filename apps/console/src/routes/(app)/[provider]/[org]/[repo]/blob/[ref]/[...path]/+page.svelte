<script lang="ts">
  import { page } from '$app/state';
</script>

<svelte:head>
  <title>{page.params.path} — {page.params.org}/{page.params.repo}</title>
</svelte:head>
