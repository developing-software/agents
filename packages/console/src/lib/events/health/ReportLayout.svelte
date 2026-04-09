<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		sidebar: Snippet;
		children: Snippet;
		/** Optional compact mode forces single-column stacking. */
		compact?: boolean;
	}

	let { sidebar, children, compact = false }: Props = $props();
</script>

<div class="report-layout" class:compact>
	<aside class="sidebar">
		{@render sidebar()}
	</aside>
	<section class="main">
		{@render children()}
	</section>
</div>

<style>
	.report-layout {
		display: grid;
		grid-template-columns: minmax(200px, 240px) minmax(0, 1fr);
		gap: 16px;
		align-items: start;
	}

	.sidebar {
		position: sticky;
		top: 8px;
		display: flex;
		flex-direction: column;
		gap: 10px;
		padding-right: 12px;
		border-right: 1px dashed var(--color-border);
		min-width: 0;
	}

	.main {
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.report-layout.compact {
		grid-template-columns: 1fr;
		gap: 10px;
	}
	.report-layout.compact .sidebar {
		position: static;
		padding-right: 0;
		border-right: none;
		border-bottom: 1px dashed var(--color-border);
		padding-bottom: 10px;
	}

	@media (max-width: 720px) {
		.report-layout {
			grid-template-columns: 1fr;
			gap: 10px;
		}
		.sidebar {
			position: static;
			padding-right: 0;
			border-right: none;
			border-bottom: 1px dashed var(--color-border);
			padding-bottom: 10px;
		}
	}
</style>
