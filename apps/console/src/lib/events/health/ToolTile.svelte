<script lang="ts">
	import { getToolDef } from './tools';

	interface Props {
		category: string;
		name: string;
		outcome: string;
		summary: string | null;
		onclick?: () => void;
	}

	let { category, name, outcome, summary, onclick }: Props = $props();

	const def = $derived(getToolDef(category, name));
	const label = $derived(def?.label ?? name);
	const glyph = $derived(def?.glyph ?? '•');
	const headline = $derived.by(() => {
		if (def?.headline) {
			const h = def.headline(summary);
			if (h) return h;
		}
		return null;
	});

	const isFailure = $derived(outcome !== 'success');
</script>

<button
	type="button"
	class="tile"
	class:tile-failure={isFailure}
	onclick={() => onclick?.()}
	title={def?.hint ?? `${category}/${name}`}
>
	<header class="tile-head">
		<span class="tile-glyph">{glyph}</span>
		<span class="tile-label">{label}</span>
		<span
			class="tile-dot"
			class:dot-success={!isFailure}
			class:dot-failure={isFailure}
			aria-hidden="true"
		></span>
	</header>
	<div class="tile-body">
		{#if headline}
			<span class="tile-value">{headline.value}</span>
			{#if headline.unit}
				<span class="tile-unit">{headline.unit}</span>
			{/if}
		{:else if summary}
			<span class="tile-summary">{summary}</span>
		{:else}
			<span class="tile-summary tile-summary-empty">—</span>
		{/if}
	</div>
	<footer class="tile-foot">
		<span class="tile-source">{category}/{name}</span>
	</footer>
</button>

<style>
	.tile {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 12px 14px 10px;
		background: var(--color-elevated);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		text-align: left;
		cursor: pointer;
		font-family: "JetBrains Mono", monospace;
		color: inherit;
		min-height: 96px;
		position: relative;
		overflow: hidden;
		transition: border-color 0.15s, background 0.15s, transform 0.15s;
	}

	.tile::before {
		content: "";
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 2px;
		background: var(--color-success);
		opacity: 0.7;
		transition: opacity 0.15s, background 0.15s;
	}

	.tile-failure::before {
		background: var(--color-danger);
	}

	.tile:hover {
		border-color: var(--color-border-bright, var(--color-accent));
		background: var(--color-hover);
	}

	.tile:hover::before {
		opacity: 1;
	}

	.tile-head {
		display: flex;
		align-items: center;
		gap: 6px;
	}

	.tile-glyph {
		font-size: 12px;
		color: var(--color-accent);
		width: 14px;
	}

	.tile-label {
		font-size: 10px;
		text-transform: uppercase;
		letter-spacing: 0.6px;
		color: var(--color-muted);
		flex: 1;
	}

	.tile-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
	}

	.dot-success {
		background: var(--color-success);
	}
	.dot-failure {
		background: var(--color-danger);
	}

	.tile-body {
		display: flex;
		align-items: baseline;
		gap: 6px;
		min-height: 28px;
	}

	.tile-value {
		font-size: 22px;
		font-weight: 600;
		color: var(--color-text);
		letter-spacing: -0.5px;
		line-height: 1;
	}

	.tile-unit {
		font-size: 10px;
		color: var(--color-dim);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.tile-summary {
		font-size: 11px;
		color: var(--color-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		max-width: 100%;
	}

	.tile-summary-empty {
		color: var(--color-dim);
	}

	.tile-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding-top: 6px;
		border-top: 1px dashed var(--color-border);
	}

	.tile-source {
		font-size: 9px;
		color: var(--color-dim);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
</style>
