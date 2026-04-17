<script lang="ts">
	import type { PageProps } from './$types';
	import PlanForm from '$lib/features/agents/plans/PlanForm.svelte';

	let { data }: PageProps = $props();
</script>

{#if data.plan && data.repo}
	<div class="header">
		<a href="/{data.provider}/{data.organization}/{data.repoName}/agents/plans/{data.plan.id}" class="back">&larr; Plan</a>
		<span class="title">Edit Plan</span>
	</div>

	<PlanForm plan={data.plan} repoId={data.repo.id} />
{:else}
	<div class="not-found">
		<a href="/{data.provider}/{data.organization}/{data.repoName}/agents/plans" class="back">&larr; Plans</a>
		<span class="not-found-text">Plan not found</span>
	</div>
{/if}

<style>
	.header {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 16px;
	}

	.back {
		font-family: "JetBrains Mono", monospace;
		font-size: 11px;
		color: var(--color-dim);
		text-decoration: none;
		flex-shrink: 0;
	}
	.back:hover {
		color: var(--color-muted);
	}

	.title {
		font-size: 14px;
		font-weight: 500;
		color: var(--color-text);
	}

	.not-found {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.not-found-text {
		font-size: 12px;
		color: var(--color-muted);
	}
</style>
