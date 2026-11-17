<script lang="ts">
	import Row from './Row.svelte';
	import Rows from './Rows.svelte';
	import { createQuery } from '@tanstack/svelte-query';
	import { Badge, Button, Empty, Issue, Skeleton } from '@agents/ui';
	import { choose, mine } from '../api/workspaces.query';

	// `current` is the slug the request runs in, so its row shows as the one you're in.
	let { current }: { current?: string } = $props();

	const list = createQuery(mine);
	const pick = choose();
</script>

{#snippet row(one: { name: string; slug: string; status: string })}
	<Row>
		<span class="name">{one.name}</span>
		<span class="slug">{one.slug}</span>
		{#if one.status === 'pending'}
			<Badge tone="pending">setting up</Badge>
		{/if}
		<span class="end">
			{#if one.slug === current}
				<Badge tone="accent">current</Badge>
			{:else}
				<Button
					disabled={one.status !== 'ready'}
					pending={pick.isPending && pick.variables?.slug === one.slug}
					onclick={() => pick.mutate({ slug: one.slug })}>Switch</Button
				>
			{/if}
		</span>
	</Row>
{/snippet}

{#if list.isError}
	<Issue>{list.error.message}</Issue>
{:else if list.isSuccess}
	{#if list.data.length === 0}
		<Empty>You aren't in any workspace yet.</Empty>
	{:else}
		{#if pick.isError}
			<Issue>{pick.error.message}</Issue>
		{/if}
		<Rows>
			{#each list.data as one (one.id)}
				{@render row(one)}
			{/each}
		</Rows>
	{/if}
{:else}
	<Skeleton h="6em" />
{/if}

<style>
	.name {
		font-weight: 500;
	}

	.slug {
		font-family: var(--font-mono);
		font-size: 0.85em;
		color: var(--muted);
	}

	.end {
		margin-left: auto;
	}
</style>
