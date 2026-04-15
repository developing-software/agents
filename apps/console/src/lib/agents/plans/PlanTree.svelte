<script lang="ts">
  import { listTree } from '$lib/events/repository/repository.remote';
  import { relativeTime } from '$lib/agents/plans/plan-helpers';

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

  let {
    organization,
    repoName,
  }: {
    organization: string;
    repoName: string;
  } = $props();

  let retryCount = $state(0);

  function extractPrFromTags(tags: string[]): string | null {
    for (const tag of tags) {
      const match = tag.match(/^gh:pr:(\d+)$/);
      if (match) return match[1];
    }
    return null;
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

  const treePromise = $derived.by(() => {
    void retryCount;
    return (listTree({ organization, repoName, tags: [] }) as Promise<TreeNode[]>).then(
      (roots) => roots.filter(hasTypePlan)
    );
  });

  function retry() {
    retryCount += 1;
  }
</script>

{#await treePromise}
  <div class="tree">
    {#each [1, 2, 3] as i (i)}
      <div class="skeleton-row">
        <div class="skeleton-block" style="width:5px;height:5px;border-radius:50%;"></div>
        <div class="skeleton-block" style="width:140px;height:12px;"></div>
        <div class="skeleton-block" style="width:52px;height:16px;"></div>
        <div class="skeleton-block" style="width:40px;height:11px;margin-left:auto;"></div>
      </div>
    {/each}
  </div>
{:then roots}
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
            <a href="/gh/{organization}/{repoName}/agents/plans/{node.id}" class="etype etype-accent plan-link">{title}</a>
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
{:catch}
  <div class="error">
    <span class="error-text">Failed to load plan tree</span>
    <button type="button" class="retry" onclick={retry}>Retry</button>
  </div>
{/await}

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

  .skeleton-row { display: flex; align-items: center; gap: 8px; padding: 4px 0; }
  .skeleton-block { background: var(--color-elevated); border-radius: 3px; animation: pulse 1.4s ease-in-out infinite; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

  .error { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: color-mix(in srgb, var(--color-danger) 8%, transparent); border: 1px solid color-mix(in srgb, var(--color-danger) 20%, transparent); border-radius: 3px; margin-top: 4px; }
  .error-text { font-size: 12px; color: var(--color-danger); flex: 1; }
  .retry { font-family: "JetBrains Mono", monospace; font-size: 11px; padding: 2px 8px; border-radius: 3px; border: 1px solid color-mix(in srgb, var(--color-danger) 30%, transparent); background: none; color: var(--color-danger); cursor: pointer; }
</style>
