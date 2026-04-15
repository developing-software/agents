<script lang="ts">
	import TagPill from "./TagPill.svelte";

	let { tags, limit }: { tags: string[]; limit?: number } = $props();

	let visible = $derived(limit != null ? tags.slice(0, limit) : tags);
	let remaining = $derived(limit != null ? tags.length - limit : 0);
</script>

<div class="tags">
	{#each visible as tag (tag)}
		<TagPill {tag} />
	{/each}
	{#if remaining > 0}
		<span class="more">+{remaining}</span>
	{/if}
</div>

<style>
	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		align-items: center;
	}

	.more {
		font-family: "JetBrains Mono", monospace;
		font-size: 10px;
		color: var(--color-dim);
	}
</style>
