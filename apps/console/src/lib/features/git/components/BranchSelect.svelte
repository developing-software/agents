<script lang="ts">
	import { listBranches } from '$lib/features/agents/api/dispatch.remote';
	import { repoContext } from '../context.svelte';

	interface Props {
		value: string;
		onchange?: (branch: string) => void;
	}

	let {
		value = $bindable(''),
		onchange,
	}: Props = $props();

	const { organization, repoName } = repoContext.get();
	const branchesQuery = listBranches({ organization, repoName });

	function handleChange(e: Event) {
		const selected = (e.target as HTMLSelectElement).value;
		value = selected;
		onchange?.(selected);
	}
</script>

{#if branchesQuery.loading && !branchesQuery.current}
	<span class="branch-loading">...</span>
{:else if branchesQuery.error || !branchesQuery.current || branchesQuery.current.length === 0}
	<input class="branch-input" type="text" bind:value={value} placeholder="branch" />
{:else}
	<select class="branch-select" value={value} onchange={handleChange}>
		{#each branchesQuery.current as branch (branch.name)}
			<option value={branch.name}>{branch.name}</option>
		{/each}
	</select>
{/if}

<style>
	.branch-select {
		font-family: "JetBrains Mono", monospace;
		font-size: 12px;
		padding: 3px 8px;
		background: var(--color-elevated);
		border: 1px solid var(--color-border);
		border-radius: 3px;
		color: var(--color-text);
		outline: none;
		cursor: pointer;
		transition: border-color 0.1s;
	}

	.branch-select:focus {
		border-color: var(--color-accent);
	}

	.branch-input {
		font-family: "JetBrains Mono", monospace;
		font-size: 12px;
		padding: 3px 8px;
		background: var(--color-elevated);
		border: 1px solid var(--color-border);
		border-radius: 3px;
		color: var(--color-text);
		outline: none;
		transition: border-color 0.1s;
	}

	.branch-input:focus {
		border-color: var(--color-accent);
	}

	.branch-loading {
		font-family: "JetBrains Mono", monospace;
		font-size: 12px;
		color: var(--color-muted);
		padding: 3px 0;
	}
</style>
