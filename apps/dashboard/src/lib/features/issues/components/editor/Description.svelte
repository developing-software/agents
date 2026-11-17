<script lang="ts">
	import { Button, Markdown, MarkdownEditor } from '@agents/ui';
	import { upload } from '#lib/upload.ts';
	import type { Issue } from '@agents/core/issue';

	let {
		issue,
		pending,
		onsave
	}: {
		issue: Issue.Info;
		pending: boolean;
		onsave: (body: string) => Promise<unknown>;
	} = $props();

	let editing = $state(false);
	let body = $state('');

	function edit() {
		body = issue.body ?? '';
		editing = true;
	}

	// A failed save keeps the draft open; the caller shows the error.
	function submit(e: SubmitEvent) {
		e.preventDefault();
		onsave(body).then(
			() => (editing = false),
			() => {}
		);
	}
</script>

{#if editing}
	<form onsubmit={submit}>
		<MarkdownEditor bind:value={body} {upload} />
		<div class="row">
			<Button variant="primary" type="submit" {pending}>Save</Button>
			<Button variant="ghost" type="button" onclick={() => (editing = false)}>Cancel</Button>
		</div>
	</form>
{:else}
	{#if issue.body}
		<div class="body">
			<Markdown value={issue.body} />
		</div>
	{:else}
		<p class="blank">No description yet.</p>
	{/if}
	<Button variant="ghost" onclick={edit}>
		{issue.body ? 'Edit description' : 'Add description'}
	</Button>
{/if}

<style>
	.body {
		margin-bottom: 0.5em;
	}

	.blank {
		color: var(--dim);
		font-size: 0.9em;
		font-style: italic;
		margin: 0 0 0.5em;
	}

	.row {
		display: flex;
		gap: 0.5em;
		margin-top: 0.6em;
	}
</style>
