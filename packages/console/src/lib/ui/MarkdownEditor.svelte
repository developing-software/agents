<script lang="ts">
	import Markdown from '$lib/ui/Markdown.svelte';

	let {
		value = $bindable(),
		placeholder = '',
		minHeight = '200px',
	}: {
		value: string;
		placeholder?: string;
		minHeight?: string;
	} = $props();

	let mode = $state<'write' | 'preview'>('write');
</script>

<div class="editor">
	<div class="tabs">
		<button type="button" class="tab" class:tab-active={mode === 'write'} onclick={() => { mode = 'write'; }}>Write</button>
		<button type="button" class="tab" class:tab-active={mode === 'preview'} onclick={() => { mode = 'preview'; }}>Preview</button>
	</div>

	{#if mode === 'write'}
		<textarea
			class="editor-textarea"
			bind:value
			{placeholder}
			style="min-height: {minHeight}"
		></textarea>
	{:else}
		<div class="preview" style="min-height: {minHeight}">
			<Markdown source={value} />
		</div>
	{/if}
</div>

<style>
	.editor {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.tabs {
		display: flex;
		gap: 2px;
		background: var(--color-elevated);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: 2px;
	}

	.tab {
		font-family: "JetBrains Mono", monospace;
		font-size: 10px;
		padding: 2px 10px;
		border-radius: 3px;
		border: none;
		background: none;
		color: var(--color-dim);
		cursor: pointer;
		line-height: 1.6;
		transition: color 0.1s, background 0.1s;
	}
	.tab:hover { color: var(--color-muted); }
	.tab-active { background: var(--color-surface); color: var(--color-text); }

	.editor-textarea {
		width: 100%;
		font-family: "JetBrains Mono", monospace;
		font-size: 12px;
		background: var(--color-elevated);
		border: 1px solid var(--color-border);
		color: var(--color-text);
		border-radius: 3px;
		padding: 8px 10px;
		outline: none;
		resize: vertical;
		transition: border-color 0.1s;
		line-height: 1.6;
	}
	.editor-textarea:focus {
		border-color: var(--color-accent);
	}

	.preview {
		padding: 8px 10px;
		border: 1px solid var(--color-border);
		border-radius: 3px;
		background: var(--color-surface);
	}
</style>
