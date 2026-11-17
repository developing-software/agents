<script lang="ts">
	import type { Insights } from '@agents/core/issue';
	import { createQuery } from '@tanstack/svelte-query';
	import { Empty } from '@agents/ui';
	import { due } from '../../api/issues.query';
	import StatusPill from '../StatusPill.svelte';
	import Section from './Section.svelte';
	import { fmt } from '#lib/utils/fmt.ts';

	let { scope = {} }: { scope?: Insights.Scope } = $props();

	const f = fmt();
	const query = createQuery(() => due(scope));
</script>

<Section title="Next due" {query} height="180px">
	{#snippet children(issues)}
		{#if issues.length === 0}
			<Empty>No upcoming due issues.</Empty>
		{:else}
			<ul>
				{#each issues as issue (issue.id)}
					<li>
						<a href="/issues/{issue.id}">{issue.title}</a>
						<span>{issue.dueDate ? f.day(issue.dueDate) : 'No due date'}</span>
						<StatusPill status={issue.status} />
					</li>
				{/each}
			</ul>
		{/if}
	{/snippet}
</Section>

<style>
	ul {
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.7em;
		padding: 0;
		margin: 0;
	}

	li {
		display: grid;
		grid-template-columns: 1fr auto auto;
		align-items: center;
		gap: 0.75em;
		padding: 0.75em 0;
		border-top: 1px solid var(--border);
	}

	li:first-child {
		border-top: 0;
		padding-top: 0;
	}

	a {
		color: var(--ink);
		text-decoration: none;
	}

	a:hover {
		text-decoration: underline;
	}

	span {
		color: var(--muted);
		font-size: 0.9em;
	}

	@media (max-width: 640px) {
		li {
			grid-template-columns: 1fr;
			align-items: start;
			/* One column stretches every cell; the pill keeps its own width. */
			justify-items: start;
		}
	}
</style>
