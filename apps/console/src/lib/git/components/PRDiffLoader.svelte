<script lang="ts">
	import { getPRDiff } from '../remote';
	import UnifiedDiff from '$lib/ui/UnifiedDiff.svelte';
	import { repoContext } from '../context.svelte';

	let {
		prNumber,
		prUrl = null,
		autoLoad = false
	}: {
		prNumber: number;
		prUrl?: string | null;
		autoLoad?: boolean;
	} = $props();

	const { organization, repoName } = repoContext.get();

	let loading = $state(false);
	let diff = $state<string | null>(null);
	let truncated = $state(false);
	let error = $state<string | null>(null);
	let visible = $state(false);

	async function load() {
		if (loading || diff != null) return;
		error = null;
		loading = true;
		try {
			const result = await getPRDiff({ organization, repoName, prNumber });
			diff = result.diff;
			truncated = result.truncated;
			visible = true;
		} catch (e) {
			diff = null;
			error = e instanceof Error ? e.message : 'Failed to load diff';
		} finally {
			loading = false;
		}
	}

	async function toggle() {
		if (loading) return;
		if (diff != null) {
			visible = !visible;
			return;
		}
		await load();
	}

	$effect(() => {
		if (autoLoad && diff == null && !loading) {
			void load();
		}
	});
</script>

<div class="diff-loader">
	{#if !autoLoad}
		<button class="action-btn" disabled={loading} onclick={toggle}>
			{#if loading}
				...
			{:else if visible}
				Hide Diff
			{:else}
				Diff
			{/if}
		</button>
	{/if}

	{#if loading && autoLoad}
		<div class="diff-loading">loading diff...</div>
	{/if}

	{#if error}
		<div class="diff-error">{error}</div>
	{/if}

	{#if visible && diff != null}
		<UnifiedDiff {diff} {prUrl} />
	{/if}
</div>

<style>
	.diff-loader {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.action-btn {
		font-family: 'JetBrains Mono', monospace;
		font-size: 11px;
		padding: 3px 10px;
		border-radius: 4px;
		border: 1px solid color-mix(in srgb, var(--color-accent) 40%, transparent);
		background: color-mix(in srgb, var(--color-accent) 8%, transparent);
		color: var(--color-accent);
		cursor: pointer;
		transition: background 0.1s, border-color 0.1s;
	}

	.action-btn:hover:not(:disabled) {
		background: color-mix(in srgb, var(--color-accent) 15%, transparent);
		border-color: var(--color-accent);
	}

	.action-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.diff-error {
		font-size: 11px;
		color: var(--color-danger);
	}

	.diff-loading {
		font-size: 11px;
		color: var(--color-dim);
		font-style: italic;
		padding: 4px 0;
	}
</style>
