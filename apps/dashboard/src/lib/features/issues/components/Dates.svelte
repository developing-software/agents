<!-- Planned start and finish edit as one transaction, so an invalid half-update never lands. -->
<script lang="ts">
	import type { Issue } from '@agents/core/issue';
	import { DateSpanPicker, Status, type Span } from '@agents/ui';
	import Calendar from '@lucide/svelte/icons/calendar';
	import { fmt } from '#lib/utils/fmt.ts';
	import { update } from '../api/issues.query';
	import { late } from '../status';

	let { issue }: { issue: Issue.Info } = $props();

	const f = fmt();
	const save = update();
	const start = $derived(
		save.isPending && save.variables?.body?.startDate !== undefined
			? save.variables.body.startDate
			: issue.startDate
	);
	const finish = $derived(
		save.isPending && save.variables?.body?.dueDate !== undefined
			? save.variables.body.dueDate
			: issue.dueDate
	);

	const set = (span: Span) =>
		save.mutate({
			path: { id: issue.id },
			body: { startDate: span.start ?? null, dueDate: span.finish ?? null }
		});
</script>

<span class="dates">
	<DateSpanPicker
		start={start ?? undefined}
		finish={finish ?? undefined}
		label="Issue dates"
		time
		onchange={set}
	>
		{#snippet trigger(attrs, text)}
			<button
				class={['when', { late: late({ ...issue, dueDate: finish ?? null }, f.zone) }]}
				type="button"
				aria-label={start || finish ? `Dates ${text}` : 'Set issue dates'}
				disabled={save.isPending}
				{...attrs}
			>
				{#if start || finish}{text}{:else}<Calendar size={13} strokeWidth={1.75} />{/if}
			</button>
		{/snippet}
	</DateSpanPicker>
	<Status of={save} />
</span>

<style>
	.dates {
		position: relative;
		z-index: 1;
		display: inline-flex;
		align-items: center;
		gap: 0.3em;
	}

	.when {
		display: inline-flex;
		align-items: center;
		min-height: 1.6em;
		padding: 0 0.35em;
		border: none;
		border-radius: var(--radius-sm);
		background: none;
		color: var(--dim);
		font: inherit;
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
		cursor: pointer;
		transition: background 140ms ease;
	}

	.when:hover,
	.when[aria-expanded='true'] {
		background: var(--hover);
		color: var(--ink);
	}

	.when.late {
		color: var(--danger);
	}

	.when:disabled {
		cursor: default;
	}

	@media (prefers-reduced-motion: reduce) {
		.when {
			transition: none;
		}
	}
</style>
