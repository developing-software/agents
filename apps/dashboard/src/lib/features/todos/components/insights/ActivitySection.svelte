<script lang="ts">
	import type { Insights } from '@agents/core/todo';
	import { createQuery } from '@tanstack/svelte-query';
	import { Empty } from '@agents/ui';
	import { activity } from '../../api/todos.query';
	import Section from './Section.svelte';
	import ActivityChart from './ActivityChart.svelte';

	let { range }: { range: Insights.Range } = $props();

	const query = createQuery(() => activity(range));
</script>

<Section title="Activity" {query} height="300px">
	{#snippet children(data)}
		{#if data.active}
			<ActivityChart series={data.series} />
		{:else}
			<Empty>No activity in this range</Empty>
		{/if}
	{/snippet}
</Section>
