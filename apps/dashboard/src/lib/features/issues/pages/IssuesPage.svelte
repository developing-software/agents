<script lang="ts">
	import { page } from '$app/state';
	import { query } from '#lib/utils/params.ts';
	import * as Header from '#lib/components/header/index.ts';
	import { createQuery } from '@tanstack/svelte-query';
	import { createHotkey } from '@tanstack/svelte-hotkeys';
	import { hotkeys } from '#lib/hotkeys.ts';
	import { Button, Drawer, Empty, Issue, Kbd, Skeleton, Status, modal } from '@agents/ui';
	import { list } from '../api/issues.query';
	import Source from '#lib/features/events/components/Source.svelte';
	import { keep, schema, where } from '../filter';
	import IssueForm from '../components/form/IssueForm.svelte';
	import IssueFilters from '../components/IssueFilters.svelte';
	import ViewSelector from '../components/ViewSelector.svelte';
	import GroupSelector from '../components/GroupSelector.svelte';
	import IssuesView from '../components/IssuesView.svelte';
	import IssueEditor from '../components/IssueEditor.svelte';

	let { source, sourceID }: { source?: string; sourceID?: string } = $props();

	const params = query(schema);

	const scope = $derived({ source, sourceID });

	const picks = $derived({ status: params.status, assignee: params.assignee, stage: params.stage });
	const filters = $derived(where(params, scope));
	const match = $derived(keep(picks));

	// The calendar asks for its own window, so this page-wide list sits out.
	const issues = createQuery(() => ({ ...list(filters), enabled: params.view !== 'calendar' }));
	const shown = $derived(issues.data?.data.filter(match));

	const add = () => modal(IssueForm, { scope });
	createHotkey(hotkeys.create, add);

	const filtered = $derived(
		!!(params.q || params.assignee.length || params.stage.length || params.status.length)
	);
	const clear = () =>
		params.update({ q: undefined, status: undefined, assignee: undefined, stage: undefined });
</script>

<!-- Scoped to a project, the project rides above the title as the way back. -->
{#snippet parent()}
	<a href="/projects/{sourceID}"><Source {source} {sourceID} fallback="Project" /></a>
{/snippet}

<Header.Root title="Issues" eyebrow={source && sourceID ? parent : undefined}>
	{#snippet actions()}
		{#if issues.isFetching && !issues.isPending}<Status state="pending" />{/if}
		<ViewSelector view={params.view} onchange={(view) => params.update({ view })} />
		<Button variant="primary" onclick={add}>New issue <Kbd keys="C" /></Button>
	{/snippet}
	{#snippet strip()}
		<IssueFilters
			{scope}
			issues={shown}
			filters={{
				status: params.status,
				assignee: params.assignee,
				stage: params.stage,
				search: params.q
			}}
			onchange={(next) =>
				params.update({
					status: next.status,
					assignee: next.assignee,
					stage: next.stage,
					q: next.search
				})}
		>
			{#if params.view === 'board' || params.view === 'timeline'}
				<GroupSelector by={params.group} onchange={(group) => params.update({ group })} />
			{/if}
		</IssueFilters>
	{/snippet}
</Header.Root>

<!-- Shallow-routed by `peek`: the URL reads /issues/[id] but this list stays mounted,
     so closing (or swiping back) lands right back on the filtered view. -->
<!-- Guarded: when the browser Back button closed the drawer, the entry is already
     popped and `selected` is gone — backing again would leave the page entirely. -->
<Drawer open={!!page.state.selected} onclose={() => page.state.selected && history.back()}>
	{#if page.state.selected}
		<IssueEditor id={page.state.selected} onremove={() => history.back()} />
	{/if}
</Drawer>

{#if params.view === 'calendar'}
	<IssuesView
		view="calendar"
		calendar={{
			filters,
			keep: match,
			mode: params.mode,
			at: params.at,
			onchange: (next) => params.update(next)
		}}
	/>
{:else if issues.isPending}
	<div class="skeleton">
		{#each [0, 1, 2, 3, 4, 5] as i (i)}
			<Skeleton h="2.6em" />
		{/each}
	</div>
{:else if issues.isError}
	<Issue>{issues.error.message}</Issue>
{:else if !shown?.length}
	{#if filtered}
		<Empty>
			No issues match these filters.
			{#snippet action()}
				<Button variant="ghost" onclick={clear}>Clear filters</Button>
			{/snippet}
		</Empty>
	{:else}
		<Empty>
			No issues yet.
			{#snippet action()}
				<Button onclick={add}>New issue <Kbd keys="C" /></Button>
			{/snippet}
		</Empty>
	{/if}
{:else}
	<IssuesView issues={shown} view={params.view} by={params.group} />
{/if}

<style>
	.skeleton {
		display: grid;
		gap: 0.35em;
	}
</style>
