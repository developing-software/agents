<!-- Issues with no dates yet; drag one onto a day to schedule it. -->
<script lang="ts">
	import type { Issue } from '@agents/core/issue';
	import { Skeleton } from '@agents/ui';
	import Chip from './Chip.svelte';
	import type { Chips } from './CalendarView.svelte';

	let {
		issues,
		total = 0,
		loading = false,
		chips
	}: { issues: Issue.Info[]; total?: number; loading?: boolean; chips: Chips } = $props();
</script>

<aside class="tray" aria-label="Unscheduled issues">
	<header>
		<span>Unscheduled</span>
		<span class="count">{total}</span>
	</header>
	{#if loading}
		<Skeleton h="1.45em" />
		<Skeleton h="1.45em" />
	{:else if issues.length === 0}
		<p class="none">Nothing unscheduled.</p>
	{:else}
		<ul>
			{#each issues as issue (issue.id)}
				<li>
					<Chip {issue} link {...chips.mark(issue.id)} grab={chips.grab} open={chips.open} />
				</li>
			{/each}
		</ul>
		{#if total > issues.length}<p class="none">{issues.length} of {total} shown</p>{/if}
	{/if}
</aside>

<style>
	.tray {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		min-width: 0;
		padding: 0.55rem;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
	}

	header {
		display: flex;
		justify-content: space-between;
		color: var(--muted);
		font-size: 0.78rem;
		font-weight: 500;
	}

	.count {
		color: var(--dim);
		font-family: var(--font-mono);
		font-size: 0.9em;
	}

	ul {
		display: grid;
		gap: 3px;
		margin: 0;
		padding: 0;
		max-height: 32rem;
		overflow-y: auto;
		scrollbar-width: thin;
		list-style: none;
	}

	.none {
		margin: 0;
		color: var(--dim);
		font-size: 0.75rem;
	}
</style>
