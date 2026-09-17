<script lang="ts">
	import CopyToAgent from '$lib/features/agents/CopyToAgent.svelte';
	import MetricList from './MetricList.svelte';
	import ReportLayout from './ReportLayout.svelte';
	import { hotspotPrompt } from './prompt';

	interface Props {
		data: any;
	}

	let { data }: Props = $props();

	const summaryMetrics = $derived.by(() => {
		const s = data.summary ?? {};
		const v = data.vital_signs ?? {};
		const mAvg =
			v.maintainability_avg != null ? Number(v.maintainability_avg).toFixed(1) : '—';
		const cAvg = v.avg_cyclomatic != null ? Number(v.avg_cyclomatic).toFixed(1) : '—';
		return [
			{
				label: 'maintainability',
				value: mAvg,
				emphasized: true,
				hint: 'average',
			},
			{ label: 'files', value: s.files_analyzed ?? '—' },
			{ label: 'functions', value: s.functions_analyzed ?? '—' },
			{ label: 'above threshold', value: s.functions_above_threshold ?? '—' },
			{ label: 'hotspots', value: v.hotspot_count ?? '—' },
			{ label: 'avg cyclomatic', value: cAvg },
			{ label: 'p90 cyclomatic', value: v.p90_cyclomatic ?? '—' },
		];
	});

	const vitalCounts = $derived.by(() => {
		const counts = data.vital_signs?.counts;
		if (!counts || typeof counts !== 'object') return [];
		return Object.entries(counts).map(([key, val]) => ({
			label: key,
			value: val as string | number,
		}));
	});

	interface Hotspot {
		path: string;
		score?: number;
		trend?: string;
		commits?: number;
		actions?: Array<{ description?: string; note?: string } | string>;
	}

	const hotspots = $derived<Hotspot[]>(Array.isArray(data.hotspots) ? data.hotspots : []);

	// Severity bar scaling — normalize against the max score in the set.
	const maxScore = $derived(
		hotspots.reduce((m, h) => (h.score != null && h.score > m ? h.score : m), 0)
	);

	function severityPct(score: number | undefined): number {
		if (score == null || maxScore === 0) return 0;
		return Math.max(8, Math.min(100, (score / maxScore) * 100));
	}

	function severityTier(score: number | undefined): 'hot' | 'warm' | 'cool' {
		if (score == null || maxScore === 0) return 'cool';
		const pct = score / maxScore;
		if (pct >= 0.75) return 'hot';
		if (pct >= 0.4) return 'warm';
		return 'cool';
	}

	function formatTrend(trend: string | undefined): string {
		if (!trend) return '';
		if (trend.includes('up') || trend === 'rising') return '↗';
		if (trend.includes('down') || trend === 'falling') return '↘';
		if (trend === 'flat' || trend === 'stable') return '→';
		return trend;
	}
</script>

<ReportLayout>
	{#snippet sidebar()}
		<MetricList title="Vital signs" metrics={summaryMetrics} />
		{#if vitalCounts.length > 0}
			<MetricList title="Counts" metrics={vitalCounts} />
		{/if}
		<div class="legend">
			<div class="legend-title">Insights, not todos</div>
			<p class="legend-body">
				Hotspots are discovery signals — files that churn and resist change.
				Review them, then use <em>copy to agent</em> to open a refactor conversation.
			</p>
		</div>
	{/snippet}

	{#if hotspots.length > 0}
		<div class="section-head">
			<span class="section-title">Hotspots</span>
			<span class="section-sub">{hotspots.length} ranked by risk</span>
		</div>
		<ol class="hotspot-list">
			{#each hotspots as spot, i (spot.path ?? i)}
				{@const tier = severityTier(spot.score)}
				<li class="hotspot" data-tier={tier}>
					<div class="hotspot-rank">{i + 1}</div>
					<div class="hotspot-bar" aria-hidden="true">
						<div class="hotspot-bar-fill" style="width: {severityPct(spot.score)}%"></div>
					</div>
					<div class="hotspot-main">
						<div class="hotspot-head">
							<span class="hotspot-path">{spot.path}</span>
							<div class="hotspot-meta">
								{#if spot.score != null}
									<span class="stat stat-score">{Number(spot.score).toFixed(1)}</span>
								{/if}
								{#if spot.commits != null}
									<span class="stat">{spot.commits} commits</span>
								{/if}
								{#if spot.trend}
									<span class="stat stat-trend">{formatTrend(spot.trend)} {spot.trend}</span>
								{/if}
								<CopyToAgent
									prompt={() => hotspotPrompt(spot)}
									label="discuss"
									variant="row"
									menuTitle="Discuss hotspot with"
								/>
							</div>
						</div>
						{#if Array.isArray(spot.actions) && spot.actions.length > 0}
							<ul class="hotspot-actions">
								{#each spot.actions as action, j (j)}
									<li class="action">
										<span class="action-dot">›</span>
										<span class="action-text">
											{typeof action === 'string' ? action : action.description ?? ''}
											{#if typeof action !== 'string' && action?.note}
												<span class="action-note"> — {action.note}</span>
											{/if}
										</span>
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				</li>
			{/each}
		</ol>
	{:else}
		<div class="empty">No hotspots detected.</div>
	{/if}
</ReportLayout>

<style>
	.legend {
		font-family: "JetBrains Mono", monospace;
		padding: 8px;
		border: 1px solid var(--color-border);
		border-radius: 3px;
		background: var(--color-surface);
	}
	.legend-title {
		font-size: 9px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--color-accent);
		margin-bottom: 4px;
	}
	.legend-body {
		margin: 0;
		font-size: 10px;
		color: var(--color-dim);
		line-height: 1.5;
	}
	.legend-body em {
		font-style: normal;
		color: var(--color-text);
	}

	.section-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 8px;
		padding-bottom: 4px;
		border-bottom: 1px solid var(--color-border);
	}
	.section-title {
		font-family: "JetBrains Mono", monospace;
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.6px;
		color: var(--color-text);
	}
	.section-sub {
		font-family: "JetBrains Mono", monospace;
		font-size: 10px;
		color: var(--color-dim);
	}

	.hotspot-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.hotspot {
		position: relative;
		display: grid;
		grid-template-columns: 20px 1fr;
		grid-template-rows: auto auto;
		gap: 2px 8px;
		padding: 6px 8px 6px 6px;
		border: 1px solid var(--color-border);
		border-radius: 3px;
		background: var(--color-elevated);
		transition: border-color 0.1s, background 0.1s;
		overflow: hidden;
	}

	.hotspot:hover {
		background: var(--color-hover);
	}

	.hotspot-rank {
		grid-row: 1;
		grid-column: 1;
		font-family: "JetBrains Mono", monospace;
		font-size: 10px;
		font-weight: 600;
		color: var(--color-dim);
		text-align: right;
		line-height: 1.3;
	}

	/* Severity bar runs along the bottom of the card, tier-tinted. */
	.hotspot-bar {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		height: 2px;
		background: var(--color-border);
		pointer-events: none;
	}
	.hotspot-bar-fill {
		height: 100%;
		transition: width 0.3s ease;
	}
	.hotspot[data-tier="hot"] .hotspot-bar-fill {
		background: var(--color-danger, #ff5f56);
	}
	.hotspot[data-tier="warm"] .hotspot-bar-fill {
		background: var(--color-warning, #f5b700);
	}
	.hotspot[data-tier="cool"] .hotspot-bar-fill {
		background: var(--color-accent);
	}

	.hotspot-main {
		grid-row: 1;
		grid-column: 2;
		min-width: 0;
	}

	.hotspot-head {
		display: flex;
		align-items: center;
		gap: 8px;
		justify-content: space-between;
		flex-wrap: wrap;
	}

	.hotspot-path {
		font-family: "JetBrains Mono", monospace;
		font-size: 11px;
		color: var(--color-text);
		word-break: break-all;
		min-width: 0;
		flex: 1;
	}

	.hotspot-meta {
		display: flex;
		align-items: center;
		gap: 4px;
		flex-wrap: wrap;
	}

	.stat {
		font-family: "JetBrains Mono", monospace;
		font-size: 9px;
		padding: 1px 5px;
		border-radius: 2px;
		border: 1px solid var(--color-border);
		color: var(--color-muted);
		white-space: nowrap;
		line-height: 1.5;
	}

	.stat-score {
		color: var(--color-text);
	}

	.hotspot[data-tier="hot"] .stat-score {
		color: var(--color-danger, #ff5f56);
		border-color: color-mix(in srgb, var(--color-danger, #ff5f56) 40%, transparent);
	}
	.hotspot[data-tier="warm"] .stat-score {
		color: var(--color-warning, #f5b700);
		border-color: color-mix(in srgb, var(--color-warning, #f5b700) 40%, transparent);
	}

	.stat-trend {
		color: var(--color-dim);
	}

	.hotspot-actions {
		grid-row: 2;
		grid-column: 2;
		list-style: none;
		margin: 4px 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 1px;
	}
	.action {
		display: flex;
		gap: 6px;
		font-size: 10px;
		line-height: 1.4;
	}
	.action-dot {
		color: var(--color-dim);
		flex-shrink: 0;
	}
	.action-text {
		color: var(--color-muted);
	}
	.action-note {
		color: var(--color-dim);
	}

	.empty {
		font-family: "JetBrains Mono", monospace;
		font-size: 11px;
		color: var(--color-dim);
		padding: 12px;
		text-align: center;
		border: 1px dashed var(--color-border);
		border-radius: 4px;
	}
</style>
