<!-- An issue's children and its parent; the widget around it carries the heading. -->
<script lang="ts">
	import { createQuery } from '@tanstack/svelte-query';
	import { Button, Input, Issue as Problem, Meter } from '@agents/ui';
	import type { Issue } from '@agents/core/issue';
	import { create, get, list } from '../../api/issues.query';
	import StatusPicker from '../StatusPicker.svelte';
	import { peek } from '#lib/utils/peek.ts';

	let { issue }: { issue: Issue.Info } = $props();

	const kids = createQuery(() => list({ parentID: issue.id, sort: ['position'] }));
	const parent = createQuery(() => ({ ...get(issue.parentID ?? ''), enabled: !!issue.parentID }));
	const add = create();
	const rows = $derived(kids.data?.data ?? []);
	const done = $derived(rows.filter((kid) => kid.status === 'done').length);

	function submit(e: SubmitEvent & { currentTarget: HTMLFormElement }) {
		e.preventDefault();
		const form = e.currentTarget;
		const title = String(new FormData(form).get('title') ?? '').trim();
		if (title)
			add.mutate({ body: { title, parentID: issue.id } }, { onSuccess: () => form.reset() });
	}
</script>

{#if issue.parentID && parent.data}
	<p class="parent">
		Sub-issue of <a href="/issues/{parent.data.id}">{parent.data.title}</a>
	</p>
{/if}

{#if rows.length}
	<div class="progress">
		<Meter value={done} max={rows.length} label="Sub-issues done" />
		<span class="count">{done}/{rows.length}</span>
	</div>

	<ul>
		{#each rows as kid (kid.id)}
			<li>
				<StatusPicker issue={kid} compact />
				<a href="/issues/{kid.id}" onclick={peek({ selected: kid.id })}>{kid.title}</a>
			</li>
		{/each}
	</ul>
{/if}

{#if add.error}
	<Problem>{add.error.message}</Problem>
{/if}

<form class="add" onsubmit={submit}>
	<Input name="title" placeholder="Add a sub-issue" />
	<Button type="submit" variant="secondary" pending={add.isPending}>Add</Button>
</form>

<style>
	.parent {
		margin: 0 0 0.75em;
		font-size: 0.85em;
		color: var(--muted);
	}

	.progress {
		display: grid;
		grid-template-columns: minmax(0, 1fr) auto;
		align-items: center;
		gap: 0.6em;
	}

	.count {
		font-family: var(--font-mono);
		font-size: 0.8em;
		color: var(--muted);
	}

	ul {
		list-style: none;
		margin: 0.5em 0 0.75em;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.15em;
	}

	li {
		display: flex;
		align-items: center;
		gap: 0.4em;
	}

	li a {
		color: var(--ink);
		text-decoration: none;
	}

	li a:hover {
		color: var(--accent);
	}

	.add {
		display: flex;
		gap: 0.5em;
	}
</style>
