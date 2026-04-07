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

	let selectedOption: string | null = $state(null);
	let notes: string = $state('');

	let canSend = $derived(selectedOption !== null || notes.trim().length > 0);

	function send() {
		if (!canSend) return;

		let answer: string;
		if (selectedOption && notes.trim()) {
			answer = `${selectedOption}\n\nNotes: ${notes.trim()}`;
		} else if (selectedOption) {
			answer = selectedOption;
		} else {
			answer = notes.trim();
		}

		onrespond(answer);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey && canSend) {
			e.preventDefault();
			send();
		}
	}
</script>

<div class="ask-input-area">
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
					class="option"
					class:selected={selectedOption === option}
					onclick={() => {
						selectedOption = selectedOption === option ? null : option;
					}}
				>
					<span class="option-key">{i + 1}</span>
					{option}
				</button>
			{/each}
		</div>
	{/if}

	<div class="input-row">
		<textarea
			bind:value={notes}
			onkeydown={handleKeydown}
			placeholder={options?.length ? 'Add notes (optional)...' : 'Type your answer...'}
			rows={1}
		></textarea>
		<button
			class="send-btn"
			onclick={send}
			disabled={!canSend}
			title="Send"
		>
			<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
				<line x1="22" y1="2" x2="11" y2="13" />
				<polygon points="22 2 15 22 11 13 2 9 22 2" />
			</svg>
		</button>
	</div>
</div>

<style>
	.ask-input-area {
		border-top: 1px solid var(--color-border);
		padding: 12px 16px;
		background: var(--color-surface);
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.ask-question {
		padding: 8px 12px;
		border-left: 3px solid var(--color-accent);
		background: color-mix(in srgb, var(--color-accent) 6%, transparent);
		font-size: 13px;
		color: var(--color-text);
		font-weight: 500;
	}

	.ask-context {
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
		max-height: 160px;
		overflow-y: auto;
	}

	.ask-options {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.option {
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

	.option:hover {
		border-color: var(--color-border-bright);
		background: var(--color-hover);
	}

	.option.selected {
		border-color: var(--color-accent);
		background: color-mix(in srgb, var(--color-accent) 10%, transparent);
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

	.input-row {
		display: flex;
		gap: 8px;
		align-items: flex-end;
	}

	textarea {
		flex: 1;
		resize: none;
		font-family: system-ui, sans-serif;
		font-size: 13px;
		line-height: 1.5;
		padding: 8px 10px;
		border-radius: 4px;
		border: 1px solid var(--color-border);
		background: var(--color-elevated);
		color: var(--color-text);
		outline: none;
		transition: border-color 0.1s;
		min-height: 36px;
		max-height: 200px;
	}

	textarea:focus {
		border-color: var(--color-border-bright);
	}

	textarea::placeholder {
		color: var(--color-dim);
	}

	.send-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: 4px;
		border: none;
		background: var(--color-accent);
		color: #fff;
		cursor: pointer;
		flex-shrink: 0;
		transition: opacity 0.1s;
	}

	.send-btn:hover {
		opacity: 0.9;
	}

	.send-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
</style>
