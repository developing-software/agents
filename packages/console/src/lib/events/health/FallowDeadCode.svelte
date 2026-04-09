<script lang="ts">
	import CopyToAgent from '$lib/agents/CopyToAgent.svelte';
	import MetricList from './MetricList.svelte';
	import ReportLayout from './ReportLayout.svelte';
	import SelectionBar from './SelectionBar.svelte';
	import {
		circularDepPrompt,
		deadCodeSelectionPrompt,
		unusedExportPrompt,
		unusedFilePrompt,
	} from './prompt';

	interface Props {
		data: any;
	}

	let { data }: Props = $props();

	const unusedFiles = $derived<any[]>(
		Array.isArray(data.unused_files) ? data.unused_files : []
	);
	const allUnusedExports = $derived<any[]>(
		Array.isArray(data.unused_exports) ? data.unused_exports : []
	);
	const allUnusedTypes = $derived<any[]>(
		Array.isArray(data.unused_types) ? data.unused_types : []
	);
	const circularDeps = $derived<any[]>(
		Array.isArray(data.circular_dependencies) ? data.circular_dependencies : []
	);

	const unusedExports = $derived(allUnusedExports.slice(0, 30));
	const unusedTypes = $derived(allUnusedTypes.slice(0, 20));

	const totalIssues = $derived(
		data.total_issues ??
			unusedFiles.length +
				allUnusedExports.length +
				allUnusedTypes.length +
				circularDeps.length
	);

	const metrics = $derived.by(() => {
		return [
			{
				label: 'total issues',
				value: totalIssues,
				emphasized: true,
				hint: 'files + exports + types + cycles',
			},
			{ label: 'unused files', value: unusedFiles.length },
			{ label: 'unused exports', value: allUnusedExports.length },
			{ label: 'unused types', value: allUnusedTypes.length },
			{ label: 'circular deps', value: circularDeps.length },
			{
				label: 'unresolved imports',
				value: Array.isArray(data.unresolved_imports) ? data.unresolved_imports.length : 0,
			},
		];
	});

	type TabId = 'files' | 'exports' | 'types' | 'cycles';

	const tabs = $derived.by(() => {
		const t: Array<{ id: TabId; label: string; count: number }> = [];
		if (unusedFiles.length > 0) t.push({ id: 'files', label: 'Files', count: unusedFiles.length });
		if (allUnusedExports.length > 0)
			t.push({ id: 'exports', label: 'Exports', count: allUnusedExports.length });
		if (allUnusedTypes.length > 0)
			t.push({ id: 'types', label: 'Types', count: allUnusedTypes.length });
		if (circularDeps.length > 0)
			t.push({ id: 'cycles', label: 'Cycles', count: circularDeps.length });
		return t;
	});

	let activeTab = $state<TabId>('files');

	$effect(() => {
		// When tabs change (data loaded), ensure activeTab is valid.
		if (tabs.length > 0 && !tabs.find((t) => t.id === activeTab)) {
			activeTab = tabs[0].id;
		}
	});

	// --- Selection state ---
	// key format: "kind:identifier"
	let selected = $state<Set<string>>(new Set());

	function fileKey(f: any): string {
		return `file:${typeof f === 'string' ? f : f.path}`;
	}
	function exportKey(e: any): string {
		return `export:${e.path}:${e.export_name}`;
	}
	function typeKey(t: any): string {
		return `type:${t.path}:${t.export_name}`;
	}
	function cycleKey(c: any, idx: number): string {
		const files = Array.isArray(c) ? c : Array.isArray(c?.cycle) ? c.cycle : [];
		return `cycle:${idx}:${files.join('>')}`;
	}

	function toggle(key: string) {
		const next = new Set(selected);
		if (next.has(key)) next.delete(key);
		else next.add(key);
		selected = next;
	}

	function clearSelection() {
		selected = new Set();
	}

	function selectedItems() {
		return {
			files: unusedFiles.filter((f) => selected.has(fileKey(f))),
			exports: allUnusedExports.filter((e) => selected.has(exportKey(e))),
			types: allUnusedTypes.filter((t) => selected.has(typeKey(t))),
			cycles: circularDeps.filter((c, i) => selected.has(cycleKey(c, i))),
		};
	}
</script>

<ReportLayout>
	{#snippet sidebar()}
		<MetricList title="Dead code" metrics={metrics} />
		<SelectionBar
			count={selected.size}
			fixPrompt={() => deadCodeSelectionPrompt(selectedItems(), 'fix')}
			planPrompt={() => deadCodeSelectionPrompt(selectedItems(), 'plan')}
			onclear={clearSelection}
		/>
	{/snippet}

	{#if totalIssues === 0}
		<div class="empty">Nothing unused — the codebase is tidy.</div>
	{:else}
		{#if tabs.length > 1}
			<div class="tab-bar" role="tablist" aria-label="Dead code sections">
				{#each tabs as tab (tab.id)}
					<button
						type="button"
						class="tab"
						class:tab-active={activeTab === tab.id}
						onclick={() => (activeTab = tab.id)}
						role="tab"
						aria-selected={activeTab === tab.id}
					>
						<span class="tab-label">{tab.label}</span>
						<span class="tab-count">{tab.count}</span>
					</button>
				{/each}
			</div>
		{/if}

		{#if activeTab === 'files' && unusedFiles.length > 0}
			<ul class="items">
				{#each unusedFiles as file, i (typeof file === 'string' ? file : i)}
					{@const key = fileKey(file)}
					{@const path = typeof file === 'string' ? file : (file.path ?? JSON.stringify(file))}
					<li class="item" class:item-selected={selected.has(key)}>
						<label class="item-label">
							<input
								type="checkbox"
								class="item-checkbox"
								checked={selected.has(key)}
								onchange={() => toggle(key)}
							/>
							<span class="item-path">{path}</span>
						</label>
						<CopyToAgent
							prompt={() => unusedFilePrompt(file)}
							label="remove"
							variant="row"
							menuTitle="Send removal prompt to"
						/>
					</li>
				{/each}
			</ul>
		{/if}

		{#if activeTab === 'exports' && unusedExports.length > 0}
			{#if allUnusedExports.length > 30}
				<div class="truncate-note">showing top 30 of {allUnusedExports.length}</div>
			{/if}
			<ul class="items">
				{#each unusedExports as exp, i (exp.export_name ? `${exp.path}:${exp.export_name}` : i)}
					{@const key = exportKey(exp)}
					<li class="item" class:item-selected={selected.has(key)}>
						<label class="item-label">
							<input
								type="checkbox"
								class="item-checkbox"
								checked={selected.has(key)}
								onchange={() => toggle(key)}
							/>
							<span class="item-path">{exp.path ?? '—'}</span>
						</label>
						<div class="item-meta">
							{#if exp.export_name}
								<span class="badge">{exp.export_name}</span>
							{/if}
							{#if exp.line != null}
								<span class="badge badge-dim">L{exp.line}</span>
							{/if}
							<CopyToAgent
								prompt={() => unusedExportPrompt(exp)}
								label="remove"
								variant="row"
								menuTitle="Send removal prompt to"
							/>
						</div>
					</li>
				{/each}
			</ul>
		{/if}

		{#if activeTab === 'types' && unusedTypes.length > 0}
			{#if allUnusedTypes.length > 20}
				<div class="truncate-note">showing top 20 of {allUnusedTypes.length}</div>
			{/if}
			<ul class="items">
				{#each unusedTypes as typ, i (typ.export_name ? `${typ.path}:${typ.export_name}` : i)}
					{@const key = typeKey(typ)}
					<li class="item" class:item-selected={selected.has(key)}>
						<label class="item-label">
							<input
								type="checkbox"
								class="item-checkbox"
								checked={selected.has(key)}
								onchange={() => toggle(key)}
							/>
							<span class="item-path">{typ.path ?? '—'}</span>
						</label>
						<div class="item-meta">
							{#if typ.export_name}
								<span class="badge">{typ.export_name}</span>
							{/if}
							{#if typ.line != null}
								<span class="badge badge-dim">L{typ.line}</span>
							{/if}
						</div>
					</li>
				{/each}
			</ul>
		{/if}

		{#if activeTab === 'cycles' && circularDeps.length > 0}
			<ul class="items">
				{#each circularDeps as cycle, i (i)}
					{@const key = cycleKey(cycle, i)}
					{@const files = Array.isArray(cycle)
						? cycle
						: Array.isArray(cycle?.cycle)
							? cycle.cycle
							: [JSON.stringify(cycle)]}
					<li class="item item-cycle" class:item-selected={selected.has(key)}>
						<label class="item-label">
							<input
								type="checkbox"
								class="item-checkbox"
								checked={selected.has(key)}
								onchange={() => toggle(key)}
							/>
							<div class="cycle-chain">
								{#each files as f, j (j)}
									<span class="cycle-node">{f}</span>
									{#if j < files.length - 1}
										<span class="cycle-arrow">→</span>
									{/if}
								{/each}
							</div>
						</label>
						<CopyToAgent
							prompt={() => circularDepPrompt(cycle)}
							label="break"
							variant="row"
							menuTitle="Send break-cycle prompt to"
						/>
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
</ReportLayout>

<style>
	.tab-bar {
		display: flex;
		gap: 0;
		border-bottom: 1px solid var(--color-border);
		flex-wrap: wrap;
	}

	.tab {
		font-family: "JetBrains Mono", monospace;
		font-size: 10px;
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 5px 12px;
		border: none;
		border-bottom: 2px solid transparent;
		background: none;
		color: var(--color-dim);
		cursor: pointer;
		transition: color 0.1s, border-color 0.1s;
	}
	.tab:hover {
		color: var(--color-text);
	}
	.tab-active {
		color: var(--color-text);
		border-bottom-color: var(--color-accent);
	}
	.tab-label {
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}
	.tab-count {
		font-size: 9px;
		padding: 1px 5px;
		border-radius: 8px;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		color: var(--color-muted);
		line-height: 1.3;
	}
	.tab-active .tab-count {
		color: var(--color-accent);
		border-color: color-mix(in srgb, var(--color-accent) 50%, transparent);
	}

	.truncate-note {
		font-family: "JetBrains Mono", monospace;
		font-size: 9px;
		color: var(--color-dim);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		padding: 2px 4px;
	}

	.items {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.item {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 10px;
		align-items: center;
		padding: 4px 8px;
		border: 1px solid var(--color-border);
		border-radius: 3px;
		background: var(--color-elevated);
		min-width: 0;
		transition: border-color 0.1s, background 0.1s;
	}
	.item:hover {
		background: var(--color-hover);
	}
	.item-selected {
		border-color: var(--color-accent);
		background: color-mix(in srgb, var(--color-accent) 4%, var(--color-elevated));
	}

	.item-cycle {
		padding: 6px 8px;
	}

	.item-label {
		display: flex;
		align-items: center;
		gap: 6px;
		min-width: 0;
		flex: 1;
		cursor: pointer;
	}

	.item-checkbox {
		accent-color: var(--color-accent);
		cursor: pointer;
		flex-shrink: 0;
	}

	.item-path {
		font-family: "JetBrains Mono", monospace;
		font-size: 11px;
		color: var(--color-text);
		word-break: break-all;
		min-width: 0;
	}

	.item-meta {
		display: flex;
		align-items: center;
		gap: 4px;
		flex-shrink: 0;
	}

	.badge {
		font-family: "JetBrains Mono", monospace;
		font-size: 9px;
		padding: 1px 5px;
		border-radius: 2px;
		border: 1px solid var(--color-border);
		color: var(--color-muted);
		white-space: nowrap;
		line-height: 1.5;
	}
	.badge-dim {
		color: var(--color-dim);
	}

	.cycle-chain {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px;
		min-width: 0;
	}

	.cycle-node {
		font-family: "JetBrains Mono", monospace;
		font-size: 10px;
		padding: 1px 6px;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 2px;
		color: var(--color-text);
		white-space: nowrap;
	}

	.cycle-arrow {
		font-family: "JetBrains Mono", monospace;
		font-size: 10px;
		color: var(--color-accent);
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
		.item {
			grid-template-columns: 1fr;
		}
		.item-meta {
			justify-content: flex-end;
		}
	}
</style>
