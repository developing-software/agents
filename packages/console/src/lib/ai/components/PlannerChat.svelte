<script lang="ts">
	import { tick } from 'svelte';
	import type { Chat } from '@ai-sdk/svelte';
	import { isToolUIPart, getToolName } from 'ai';
	import { TextareaAutosize, useMutationObserver } from 'runed';
	import Markdown from '$lib/ui/Markdown.svelte';
	import ToolCard from '$lib/ai/components/ToolCard.svelte';
	import ToolOutput from '$lib/ai/components/ToolOutput.svelte';
	import TriageResult from '$lib/ai/components/TriageResult.svelte';
	import AskUserInput from '$lib/ai/components/AskUserInput.svelte';
	import ToolApproval from '$lib/ai/components/ToolApproval.svelte';

	type PlanSummary = {
		id: string;
		title: string;
		status: string;
	};

	let {
		chat,
		mode = 'draft',
		plan,
	}: {
		chat: Chat;
		mode?: 'draft' | 'edit';
		plan?: PlanSummary;
	} = $props();

	let inputValue = $state('');
	let textareaEl: HTMLTextAreaElement | undefined = $state();
	let messagesArea: HTMLElement | undefined = $state();

	let isActive = $derived(chat.status === 'submitted' || chat.status === 'streaming');
	let hasMessages = $derived(chat.messages.length > 0);

	// Find a pending askUser tool that needs user response
	let pendingAsk = $derived.by(() => {
		for (const message of chat.messages) {
			for (const part of message.parts) {
				if (
					isToolUIPart(part) &&
					getToolName(part) === 'askUser' &&
					part.state === 'input-available'
				) {
					const input = part.input as { question: string; options?: string[]; context?: string };
					return {
						toolCallId: part.toolCallId,
						question: input.question,
						options: input.options,
						context: input.context,
					};
				}
			}
		}
		return null;
	});

	const draftSuggestions = [
		'Triage open issues',
		'Draft plan for #...',
		'Show existing plans',
	];

	const editSuggestions = [
		'Add acceptance criteria for error handling',
		'Link related issues to this plan',
		'Update scope based on latest discussion',
	];

	let suggestions = $derived(mode === 'edit' ? editSuggestions : draftSuggestions);

	// Auto-scroll when messages area content changes
	useMutationObserver(
		() => messagesArea,
		() => {
			if (messagesArea) messagesArea.scrollTop = messagesArea.scrollHeight;
		},
		{ childList: true, subtree: true, characterData: true },
	);

	// Auto-grow textarea with content
	new TextareaAutosize({
		element: () => textareaEl,
		input: () => inputValue,
		maxHeight: 200,
	});

	async function send() {
		const text = inputValue.trim();
		if (!text || isActive) return;
		inputValue = '';
		await chat.sendMessage({ text });
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			send();
		}
	}

	function selectSuggestion(text: string) {
		inputValue = text;
		textareaEl?.focus();
		if (text === 'Draft plan for #...') {
			tick().then(() => {
				if (textareaEl) {
					const pos = text.indexOf('...');
					textareaEl.setSelectionRange(pos, pos + 3);
				}
			});
		} else {
			send();
		}
	}

	function handleAskUserResponse(toolCallId: string, answer: string) {
		chat.addToolOutput({ tool: 'askUser', toolCallId, output: answer });
	}

	function handleApprove(id: string, reason?: string) {
		chat.addToolApprovalResponse({ id, approved: true, reason });
	}

	function handleDeny(id: string, reason?: string) {
		chat.addToolApprovalResponse({ id, approved: false, reason });
	}
</script>

<div class="planner-chat">
	<div class="messages-area" bind:this={messagesArea}>
		{#if !hasMessages}
			<div class="empty-chat">
				{#if mode === 'edit' && plan}
					<div class="empty-title">Editing: {plan.title}</div>
					<div class="plan-status-badge">{plan.status}</div>
					<div class="empty-description">Ask the agent to refine this plan — add issues, update scope, or adjust acceptance criteria.</div>
				{:else}
					<div class="empty-title">Planner Agent</div>
					<div class="empty-description">Ask the agent to triage issues, draft plans, or explore the repository.</div>
				{/if}
			</div>
		{/if}

		{#each chat.messages as message (message.id)}
			<div class="message" class:user={message.role === 'user'} class:assistant={message.role === 'assistant'}>
				<div class="message-role">{message.role === 'user' ? 'You' : 'Agent'}</div>
				<div class="message-content">
					{#each message.parts as part, i (i)}
						{#if part.type === 'text'}
							{#if part.text.trim()}
								<Markdown source={part.text} />
							{/if}
						{:else if part.type === 'step-start'}
							<div class="step-divider"></div>
						{:else if isToolUIPart(part)}
							{@const toolName = getToolName(part)}
							{#if toolName === 'askUser' && part.state === 'input-available'}
								<!-- Read-only inline display — interactive controls are in the input area -->
								{@const input = part.input as { question: string; context?: string }}
								<div class="ask-pending">
									<div class="ask-pending-question">{input.question}</div>
									{#if input.context}
										<div class="ask-pending-context">
											<Markdown source={'```\n' + input.context + '\n```'} />
										</div>
									{/if}
									<div class="ask-pending-hint">Awaiting your response below...</div>
								</div>
							{:else if toolName === 'askUser' && part.state === 'output-available'}
								<div class="ask-answered">
									<span class="ask-answered-label">Answered:</span>
									{part.output}
								</div>
							{:else if (toolName === 'createPlan' || toolName === 'updatePlan') && part.state === 'approval-requested'}
								<ToolApproval
									{toolName}
									input={part.input}
									approvalId={part.approval.id}
									onapprove={handleApprove}
									ondeny={handleDeny}
								/>
							{:else if (toolName === 'createPlan' || toolName === 'updatePlan') && part.state === 'output-denied'}
								<ToolCard name={toolName} state={part.state}>
									<span class="approval-denied-text">Denied{part.approval?.reason ? `: ${part.approval.reason}` : ''}</span>
								</ToolCard>
							{:else}
								<ToolCard name={toolName} state={part.state}>
									{#if part.state === 'output-available' && part.output != null}
										{#if toolName === 'triageIssue'}
											<TriageResult output={part.output as Record<string, unknown>} />
										{:else}
											<ToolOutput name={toolName} output={part.output} />
										{/if}
									{:else if part.state === 'output-error'}
										<span class="tool-error-text">{part.errorText}</span>
									{/if}
								</ToolCard>
							{/if}
						{/if}
					{/each}
				</div>
			</div>
		{/each}

		{#if isActive}
			<div class="streaming-indicator">
				<span class="dot"></span>
				<span class="dot"></span>
				<span class="dot"></span>
			</div>
		{/if}
	</div>

	{#if pendingAsk}
		<AskUserInput
			question={pendingAsk.question}
			options={pendingAsk.options}
			context={pendingAsk.context}
			onrespond={(answer) => handleAskUserResponse(pendingAsk.toolCallId, answer)}
		/>
	{:else}
		<div class="input-area">
			{#if !hasMessages}
				<div class="suggestions">
					{#each suggestions as suggestion (suggestion)}
						<button class="suggestion-chip" onclick={() => selectSuggestion(suggestion)}>
							{suggestion}
						</button>
					{/each}
				</div>
			{/if}

			<div class="input-row">
				<textarea
					bind:this={textareaEl}
					bind:value={inputValue}
					onkeydown={handleKeydown}
					placeholder="Ask the planner agent..."
					rows={1}
					disabled={isActive}
				></textarea>
				<button
					class="send-btn"
					onclick={isActive ? () => chat.stop() : send}
					disabled={!isActive && !inputValue.trim()}
					title={isActive ? 'Stop' : 'Send'}
				>
					{#if isActive}
						<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
							<rect x="6" y="6" width="12" height="12" rx="2" />
						</svg>
					{:else}
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<line x1="22" y1="2" x2="11" y2="13" />
							<polygon points="22 2 15 22 11 13 2 9 22 2" />
						</svg>
					{/if}
				</button>
			</div>
		</div>
	{/if}
</div>

<style>
	.planner-chat {
		display: flex;
		flex-direction: column;
		height: 100%;
		min-height: 0;
		background: var(--color-bg);
	}

	.messages-area {
		flex: 1;
		overflow-y: auto;
		padding: 16px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.empty-chat {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 6px;
	}

	.empty-title {
		font-size: 15px;
		font-weight: 600;
		color: var(--color-text);
	}

	.empty-description {
		font-size: 12px;
		color: var(--color-dim);
		text-align: center;
		max-width: 320px;
		line-height: 1.5;
	}

	.plan-status-badge {
		font-family: 'JetBrains Mono', monospace;
		font-size: 10px;
		padding: 1px 8px;
		border-radius: 3px;
		line-height: 1.6;
		text-transform: capitalize;
		color: var(--color-accent);
		background: color-mix(in srgb, var(--color-accent) 12%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-accent) 25%, transparent);
	}

	.message {
		padding: 8px 0;
	}

	.message.user {
		padding-bottom: 4px;
	}

	.message-role {
		font-family: 'JetBrains Mono', monospace;
		font-size: 10px;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-dim);
		margin-bottom: 4px;
	}

	.message.user .message-role {
		color: var(--color-accent);
	}

	.message-content {
		font-size: 13px;
		color: var(--color-text);
		line-height: 1.6;
	}

	.step-divider {
		height: 1px;
		background: var(--color-border);
		margin: 8px 0;
	}

	/* AskUser inline displays */
	.ask-pending {
		margin: 6px 0;
		padding: 10px 12px;
		background: color-mix(in srgb, var(--color-accent) 6%, var(--color-surface));
		border: 1px solid color-mix(in srgb, var(--color-accent) 20%, var(--color-border));
		border-radius: 4px;
	}

	.ask-pending-question {
		font-size: 13px;
		color: var(--color-text);
		font-weight: 500;
		margin-bottom: 4px;
	}

	.ask-pending-context {
		margin-bottom: 4px;
		font-size: 12px;
	}

	.ask-pending-context :global(pre) {
		margin: 0;
		padding: 8px 10px;
		background: var(--color-bg);
		border: 1px solid var(--color-border);
		border-radius: 3px;
		font-size: 11px;
		overflow-x: auto;
	}

	.ask-pending-hint {
		font-family: 'JetBrains Mono', monospace;
		font-size: 10px;
		color: var(--color-dim);
		font-style: italic;
	}

	.ask-answered {
		margin: 6px 0;
		padding: 6px 10px;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: 4px;
		font-size: 12px;
		color: var(--color-muted);
	}

	.ask-answered-label {
		font-family: 'JetBrains Mono', monospace;
		font-size: 10px;
		color: var(--color-dim);
		margin-right: 6px;
	}

	.approval-denied-text {
		font-size: 11px;
		color: var(--color-danger);
	}

	.tool-error-text {
		color: var(--color-danger);
		font-size: 11px;
	}

	.streaming-indicator {
		display: flex;
		gap: 4px;
		padding: 8px 0;
		align-items: center;
	}

	.dot {
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: var(--color-dim);
		animation: blink 1.4s ease-in-out infinite;
	}

	.dot:nth-child(2) { animation-delay: 0.2s; }
	.dot:nth-child(3) { animation-delay: 0.4s; }

	@keyframes blink {
		0%, 80%, 100% { opacity: 0.3; }
		40% { opacity: 1; }
	}

	.input-area {
		border-top: 1px solid var(--color-border);
		padding: 12px 16px;
		background: var(--color-surface);
	}

	.suggestions {
		display: flex;
		gap: 6px;
		flex-wrap: wrap;
		margin-bottom: 10px;
	}

	.suggestion-chip {
		font-family: 'JetBrains Mono', monospace;
		font-size: 11px;
		padding: 4px 10px;
		border-radius: 4px;
		border: 1px solid var(--color-border);
		background: var(--color-elevated);
		color: var(--color-muted);
		cursor: pointer;
		transition: border-color 0.1s, color 0.1s;
	}

	.suggestion-chip:hover {
		border-color: var(--color-border-bright);
		color: var(--color-text);
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

	textarea:focus { border-color: var(--color-border-bright); }
	textarea::placeholder { color: var(--color-dim); }
	textarea:disabled { opacity: 0.5; cursor: not-allowed; }

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

	.send-btn:hover { opacity: 0.9; }
	.send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
</style>
