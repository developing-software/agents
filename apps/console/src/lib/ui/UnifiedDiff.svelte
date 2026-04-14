<script lang="ts">
	interface Props {
		diff: string;
		maxFiles?: number;
		maxLines?: number;
		prUrl?: string | null;
	}

	let { diff, maxFiles = 20, maxLines = 3000, prUrl = null }: Props = $props();

	interface DiffLine {
		type: 'addition' | 'deletion' | 'context' | 'meta';
		content: string;
		oldNum: number | null;
		newNum: number | null;
	}

	interface DiffHunk {
		header: string;
		lines: DiffLine[];
	}

	interface DiffFile {
		filename: string;
		oldFilename: string | null;
		isNew: boolean;
		isDeleted: boolean;
		isBinary: boolean;
		hunks: DiffHunk[];
		additions: number;
		deletions: number;
	}

	function parseDiff(raw: string): DiffFile[] {
		if (!raw || !raw.trim()) return [];

		const fileSections = raw.split(/^diff --git /m).filter(Boolean);
		const files: DiffFile[] = [];

		for (const section of fileSections) {
			const lines = section.split('\n');

			let filename = '';
			let oldFilename: string | null = null;
			let isNew = false;
			let isDeleted = false;
			let isBinary = false;

			for (const line of lines) {
				if (line.startsWith('--- ')) {
					const name = line.slice(4).trim();
					if (name === '/dev/null') {
						isNew = true;
					} else {
						oldFilename = name.replace(/^a\//, '');
					}
				} else if (line.startsWith('+++ ')) {
					const name = line.slice(4).trim();
					if (name === '/dev/null') {
						isDeleted = true;
						filename = oldFilename ?? '';
					} else {
						filename = name.replace(/^b\//, '');
					}
				} else if (line.startsWith('Binary files') || line.includes('Binary files')) {
					isBinary = true;
				} else if (line.startsWith('new file')) {
					isNew = true;
				} else if (line.startsWith('deleted file')) {
					isDeleted = true;
				}
			}

			// Fallback: extract filename from the header line
			if (!filename && lines[0]) {
				const match = lines[0].match(/a\/(.+?)\s+b\/(.+)/);
				if (match) {
					filename = match[2] === '/dev/null' ? (match[1] ?? '') : (match[2] ?? '');
				}
			}

			if (isBinary) {
				files.push({
					filename,
					oldFilename,
					isNew,
					isDeleted,
					isBinary,
					hunks: [],
					additions: 0,
					deletions: 0,
				});
				continue;
			}

			// Parse hunks
			const hunks: DiffHunk[] = [];
			let additions = 0;
			let deletions = 0;

			const contentStart = lines.findIndex((l) => l.startsWith('+++ '));
			if (contentStart === -1) {
				files.push({
					filename,
					oldFilename,
					isNew,
					isDeleted,
					isBinary,
					hunks: [],
					additions: 0,
					deletions: 0,
				});
				continue;
			}

			const contentLines = lines.slice(contentStart + 1);

			// Walk through lines to find hunk headers and their content
			let currentHunk: DiffHunk | null = null;
			let oldLineNum = 0;
			let newLineNum = 0;

			for (const line of contentLines) {
				const hunkMatch = line.match(/^@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@(.*)/);
				if (hunkMatch) {
					if (currentHunk) hunks.push(currentHunk);
					oldLineNum = parseInt(hunkMatch[1]);
					newLineNum = parseInt(hunkMatch[2]);
					currentHunk = { header: line, lines: [] };
					continue;
				}

				if (!currentHunk) continue;

				if (line.startsWith('+')) {
					currentHunk.lines.push({
						type: 'addition',
						content: line.slice(1),
						oldNum: null,
						newNum: newLineNum,
					});
					newLineNum++;
					additions++;
				} else if (line.startsWith('-')) {
					currentHunk.lines.push({
						type: 'deletion',
						content: line.slice(1),
						oldNum: oldLineNum,
						newNum: null,
					});
					oldLineNum++;
					deletions++;
				} else if (line.startsWith(' ')) {
					currentHunk.lines.push({
						type: 'context',
						content: line.slice(1),
						oldNum: oldLineNum,
						newNum: newLineNum,
					});
					oldLineNum++;
					newLineNum++;
				} else if (line.startsWith('\\')) {
					currentHunk.lines.push({
						type: 'meta',
						content: line,
						oldNum: null,
						newNum: null,
					});
				}
			}

			if (currentHunk) hunks.push(currentHunk);

			files.push({ filename, oldFilename, isNew, isDeleted, isBinary, hunks, additions, deletions });
		}

		return files;
	}

	let files = $derived(parseDiff(diff));

	let totalLineCount = $derived(
		files.reduce((sum, f) => sum + f.hunks.reduce((s, h) => s + h.lines.length, 0), 0),
	);

	let filesTruncated = $derived(files.length > maxFiles);
	let linesToShow = $derived(totalLineCount > maxLines);

	let displayFiles = $derived(files.slice(0, maxFiles));

	let collapsed: Record<number, boolean> = $state({});

	function toggle(index: number) {
		collapsed[index] = !collapsed[index];
	}

	function fileBadge(file: DiffFile): string {
		if (file.isNew) return 'new';
		if (file.isDeleted) return 'deleted';
		if (file.oldFilename && file.oldFilename !== file.filename) return 'renamed';
		return '';
	}
</script>

{#if files.length === 0}
	<div class="diff-empty">No changes</div>
{:else}
	<div class="diff-container">
		{#each displayFiles as file, i (file.filename + i)}
			{@const badge = fileBadge(file)}
			<div class="diff-file">
				<button class="file-header" onclick={() => toggle(i)} aria-expanded={!collapsed[i]}>
					<span class="file-name">
						<span class="toggle-icon">{collapsed[i] ? '\u25B6' : '\u25BC'}</span>
						{file.filename}
						{#if badge}
							<span class="badge badge-{badge}">{badge}</span>
						{/if}
					</span>
					<span class="file-stats">
						{#if file.isBinary}
							<span class="binary-label">binary</span>
						{:else}
							{#if file.additions > 0}<span class="stat-add">+{file.additions}</span>{/if}
							{#if file.deletions > 0}<span class="stat-del">-{file.deletions}</span>{/if}
						{/if}
					</span>
				</button>

				{#if !collapsed[i]}
					<div class="file-body">
						{#if file.isBinary}
							<div class="binary-notice">Binary file</div>
						{:else}
							{#each file.hunks as hunk}
								<div class="hunk-header">{hunk.header}</div>
								{#each hunk.lines as line}
									<div class="line line-{line.type}">
										<span class="gutter gutter-old">{line.oldNum ?? ''}</span>
										<span class="gutter gutter-new">{line.newNum ?? ''}</span>
										<span class="line-prefix"
											>{line.type === 'addition'
												? '+'
												: line.type === 'deletion'
													? '-'
													: line.type === 'context'
														? ' '
														: ''}</span
										>
										<span class="line-content">{line.content}</span>
									</div>
								{/each}
							{/each}
						{/if}
					</div>
				{/if}
			</div>
		{/each}

		{#if filesTruncated || linesToShow}
			<div class="truncation">
				{#if filesTruncated}
					Showing {maxFiles} of {files.length} files.
				{/if}
				{#if linesToShow}
					Diff is large ({totalLineCount} lines).
				{/if}
				{#if prUrl}
					<a href={prUrl} target="_blank" rel="noopener noreferrer">View on GitHub</a>
				{/if}
			</div>
		{/if}
	</div>
{/if}

<style>
	.diff-container {
		border: 1px solid var(--color-border);
		border-radius: 5px;
		overflow: hidden;
		font-family: 'JetBrains Mono', monospace;
		font-size: 12px;
	}

	.diff-empty {
		padding: 16px;
		text-align: center;
		font-size: 12px;
		color: var(--color-dim);
	}

	/* File sections */
	.diff-file + .diff-file {
		border-top: 1px solid var(--color-border);
	}

	.file-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		width: 100%;
		background: var(--color-elevated);
		padding: 6px 10px;
		border: none;
		border-bottom: 1px solid var(--color-border);
		cursor: pointer;
		font-family: 'JetBrains Mono', monospace;
		font-size: 12px;
		color: var(--color-text);
		text-align: left;
	}

	.file-header:hover {
		background: color-mix(in srgb, var(--color-elevated) 80%, var(--color-accent) 20%);
	}

	.file-name {
		display: flex;
		align-items: center;
		gap: 6px;
		min-width: 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-weight: 500;
	}

	.toggle-icon {
		font-size: 9px;
		color: var(--color-dim);
		flex-shrink: 0;
		width: 10px;
	}

	/* Badges */
	.badge {
		font-size: 10px;
		padding: 0 5px;
		border-radius: 3px;
		font-weight: 500;
		flex-shrink: 0;
	}

	.badge-new {
		background: color-mix(in srgb, var(--color-success) 15%, transparent);
		color: var(--color-success);
	}

	.badge-deleted {
		background: color-mix(in srgb, var(--color-danger) 15%, transparent);
		color: var(--color-danger);
	}

	.badge-renamed {
		background: color-mix(in srgb, var(--color-accent) 15%, transparent);
		color: var(--color-accent);
	}

	/* Stats */
	.file-stats {
		display: flex;
		gap: 6px;
		flex-shrink: 0;
		font-size: 11px;
	}

	.stat-add {
		color: var(--color-success);
	}

	.stat-del {
		color: var(--color-danger);
	}

	.binary-label {
		color: var(--color-dim);
		font-size: 10px;
	}

	/* File body */
	.file-body {
		overflow-x: auto;
	}

	/* Hunk header */
	.hunk-header {
		padding: 4px 10px;
		color: var(--color-dim);
		background: var(--color-surface);
		font-size: 11px;
		border-bottom: 1px solid var(--color-border);
		white-space: pre;
	}

	/* Lines */
	.line {
		display: flex;
		white-space: pre;
		line-height: 1.5;
		min-width: fit-content;
	}

	.gutter {
		display: inline-block;
		width: 4ch;
		text-align: right;
		color: var(--color-dim);
		user-select: none;
		flex-shrink: 0;
		padding-right: 4px;
		font-size: 11px;
	}

	.line-prefix {
		width: 1ch;
		flex-shrink: 0;
		user-select: none;
	}

	.line-content {
		flex: 1;
		padding-right: 10px;
	}

	/* Line types */
	.line-addition {
		background: color-mix(in srgb, var(--color-success) 8%, transparent);
		color: var(--color-success);
	}

	.line-deletion {
		background: color-mix(in srgb, var(--color-danger) 8%, transparent);
		color: var(--color-danger);
	}

	.line-context {
		color: var(--color-text);
	}

	.line-meta {
		color: var(--color-dim);
		font-style: italic;
	}

	/* Binary notice */
	.binary-notice {
		padding: 12px 10px;
		color: var(--color-dim);
		font-style: italic;
		font-size: 11px;
	}

	/* Truncation */
	.truncation {
		padding: 10px;
		text-align: center;
		font-size: 11px;
		color: var(--color-muted);
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		background: var(--color-surface);
		border-top: 1px solid var(--color-border);
	}

	.truncation a {
		color: var(--color-accent);
		text-decoration: none;
		margin-left: 4px;
	}

	.truncation a:hover {
		text-decoration: underline;
	}
</style>
