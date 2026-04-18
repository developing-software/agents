<script lang="ts">
  import QueryLoader from '$lib/ui/QueryLoader.svelte';
  import { listTree } from '$lib/features/events/api/activity.remote';
  import { relativeTime } from '$lib/features/agents/plans/plan-helpers';
  import { repoContext } from '$lib/features/git/context.svelte';
  import { Tags } from '@agents/core/events/tag';

  type TreeNode = {
    id: string;
    type: string;
    origin: string;
    tags: string[];
    data: Record<string, unknown>;
    parentEventId: string | null;
    timeCreated: string;
    children: TreeNode[];
  };

  const repo = repoContext.get();

  const treeQuery = $derived(listTree({ organization: repo.organization, repoName: repo.repoName, tags: [] }));

  function extractPrFromTags(tags: string[]): string | null {
    const pr = Tags.Git.find(tags, 'pr');
    return pr ? String(pr.number) : null;
  }

  function extractStatus(node: TreeNode): string | null {
    if (node.type === 'plan' && typeof node.data?.status === 'string') return node.data.status;
    return null;
  }

  function extractTitle(node: TreeNode): string | null {
    if (node.type === 'plan' && typeof node.data?.title === 'string') return node.data.title;
    return null;
  }

  function hasTypePlan(node: TreeNode): boolean {
    if (node.type === 'plan') return true;
    return node.children.some(hasTypePlan);
  }

  function dotColor(type: string): string {
    switch (type) {
      case 'plan':
        return 'var(--color-accent)';
      case 'agent':
        return 'var(--color-success)';
      default:
        return 'var(--color-dim)';
    }
  }

  function statusPillStyle(status: string): string {
    let color: string;
    switch (status) {
      case 'draft':
        color = 'var(--color-dim)';
        break;
      case 'review':
        color = 'var(--color-warning)';
        break;
      case 'approved':
      case 'implementing':
        color = 'var(--color-accent)';
        break;
      case 'completed':
        color = 'var(--color-success)';
        break;
      case 'rejected':
        color = 'var(--color-danger)';
        break;
      default:
        color = 'var(--color-dim)';
    }
    return `background: color-mix(in srgb, ${color} 12%, transparent); color: ${color}; border: 1px solid color-mix(in srgb, ${color} 25%, transparent);`;
  }


</script>

<QueryLoader query={treeQuery}>
  {#snippet empty()}
    <p class="empty">No plan trees</p>
  {/snippet}
  {#snippet children(allNodes)}
    {@const roots = allNodes.filter(hasTypePlan)}
    {#if roots.length === 0}
      <p class="empty">No plan trees</p>
    {:else}
    {#snippet renderNode(node: TreeNode, depth: number)}
      {@const isPlan = node.type === 'plan'}
      {@const isAgentCompleted = node.type === 'agent'}
      {@const status = extractStatus(node)}
      {@const title = extractTitle(node)}
      {@const pr = isAgentCompleted ? extractPrFromTags(node.tags) : null}
      <div class="node" style="padding-left: {depth * 16}px;">
        <div class="row" class:row-highlight={isPlan}>
          {#if depth > 0}
            <span class="connector">&#x2514;</span>
          {/if}
          <span class="dot" style="background:{dotColor(node.type)};"></span>
          {#if isPlan && title}
            <a href="/{repo.provider}/{repo.organization}/{repo.repoName}/agents/plans/{node.id}" class="etype etype-accent plan-link">{title}</a>
          {:else}
            <span class="etype" class:etype-accent={isPlan} class:etype-muted={!isPlan && depth > 0}>{node.type}</span>
          {/if}
          {#if status}
            <span class="pill" style={statusPillStyle(status)}>{status}</span>
          {/if}
          {#if pr}
            <span class="pr-badge">PR #{pr}</span>
          {/if}
          <span class="time">{relativeTime(node.timeCreated)}</span>
        </div>
        {#if node.children.length > 0}
          <div class="branch">
            {#each node.children as child (child.id)}
              {@render renderNode(child, depth + 1)}
            {/each}
          </div>
        {/if}
      </div>
    {/snippet}

    <div class="tree">
      {#each roots as root (root.id)}
        {@render renderNode(root, 0)}
      {/each}
    </div>
    {/if}
  {/snippet}
</QueryLoader>

<style>
  .empty { font-size: 12px; color: var(--color-dim); margin: 8px 0 0; }

  .tree { display: flex; flex-direction: column; gap: 1px; margin-top: 4px; }

  .node { display: flex; flex-direction: column; }

  .row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
    min-width: 0;
  }
  .row-highlight {
    background: color-mix(in srgb, var(--color-accent) 4%, transparent);
    border-radius: 2px;
    padding: 4px 6px;
  }

  .connector { font-family: "JetBrains Mono", monospace; font-size: 11px; color: var(--color-border); flex-shrink: 0; margin-right: -4px; }

  .dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }

  .etype { font-family: "JetBrains Mono", monospace; font-size: 12px; color: var(--color-text); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .etype-accent { color: var(--color-accent); font-weight: 600; }
  .etype-muted { color: var(--color-muted); font-size: 11px; }
  .plan-link { text-decoration: none; }
  .plan-link:hover { text-decoration: underline; }

  .pill { font-family: "JetBrains Mono", monospace; font-size: 10px; padding: 0 5px; border-radius: 3px; flex-shrink: 0; line-height: 1.6; white-space: nowrap; }

  .pr-badge { font-family: "JetBrains Mono", monospace; font-size: 10px; padding: 0 5px; border-radius: 3px; flex-shrink: 0; line-height: 1.6; background: color-mix(in srgb, var(--color-success) 12%, transparent); color: var(--color-success); border: 1px solid color-mix(in srgb, var(--color-success) 25%, transparent); white-space: nowrap; }

  .time { font-size: 11px; color: var(--color-dim); flex-shrink: 0; font-variant-numeric: tabular-nums; margin-left: auto; }

  .branch { border-left: 1px solid var(--color-border); margin-left: 6px; }

</style>
