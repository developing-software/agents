<!-- The record header on the issue's own route: every fact edits in place, the status rides a
     stepper, and one primary action moves it a step along the flow. -->
<script lang="ts">
	import type { Issue } from '@agents/core/issue';
	import { Button, Inline } from '@agents/ui';
	import * as Header from '#lib/components/header/index.ts';
	import Steps from '#lib/components/Steps.svelte';
	import Source from '#lib/features/events/components/Source.svelte';
	import { fmt } from '#lib/utils/fmt.ts';
	import { update } from '../../api/issues.query';
	import { FLOW, next, step } from '../../status';
	import Assignee from '../Assignee.svelte';
	import Dates from '../Dates.svelte';
	import StatusPicker from '../StatusPicker.svelte';
	import More from './More.svelte';
	import Stage from './Stage.svelte';

	let { issue, onremove }: { issue: Issue.Info; onremove: () => void } = $props();

	const f = fmt();
	const save = update();
	const move = update();
	const ahead = $derived(next(issue.status));
</script>

{#snippet parent()}
	{#if issue.source === 'project' && issue.sourceID}
		<a href="/projects/{issue.sourceID}">
			<Source source={issue.source} sourceID={issue.sourceID} fallback="Project" />
		</a>
		<span aria-hidden="true">/</span>
		<a href="/projects/{issue.sourceID}/issues">Issues</a>
	{:else}
		<a href="/issues">Issues</a>
	{/if}
{/snippet}

{#snippet title()}
	<Inline
		label="Issue title"
		required
		flush
		value={issue.title}
		onsave={(text) => save.mutateAsync({ path: { id: issue.id }, body: { title: text } })}
	/>
{/snippet}

{#snippet actions()}
	{#if ahead}
		<Button
			variant="primary"
			pending={move.isPending}
			onclick={() =>
				move.mutate({
					path: { id: issue.id },
					body: { status: ahead.to, reason: ahead.to === 'done' ? 'completed' : null }
				})}
		>
			{ahead.label}
		</Button>
	{/if}
	<More {issue} {onremove} />
{/snippet}

<Header.Root {title} eyebrow={parent} {actions}>
	<Header.Item label="Status">
		<Steps steps={FLOW.length} current={step(issue.status)} danger={issue.status === 'blocked'}>
			<StatusPicker {issue} />
		</Steps>
	</Header.Item>
	<Header.Item label="Assignee"><Assignee {issue} full /></Header.Item>
	<Header.Item label="Stage"><Stage {issue} /></Header.Item>
	<Header.Item label="Dates"><Dates {issue} /></Header.Item>
	{#if issue.timeStarted}
		<!-- Stamped by the status flow, so it reads rather than edits. -->
		<Header.Item label="Worked">
			{f.date(issue.timeStarted)}
			{#if issue.timeDone}&rarr; {f.date(issue.timeDone)}{/if}
		</Header.Item>
	{/if}
</Header.Root>
