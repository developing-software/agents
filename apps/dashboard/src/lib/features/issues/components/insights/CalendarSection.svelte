<script lang="ts">
	import type { Insights } from '@agents/core/issue';
	import { createQuery } from '@tanstack/svelte-query';
	import { Empty } from '@agents/ui';
	import { calendar } from '../../api/issues.query';
	import Section from './Section.svelte';
	import CalendarChart from './CalendarChart.svelte';

	let { range }: { range: Insights.Range } = $props();

	const query = createQuery(() => calendar(range));
</script>

<Section title="Created" {query} height="180px">
	{#snippet children(data)}
		{#if data.total > 0}
			<CalendarChart {data} />
		{:else}
			<Empty>No issues created in this range</Empty>
		{/if}
	{/snippet}
</Section>
