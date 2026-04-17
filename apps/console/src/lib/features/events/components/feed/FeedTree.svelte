<script lang="ts">
  import { listTree, getEventDetail } from '../../api/activity.remote';
  import EventDetail from './FeedDetail.svelte';
  import {
    eventDotColor,
    originBadgeStyle,
    relativeTime,
    envTag,
    serviceTag,
    branchTag,
    workflowRef,
    triggerTag,
    toolTag,
    otherTags,
  } from '../../helpers';
  import TagPill from '$lib/ui/tag/TagPill.svelte';
  import { repoContext } from '$lib/features/git/context.svelte';

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
    filterTags = [],
    emptyText = 'No events',
    rootEventId,
  }: {
    filterTags?: string[];
    emptyText?: string;
    rootEventId?: string;
  } = $props();

  const { organization, repoName } = repoContext.get();

  const query = $derived(listTree({ organization, repoName, tags: filterTags, rootEventId }));

  let selectedEventId = $state<string | null>(null);
  let selectedEventData = $state<Record<string, unknown> | null>(null);
  let loadingDetail = $state(false);
  let collapsed = $state(new Set<string>());

  function toggleCollapse(e: MouseEvent, nodeId: string) {
    e.stopPropagation();
    const next = new Set(collapsed);
    if (next.has(nodeId)) next.delete(nodeId);
    else next.add(nodeId);
    collapsed = next;
  }

  async function selectEvent(node: TreeNode) {
    if (selectedEventId === node.id) {
      selectedEventId = null;
      selectedEventData = null;
      return;
    }
    selectedEventId = node.id;
    selectedEventData = null;
    loadingDetail = true;
    try {
      const detail = await getEventDetail({ eventId: node.id });
      if (selectedEventId === node.id && detail) {
        selectedEventData = detail.data;
      }
    } finally {
      loadingDetail = false;
    }
  }
</script>

{#if query.loading && !query.current}
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
{:else if query.error}
  <div class="error">
    <span class="error-text">Failed to load events</span>
    <button type="button" class="retry" onclick={() => query.refresh()}>Retry</button>
  </div>
{:else if !query.current || query.current.length === 0}
  <p class="empty">{emptyText}</p>
{:else}
  {@const roots = query.current}
    {#snippet renderNode(node: TreeNode, depth: number)}
      {@const env = envTag(node.tags)}
      {@const svc = serviceTag(node.tags)}
      {@const tool = toolTag(node.tags)}
      {@const branch = branchTag(node.tags)}
      {@const workflow = workflowRef(node.tags)}
      {@const trigger = triggerTag(node.tags)}
      {@const other = otherTags(node.tags)}
      {@const hasMeta = env || svc || tool || branch || workflow !== null || trigger || other.length > 0}
      {@const hasChildren = node.children.length > 0}
      {@const isCollapsed = collapsed.has(node.id)}
      <div class="node" style="padding-left: {depth * 16}px;">
        <div class="row-wrapper">
          {#if hasChildren}
            <button
              type="button"
              class="collapse-toggle"
              class:collapse-open={!isCollapsed}
              onclick={(e) => toggleCollapse(e, node.id)}
              aria-label={isCollapsed ? 'Expand' : 'Collapse'}
            >&#x25B6;</button>
          {:else if depth > 0}
            <span class="connector">&#x2514;</span>
          {:else}
            <span class="collapse-spacer"></span>
          {/if}
          <button
            type="button"
            class="row-btn"
            class:row-btn-selected={selectedEventId === node.id}
            onclick={() => selectEvent(node)}
          >
            <span class="dot" style="background:{eventDotColor(node.type)};"></span>
            <span class="etype" class:etype-muted={depth > 0}>{node.type}</span>
            <span class="badge" style={originBadgeStyle(node.origin)}>{node.origin}</span>
            <span class="time">{relativeTime(node.timeCreated)}</span>
          </button>
        </div>
        {#if hasMeta}
          <div class="meta" style="padding-left: {depth > 0 ? 29 : 13}px;">
            {#if env}
              <span class="meta-tag">{env}</span>
            {/if}
            {#if svc}
              <span class="meta-tag">{svc}</span>
            {/if}
            {#if tool}
              <span class="meta-tag">{tool}</span>
            {/if}
            {#if branch}
              <span class="meta-branch">&#x238B; {branch}</span>
            {/if}
            {#if workflow !== null}
              <span class="meta-dim">workflow #{workflow}</span>
            {/if}
            {#if trigger}
              <span class="meta-trigger">{trigger}</span>
            {/if}
            {#each other as tag (tag)}
              <TagPill {tag} />
            {/each}
          </div>
        {/if}
        {#if selectedEventId === node.id}
          {#if loadingDetail}
            <div class="detail-loading" style="margin-left: {depth > 0 ? 29 : 13}px;">loading...</div>
          {:else}
            <EventDetail
              event={{
                id: node.id,
                type: node.type,
                origin: node.origin,
                tags: node.tags,
                parentEventId: node.parentEventId,
                data: selectedEventData ?? {},
                timeCreated: node.timeCreated,
              }}
              onclose={() => { selectedEventId = null; selectedEventData = null; }}
            />
          {/if}
        {/if}
        {#if hasChildren && !isCollapsed}
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

<style>
  .empty { font-size: 12px; color: var(--color-dim); margin: 8px 0 0; }

  .tree { display: flex; flex-direction: column; gap: 1px; margin-top: 4px; }

  .node { display: flex; flex-direction: column; }

  .row-wrapper {
    display: flex;
    align-items: center;
    gap: 0;
  }

  .collapse-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    padding: 0;
    background: none;
    border: none;
    cursor: pointer;
    color: var(--color-dim);
    font-size: 8px;
    flex-shrink: 0;
    transition: transform 0.15s ease, color 0.1s;
    border-radius: 2px;
  }
  .collapse-toggle:hover { color: var(--color-text); background: color-mix(in srgb, var(--color-text) 6%, transparent); }
  .collapse-open { transform: rotate(90deg); }

  .collapse-spacer { width: 16px; flex-shrink: 0; }

  .row-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
    min-width: 0;
    width: 100%;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
  }
  .row-btn:hover { background: color-mix(in srgb, var(--color-text) 3%, transparent); border-radius: 2px; }
  .row-btn-selected { background: color-mix(in srgb, var(--color-accent) 4%, transparent); border-radius: 2px; }

  .connector { font-family: "JetBrains Mono", monospace; font-size: 11px; color: var(--color-border); flex-shrink: 0; margin-right: -4px; }

  .dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }

  .etype { font-family: "JetBrains Mono", monospace; font-size: 12px; color: var(--color-text); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .etype-muted { color: var(--color-muted); font-size: 11px; }

  .badge { font-family: "JetBrains Mono", monospace; font-size: 10px; padding: 1px 5px; border-radius: 3px; flex-shrink: 0; line-height: 1.6; }

  .time { font-size: 11px; color: var(--color-dim); flex-shrink: 0; font-variant-numeric: tabular-nums; }

  .meta { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; padding-bottom: 4px; min-width: 0; }

  .meta-tag { font-family: "JetBrains Mono", monospace; font-size: 10px; padding: 0 4px; border-radius: 3px; background: var(--color-elevated); color: var(--color-muted); line-height: 1.6; }

  .meta-branch { font-family: "JetBrains Mono", monospace; font-size: 10px; color: var(--color-dim); }

  .meta-dim { font-family: "JetBrains Mono", monospace; font-size: 10px; color: var(--color-dim); }

  .meta-trigger { font-family: "JetBrains Mono", monospace; font-size: 10px; padding: 0 4px; border-radius: 3px; background: color-mix(in srgb, var(--color-warning) 10%, transparent); color: var(--color-warning); border: 1px solid color-mix(in srgb, var(--color-warning) 20%, transparent); line-height: 1.6; }

  .detail-loading { font-size: 11px; color: var(--color-dim); font-style: italic; padding: 4px 0; }

  .branch { border-left: 1px solid var(--color-border); margin-left: 6px; }

  .skeleton-row { display: flex; align-items: center; gap: 8px; padding: 4px 0; }
  .skeleton-block { background: var(--color-elevated); border-radius: 3px; animation: pulse 1.4s ease-in-out infinite; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

  .error { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: color-mix(in srgb, var(--color-danger) 8%, transparent); border: 1px solid color-mix(in srgb, var(--color-danger) 20%, transparent); border-radius: 3px; margin-top: 4px; }
  .error-text { font-size: 12px; color: var(--color-danger); flex: 1; }
  .retry { font-family: "JetBrains Mono", monospace; font-size: 11px; padding: 2px 8px; border-radius: 3px; border: 1px solid color-mix(in srgb, var(--color-danger) 30%, transparent); background: none; color: var(--color-danger); cursor: pointer; }
</style>
