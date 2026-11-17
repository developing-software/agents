<script lang="ts">
	import Frame from '#lib/features/auth/components/Frame.svelte';
	import StartPage from '#lib/features/workspaces/pages/StartPage.svelte';

	let { data } = $props();
</script>

<Frame
	title="Your workspace"
	lead="Signed in as {data.email}. Start a workspace, or join one you were invited to."
>
	<StartPage />
	<a class="out" href="/logout" data-sveltekit-reload>Not {data.email}? Log out</a>
</Frame>

<style>
	.out {
		font-size: 0.8em;
		color: var(--dim);
	}

	.out:hover {
		color: var(--ink);
	}
</style>
