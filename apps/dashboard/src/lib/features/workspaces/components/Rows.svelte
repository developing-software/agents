<!-- The stacked card list the workspace screens share; each child is a `Row`. -->
<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();
</script>

<ul>{@render children()}</ul>

<style>
	ul {
		display: flex;
		flex-direction: column;
		gap: 0.35em;
		margin: 0;
		padding: 0;
		list-style: none;
	}
</style>
