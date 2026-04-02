<script lang="ts">
	let { output }: { output: Record<string, unknown> } = $props();
</script>

<div class="triage-badges">
	{#if output.type}
		<span class="badge badge-type">{output.type}</span>
	{/if}
	{#if output.scope}
		<span class="badge badge-scope">{output.scope}</span>
	{/if}
	{#if output.actionable != null}
		<span class="badge" class:badge-yes={output.actionable} class:badge-no={!output.actionable}>
			{output.actionable ? 'actionable' : 'not actionable'}
		</span>
	{/if}
</div>

<style>
	.triage-badges {
		display: flex;
		gap: 4px;
		flex-wrap: wrap;
	}

	.badge {
		font-family: 'JetBrains Mono', monospace;
		font-size: 10px;
		padding: 1px 6px;
		border-radius: 3px;
		line-height: 1.6;
	}

	.badge-type {
		color: var(--color-accent);
		background: color-mix(in srgb, var(--color-accent) 12%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-accent) 25%, transparent);
	}

	.badge-scope {
		color: var(--color-warning);
		background: color-mix(in srgb, var(--color-warning) 12%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-warning) 25%, transparent);
	}

	.badge-yes {
		color: var(--color-success);
		background: color-mix(in srgb, var(--color-success) 12%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-success) 25%, transparent);
	}

	.badge-no {
		color: var(--color-danger);
		background: color-mix(in srgb, var(--color-danger) 12%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-danger) 25%, transparent);
	}
</style>
