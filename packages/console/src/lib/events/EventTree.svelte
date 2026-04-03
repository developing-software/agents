<script lang="ts">
  import { listTree, getEventDetail } from './events.remote';
  import EventDetail from './EventDetail.svelte';
  import {
    eventDotColor,
    originBadgeStyle,
    relativeTime,
    envTag,
    serviceTag,
    branchTag,
    workflowRef,
    otherTags,
  } from './event-helpers';
  import TagPill from '$lib/ui/tag/TagPill.svelte';

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
    void retryCount;
    return listTree({ organization, repoName, tags: filterTags }) as Promise<TreeNode[]>;
  });

  function retry() { retryCount += 1; }

  let selectedEventId = $state<string | null>(null);
  let selectedEventData = $state<Record<string, unknown> | null>(null);
  let loadingDetail = $state(false);

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
      {@const env = envTag(node.tags)}
      {@const svc = serviceTag(node.tags)}
      {@const branch = branchTag(node.tags)}
      {@const workflow = workflowRef(node.tags)}
      {@const other = otherTags(node.tags)}
      {@const hasMeta = env || svc || branch || workflow !== null || other.length > 0}
      <div class="node" style="padding-left: {depth * 16}px;">
        <button
          type="button"
          class="row-btn"
          class:row-btn-selected={selectedEventId === node.id}
          onclick={() => selectEvent(node)}
        >
          {#if depth > 0}
            <span class="connector">&#x2514;</span>
          {/if}
          <span class="dot" style="background:{eventDotColor(node.type)};"></span>
          <span class="etype" class:etype-muted={depth > 0}>{node.type}</span>
          <span class="badge" style={originBadgeStyle(node.origin)}>{node.origin}</span>
          <span class="time">{relativeTime(node.timeCreated)}</span>
        </button>
        {#if hasMeta}
          <div class="meta" style="padding-left: {depth > 0 ? 29 : 13}px;">
            {#if env}
              <span class="meta-tag">{env}</span>
            {/if}
            {#if svc}
              <span class="meta-tag">{svc}</span>
            {/if}
            {#if branch}
              <span class="meta-branch">&#x238B; {branch}</span>
            {/if}
            {#if workflow !== null}
              <span class="meta-dim">workflow #{workflow}</span>
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
              {organization}
              {repoName}
              onclose={() => { selectedEventId = null; selectedEventData = null; }}
            />
          {/if}
        {/if}
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

  .detail-loading { font-size: 11px; color: var(--color-dim); font-style: italic; padding: 4px 0; }

  .branch { border-left: 1px solid var(--color-border); margin-left: 6px; }

  .skeleton-row { display: flex; align-items: center; gap: 8px; padding: 4px 0; }
  .skeleton-block { background: var(--color-elevated); border-radius: 3px; animation: pulse 1.4s ease-in-out infinite; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

  .error { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: color-mix(in srgb, var(--color-danger) 8%, transparent); border: 1px solid color-mix(in srgb, var(--color-danger) 20%, transparent); border-radius: 3px; margin-top: 4px; }
  .error-text { font-size: 12px; color: var(--color-danger); flex: 1; }
  .retry { font-family: "JetBrains Mono", monospace; font-size: 11px; padding: 2px 8px; border-radius: 3px; border: 1px solid color-mix(in srgb, var(--color-danger) 30%, transparent); background: none; color: var(--color-danger); cursor: pointer; }
</style>
