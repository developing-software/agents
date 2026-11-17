<script lang="ts">
	import { Button, Field, FormBoundary, Input, Issue, toast } from '@agents/ui';
	import { invalidate } from '#lib/query.ts';
	import { createWorkspace } from '../api/workspaces.remote';

	// `oncreated` hands back the slug, for a caller that waits to enter it.
	let { oncreated }: { oncreated?: (slug: string) => void } = $props();

	let el = $state<HTMLFormElement>();
	const issues = $derived(createWorkspace.fields.allIssues() ?? []);
</script>

<!-- Lands `pending`; the lists poll until the setup job marks it `ready`. -->
<FormBoundary>
	{#each issues as issue (issue)}
		<Issue>{issue.message}</Issue>
	{/each}

	<form
		bind:this={el}
		{...createWorkspace.enhance(async (f) => {
			await f.submit();
			const made = createWorkspace.result;
			if (!made) return;
			await invalidate(['workspaces']);
			el?.reset();
			toast.success('Workspace created');
			oncreated?.(made.slug);
		})}
	>
		<Field label="Name">
			<Input {...createWorkspace.fields.name.as('text')} placeholder="Acme" />
		</Field>
		<Field label="Slug">
			<Input {...createWorkspace.fields.slug.as('text')} placeholder="acme" autocomplete="off" />
		</Field>
		<div>
			<Button variant="primary" type="submit" pending={!!createWorkspace.pending}>Create</Button>
		</div>
	</form>
</FormBoundary>

<style>
	form {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 14em)) auto;
		align-items: end;
		gap: 0.6em;
	}

	@media (max-width: 40em) {
		form {
			grid-template-columns: 1fr;
		}
	}
</style>
