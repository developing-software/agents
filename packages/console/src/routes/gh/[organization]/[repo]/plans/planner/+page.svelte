<script lang="ts">
  import { Chat } from '@ai-sdk/svelte';
  import { DefaultChatTransport, isToolUIPart, getToolName } from 'ai';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import PlannerChat from '$lib/planner/PlannerChat.svelte';

  const { organization, repo } = page.params;
  const basePath = `/gh/${organization}/${repo}/plans`;

  let navigated = false;

  const chat = new Chat({
    transport: new DefaultChatTransport({ api: `${basePath}/planner` }),
    onFinish({ message }) {
      if (navigated) return;
      for (const part of message.parts) {
        if (
          isToolUIPart(part) &&
          getToolName(part) === 'createPlan' &&
          part.state === 'output-available' &&
          part.output
        ) {
          const output = part.output as Record<string, unknown>;
          if (typeof output.id === 'string') {
            navigated = true;
            goto(`${basePath}/${output.id}/planner`);
            return;
          }
        }
      }
    },
  });
</script>

<div class="planner-page">
  <PlannerChat {chat} mode="draft" />
</div>

<style>
  .planner-page {
    height: calc(100vh - 38px - 32px - 40px);
    margin: -20px -24px;
    display: flex;
    flex-direction: column;
  }
</style>
