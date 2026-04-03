<script lang="ts">
  import { listEvents } from './events.remote';
  import EventDetail from './EventDetail.svelte';
  import {
    eventDotColor,
    originBadgeStyle,
    relativeTime,
    typePrefix,
    issueRef,
    prRef,
    envTag,
    serviceTag,
    branchTag,
    runRef,
    otherTags,
    extractMetrics,
    formatMetricValue,
  } from './event-helpers';
  import TagPill from '$lib/ui/tag/TagPill.svelte';

  type EventItem = {
    id: string;
    type: string;
    origin: string;
    tags: string[];
    parentEventId: string | null;
    data: Record<string, unknown>;
    timeCreated: string;
  };

  let {
    organization,
    repoName,
    filterTags = [],
    compact = false,
    emptyText = 'No events',
  }: {
    organization: string;
    repoName: string;
    filterTags?: string[];
    compact?: boolean;
    emptyText?: string;
  } = $props();

  let retryCount = $state(0);

  const eventsPromise = $derived.by(() => {
    void retryCount;
    return listEvents({ organization, repoName, tags: filterTags }) as Promise<EventItem[]>;
  });

  function retry() { retryCount += 1; }

  let activeFilter = $state('all');
  let selectedEventId = $state<string | null>(null);
</script>

{#await eventsPromise}
  <div class="timeline">
    {#each [1, 2, 3] as i (i)}
      <div class="skeleton-row">
        <div class="skeleton-block" style="width:5px;height:5px;border-radius:50%;"></div>
        <div class="skeleton-block" style="width:140px;height:12px;"></div>
        <div class="skeleton-block" style="width:48px;height:16px;"></div>
        <div class="skeleton-block" style="width:40px;height:11px;margin-left:auto;"></div>
      </div>
    {/each}
  </div>
{:then events}
  {#if events.length === 0}
    <p class="empty">{emptyText}</p>
  {:else}
    {@const topLevel = events.filter((e) => !e.parentEventId)}
    {@const byParent = events.reduce((acc, e) => {
      if (e.parentEventId) (acc[e.parentEventId] ??= []).push(e);
      return acc;
    }, {} as Record<string, EventItem[]>)}
    {@const prefixes = (() => {
      const seen = new Set<string>();
      const out: string[] = [];
      for (const e of topLevel) {
        const p = typePrefix(e.type);
        if (!seen.has(p)) { seen.add(p); out.push(p); }
      }
      return out;
    })()}
    {@const visible = activeFilter === 'all' ? topLevel : topLevel.filter((e) => typePrefix(e.type) === activeFilter)}

    {#if !compact && prefixes.length > 1}
      <div class="filter-tabs">
        <button type="button" class="tab" class:tab-active={activeFilter === 'all'} onclick={() => { activeFilter = 'all'; }}>all</button>
        {#each prefixes as p (p)}
          <button type="button" class="tab" class:tab-active={activeFilter === p} onclick={() => { activeFilter = p; }}>{p}</button>
        {/each}
      </div>
    {/if}

    <div class="timeline">
      {#each visible as ev (ev.id)}
        {@const children = byParent[ev.id] ?? []}

        {#snippet row(e: EventItem, child: boolean)}
          {@const issue = issueRef(e.tags)}
          {@const pr = prRef(e.tags)}
          {@const env = envTag(e.tags)}
          {@const svc = serviceTag(e.tags)}
          {@const branch = branchTag(e.tags)}
          {@const run = runRef(e.tags)}
          {@const other = otherTags(e.tags)}
          {@const mets = extractMetrics(e.data)}
          {@const hasMeta = mets || env || svc || branch || run !== null || other.length > 0}
          <div
            class="event-item"
            class:event-item-child={child}
            class:event-item-selected={selectedEventId === e.id}
          >
            <button
              type="button"
              class="row-btn"
              onclick={() => { selectedEventId = selectedEventId === e.id ? null : e.id; }}
            >
              <span class="dot" style="background:{eventDotColor(e.type)};opacity:{child ? 0.6 : 1};"></span>
              <span class="etype" class:etype-muted={child}>{e.type}</span>
              <span class="badge" style={originBadgeStyle(e.origin)}>{e.origin}</span>
              {#if issue}
                <a href="/gh/{organization}/{repoName}/issues/{issue}" class="ref ref-issue" onclick={(ev) => ev.stopPropagation()}>#{issue}</a>
              {:else if pr}
                <a href="/gh/{organization}/{repoName}/pulls/{pr}" class="ref ref-pr" onclick={(ev) => ev.stopPropagation()}>#{pr}</a>
              {/if}
              <span class="time">{relativeTime(e.timeCreated)}</span>
            </button>
            {#if hasMeta}
              <div class="meta">
                {#if env}
                  <span class="meta-tag">{env}</span>
                {/if}
                {#if svc}
                  <span class="meta-tag">{svc}</span>
                {/if}
                {#if branch}
                  <span class="meta-branch">⎇ {branch}</span>
                {/if}
                {#if run !== null}
                  <span class="meta-dim">run #{run}</span>
                {/if}
                {#if mets}
                  {#if mets.model}
                    <span class="meta-metric"><span class="meta-metric-name">model</span><span class="meta-metric-sep">:</span><span class="meta-metric-val">{mets.model}</span></span>
                  {/if}
                  {#if mets.cost_usd !== null}
                    <span class="meta-metric"><span class="meta-metric-name">cost</span><span class="meta-metric-sep">:</span><span class="meta-metric-val">{formatMetricValue('cost_usd', mets.cost_usd)}</span></span>
                  {/if}
                  {#if mets.turns !== null}
                    <span class="meta-metric"><span class="meta-metric-name">turns</span><span class="meta-metric-sep">:</span><span class="meta-metric-val">{mets.turns}</span></span>
                  {/if}
                  {#if mets.tokens.input !== null}
                    <span class="meta-metric"><span class="meta-metric-name">in</span><span class="meta-metric-sep">:</span><span class="meta-metric-val">{formatMetricValue('tokens', mets.tokens.input)}</span></span>
                  {/if}
                  {#if mets.tokens.output !== null}
                    <span class="meta-metric"><span class="meta-metric-name">out</span><span class="meta-metric-sep">:</span><span class="meta-metric-val">{formatMetricValue('tokens', mets.tokens.output)}</span></span>
                  {/if}
                {/if}
                {#each other as tag (tag)}
                  <TagPill {tag} />
                {/each}
              </div>
            {/if}
          </div>
          {#if selectedEventId === e.id}
            <EventDetail event={e} {organization} {repoName} onclose={() => { selectedEventId = null; }} />
          {/if}
        {/snippet}

        {@render row(ev, false)}

        {#if children.length > 0}
          <div class="children">
            {#each children as child (child.id)}
              {@render row(child, true)}
            {/each}
          </div>
        {/if}
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

  .filter-tabs { display: flex; flex-wrap: wrap; gap: 3px; margin-bottom: 6px; }

  .tab {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 3px;
    border: 1px solid var(--color-border);
    background: none;
    color: var(--color-dim);
    cursor: pointer;
    line-height: 1.6;
    transition: color 0.1s, border-color 0.1s, background 0.1s;
  }
  .tab:hover { color: var(--color-muted); }
  .tab-active { background: color-mix(in srgb, var(--color-accent) 12%, transparent); color: var(--color-accent); border-color: color-mix(in srgb, var(--color-accent) 35%, transparent); }
  .tab-active:hover { color: var(--color-accent); }

  .timeline { display: flex; flex-direction: column; gap: 1px; margin-top: 4px; }

  .event-item { display: flex; flex-direction: column; }
  .event-item-child { padding-left: 16px; }
  .event-item-selected { background: color-mix(in srgb, var(--color-accent) 4%, transparent); border-radius: 3px; }

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

  .dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }

  .etype { font-family: "JetBrains Mono", monospace; font-size: 12px; color: var(--color-text); flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .etype-muted { color: var(--color-muted); }

  .badge { font-family: "JetBrains Mono", monospace; font-size: 10px; padding: 1px 5px; border-radius: 3px; flex-shrink: 0; line-height: 1.6; }

  .ref { font-family: "JetBrains Mono", monospace; font-size: 11px; text-decoration: none; flex-shrink: 0; }
  .ref:hover { text-decoration: underline; }
  .ref-issue { color: var(--color-success); }
  .ref-pr { color: var(--color-merged); }

  .time { font-size: 11px; color: var(--color-dim); flex-shrink: 0; font-variant-numeric: tabular-nums; }

  .meta { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; padding: 0 0 4px 13px; min-width: 0; }

  .meta-tag { font-family: "JetBrains Mono", monospace; font-size: 10px; padding: 0 4px; border-radius: 3px; background: var(--color-elevated); color: var(--color-muted); line-height: 1.6; }

  .meta-branch { font-family: "JetBrains Mono", monospace; font-size: 10px; color: var(--color-dim); }

  .meta-dim { font-family: "JetBrains Mono", monospace; font-size: 10px; color: var(--color-dim); }

  .meta-metric { display: inline-flex; align-items: center; font-family: "JetBrains Mono", monospace; font-size: 10px; gap: 1px; }
  .meta-metric-name { color: var(--color-muted); }
  .meta-metric-sep { color: var(--color-dim); }
  .meta-metric-val { color: var(--color-accent); }


  .children { border-left: 1px solid var(--color-border); margin-left: 2px; }

  .skeleton-row { display: flex; align-items: center; gap: 8px; padding: 4px 0; }
  .skeleton-block { background: var(--color-elevated); border-radius: 3px; animation: pulse 1.4s ease-in-out infinite; }
  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

  .error { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: color-mix(in srgb, var(--color-danger) 8%, transparent); border: 1px solid color-mix(in srgb, var(--color-danger) 20%, transparent); border-radius: 3px; margin-top: 4px; }
  .error-text { font-size: 12px; color: var(--color-danger); flex: 1; }
  .retry { font-family: "JetBrains Mono", monospace; font-size: 11px; padding: 2px 8px; border-radius: 3px; border: 1px solid color-mix(in srgb, var(--color-danger) 30%, transparent); background: none; color: var(--color-danger); cursor: pointer; }
</style>
