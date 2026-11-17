<script lang="ts">
	import CalendarView from './calendar/CalendarView.svelte';

	let {
		scope = {},
		href = '/issues?view=calendar'
	}: {
		scope?: { source?: string; sourceID?: string };
		href?: string;
	} = $props();
</script>

<CalendarView filters={scope} compact {href} onchange={() => {}} />
