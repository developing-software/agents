<script lang="ts">
  import type { PageProps } from './$types';
  import { Chat } from '@ai-sdk/svelte';
  import PlannerChat from '$lib/planner/PlannerChat.svelte';

  let { data }: PageProps = $props();

  const chat = new Chat({
    api: `/gh/${data.organization}/${data.repoName}/planner`,
  });
</script>

<PlannerChat {chat} organization={data.organization} repoName={data.repoName} />
