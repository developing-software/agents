<script lang="ts">
	import Markdown from '$lib/ui/Markdown.svelte';

	let {
		question,
		options,
		context,
		onrespond,
	}: {
		question: string;
		options?: string[];
		context?: string;
		onrespond: (answer: string) => void;
	} = $props();

	let freeText = $state('');
</script>

<div class="ask-user">
	<div class="ask-question">{question}</div>

	{#if context}
		<div class="ask-context">
			<Markdown source={'```\n' + context + '\n```'} />
		</div>
	{/if}

	{#if options?.length}
		<div class="ask-options">
			{#each options as option, i (i)}
				<button
					class="ask-option"
					onclick={() => onrespond(option)}
				>
					<span class="option-key">{i + 1}</span>
					{option}
				</button>
			{/each}
		</div>
	{:else}
		<div class="ask-free">
			<textarea
				bind:value={freeText}
				placeholder="Type your answer..."
				rows={2}
				onkeydown={(e) => {
					if (e.key === 'Enter' && !e.shiftKey && freeText.trim()) {
						e.preventDefault();
						onrespond(freeText.trim());
					}
				}}
			></textarea>
			<button
				class="ask-submit"
				disabled={!freeText.trim()}
				onclick={() => onrespond(freeText.trim())}
			>Reply</button>
		</div>
	{/if}
</div>

<style>
	.ask-user {
		margin: 6px 0;
		padding: 10px 12px;
		background: color-mix(in srgb, var(--color-accent) 6%, var(--color-surface));
		border: 1px solid color-mix(in srgb, var(--color-accent) 20%, var(--color-border));
		border-radius: 4px;
	}

	.ask-question {
		font-size: 13px;
		color: var(--color-text);
		font-weight: 500;
		margin-bottom: 8px;
	}

	.ask-context {
		margin-bottom: 8px;
		font-size: 12px;
	}

	.ask-context :global(pre) {
		margin: 0;
		padding: 8px 10px;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 3px;
		font-size: 11px;
		overflow-x: auto;
	}

	.ask-options {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.ask-option {
		display: flex;
		align-items: center;
		gap: 8px;
		width: 100%;
		padding: 6px 10px;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		background: var(--color-elevated);
		color: var(--color-text);
		font-size: 12px;
		cursor: pointer;
		text-align: left;
		transition: border-color 0.1s, background 0.1s;
	}

	.ask-option:hover {
		border-color: var(--color-accent);
		background: var(--color-hover);
	}

	.option-key {
		font-family: 'JetBrains Mono', monospace;
		font-size: 10px;
		width: 18px;
		height: 18px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 3px;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		color: var(--color-muted);
		flex-shrink: 0;
	}

	.ask-free {
		display: flex;
		gap: 6px;
		align-items: flex-end;
	}

	.ask-free textarea {
		flex: 1;
		resize: none;
		font-family: system-ui, sans-serif;
		font-size: 12px;
		line-height: 1.5;
		padding: 6px 8px;
		border-radius: 4px;
		border: 1px solid var(--color-border);
		background: var(--color-elevated);
		color: var(--color-text);
		outline: none;
	}

	.ask-free textarea:focus {
		border-color: var(--color-border-bright);
	}

	.ask-free textarea::placeholder {
		color: var(--color-dim);
	}

	.ask-submit {
		font-family: 'JetBrains Mono', monospace;
		font-size: 11px;
		padding: 6px 12px;
		border-radius: 4px;
		border: none;
		background: var(--color-accent);
		color: #fff;
		cursor: pointer;
		flex-shrink: 0;
	}

	.ask-submit:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
</style>
