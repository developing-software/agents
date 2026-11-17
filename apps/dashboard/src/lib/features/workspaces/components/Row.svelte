<script lang="ts">
	import type { Snippet } from 'svelte';

	// `dense` sets the row in smaller type, for lists read at a glance.
	let { children, dense = false }: { children: Snippet; dense?: boolean } = $props();
</script>

<li class={{ dense }}>{@render children()}</li>

<style>
	li {
		display: flex;
		align-items: center;
		gap: 0.75em;
		padding: 0.5em 0.9em;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
	}

	.dense {
		font-size: 0.9em;
	}
</style>
