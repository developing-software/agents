<!-- The record's ⋯ menu beside its primary action; destructive things live here, not in the body. -->
<script lang="ts">
	import type { Issue } from '@agents/core/issue';
	import { IconButton, Menu } from '@agents/ui';
	import Ellipsis from '@lucide/svelte/icons/ellipsis';
	import Delete from '../Delete.svelte';

	let { issue, onremove }: { issue: Issue.Info; onremove: () => void } = $props();
</script>

<Delete id={issue.id} title={issue.title} ondone={onremove}>
	{#snippet children(ask, deleting)}
		<Menu.Root label="More actions" align="end">
			{#snippet trigger(attrs)}
				<IconButton label="More actions" variant="secondary" disabled={deleting} {...attrs}>
					<Ellipsis size={16} strokeWidth={1.75} />
				</IconButton>
			{/snippet}
			<Menu.Item danger onselect={ask}>Delete issue</Menu.Item>
		</Menu.Root>
	{/snippet}
</Delete>
