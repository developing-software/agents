<script lang="ts">
  import { listTree } from './events.remote';

  type TreeNode = {
    id: string;
    type: string;
    origin: string;
    tags: string[];
    parentEventId: string | null;
    timeCreated: string;
    children: TreeNode[];
  };

  let {
    organization,
    repoName,
    filterTags = [],
    emptyText = 'No events',
  }: {
    organization: string;
    repoName: string;
    filterTags?: string[];
    emptyText?: string;
  } = $props();

  let retryCount = $state(0);

  const treePromise = $derived.by(() => {
    console.log("listTree retry: ",retryCount);
    return listTree({ organization, repoName, tags: filterTags }) as Promise<TreeNode[]>;
  });

  function retry() { retryCount += 1; }

  function eventDotColor(type: string): string {
    if (type.startsWith('implement.')) return 'var(--color-accent)';
    if (type.startsWith('github.issues.')) return 'var(--color-success)';
    if (type.startsWith('github.pull_request.')) return 'var(--color-merged)';
    if (type === 'github.push') return 'var(--color-dim)';
    return 'var(--color-warning)';
  }

  function originBadgeStyle(origin: string): string {
    switch (origin) {
      case 'action': return 'background: color-mix(in srgb, var(--color-accent) 15%, transparent); color: var(--color-accent);';
      case 'cli': return 'background: color-mix(in srgb, var(--color-warning) 12%, transparent); color: var(--color-warning);';
      case 'console': return 'background: color-mix(in srgb, var(--color-merged) 12%, transparent); color: var(--color-merged);';
      default: return 'background: var(--color-elevated); color: var(--color-muted);';
    }
  }

  function relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const secs = Math.floor(diff / 1000);
    if (secs < 60) return `${secs}s ago`;
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }
</script>

{#await treePromise}
  <div class="tree">
    {#each [1, 2, 3] as i (i)}
      <div class="skeleton-row">
        <div class="skeleton-block" style="width:5px;height:5px;border-radius:50%;"></div>
        <div class="skeleton-block" style="width:160px;height:12px;"></div>
        <div class="skeleton-block" style="width:48px;height:16px;"></div>
        <div class="skeleton-block" style="width:40px;height:11px;margin-left:auto;"></div>
      </div>
    {/each}
  </div>
{:then roots}
  {#if roots.length === 0}
    <p class="empty">{emptyText}</p>
  {:else}
    {#snippet renderNode(node: TreeNode, depth: number)}
      <div class="node" style="padding-left: {depth * 16}px;">
        <div class="row">
          {#if depth > 0}
            <span class="connector">└</span>
          {/if}
          <span class="dot" style="background:{eventDotColor(node.type)};"></span>
          <span class="etype" class:etype-muted={depth > 0}>{node.type}</span>
          <span class="badge" style={originBadgeStyle(node.origin)}>{node.origin}</span>
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
    <span class="error-text">Failed to load events</span>
    <button type="button" class="retry" onclick={retry}>Retry</button>
  </div>
{/await}

<style>
  .empty { font-size: 12px; color: var(--color-dim); margin: 8px 0 0; }

  .tree { display: flex; flex-direction: column; gap: 1px; margin-top: 4px; }

  .node { display: flex; flex-direction: column; }

  .row { display: flex; align-items: center; gap: 8px; padding: 4px 0; min-width: 0; }

  .connector { font-family: "JetBrains Mono", monospace; font-size: 11px; color: var(--color-border); flex-shrink: 0; margin-right: -4px; }

  .dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }

  .etype { font-family: "JetBrains Mono", monospace; font-size: 12px; color: var(--color-text); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .etype-muted { color: var(--color-muted); font-size: 11px; }

  .badge { font-family: "JetBrains Mono", monospace; font-size: 10px; padding: 1px 5px; border-radius: 3px; flex-shrink: 0; line-height: 1.6; }

  .time { font-size: 11px; color: var(--color-dim); flex-shrink: 0; font-variant-numeric: tabular-nums; }

  .branch { border-left: 1px solid var(--color-border); margin-left: 6px; }

  .skeleton-row { display: flex; align-items: center; gap: 8px; padding: 4px 0; }
  .skeleton-block { background: var(--color-elevated); border-radius: 3px; animation: pulse 1.4s ease-in-out infinite; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

  .error { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: color-mix(in srgb, var(--color-danger) 8%, transparent); border: 1px solid color-mix(in srgb, var(--color-danger) 20%, transparent); border-radius: 3px; margin-top: 4px; }
  .error-text { font-size: 12px; color: var(--color-danger); flex: 1; }
  .retry { font-family: "JetBrains Mono", monospace; font-size: 11px; padding: 2px 8px; border-radius: 3px; border: 1px solid color-mix(in srgb, var(--color-danger) 30%, transparent); background: none; color: var(--color-danger); cursor: pointer; }
</style>
