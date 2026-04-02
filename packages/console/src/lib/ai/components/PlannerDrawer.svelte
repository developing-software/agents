<script lang="ts">
	import { Chat } from '@ai-sdk/svelte';
	import { DefaultChatTransport, isToolUIPart, getToolName, lastAssistantMessageIsCompleteWithApprovalResponses } from 'ai';
	import Drawer from '$lib/ui/Drawer.svelte';
	import PlannerChat from './PlannerChat.svelte';

	type PlanSummary = {
		id: string;
		title: string;
		status: string;
	};

	let {
		open = $bindable(false),
		organization,
		repoName,
		mode = 'draft',
		plan,
		onplancreated,
	}: {
		open?: boolean;
		organization: string;
		repoName: string;
		mode?: 'draft' | 'edit';
		plan?: PlanSummary;
		onplancreated?: (plan: PlanSummary) => void;
	} = $props();

	const basePath = $derived(`/gh/${organization}/${repoName}/plans`);

	const chat = $derived.by(() => {
		const body = mode === 'edit' && plan ? { planId: plan.id } : undefined;
		return new Chat({
			transport: new DefaultChatTransport({
				api: `${basePath}/planner`,
				body,
			}),
			sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithApprovalResponses,
			onFinish({ message }) {
				if (mode !== 'draft') return;
				for (const part of message.parts) {
					if (
						isToolUIPart(part) &&
						getToolName(part) === 'createPlan' &&
						part.state === 'output-available' &&
						part.output
					) {
						const output = part.output as Record<string, unknown>;
						if (typeof output.id === 'string') {
							onplancreated?.({
								id: output.id,
								title: typeof output.title === 'string' ? output.title : 'New Plan',
								status: 'draft',
							});
							return;
						}
					}
				}
			},
		});
	});

	let drawerTitle = $derived(
		mode === 'edit' && plan ? `Editing: ${plan.title}` : 'Planner'
	);
</script>

<Drawer bind:open title={drawerTitle} width="480px">
	<PlannerChat {chat} {mode} {plan} />
</Drawer>
