<script lang="ts">
	import { untrack } from 'svelte';
	import { goto } from '$app/navigation';
	import { createPlan, updatePlan } from './plans.remote';
	import { PLAN_STATUSES } from './plan-helpers';
	import MarkdownEditor from '$lib/MarkdownEditor.svelte';

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
	let tagsInput = $state(untrack(() => plan?.tags.join(', ') ?? ''));
	let saving = $state(false);
	let error = $state<string | null>(null);

	const isEdit = $derived(!!plan);

	async function handleSubmit() {
		saving = true;
		error = null;
		const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
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
</style>
