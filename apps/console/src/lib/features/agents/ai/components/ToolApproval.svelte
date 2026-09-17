<script lang="ts">
	let {
		toolName,
		input,
		approvalId,
		onapprove,
		ondeny,
	}: {
		toolName: string;
		input: unknown;
		approvalId: string;
		onapprove: (id: string, reason?: string) => void;
		ondeny: (id: string, reason?: string) => void;
	} = $props();

	let reason: string = $state('');
	let showReason: boolean = $state(false);

	const typed = $derived(input as Record<string, unknown>);

	function handleApprove() {
		onapprove(approvalId, reason.trim() || undefined);
	}

	function handleDeny() {
		ondeny(approvalId, reason.trim() || undefined);
	}

	function truncate(str: string, max: number): string {
		if (str.length <= max) return str;
		return str.slice(0, max) + '...';
	}
</script>

<div class="approval-card">
	<div class="approval-header">
		<span class="approval-tool-name">{toolName}</span>
		<span class="approval-badge">approval required</span>
	</div>

	<div class="approval-preview">
		{#if toolName === 'createPlan'}
			{#if typed.title}
				<div class="preview-label">title</div>
				<div class="preview-value">{typed.title}</div>
			{/if}
			{#if typed.body}
				<div class="preview-body">{truncate(String(typed.body), 200)}</div>
			{/if}
		{:else if toolName === 'updatePlan'}
			{#if typed.id}
				<div class="preview-label">plan</div>
				<div class="preview-value">{typed.id}</div>
			{/if}
			{@const fields = Object.keys(typed).filter((k) => k !== 'id' && typed[k] !== undefined)}
			{#if fields.length > 0}
				<div class="preview-label" style="margin-top: 4px">updating</div>
				<div class="preview-value">{fields.join(', ')}</div>
			{/if}
		{:else}
			<pre class="preview-body">{truncate(JSON.stringify(input, null, 2), 300)}</pre>
		{/if}
	</div>

	<button class="reason-toggle" onclick={() => (showReason = !showReason)}>
		{showReason ? 'Hide reason' : 'Add reason'}
	</button>

	{#if showReason}
		<textarea
			class="reason-input"
			bind:value={reason}
			placeholder="Optional reason..."
			rows={2}
		></textarea>
	{/if}

	<div class="approval-actions">
		<button class="approve-btn" onclick={handleApprove}>Approve</button>
		<button class="deny-btn" onclick={handleDeny}>Deny</button>
	</div>
</div>

<style>
	.approval-card {
		margin: 6px 0;
		padding: 10px 12px;
		background: var(--color-surface);
		border: 1px solid color-mix(in srgb, var(--color-warning) 30%, var(--color-border));
		border-radius: 4px;
		font-size: 12px;
	}

	.approval-header {
		display: flex;
		align-items: center;
		gap: 8px;
		margin-bottom: 8px;
	}

	.approval-tool-name {
		font-family: 'JetBrains Mono', monospace;
		font-size: 11px;
		color: var(--color-muted);
	}

	.approval-badge {
		font-family: 'JetBrains Mono', monospace;
		font-size: 10px;
		padding: 0 5px;
		border-radius: 3px;
		line-height: 1.6;
		color: var(--color-warning);
		background: color-mix(in srgb, var(--color-warning) 10%, transparent);
	}

	.approval-preview {
		padding: 6px 8px;
		background: var(--color-elevated);
		border: 1px solid var(--color-border);
		border-radius: 3px;
		font-size: 11px;
		color: var(--color-muted);
		margin-bottom: 8px;
	}

	.preview-label {
		font-family: 'JetBrains Mono', monospace;
		font-size: 10px;
		color: var(--color-dim);
		margin-bottom: 2px;
	}

	.preview-value {
		color: var(--color-text);
		word-break: break-word;
	}

	.preview-body {
		margin-top: 4px;
		white-space: pre-wrap;
		max-height: 120px;
		overflow-y: auto;
		font-size: 10px;
		color: var(--color-muted);
	}

	.reason-toggle {
		font-family: 'JetBrains Mono', monospace;
		font-size: 10px;
		background: none;
		border: none;
		color: var(--color-dim);
		cursor: pointer;
		padding: 0;
		margin-bottom: 6px;
	}

	.reason-toggle:hover {
		color: var(--color-muted);
	}

	.reason-input {
		width: 100%;
		resize: none;
		font-family: system-ui, sans-serif;
		font-size: 11px;
		line-height: 1.4;
		padding: 6px 8px;
		border-radius: 3px;
		border: 1px solid var(--color-border);
		background: var(--color-elevated);
		color: var(--color-text);
		outline: none;
		margin-bottom: 8px;
		box-sizing: border-box;
	}

	.reason-input:focus {
		border-color: var(--color-border-bright);
	}

	.reason-input::placeholder {
		color: var(--color-dim);
	}

	.approval-actions {
		display: flex;
		gap: 6px;
		align-items: center;
	}

	.approve-btn {
		font-family: 'JetBrains Mono', monospace;
		font-size: 11px;
		padding: 4px 12px;
		border-radius: 4px;
		border: none;
		background: var(--color-success);
		color: #fff;
		cursor: pointer;
	}

	.deny-btn {
		font-family: 'JetBrains Mono', monospace;
		font-size: 11px;
		padding: 4px 12px;
		border-radius: 4px;
		border: 1px solid color-mix(in srgb, var(--color-danger) 40%, var(--color-border));
		background: none;
		color: var(--color-danger);
		cursor: pointer;
	}
</style>
