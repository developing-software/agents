<script lang="ts">
	import { untrack } from 'svelte';
	import Markdown from '$lib/ui/Markdown.svelte';

	type Question = {
		header: string;
		question: string;
		multiSelect?: boolean;
		options?: string[];
	};

	let {
		questions,
		context,
		onrespond,
	}: {
		questions: Question[];
		context?: string;
		onrespond: (answer: string) => void;
	} = $props();

	// NOTE: The parent component is expected to key this component on `questions`
	// so that a new ask creates a fresh instance. That means we can safely
	// initialize local state from `questions` once at mount.
	const initialCount = untrack(() => questions.length);
	let selected: string[][] = $state(Array.from({ length: initialCount }, () => []));
	let notes: string[] = $state(Array.from({ length: initialCount }, () => ''));
	let currentIndex = $state(0);

	function isAnswered(i: number) {
		return (selected[i]?.length ?? 0) > 0 || (notes[i]?.trim().length ?? 0) > 0;
	}

	let currentQuestion = $derived(questions[currentIndex]);
	let currentAnswered = $derived(isAnswered(currentIndex));
	let isFirst = $derived(currentIndex === 0);
	let isLast = $derived(currentIndex === questions.length - 1);
	let canSend = $derived(questions.every((_, i) => isAnswered(i)));

	function toggleOption(qIndex: number, option: string) {
		const q = questions[qIndex];
		const current = selected[qIndex] ?? [];
		if (q.multiSelect) {
			if (current.includes(option)) {
				selected[qIndex] = current.filter((o) => o !== option);
			} else {
				selected[qIndex] = [...current, option];
			}
		} else {
			if (current.includes(option)) {
				selected[qIndex] = [];
			} else {
				selected[qIndex] = [option];
			}
		}
	}

	function goNext() {
		if (!currentAnswered || isLast) return;
		currentIndex += 1;
	}

	function goPrev() {
		if (isFirst) return;
		currentIndex -= 1;
	}

	function send() {
		if (!canSend) return;

		const result: Record<string, string> = {};
		for (let i = 0; i < questions.length; i++) {
			const q = questions[i];
			const sel = selected[i] ?? [];
			const note = (notes[i] ?? '').trim();

			let value: string;
			if (sel.length > 0 && note) {
				value = `${sel.join(', ')}\nNotes: ${note}`;
			} else if (sel.length > 0) {
				value = sel.join(', ');
			} else {
				value = note;
			}

			result[q.header] = value;
		}

		onrespond(JSON.stringify(result));
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key !== 'Enter' || e.shiftKey) return;
		if (isLast) {
			if (canSend) {
				e.preventDefault();
				send();
			}
		} else if (currentAnswered) {
			e.preventDefault();
			goNext();
		}
	}
</script>

<div class="ask-input-area">
	{#if context}
		<div class="ask-context">
			<Markdown source={'```\n' + context + '\n```'} />
		</div>
	{/if}

	<div class="question-block">
		<div class="question-top">
			<div class="question-header">{currentQuestion.header}</div>
			{#if questions.length > 1}
				<div class="step-indicator">{currentIndex + 1} / {questions.length}</div>
			{/if}
		</div>
		<div class="question-text">{currentQuestion.question}</div>

		{#if currentQuestion.options?.length}
			<div class="ask-options">
				{#each currentQuestion.options as option, i (i)}
					<button
						class="option"
						class:selected={selected[currentIndex]?.includes(option)}
						onclick={() => toggleOption(currentIndex, option)}
					>
						<span class="option-key">{i + 1}</span>
						{option}
					</button>
				{/each}
			</div>
		{/if}

		<textarea
			bind:value={notes[currentIndex]}
			onkeydown={handleKeydown}
			placeholder={currentQuestion.options?.length
				? 'Add notes (optional)...'
				: 'Type your answer...'}
			rows={1}
		></textarea>
	</div>

	<div class="nav-row">
		{#if questions.length > 1}
			<button
				class="nav-btn"
				onclick={goPrev}
				disabled={isFirst}
				title="Previous question"
				aria-label="Previous question"
			>
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<polyline points="15 18 9 12 15 6" />
				</svg>
			</button>
		{/if}

		<div class="nav-spacer"></div>

		{#if isLast}
			<button class="send-btn" onclick={send} disabled={!canSend} title="Send">
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<line x1="22" y1="2" x2="11" y2="13" />
					<polygon points="22 2 15 22 11 13 2 9 22 2" />
				</svg>
			</button>
		{:else}
			<button
				class="nav-btn primary"
				onclick={goNext}
				disabled={!currentAnswered}
				title="Next question"
				aria-label="Next question"
			>
				<svg
					width="14"
					height="14"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<polyline points="9 18 15 12 9 6" />
				</svg>
			</button>
		{/if}
	</div>
</div>

<style>
	.ask-input-area {
		border-top: 1px solid var(--color-border);
		padding: 12px 16px;
		background: var(--color-surface);
		display: flex;
		flex-direction: column;
		gap: 12px;
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

	.question-block {
		display: flex;
		flex-direction: column;
		gap: 8px;
		padding: 10px 12px;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		background: color-mix(in srgb, var(--color-accent) 3%, transparent);
	}

	.question-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 8px;
	}

	.question-header {
		display: inline-block;
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 2px 6px;
		border-radius: 3px;
		background: color-mix(in srgb, var(--color-accent) 12%, transparent);
		color: var(--color-accent);
		border: 1px solid color-mix(in srgb, var(--color-accent) 25%, transparent);
	}

	.step-indicator {
		font-family: 'JetBrains Mono', monospace;
		font-size: 10px;
		color: var(--color-dim);
		letter-spacing: 0.05em;
	}

	.question-text {
		padding: 6px 10px;
		border-left: 3px solid var(--color-accent);
		background: color-mix(in srgb, var(--color-accent) 6%, transparent);
		font-size: 13px;
		color: var(--color-text);
		font-weight: 500;
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
		transition:
			border-color 0.1s,
			background 0.1s;
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

	.nav-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.nav-spacer {
		flex: 1;
	}

	.nav-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		border-radius: 4px;
		border: 1px solid var(--color-border);
		background: var(--color-elevated);
		color: var(--color-text);
		cursor: pointer;
		flex-shrink: 0;
		transition:
			border-color 0.1s,
			background 0.1s,
			opacity 0.1s;
	}

	.nav-btn:hover:not(:disabled) {
		border-color: var(--color-border-bright);
		background: var(--color-hover);
	}

	.nav-btn:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.nav-btn.primary {
		border-color: var(--color-accent);
		background: color-mix(in srgb, var(--color-accent) 12%, transparent);
		color: var(--color-accent);
	}

	.nav-btn.primary:hover:not(:disabled) {
		background: color-mix(in srgb, var(--color-accent) 18%, transparent);
	}

	textarea {
		width: 100%;
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
		box-sizing: border-box;
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
