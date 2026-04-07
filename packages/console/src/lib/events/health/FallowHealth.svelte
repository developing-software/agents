<script lang="ts">
	import { hotspotPrompt, healthSelectionPrompt } from './prompt';

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

	let selected = $state<Set<string>>(new Set());
	let copiedItem = $state<string | null>(null);
	let copiedBar = $state<string | null>(null);

	function toggleSelect(path: string) {
		const next = new Set(selected);
		if (next.has(path)) next.delete(path);
		else next.add(path);
		selected = next;
	}

	async function copyItem(spot: any) {
		await navigator.clipboard.writeText(hotspotPrompt(spot));
		copiedItem = spot.path;
		setTimeout(() => { copiedItem = null; }, 1200);
	}

	async function copySelection(style: 'fix' | 'plan') {
		const items = hotspots.filter((h: any) => selected.has(h.path));
		if (!items.length) return;
		await navigator.clipboard.writeText(healthSelectionPrompt(items, style));
		copiedBar = style;
		setTimeout(() => { copiedBar = null; }, 1200);
	}

	function clearSelection() {
		selected = new Set();
	}
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

		{#if selected.size > 0}
			<div class="selection-bar">
				<span class="selection-count">{selected.size} selected</span>
				<button type="button" class="bar-btn" onclick={() => copySelection('fix')}>
					{copiedBar === 'fix' ? 'Copied' : 'Copy fix'}
				</button>
				<button type="button" class="bar-btn" onclick={() => copySelection('plan')}>
					{copiedBar === 'plan' ? 'Copied' : 'Copy plan'}
				</button>
				<button type="button" class="bar-btn dim" onclick={clearSelection}>Clear</button>
			</div>
		{/if}

		<div class="items">
			{#each hotspots as spot, i (spot.path ?? i)}
				<div class="item-card" class:item-selected={selected.has(spot.path)}>
					<div class="item-main">
						<label class="check-label">
							<input
								type="checkbox"
								checked={selected.has(spot.path)}
								onchange={() => toggleSelect(spot.path)}
							/>
							<span class="filepath">{spot.path}</span>
						</label>
						<div class="item-actions">
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
							<button type="button" class="copy-btn" onclick={() => copyItem(spot)}>
								{copiedItem === spot.path ? '✓' : 'copy'}
							</button>
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
	.selection-bar {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 4px 8px;
		margin-bottom: 6px;
		background: var(--color-surface);
		border: 1px solid var(--color-accent);
		border-radius: 4px;
	}
	.selection-count {
		font-size: 10px;
		color: var(--color-accent);
		margin-right: auto;
	}
	.bar-btn {
		font-family: "JetBrains Mono", monospace;
		font-size: 10px;
		padding: 1px 8px;
		border-radius: 3px;
		border: 1px solid var(--color-border);
		background: none;
		color: var(--color-text);
		cursor: pointer;
		transition: background 0.1s;
	}
	.bar-btn:hover { background: var(--color-hover); }
	.bar-btn.dim { color: var(--color-dim); }
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
		transition: border-color 0.1s;
	}
	.item-selected {
		border-color: var(--color-accent);
	}
	.item-main {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		flex-wrap: wrap;
	}
	.check-label {
		display: flex;
		align-items: center;
		gap: 6px;
		cursor: pointer;
		min-width: 0;
	}
	.check-label input {
		accent-color: var(--color-accent);
		cursor: pointer;
	}
	.item-actions {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-shrink: 0;
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
	.copy-btn {
		font-family: "JetBrains Mono", monospace;
		font-size: 10px;
		padding: 1px 6px;
		border-radius: 3px;
		border: 1px solid var(--color-border);
		background: none;
		color: var(--color-dim);
		cursor: pointer;
		transition: color 0.1s, border-color 0.1s;
		white-space: nowrap;
	}
	.copy-btn:hover {
		color: var(--color-accent);
		border-color: var(--color-accent);
	}
	.actions {
		display: flex;
		flex-direction: column;
		gap: 1px;
		margin-top: 4px;
		padding-left: 22px;
	}
	.action-text {
		font-size: 10px;
		color: var(--color-dim);
		line-height: 1.4;
	}
</style>
