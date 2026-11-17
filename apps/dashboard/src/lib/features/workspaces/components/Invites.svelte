<script lang="ts">
	import { createQuery } from '@tanstack/svelte-query';
	import { Badge, Button, Field, FormBoundary, Input, Issue, Select, toast } from '@agents/ui';
	import { Workspace } from '@agents/core/workspace';
	import { invalidate } from '#lib/query.ts';
	import { inviteMember } from '../api/workspaces.remote';
	import { invites, revoke } from '../api/workspaces.query';

	// Only owners may offer `owner`; core refuses it for anyone else.
	let { owner = false }: { owner?: boolean } = $props();

	let el = $state<HTMLFormElement>();
	const issues = $derived(inviteMember.fields.allIssues() ?? []);
	const roles = $derived(
		Workspace.roles
			.filter((role) => owner || role !== 'owner')
			.map((role) => ({ value: role, label: role }))
	);
	const list = createQuery(invites);
	const drop = revoke();
</script>

<FormBoundary>
	{#each issues as issue (issue)}
		<Issue>{issue.message}</Issue>
	{/each}

	<form
		bind:this={el}
		{...inviteMember.enhance(async (f) => {
			await f.submit();
			if (inviteMember.fields.allIssues()?.length) return;
			await invalidate(['workspaces']);
			el?.reset();
			toast.success('Invite sent');
		})}
	>
		<Field label="Email">
			<Input {...inviteMember.fields.email.as('email')} placeholder="ada@example.com" />
		</Field>
		<Field label="Role">
			<Select options={roles} {...inviteMember.fields.role.as('select', 'member')} />
		</Field>
		<div>
			<Button variant="primary" type="submit" pending={!!inviteMember.pending}>Invite</Button>
		</div>
	</form>
</FormBoundary>

{#if list.isSuccess && list.data.length > 0}
	<ul>
		{#each list.data as one (one.id)}
			<li>
				<span>{one.email}</span>
				<Badge>{one.role}</Badge>
				<span class="end">
					<Button
						variant="ghost"
						pending={drop.isPending && drop.variables?.id === one.id}
						onclick={() => drop.mutate({ id: one.id })}>Revoke</Button
					>
				</span>
			</li>
		{/each}
	</ul>
{/if}

<style>
	form {
		display: grid;
		grid-template-columns: minmax(0, 18em) minmax(0, 9em) auto;
		align-items: end;
		gap: 0.6em;
	}

	ul {
		display: flex;
		flex-direction: column;
		gap: 0.35em;
		margin: 0.8em 0 0;
		padding: 0;
		list-style: none;
	}

	li {
		display: flex;
		align-items: center;
		gap: 0.75em;
		padding: 0.4em 0.9em;
		border: 1px solid var(--border);
		border-radius: var(--radius);
		background: var(--surface);
		font-size: 0.9em;
	}

	.end {
		margin-left: auto;
	}

	@media (max-width: 40em) {
		form {
			grid-template-columns: 1fr;
		}
	}
</style>
