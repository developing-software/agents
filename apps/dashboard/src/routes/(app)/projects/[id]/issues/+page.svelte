<script lang="ts">
	import IssuesPage from '#lib/features/issues/pages/IssuesPage.svelte';

	let { params } = $props();
</script>

<!-- Guarded for the same reason as /projects/[id] — see that route. -->
{#if params.id}
	<IssuesPage source="project" sourceID={params.id} />
{/if}
