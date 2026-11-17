<script lang="ts">
	import Row from './Row.svelte';
	import Rows from './Rows.svelte';
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

<Rows>
	{#each rows as one (one.id)}
		<Row>
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
		</Row>
	{/each}
</Rows>

<style>
	.name {
		font-weight: 500;
	}

	.end {
		display: flex;
		gap: 0.4em;
		margin-left: auto;
	}
</style>
