<script lang="ts">
	import { createQuery } from '@tanstack/svelte-query';
	import { Card, Skeleton } from '@agents/ui';
	import { arrive, mine, offers, vacant } from '../api/workspaces.query';
	import CreateForm from '../components/CreateForm.svelte';
	import Offers from '../components/Offers.svelte';

	const open = createQuery(vacant);
	const invites = createQuery(offers);
	const list = createQuery(mine);
	const enter = arrive();

	// Set once created; `mine` polls until the setup job marks it ready, then it is entered.
	let made = $state<string>();
	const ready = $derived(list.data?.find((one) => one.slug === made && one.status === 'ready'));

	$effect(() => {
		if (ready && enter.isIdle) enter.mutate({ slug: ready.slug });
	});
</script>

{#if made}
	<Card>
		<p>Setting up <b>{made}</b>. You land inside it as soon as it's ready.</p>
		<Skeleton h="2em" />
	</Card>
{:else if open.isSuccess && invites.isSuccess}
	{#if open.data}
		<section>
			<h2>Create a workspace</h2>
			<Card><CreateForm oncreated={(slug) => (made = slug)} /></Card>
		</section>
	{:else if invites.data.length === 0}
		<!-- Single mode, already set up: the only way in is an invite. -->
		<Card>
			<p>
				This app's workspace is already set up. Ask one of its admins to invite you, then come back.
			</p>
		</Card>
	{/if}

	{#if invites.data.length > 0}
		<section>
			<h2>Join a workspace</h2>
			<Offers rows={invites.data} />
		</section>
	{/if}
{:else}
	<Skeleton h="10em" />
{/if}

<style>
	section {
		display: flex;
		flex-direction: column;
		gap: 0.6em;
	}

	h2 {
		margin: 0;
		font-size: 0.95em;
		font-weight: 600;
	}

	p {
		margin: 0 0 0.6em;
	}
</style>
