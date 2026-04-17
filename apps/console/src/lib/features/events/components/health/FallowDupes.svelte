<script lang="ts">
	import CopyToAgent from '$lib/features/agents/CopyToAgent.svelte';
	import MetricList from './MetricList.svelte';
	import ReportLayout from './ReportLayout.svelte';
	import SelectionBar from './SelectionBar.svelte';
	import { cloneGroupPrompt, dupesSelectionPrompt } from './prompt';

	interface Props {
		data: any;
	}

	let { data }: Props = $props();

	const metrics = $derived.by(() => {
		const s = data.stats ?? {};
		const dupPct =
			s.duplication_percentage != null
				? `${Number(s.duplication_percentage).toFixed(1)}%`
				: '—';
		return [
			{
				label: 'duplication',
				value: dupPct,
				emphasized: true,
				hint: 'of scanned LOC',
			},
			{ label: 'clone groups', value: s.clone_groups ?? '—' },
			{ label: 'clone instances', value: s.clone_instances ?? '—' },
			{ label: 'duplicated lines', value: s.duplicated_lines ?? '—' },
			{ label: 'duplicated tokens', value: s.duplicated_tokens ?? '—' },
		];
	});

	const allCloneGroups = $derived<any[]>(
		Array.isArray(data.clone_groups) ? data.clone_groups : []
	);
	const cloneGroups = $derived(allCloneGroups.slice(0, 10));

	let expandedGroups = $state<Record<number, boolean>>({});
	let selected = $state<Set<number>>(new Set());

	function toggleGroup(idx: number) {
		expandedGroups[idx] = !expandedGroups[idx];
	}

	function toggleSelect(idx: number) {
		const next = new Set(selected);
		if (next.has(idx)) next.delete(idx);
		else next.add(idx);
		selected = next;
	}

	function clearSelection() {
		selected = new Set();
	}

	function selectedGroups(): any[] {
		return cloneGroups.filter((_: any, i: number) => selected.has(i));
	}
</script>

<ReportLayout>
	{#snippet sidebar()}
		<MetricList title="Code duplication" metrics={metrics} />
		<SelectionBar
			count={selected.size}
			fixPrompt={() => dupesSelectionPrompt(selectedGroups(), 'fix')}
			planPrompt={() => dupesSelectionPrompt(selectedGroups(), 'plan')}
			onclear={clearSelection}
		/>
	{/snippet}

	{#if cloneGroups.length > 0}
		<div class="section-head">
			<span class="section-title">Clone groups</span>
			<span class="section-sub">
				{#if allCloneGroups.length > 10}
					top 10 of {allCloneGroups.length}
				{:else}
					{allCloneGroups.length} found
				{/if}
			</span>
		</div>
		<ul class="groups">
			{#each cloneGroups as group, i (i)}
				<li class="group" class:group-selected={selected.has(i)}>
					<div class="group-head">
						<label class="select-label">
							<input
								type="checkbox"
								class="select-checkbox"
								checked={selected.has(i)}
								onchange={() => toggleSelect(i)}
							/>
							<span class="group-idx">#{i + 1}</span>
						</label>
						<div class="group-badges">
							{#if group.line_count != null}
								<span class="badge badge-primary">{group.line_count} lines</span>
							{/if}
							{#if group.token_count != null}
								<span class="badge">{group.token_count} tokens</span>
							{/if}
							{#if Array.isArray(group.instances)}
								<span class="badge">{group.instances.length} locations</span>
							{/if}
						</div>
						<div class="group-actions">
							{#if group.instances?.[0]?.fragment}
								<button type="button" class="mini-btn" onclick={() => toggleGroup(i)}>
									{expandedGroups[i] ? 'hide' : 'show'} code
								</button>
							{/if}
							<CopyToAgent
								prompt={() => cloneGroupPrompt(group)}
								label="dedupe"
								variant="row"
								menuTitle="Send dedupe prompt to"
							/>
						</div>
					</div>

					{#if Array.isArray(group.instances)}
						<ul class="instances">
							{#each group.instances as inst, j (inst.file ? `${inst.file}:${inst.start_line}` : j)}
								<li class="instance">
									<span class="instance-dot">▸</span>
									<span class="instance-path">{inst.file ?? '—'}</span>
									{#if inst.start_line != null && inst.end_line != null}
										<span class="instance-range">:{inst.start_line}–{inst.end_line}</span>
									{/if}
								</li>
							{/each}
						</ul>
					{/if}

					{#if expandedGroups[i] && group.instances?.[0]?.fragment}
						<pre class="fragment">{group.instances[0].fragment}</pre>
					{/if}
				</li>
			{/each}
		</ul>
	{:else}
		<div class="empty">No clone groups detected.</div>
	{/if}
</ReportLayout>

<style>
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

	.groups {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.group {
		border: 1px solid var(--color-border);
		border-radius: 3px;
		background: var(--color-elevated);
		padding: 6px 8px;
		display: flex;
		flex-direction: column;
		gap: 4px;
		transition: border-color 0.1s;
	}

	.group-selected {
		border-color: var(--color-accent);
		background: color-mix(in srgb, var(--color-accent) 4%, var(--color-elevated));
	}

	.group-head {
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 10px;
		min-width: 0;
	}

	.select-label {
		display: flex;
		align-items: center;
		gap: 6px;
		cursor: pointer;
		font-family: "JetBrains Mono", monospace;
	}

	.select-checkbox {
		accent-color: var(--color-accent);
		cursor: pointer;
	}

	.group-idx {
		font-size: 10px;
		color: var(--color-dim);
		font-weight: 600;
	}

	.group-badges {
		display: flex;
		gap: 4px;
		flex-wrap: wrap;
		min-width: 0;
	}

	.badge {
		font-family: "JetBrains Mono", monospace;
		font-size: 9px;
		padding: 1px 6px;
		border-radius: 2px;
		border: 1px solid var(--color-border);
		color: var(--color-muted);
		white-space: nowrap;
		line-height: 1.5;
	}

	.badge-primary {
		color: var(--color-text);
		border-color: var(--color-border-bright, var(--color-border));
	}

	.group-actions {
		display: flex;
		align-items: center;
		gap: 4px;
		flex-shrink: 0;
	}

	.mini-btn {
		font-family: "JetBrains Mono", monospace;
		font-size: 10px;
		padding: 2px 6px;
		border: 1px solid var(--color-border);
		border-radius: 3px;
		background: none;
		color: var(--color-dim);
		cursor: pointer;
		transition: color 0.1s, border-color 0.1s;
	}
	.mini-btn:hover {
		color: var(--color-accent);
		border-color: var(--color-accent);
	}

	.instances {
		list-style: none;
		padding: 0;
		margin: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 2px 12px;
	}

	.instance {
		display: flex;
		align-items: baseline;
		gap: 4px;
		min-width: 0;
	}

	.instance-dot {
		color: var(--color-dim);
		font-size: 10px;
		flex-shrink: 0;
	}

	.instance-path {
		font-family: "JetBrains Mono", monospace;
		font-size: 10px;
		color: var(--color-text);
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.instance-range {
		font-family: "JetBrains Mono", monospace;
		font-size: 10px;
		color: var(--color-dim);
		flex-shrink: 0;
	}

	.fragment {
		margin: 0;
		padding: 8px;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 3px;
		font-family: "JetBrains Mono", monospace;
		font-size: 10px;
		color: var(--color-text);
		overflow-x: auto;
		max-height: 240px;
		overflow-y: auto;
		white-space: pre;
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

	@media (max-width: 600px) {
		.group-head {
			grid-template-columns: 1fr;
			gap: 4px;
		}
		.group-actions {
			justify-content: flex-end;
		}
	}
</style>
