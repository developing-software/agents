<script lang="ts">
  import type { PageProps } from './$types';
  import { Chat } from '@ai-sdk/svelte';
  import { DefaultChatTransport } from 'ai';
  import PlannerChat from '$lib/planner/PlannerChat.svelte';

  let { data }: PageProps = $props();

  const chat = $derived.by(() => {
    const basePath = `/gh/${data.organization}/${data.repoName}/plans`;
    return new Chat({
      transport: new DefaultChatTransport({
        api: `${basePath}/planner`,
        body: { planId: data.plan.id },
      }),
    });
  });
</script>

<div class="planner-page">
  <PlannerChat
    {chat}
    mode="edit"
    plan={{ id: data.plan.id, title: data.plan.title, status: data.plan.status }}
  />
</div>

<style>
  .planner-page {
    height: calc(100vh - 38px - 32px - 40px);
    margin: -20px -24px;
    display: flex;
    flex-direction: column;
  }
</style>
