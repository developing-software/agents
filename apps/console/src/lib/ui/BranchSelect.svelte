<script lang="ts">
	import { listBranches } from '$lib/agents/dispatch/dispatch.remote';
	import { repoContext } from '$lib/git-repo/context.svelte';

	interface Props {
		value: string;
		onchange?: (branch: string) => void;
	}

	let {
		value = $bindable(''),
		onchange,
	}: Props = $props();

	const { organization, repoName } = repoContext.get();
	const branchesPromise = $derived(listBranches({ organization, repoName }));

	function handleChange(e: Event) {
		const selected = (e.target as HTMLSelectElement).value;
		value = selected;
		onchange?.(selected);
	}
</script>

{#await branchesPromise}
	<span class="branch-loading">...</span>
{:then branches}
	{#if branches.length > 0}
		<select class="branch-select" value={value} onchange={handleChange}>
			{#each branches as branch (branch.name)}
				<option value={branch.name}>{branch.name}</option>
			{/each}
		</select>
	{:else}
		<input class="branch-input" type="text" bind:value={value} placeholder="branch" />
	{/if}
{:catch}
	<input class="branch-input" type="text" bind:value={value} placeholder="branch" />
{/await}

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
