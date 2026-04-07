<script lang="ts">
	interface Props {
		data: any;
	}

	let { data }: Props = $props();

	const metrics = $derived.by(() => {
		const s = data.summary ?? {};
		const v = data.vital_signs ?? {};
		return [
			{ label: 'Files analyzed', value: s.files_analyzed ?? '—' },
			{ label: 'Functions analyzed', value: s.functions_analyzed ?? '—' },
			{ label: 'Above threshold', value: s.functions_above_threshold ?? '—' },
			{ label: 'Hotspots', value: v.hotspot_count ?? '—' },
			{ label: 'Maintainability avg', value: v.maintainability_avg != null ? Number(v.maintainability_avg).toFixed(1) : '—' },
			{ label: 'Avg cyclomatic', value: v.avg_cyclomatic != null ? Number(v.avg_cyclomatic).toFixed(1) : '—' },
			{ label: 'P90 cyclomatic', value: v.p90_cyclomatic ?? '—' },
		];
	});

	const vitalCounts = $derived.by(() => {
		const counts = data.vital_signs?.counts;
		if (!counts || typeof counts !== 'object') return [];
		return Object.entries(counts).map(([key, val]) => ({ key, value: val }));
	});

	const hotspots = $derived(Array.isArray(data.hotspots) ? data.hotspots : []);
</script>

<div class="report">
	<div class="metrics-row">
		{#each metrics as metric (metric.label)}
			<div class="metric">
				<span class="metric-label">{metric.label}</span>
				<span class="metric-value">{metric.value}</span>
			</div>
		{/each}
	</div>

	{#if vitalCounts.length > 0}
		<div class="section-header">Vital signs</div>
		<div class="kv-list">
			{#each vitalCounts as item (item.key)}
				<div class="kv-row">
					<span class="kv-key">{item.key}</span>
					<span class="kv-val">{item.value}</span>
				</div>
			{/each}
		</div>
	{/if}

	{#if hotspots.length > 0}
		<div class="section-header">Hotspots</div>
		<div class="items">
			{#each hotspots as spot, i (spot.path ?? i)}
				<div class="item-card">
					<div class="item-main">
						<span class="filepath">{spot.path}</span>
						<div class="badges">
							{#if spot.score != null}
								<span class="badge">{Number(spot.score).toFixed(1)}</span>
							{/if}
							{#if spot.trend}
								<span class="badge">{spot.trend}</span>
							{/if}
							{#if spot.commits != null}
								<span class="badge">{spot.commits} commits</span>
							{/if}
						</div>
					</div>
					{#if Array.isArray(spot.actions) && spot.actions.length > 0}
						<div class="actions">
							{#each spot.actions as action, j (j)}
								<span class="action-text">{action.description ?? action}{#if action.note} — {action.note}{/if}</span>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.report {
		font-family: "JetBrains Mono", monospace;
		font-size: 11px;
		color: var(--color-text);
	}
	.metrics-row {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
		margin-bottom: 8px;
	}
	.metric {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.metric-label {
		font-size: 10px;
		color: var(--color-muted);
		text-transform: uppercase;
		letter-spacing: 0.3px;
	}
	.metric-value {
		font-size: 11px;
		color: var(--color-text);
	}
	.section-header {
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--color-muted);
		margin-top: 12px;
		margin-bottom: 6px;
	}
	.kv-list {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.kv-row {
		display: flex;
		gap: 8px;
		align-items: baseline;
	}
	.kv-key {
		font-size: 11px;
		color: var(--color-dim);
		min-width: 140px;
	}
	.kv-val {
		font-size: 11px;
		color: var(--color-text);
	}
	.filepath {
		font-family: "JetBrains Mono", monospace;
		font-size: 11px;
		color: var(--color-text);
		word-break: break-all;
	}
	.items {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}
	.item-card {
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: 6px;
		background: var(--color-elevated);
	}
	.item-main {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		flex-wrap: wrap;
	}
	.badges {
		display: flex;
		gap: 4px;
		flex-wrap: wrap;
		flex-shrink: 0;
	}
	.badge {
		font-size: 10px;
		padding: 1px 6px;
		border-radius: 3px;
		border: 1px solid var(--color-border);
		color: var(--color-muted);
		white-space: nowrap;
		line-height: 1.6;
	}
	.actions {
		display: flex;
		flex-direction: column;
		gap: 1px;
		margin-top: 4px;
	}
	.action-text {
		font-size: 10px;
		color: var(--color-dim);
		line-height: 1.4;
	}
</style>
