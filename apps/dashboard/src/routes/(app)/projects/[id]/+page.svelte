<script lang="ts">
	import ProjectPage from '#lib/features/projects/pages/ProjectPage.svelte';
	import MonthWidget from '#lib/features/issues/components/MonthWidget.svelte';
	import Stages from '#lib/features/issues/components/Stages.svelte';
	import Recent from '#lib/features/issues/components/Recent.svelte';
	import Summary from '#lib/features/issues/components/Summary.svelte';

	let { params } = $props();
</script>

<!-- `params` is empty mid-navigation, and the page would query with an undefined id. -->
{#if params.id}
	{@const scope = { source: 'project', sourceID: params.id }}
	{#snippet facts()}
		<Summary {scope} />
	{/snippet}
	{#snippet stages()}
		<Stages {scope} base="/projects/{params.id}/issues" />
	{/snippet}
	{#snippet issues()}
		<Recent {scope} />
	{/snippet}
	{#snippet calendar()}
		<MonthWidget {scope} href="/projects/{params.id}/issues?view=calendar" />
	{/snippet}
	<ProjectPage
		id={params.id}
		{facts}
		widgets={{
			main: { title: 'Issues this month', body: calendar },
			side: [
				{ title: 'Stages', body: stages },
				{ title: 'Recent issues', body: issues }
			]
		}}
	/>
{/if}
