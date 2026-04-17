<script lang="ts">
	import { Chat } from '@ai-sdk/svelte';
	import {
		DefaultChatTransport,
		isToolUIPart,
		getToolName,
		lastAssistantMessageIsCompleteWithApprovalResponses,
		lastAssistantMessageIsCompleteWithToolCalls,
		type UIMessage,
	} from 'ai';
	import Drawer from '$lib/ui/Drawer.svelte';
	import PlannerChat from './PlannerChat.svelte';

	// Auto-send the next request whenever the agent is waiting on us:
	// either after an approval response (createPlan/updatePlan) or after
	// a client-side tool output (askUser). This avoids forcing the user
	// to send an extra message just to resume generation.
	function shouldAutoSend({ messages }: { messages: UIMessage[] }) {
		return (
			lastAssistantMessageIsCompleteWithApprovalResponses({ messages }) ||
			lastAssistantMessageIsCompleteWithToolCalls({ messages })
		);
	}

	type PlanSummary = {
		id: string;
		title: string;
		status: string;
	};

	import { repoContext } from '$lib/features/git/context.svelte';

	let {
		open = $bindable(false),
		mode = 'draft',
		plan,
		onplancreated,
	}: {
		open?: boolean;
		mode?: 'draft' | 'edit';
		plan?: PlanSummary;
		onplancreated?: (plan: PlanSummary) => void;
	} = $props();

	const { provider, organization, repoName } = repoContext.get();
	const basePath = $derived(`/${provider}/${organization}/${repoName}/agents/plans`);
// TODO: remove derived by and have a pure chat insteace, (add a reactive transport? & have the plan as a separate variable || have a separate state class with inner chat state)
	const chat = $derived.by(() => {
		const body = mode === 'edit' && plan ? { planId: plan.id } : undefined;
		return new Chat({
			transport: new DefaultChatTransport({
				api: `${basePath}/planner`,
				body,
			}),
			sendAutomaticallyWhen: shouldAutoSend,
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
