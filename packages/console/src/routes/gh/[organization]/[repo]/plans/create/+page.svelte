<script lang="ts">
	import type { PageProps } from './$types';
	import PlanForm from '$lib/agents/plans/PlanForm.svelte';

	let { data }: PageProps = $props();
</script>

<div class="header">
	<a href="/gh/{data.organization}/{data.repoName}/plans" class="back">← Plans</a>
	<span class="title">New Plan</span>
</div>

<PlanForm repoId={data.repo.id} organization={data.organization} repoName={data.repoName} />

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
</style>
