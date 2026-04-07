<script lang="ts">
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
		return data.unused_exports.slice(0, 20);
	});

	const circularDeps = $derived(
		Array.isArray(data.circular_dependencies) ? data.circular_dependencies : []
	);
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

	{#if unusedFiles.length > 0}
		<div class="section-header">Unused files</div>
		<div class="file-list">
			{#each unusedFiles as file, i (typeof file === 'string' ? file : i)}
				<div class="filepath">
					{typeof file === 'string' ? file : file.path ?? JSON.stringify(file)}
				</div>
			{/each}
		</div>
	{/if}

	{#if unusedExports.length > 0}
		<div class="section-header">
			Unused exports
			{#if Array.isArray(data.unused_exports) && data.unused_exports.length > 20}
				<span class="section-note">(showing 20 of {data.unused_exports.length})</span>
			{/if}
		</div>
		<div class="items">
			{#each unusedExports as exp, i (exp.export_name ? `${exp.path}:${exp.export_name}` : i)}
				<div class="item-card">
					<div class="item-main">
						<span class="filepath">{exp.path ?? '—'}</span>
						<div class="badges">
							{#if exp.export_name}
								<span class="badge">{exp.export_name}</span>
							{/if}
							{#if exp.line != null}
								<span class="badge">L{exp.line}</span>
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
				<div class="item-card">
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
	.filepath {
		font-family: "JetBrains Mono", monospace;
		font-size: 11px;
		color: var(--color-text);
		word-break: break-all;
	}
	.file-list {
		display: flex;
		flex-direction: column;
		gap: 2px;
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
</style>
