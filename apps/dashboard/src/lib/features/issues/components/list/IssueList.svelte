<script lang="ts">
	import type { Issue } from '@agents/core/issue';
	import Row from './Row.svelte';
	import { tree } from '../../tree';

	let { issues }: { issues: Issue.Info[] } = $props();
</script>

<ul>
	{#each tree(issues) as issue (issue.id)}
		<Row {issue} depth={issue.depth} />
	{/each}
</ul>

<style>
	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		border-top: 1px solid var(--border);
	}
</style>
