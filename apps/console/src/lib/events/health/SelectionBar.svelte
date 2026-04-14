<script lang="ts">
	import CopyToAgent from '$lib/agents/CopyToAgent.svelte';

	interface Props {
		count: number;
		/** Build the "fix" style prompt on demand (only called when clicked). */
		fixPrompt: () => string;
		/** Build the "plan" style prompt on demand. */
		planPrompt: () => string;
		onclear: () => void;
	}

	let { count, fixPrompt, planPrompt, onclear }: Props = $props();
</script>

{#if count > 0}
	<div class="selection-bar">
		<div class="selection-meta">
			<span class="selection-count">{count}</span>
			<span class="selection-label">selected</span>
		</div>
		<div class="selection-actions">
			<CopyToAgent
				prompt={fixPrompt}
				label="Fix"
				variant="bar"
				align="left"
				menuTitle="Send fix prompt to"
			/>
			<CopyToAgent
				prompt={planPrompt}
				label="Plan"
				variant="bar"
				align="left"
				menuTitle="Send plan prompt to"
			/>
			<button type="button" class="clear-btn" onclick={onclear} aria-label="Clear selection">
				clear
			</button>
		</div>
	</div>
{/if}

<style>
	.selection-bar {
		display: flex;
		flex-direction: column;
		gap: 6px;
		padding: 8px;
		background: color-mix(in srgb, var(--color-accent) 6%, var(--color-surface));
		border: 1px solid var(--color-accent);
		border-radius: 4px;
	}

	.selection-meta {
		display: flex;
		align-items: baseline;
		gap: 6px;
	}

	.selection-count {
		font-family: "JetBrains Mono", monospace;
		font-size: 16px;
		font-weight: 600;
		color: var(--color-accent);
		line-height: 1;
	}

	.selection-label {
		font-family: "JetBrains Mono", monospace;
		font-size: 10px;
		color: var(--color-muted);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.selection-actions {
		display: flex;
		align-items: center;
		gap: 4px;
		flex-wrap: wrap;
	}

	.clear-btn {
		font-family: "JetBrains Mono", monospace;
		font-size: 10px;
		padding: 2px 6px;
		border-radius: 3px;
		border: 1px solid transparent;
		background: none;
		color: var(--color-dim);
		cursor: pointer;
		margin-left: auto;
		transition: color 0.1s, border-color 0.1s;
	}

	.clear-btn:hover {
		color: var(--color-text);
		border-color: var(--color-border);
	}
</style>
