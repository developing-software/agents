<script lang="ts">
	interface Metric {
		label: string;
		value: string | number;
		hint?: string;
		emphasized?: boolean;
	}

	interface Props {
		title?: string;
		metrics: Metric[];
	}

	let { title, metrics }: Props = $props();
</script>

<div class="metric-list">
	{#if title}
		<div class="list-title">{title}</div>
	{/if}
	{#each metrics as metric (metric.label)}
		<div class="metric-row" class:metric-row-emphasized={metric.emphasized}>
			<span class="metric-label">{metric.label}</span>
			<span class="metric-value">{metric.value}</span>
			{#if metric.hint}
				<span class="metric-hint">{metric.hint}</span>
			{/if}
		</div>
	{/each}
</div>

<style>
	.metric-list {
		display: flex;
		flex-direction: column;
		gap: 2px;
		font-family: "JetBrains Mono", monospace;
	}

	.list-title {
		font-size: 9px;
		text-transform: uppercase;
		letter-spacing: 0.6px;
		color: var(--color-muted);
		padding-bottom: 4px;
		margin-bottom: 2px;
		border-bottom: 1px solid var(--color-border);
	}

	.metric-row {
		display: grid;
		grid-template-columns: 1fr auto;
		align-items: baseline;
		gap: 8px;
		padding: 2px 0;
		border-bottom: 1px dotted transparent;
	}

	.metric-row-emphasized {
		border-bottom-color: var(--color-border);
		padding-bottom: 4px;
		margin-bottom: 2px;
	}

	.metric-label {
		font-size: 10px;
		color: var(--color-muted);
		text-transform: lowercase;
		letter-spacing: 0.2px;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.metric-value {
		font-size: 12px;
		color: var(--color-text);
		font-weight: 500;
		text-align: right;
	}

	.metric-row-emphasized .metric-value {
		font-size: 14px;
		color: var(--color-accent);
	}

	.metric-hint {
		grid-column: 1 / -1;
		font-size: 9px;
		color: var(--color-dim);
	}
</style>
