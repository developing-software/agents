<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		name,
		state,
		children,
	}: {
		name: string;
		state: string;
		children?: Snippet;
	} = $props();
</script>

<div class="tool-card">
	<div class="tool-header">
		<span class="tool-name">{name}</span>
		{#if state === 'input-streaming' || state === 'input-available'}
			<span class="tool-status running">running...</span>
		{:else if state === 'approval-requested'}
			<span class="tool-status approval">approval required</span>
		{:else if state === 'approval-responded'}
			<span class="tool-status running">executing...</span>
		{:else if state === 'output-available'}
			<span class="tool-status done">done</span>
		{:else if state === 'output-denied'}
			<span class="tool-status denied">denied</span>
		{:else if state === 'output-error'}
			<span class="tool-status error">error</span>
		{/if}
	</div>
	{#if children}
		<div class="tool-body">
			{@render children()}
		</div>
	{/if}
</div>

<style>
	.tool-card {
		margin: 6px 0;
		padding: 8px 10px;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		font-size: 12px;
	}

	.tool-header {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.tool-name {
		font-family: 'JetBrains Mono', monospace;
		font-size: 11px;
		color: var(--color-muted);
	}

	.tool-status {
		font-family: 'JetBrains Mono', monospace;
		font-size: 10px;
		padding: 0 5px;
		border-radius: 3px;
		line-height: 1.6;
	}

	.tool-status.running {
		color: var(--color-warning);
		background: color-mix(in srgb, var(--color-warning) 10%, transparent);
	}

	.tool-status.done {
		color: var(--color-success);
		background: color-mix(in srgb, var(--color-success) 10%, transparent);
	}

	.tool-status.approval {
		color: var(--color-warning);
		background: color-mix(in srgb, var(--color-warning) 10%, transparent);
	}

	.tool-status.denied {
		color: var(--color-danger);
		background: color-mix(in srgb, var(--color-danger) 10%, transparent);
	}

	.tool-status.error {
		color: var(--color-danger);
		background: color-mix(in srgb, var(--color-danger) 10%, transparent);
	}

	.tool-body {
		margin-top: 4px;
		font-size: 11px;
		color: var(--color-muted);
	}
</style>
