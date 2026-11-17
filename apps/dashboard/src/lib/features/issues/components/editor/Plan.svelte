<!-- The drawer's facts, since a peek has no header: each field saves on its own through a picker. -->
<script lang="ts">
	import type { Issue } from '@agents/core/issue';
	import Source from '#lib/features/events/components/Source.svelte';
	import { fmt } from '#lib/utils/fmt.ts';
	import Assignee from '../Assignee.svelte';
	import Dates from '../Dates.svelte';
	import Stage from './Stage.svelte';

	let { issue }: { issue: Issue.Info } = $props();

	const f = fmt();
</script>

<dl class="plan">
	{#if issue.source === 'project' && issue.sourceID}
		<div>
			<dt>Project</dt>
			<dd>
				<a href="/projects/{issue.sourceID}">
					<Source source={issue.source} sourceID={issue.sourceID} fallback="Project" />
				</a>
			</dd>
		</div>
	{/if}
	<div>
		<dt>Stage</dt>
		<dd><Stage {issue} /></dd>
	</div>
	<div>
		<dt>Assignee</dt>
		<dd><Assignee {issue} full /></dd>
	</div>
	<div>
		<dt>Dates</dt>
		<dd><Dates {issue} /></dd>
	</div>
	{#if issue.timeStarted}
		<div>
			<dt>Worked</dt>
			<dd>
				{f.date(issue.timeStarted)}
				{#if issue.timeDone}&rarr; {f.date(issue.timeDone)}{/if}
			</dd>
		</div>
	{/if}
</dl>

<style>
	.plan {
		display: grid;
		gap: 0.35em;
		margin: 0;
	}

	.plan div {
		display: grid;
		grid-template-columns: 6em minmax(0, 1fr);
		align-items: center;
		min-height: 2em;
	}

	dt {
		color: var(--muted);
		font-size: 0.86em;
	}

	dd {
		margin: 0;
		color: var(--ink);
	}

	a {
		color: inherit;
	}

	a:hover {
		color: var(--accent);
	}
</style>
