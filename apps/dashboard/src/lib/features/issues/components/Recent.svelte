<!-- The list chrome matches Stages': the rows differ, and each card staying
     self-contained beats extracting presentation coincidence. -->
<!-- fallow-ignore-file code-duplication -->
<script lang="ts">
	import { createQuery } from '@tanstack/svelte-query';
	import { Empty, Issue, Skeleton } from '@agents/ui';
	import { list } from '../api/issues.query';
	import StatusPill from './StatusPill.svelte';
	import { late } from '../status';
	import { fmt } from '#lib/utils/fmt.ts';

	// No scope lists every issue, for the home.
	let { scope = {} }: { scope?: { source?: string; sourceID?: string } } = $props();

	const f = fmt();
	const issues = createQuery(() => list(scope));
</script>

{#if issues.isPending}
	<Skeleton h="128px" />
{:else if issues.isError}
	<Issue>{issues.error.message}</Issue>
{:else if issues.data.data.length === 0}
	<Empty>Nothing here yet.</Empty>
{:else}
	<ul>
		{#each issues.data.data.slice(0, 8) as issue (issue.id)}
			<li>
				<a href="/issues/{issue.id}">{issue.title}</a>
				<span class="meta">
					<span class={['when', { late: late(issue, f.zone) }]}>
						{issue.dueDate ? f.day(issue.dueDate) : '—'}
					</span>
					<StatusPill status={issue.status} />
				</span>
			</li>
		{/each}
	</ul>
{/if}

<style>
	/* Shared list chrome with Stages.svelte — the row layouts differ, and keeping
	   each card self-contained is worth the duplicated base rules. */
	ul {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.1em;
		padding: 0;
		margin: 0;
	}

	/* Two lines, because this list sits in the short column. */
	li {
		display: flex;
		flex-direction: column;
		gap: 0.4em;
		padding: 0.6em 0;
		border-top: 1px solid var(--border);
	}

	li:first-child {
		border-top: 0;
	}

	a {
		color: var(--ink);
		text-decoration: none;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	a:hover {
		color: var(--accent);
	}

	.meta {
		display: flex;
		align-items: center;
		gap: 0.6em;
	}

	.when {
		font-family: var(--font-mono);
		font-size: 0.72em;
		color: var(--dim);
		white-space: nowrap;
	}

	.when.late {
		color: var(--danger);
	}
</style>
