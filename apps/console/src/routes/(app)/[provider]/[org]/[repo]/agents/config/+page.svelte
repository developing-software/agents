<script lang="ts">
  import type { PageProps } from './$types';
  import ConfigPairsTable from '$lib/features/agents/config/ConfigPairsTable.svelte';
  import AgentConfigPairEditor from '$lib/features/agents/config/AgentConfigPairEditor.svelte';
  import GenerateClaudeModal from '$lib/features/agents/config/GenerateClaudeModal.svelte';

  let { data }: PageProps = $props();

  let editor = $state<AgentConfigPairEditor>();
  let generator = $state<GenerateClaudeModal>();
</script>

<svelte:head>
  <title>Config — {data.organization}/{data.repoName}</title>
</svelte:head>

<section class="page-header">
  <h2 class="section-heading">Agent Configuration</h2>
  <p class="intro-copy">
    Review repo-scoped <span class="mono">AGENTS.md</span> and <span class="mono">CLAUDE.md</span> pairs, collapse symlinked copies to their original source, and edit both files without leaving the page.
  </p>
</section>

<ConfigPairsTable
  pairs={data.configPairs}
  provider={data.provider}
  organization={data.organization}
  repoName={data.repoName}
  defaultBranch={data.defaultBranch ?? 'main'}
  onedit={(pair) => editor?.open(pair)}
  ongenerate={(pair) => generator?.open(pair)}
/>

<AgentConfigPairEditor
  bind:this={editor}
  organization={data.organization}
  repoName={data.repoName}
/>

<GenerateClaudeModal
  bind:this={generator}
  organization={data.organization}
  repoName={data.repoName}
/>

<style>
  .page-header {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 12px;
  }

  .intro-copy {
    margin: 0;
    color: var(--color-dim);
    line-height: 1.5;
    max-width: 860px;
  }
</style>
