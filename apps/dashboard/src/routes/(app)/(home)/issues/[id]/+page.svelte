<script lang="ts">
	import IssueDetailPage from '#lib/features/issues/pages/IssueDetailPage.svelte';

	let { params } = $props();
</script>

<!-- Guarded for the same reason as /projects/[id] — see that route. -->
{#if params.id}
	<IssueDetailPage id={params.id} />
{/if}
