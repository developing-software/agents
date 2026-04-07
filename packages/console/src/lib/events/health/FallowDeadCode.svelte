<script lang="ts">
	import { unusedFilePrompt, unusedExportPrompt, deadCodeSelectionPrompt } from './prompt';

	interface Props {
		data: any;
	}

	let { data }: Props = $props();

	const metrics = $derived.by(() => {
		const uf = Array.isArray(data.unused_files) ? data.unused_files.length : 0;
		const ue = Array.isArray(data.unused_exports) ? data.unused_exports.length : 0;
		const ut = Array.isArray(data.unused_types) ? data.unused_types.length : 0;
		const cd = Array.isArray(data.circular_dependencies) ? data.circular_dependencies.length : 0;
		const ui = Array.isArray(data.unresolved_imports) ? data.unresolved_imports.length : 0;
		return [
			{ label: 'Total issues', value: data.total_issues ?? uf + ue + ut },
			{ label: 'Unused files', value: uf },
			{ label: 'Unused exports', value: ue },
			{ label: 'Unused types', value: ut },
			{ label: 'Circular deps', value: cd },
			{ label: 'Unresolved imports', value: ui },
		];
	});

	const unusedFiles = $derived(Array.isArray(data.unused_files) ? data.unused_files : []);

	const unusedExports = $derived.by(() => {
		if (!Array.isArray(data.unused_exports)) return [];
		return data.unused_exports.slice(0, 30);
	});

	const unusedTypes = $derived.by(() => {
		if (!Array.isArray(data.unused_types)) return [];
		return data.unused_types.slice(0, 20);
	});

	const circularDeps = $derived(
		Array.isArray(data.circular_dependencies) ? data.circular_dependencies : []
	);

	// Selection state — keys are "file:path" or "export:path:name" or "type:path:name"
	let selected = $state<Set<string>>(new Set());
	let copiedItem = $state<string | null>(null);
	let copiedBar = $state<string | null>(null);

	function itemKey(prefix: string, item: any): string {
		if (prefix === 'file') return `file:${typeof item === 'string' ? item : item.path}`;
		return `${prefix}:${item.path}:${item.export_name}`;
	}

	function toggleSelect(key: string) {
		const next = new Set(selected);
		if (next.has(key)) next.delete(key);
		else next.add(key);
		selected = next;
	}

	async function copyFile(file: any) {
		await navigator.clipboard.writeText(unusedFilePrompt(file));
		copiedItem = itemKey('file', file);
		setTimeout(() => { copiedItem = null; }, 1200);
	}

	async function copyExport(exp: any) {
		await navigator.clipboard.writeText(unusedExportPrompt(exp));
		copiedItem = itemKey('export', exp);
		setTimeout(() => { copiedItem = null; }, 1200);
	}

	async function copySelection(style: 'fix' | 'plan') {
		const files = unusedFiles.filter((f: any) => selected.has(itemKey('file', f)));
		const exports = (data.unused_exports ?? []).filter((e: any) => selected.has(itemKey('export', e)));
		const types = (data.unused_types ?? []).filter((t: any) => selected.has(itemKey('type', t)));
		if (!files.length && !exports.length && !types.length) return;
		await navigator.clipboard.writeText(deadCodeSelectionPrompt({ files, exports, types }, style));
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

	{#if unusedFiles.length > 0}
		<div class="section-header">Unused files</div>
		<div class="items">
			{#each unusedFiles as file, i (typeof file === 'string' ? file : i)}
				{@const key = itemKey('file', file)}
				{@const path = typeof file === 'string' ? file : file.path ?? JSON.stringify(file)}
				<div class="item-row" class:item-selected={selected.has(key)}>
					<label class="check-label">
						<input type="checkbox" checked={selected.has(key)} onchange={() => toggleSelect(key)} />
						<span class="filepath">{path}</span>
					</label>
					<button type="button" class="copy-btn" onclick={() => copyFile(file)}>
						{copiedItem === key ? '✓' : 'copy'}
					</button>
				</div>
			{/each}
		</div>
	{/if}

	{#if unusedExports.length > 0}
		<div class="section-header">
			Unused exports
			{#if Array.isArray(data.unused_exports) && data.unused_exports.length > 30}
				<span class="section-note">(showing 30 of {data.unused_exports.length})</span>
			{/if}
		</div>
		<div class="items">
			{#each unusedExports as exp, i (exp.export_name ? `${exp.path}:${exp.export_name}` : i)}
				{@const key = itemKey('export', exp)}
				<div class="item-row" class:item-selected={selected.has(key)}>
					<label class="check-label">
						<input type="checkbox" checked={selected.has(key)} onchange={() => toggleSelect(key)} />
						<span class="filepath">{exp.path ?? '—'}</span>
					</label>
					<div class="item-actions">
						<div class="badges">
							{#if exp.export_name}
								<span class="badge">{exp.export_name}</span>
							{/if}
							{#if exp.line != null}
								<span class="badge">L{exp.line}</span>
							{/if}
						</div>
						<button type="button" class="copy-btn" onclick={() => copyExport(exp)}>
							{copiedItem === key ? '✓' : 'copy'}
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	{#if unusedTypes.length > 0}
		<div class="section-header">
			Unused types
			{#if Array.isArray(data.unused_types) && data.unused_types.length > 20}
				<span class="section-note">(showing 20 of {data.unused_types.length})</span>
			{/if}
		</div>
		<div class="items">
			{#each unusedTypes as typ, i (typ.export_name ? `${typ.path}:${typ.export_name}` : i)}
				{@const key = itemKey('type', typ)}
				<div class="item-row" class:item-selected={selected.has(key)}>
					<label class="check-label">
						<input type="checkbox" checked={selected.has(key)} onchange={() => toggleSelect(key)} />
						<span class="filepath">{typ.path ?? '—'}</span>
					</label>
					<div class="item-actions">
						<div class="badges">
							{#if typ.export_name}
								<span class="badge">{typ.export_name}</span>
							{/if}
							{#if typ.line != null}
								<span class="badge">L{typ.line}</span>
							{/if}
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}

	{#if circularDeps.length > 0}
		<div class="section-header">Circular dependencies</div>
		<div class="items">
			{#each circularDeps as cycle, i (i)}
				<div class="item-row">
					{#if Array.isArray(cycle)}
						<span class="filepath">{cycle.join(' → ')}</span>
					{:else if typeof cycle === 'object' && Array.isArray(cycle.cycle)}
						<span class="filepath">{cycle.cycle.join(' → ')}</span>
					{:else}
						<span class="filepath">{JSON.stringify(cycle)}</span>
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
	.section-note {
		font-size: 10px;
		text-transform: none;
		letter-spacing: 0;
		color: var(--color-dim);
	}
	.selection-bar {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 4px 8px;
		margin-top: 8px;
		margin-bottom: 4px;
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
		gap: 3px;
	}
	.item-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
		padding: 4px 6px;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		background: var(--color-elevated);
		transition: border-color 0.1s;
	}
	.item-selected {
		border-color: var(--color-accent);
	}
	.check-label {
		display: flex;
		align-items: center;
		gap: 6px;
		cursor: pointer;
		min-width: 0;
		flex: 1;
	}
	.check-label input {
		accent-color: var(--color-accent);
		cursor: pointer;
		flex-shrink: 0;
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
</style>
