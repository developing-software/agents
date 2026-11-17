<!-- An issue's stage, saved on pick: suggests the project's stages and creates whatever is new. -->
<script lang="ts">
	import type { Issue } from '@agents/core/issue';
	import { Status } from '@agents/ui';
	import { update } from '../../api/issues.query';
	import StagePicker from '../StagePicker.svelte';

	let { issue }: { issue: Issue.Info } = $props();

	const save = update();
</script>

<span class="stage">
	<StagePicker
		scope={{ source: issue.source ?? undefined, sourceID: issue.sourceID ?? undefined }}
		value={issue.stage ?? ''}
		onchange={(stage) =>
			stage !== (issue.stage ?? '') &&
			save.mutate({ path: { id: issue.id }, body: { stage: stage || null } })}
	/>
	<Status of={save} />
</span>

<style>
	.stage {
		display: inline-flex;
		align-items: center;
		gap: 0.4em;
		min-width: 0;
	}
</style>
