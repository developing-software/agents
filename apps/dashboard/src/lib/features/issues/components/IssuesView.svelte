<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import type { Issue } from '@agents/core/issue';
	import type { By } from '../group';
	import type { View } from './ViewSelector.svelte';
	import IssueList from './list/IssueList.svelte';
	import KanbanBoard from './kanban/KanbanBoard.svelte';
	import IssueTable from './table/IssueTable.svelte';
	import TimelineView from './timeline/TimelineView.svelte';
	import CalendarView from './calendar/CalendarView.svelte';

	let {
		issues = [],
		view,
		by = 'status',
		calendar
	}: {
		issues?: Issue.Info[];
		view: View;
		by?: By;
		/** The calendar fetches its own window, so it takes filters instead of `issues`. */
		calendar?: ComponentProps<typeof CalendarView>;
	} = $props();
</script>

<!-- Wrapped so the swap has one element to name. `sort` and `q` are deliberately unclaimed:
     a sort click and a search keystroke should land instantly. -->
<div class="view">
	{#if view === 'board'}
		<KanbanBoard {issues} {by} />
	{:else if view === 'timeline'}
		<TimelineView {issues} by={by === 'status' ? 'stage' : by} />
	{:else if view === 'calendar'}
		{#if calendar}<CalendarView {...calendar} />{/if}
	{:else if view === 'table'}
		<IssueTable {issues} />
	{:else}
		<IssueList {issues} />
	{/if}
</div>

<style>
	/* Named only while the swap it owns is running: an unconditional name would make this
	   its own group on every navigation, including ones where it exists on one side only. */
	:global(html[data-swap~='view']) .view {
		view-transition-name: issues;
	}

	:global(::view-transition-old(issues)),
	:global(::view-transition-new(issues)) {
		animation-duration: 200ms;
		animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
		animation-fill-mode: both;
		mix-blend-mode: normal;
	}

	:global(::view-transition-old(issues)) {
		animation-name: out;
	}

	/* The three screens that own a same-page swap share this animation. It can't be lifted
	   without one global view-transition-name for all of them, and the marker has to sit on
	   the line the clone starts on. */
	/* fallow-ignore-next-line code-duplication */
	:global(::view-transition-new(issues)) {
		animation-name: in;
	}

	@keyframes out {
		to {
			opacity: 0;
			transform: translateY(-4px);
		}
	}

	@keyframes in {
		from {
			opacity: 0;
			transform: translateY(6px);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		:global(::view-transition-old(issues)),
		:global(::view-transition-new(issues)) {
			animation: none;
		}
	}
</style>
