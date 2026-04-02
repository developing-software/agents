<script lang="ts">
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { createPlan, updatePlan } from './plans.remote';
	import { PLAN_STATUSES } from './plan-helpers';
	import MarkdownEditor from '$lib/ui/MarkdownEditor.svelte';
	import { listIssues } from '$lib/github/github.remote';
	import IssueList from '$lib/github/IssueList.svelte';

	let {
		plan = null,
		repoId,
		organization,
		repoName,
	}: {
		plan?: {
			id: string;
			title: string;
			body: string;
			status: string;
			authorType: string;
			tags: string[];
		} | null | undefined;
		repoId: string;
		organization: string;
		repoName: string;
	} = $props();

	let title = $state(untrack(() => plan?.title ?? ''));
	let body = $state(untrack(() => plan?.body ?? ''));
	let authorType = $state(untrack(() => plan?.authorType ?? 'human'));
	let status = $state(untrack(() => plan?.status ?? 'draft'));
	let tagsInput = $state(untrack(() => plan?.tags.filter(t => !t.startsWith('gh:issue:')).join(', ') ?? ''));
	let saving = $state(false);
	let error = $state<string | null>(null);
	let showIssues = $state(false);
	let linkedIssues = $state<Set<number>>(new Set(untrack(() => {
		// Parse existing gh:issue:N tags from plan
		if (!plan?.tags) return [];
		return plan.tags
			.filter(t => t.startsWith('gh:issue:'))
			.map(t => parseInt(t.slice('gh:issue:'.length)))
			.filter(n => !isNaN(n));
	})));
	let issuesRetry = $state(0);

	const isEdit = $derived(!!plan);

	const issuesPromise = $derived.by(() => {
		if (!showIssues) return null;
		void issuesRetry;
		return listIssues({ organization, repoName });
	});

	async function handleSubmit() {
		saving = true;
		error = null;
		const manualTags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
		const issueTags = [...linkedIssues].map(n => `gh:issue:${n}`);
		const tags = [...new Set([...manualTags, ...issueTags])];
		try {
			if (isEdit && plan) {
				await updatePlan({ id: plan.id, title, body, status, tags });
				goto(`/gh/${organization}/${repoName}/plans/${plan.id}`);
			} else {
				const result = await createPlan({ title, body, authorType, tags, repoId });
				goto(`/gh/${organization}/${repoName}/plans/${result.id}`);
			}
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to save plan';
			saving = false;
		}
	}
</script>

<div class="form">
	<div class="field">
		<label class="label" for="plan-title">Title</label>
		<input id="plan-title" type="text" bind:value={title} placeholder="Plan title" />
	</div>

	<div class="field">
		<label class="label" for="plan-body">Body</label>
		<MarkdownEditor bind:value={body} placeholder="Plan body (markdown)" />
	</div>

	<!-- Link Issues section -->
	<div class="field">
		<button type="button" class="toggle-btn" onclick={() => { showIssues = !showIssues; }}>
			<span class="toggle-arrow">{showIssues ? '▾' : '▸'}</span>
			<span class="label">Link Issues</span>
			{#if linkedIssues.size > 0}
				<span class="linked-count">{linkedIssues.size}</span>
			{/if}
		</button>

		{#if linkedIssues.size > 0}
			<div class="linked-pills">
				{#each [...linkedIssues] as num (num)}
					<button type="button" class="linked-pill" onclick={() => { linkedIssues = new Set([...linkedIssues].filter(n => n !== num)); }}>
						#{num} ×
					</button>
				{/each}
			</div>
		{/if}

		{#if showIssues}
			<div class="issues-panel">
				{#if issuesPromise}
					{#await issuesPromise}
						<div class="issues-loading">Loading issues...</div>
					{:then issues}
						<IssueList
							{organization}
							{repoName}
							issues={issues}
							selectable={true}
							bind:selected={linkedIssues}
							emptyText="No issues found"
						/>
					{:catch}
						<div class="issues-error">
							<span>Failed to load issues</span>
							<button type="button" class="retry-btn" onclick={() => { issuesRetry++; }}>Retry</button>
						</div>
					{/await}
				{/if}
			</div>
		{/if}
	</div>

	{#if !isEdit}
		<div class="field">
			<label class="label" for="plan-author">Author</label>
			<select id="plan-author" bind:value={authorType}>
				<option value="human">human</option>
				<option value="llm">llm</option>
			</select>
		</div>
	{/if}

	{#if isEdit}
		<div class="field">
			<label class="label" for="plan-status">Status</label>
			<select id="plan-status" bind:value={status}>
				{#each PLAN_STATUSES as s (s)}
					<option value={s}>{s}</option>
				{/each}
			</select>
		</div>
	{/if}

	<div class="field">
		<label class="label" for="plan-tags">Tags</label>
		<input id="plan-tags" type="text" bind:value={tagsInput} placeholder="Comma-separated tags" />
		<span class="hint">Comma-separated, e.g. gh:issue:42, scope:small</span>
	</div>

	{#if error}
		<div class="error-msg">{error}</div>
	{/if}

	<button type="button" class="submit-btn" disabled={saving || !title.trim()} onclick={handleSubmit}>
		{saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Plan'}
	</button>
</div>

<style>
	.form {
		display: flex;
		flex-direction: column;
		gap: 12px;
		max-width: 700px;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.label {
		font-family: "JetBrains Mono", monospace;
		font-size: 11px;
		color: var(--color-muted);
	}

	.hint {
		font-size: 10px;
		color: var(--color-dim);
	}

	.error-msg {
		font-size: 12px;
		color: var(--color-danger);
		padding: 6px 10px;
		background: color-mix(in srgb, var(--color-danger) 8%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-danger) 20%, transparent);
		border-radius: 3px;
	}

	.submit-btn {
		align-self: flex-start;
		font-family: "JetBrains Mono", monospace;
		font-size: 11px;
		padding: 5px 14px;
		border-radius: 4px;
		border: none;
		background: var(--color-accent);
		color: #fff;
		cursor: pointer;
		transition: opacity 0.1s;
	}
	.submit-btn:hover {
		opacity: 0.9;
	}
	.submit-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.toggle-btn {
		display: flex;
		align-items: center;
		gap: 6px;
		background: none;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: 6px 10px;
		cursor: pointer;
		color: var(--color-muted);
		transition: border-color 0.1s;
		width: 100%;
	}
	.toggle-btn:hover {
		border-color: var(--color-border-bright);
	}

	.toggle-arrow {
		font-size: 10px;
		color: var(--color-dim);
	}

	.linked-count {
		font-family: "JetBrains Mono", monospace;
		font-size: 10px;
		padding: 0 5px;
		border-radius: 3px;
		background: color-mix(in srgb, var(--color-accent) 12%, transparent);
		color: var(--color-accent);
		line-height: 1.6;
		margin-left: auto;
	}

	.linked-pills {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		margin-top: 4px;
	}

	.linked-pill {
		font-family: "JetBrains Mono", monospace;
		font-size: 10px;
		padding: 1px 6px;
		border-radius: 3px;
		border: 1px solid color-mix(in srgb, var(--color-accent) 25%, transparent);
		background: color-mix(in srgb, var(--color-accent) 8%, transparent);
		color: var(--color-accent);
		cursor: pointer;
		transition: background 0.1s;
	}
	.linked-pill:hover {
		background: color-mix(in srgb, var(--color-danger) 12%, transparent);
		border-color: color-mix(in srgb, var(--color-danger) 25%, transparent);
		color: var(--color-danger);
	}

	.issues-panel {
		margin-top: 6px;
		border: 1px solid var(--color-border);
		border-radius: 4px;
		padding: 8px;
		background: var(--color-elevated);
		max-height: 400px;
		overflow-y: auto;
	}

	.issues-loading {
		font-size: 11px;
		color: var(--color-dim);
		font-style: italic;
		padding: 8px 0;
	}

	.issues-error {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12px;
		color: var(--color-danger);
	}

	.retry-btn {
		font-family: "JetBrains Mono", monospace;
		font-size: 11px;
		padding: 2px 8px;
		border-radius: 3px;
		border: 1px solid color-mix(in srgb, var(--color-danger) 30%, transparent);
		background: none;
		color: var(--color-danger);
		cursor: pointer;
	}
</style>
