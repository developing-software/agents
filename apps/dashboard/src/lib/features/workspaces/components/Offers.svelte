<script lang="ts">
	import { Badge, Button, Issue } from '@agents/ui';
	import type { Workspaces } from '@agents/core/workspaces';
	import { accept, decline } from '../api/workspaces.query';

	type Offer = Awaited<ReturnType<typeof Workspaces.offers>>[number];

	let { rows }: { rows: Offer[] } = $props();

	const join = accept();
	const drop = decline();
</script>

{#if join.isError}
	<Issue>{join.error.message}</Issue>
{/if}

<ul>
	{#each rows as one (one.id)}
		<li>
			<span class="name">{one.workspace.name}</span>
			<Badge>{one.role}</Badge>
			{#if one.workspace.status !== 'ready'}
				<Badge tone="pending">setting up</Badge>
			{/if}
			<span class="end">
				<Button
					variant="ghost"
					pending={drop.isPending && drop.variables?.id === one.id}
					onclick={() => drop.mutate({ id: one.id })}>Decline</Button
				>
				<Button
					variant="primary"
					disabled={one.workspace.status !== 'ready'}
					pending={join.isPending && join.variables?.id === one.id}
					onclick={() => join.mutate({ id: one.id })}>Join</Button
				>
			</span>
		</li>
	{/each}
</ul>

<style>
	ul {
		display: flex;
		flex-direction: column;
		gap: 0.35em;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	li {
		display: flex;
		align-items: center;
		gap: 0.75em;
		padding: 0.5em 0.9em;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
	}

	.name {
		font-weight: 500;
	}

	.end {
		display: flex;
		gap: 0.4em;
		margin-left: auto;
	}
</style>
