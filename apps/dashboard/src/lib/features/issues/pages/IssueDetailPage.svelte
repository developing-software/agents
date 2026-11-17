<script lang="ts">
	import { goto } from '$app/navigation';
	import IssueEditor from '../components/IssueEditor.svelte';

	let { id }: { id: string } = $props();
</script>

<IssueEditor {id} page onremove={() => goto('/issues')} />
