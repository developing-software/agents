<script lang="ts">
	import { tagCategoryStyle } from './tag-helpers';

	let { tag }: { tag: string } = $props();
</script>

<span class="tag-pill" style={tagCategoryStyle(tag)}>{tag}</span>

<style>
	.tag-pill {
		font-family: 'JetBrains Mono', monospace;
		font-size: 10px;
		padding: 1px 6px;
		border-radius: 3px;
		border: 1px solid;
		line-height: 1.6;
		white-space: nowrap;
	}
</style>
