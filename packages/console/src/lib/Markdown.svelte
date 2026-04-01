<script lang="ts">
	import { marked } from 'marked';

	let { source }: { source: string } = $props();

	marked.use({ async: false });

	let html = $derived(marked.parse(source) as string);
</script>

<div class="markdown">
	{@html html}
</div>

<style>
	/* Base */
	.markdown {
		font-size: 13px;
		line-height: 1.6;
		color: var(--color-text);
	}

	/* Headings */
	.markdown :global(h1) {
		font-size: 18px;
		font-weight: 600;
		margin: 20px 0 8px;
		padding-bottom: 4px;
		border-bottom: 1px solid var(--color-border);
	}
	.markdown :global(h2) {
		font-size: 15px;
		font-weight: 600;
		margin: 16px 0 6px;
	}
	.markdown :global(h3) {
		font-size: 13px;
		font-weight: 600;
		margin: 12px 0 4px;
	}

	/* Paragraphs and lists */
	.markdown :global(p) {
		margin: 8px 0;
	}
	.markdown :global(ul),
	.markdown :global(ol) {
		margin: 8px 0;
		padding-left: 20px;
	}
	.markdown :global(li) {
		margin: 2px 0;
	}

	/* Code */
	.markdown :global(code) {
		font-family: 'JetBrains Mono', monospace;
		font-size: 12px;
		padding: 1px 4px;
		border-radius: 3px;
		background: var(--color-elevated);
		color: var(--color-muted);
	}
	.markdown :global(pre) {
		margin: 8px 0;
		padding: 10px 12px;
		border-radius: 4px;
		background: var(--color-elevated);
		border: 1px solid var(--color-border);
		overflow-x: auto;
	}
	.markdown :global(pre code) {
		padding: 0;
		background: none;
		font-size: 12px;
		color: var(--color-text);
	}

	/* Links */
	.markdown :global(a) {
		color: var(--color-accent);
		text-decoration: none;
	}
	.markdown :global(a:hover) {
		text-decoration: underline;
	}

	/* Blockquotes */
	.markdown :global(blockquote) {
		margin: 8px 0;
		padding: 4px 12px;
		border-left: 3px solid var(--color-border);
		color: var(--color-muted);
	}

	/* Checkboxes */
	.markdown :global(input[type='checkbox']) {
		margin-right: 6px;
	}

	/* Horizontal rules */
	.markdown :global(hr) {
		border: none;
		border-top: 1px solid var(--color-border);
		margin: 16px 0;
	}

	/* Tables */
	.markdown :global(table) {
		border-collapse: collapse;
		margin: 8px 0;
		width: 100%;
	}
	.markdown :global(th),
	.markdown :global(td) {
		padding: 4px 8px;
		border: 1px solid var(--color-border);
		font-size: 12px;
	}
	.markdown :global(th) {
		background: var(--color-elevated);
		font-weight: 600;
	}
</style>
