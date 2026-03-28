<script lang="ts">
  import { listEvents } from './events.remote';

  type EventItem = {
    id: string;
    type: string;
    origin: string;
    tags: string[];
    parentEventId: string | null;
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
    retryCount;
    return listEvents({ organization, repoName, tags: filterTags }) as Promise<EventItem[]>;
  });

  function retry() { retryCount += 1; }

  let activeFilter = $state('all');

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

  function typePrefix(type: string): string {
    const dot = type.indexOf('.');
    return dot === -1 ? type : type.slice(0, dot);
  }

  function issueRef(tags: string[]): number | null {
    const t = tags.find((t) => t.startsWith('gh:issue:'));
    return t ? parseInt(t.slice('gh:issue:'.length)) : null;
  }

  function prRef(tags: string[]): number | null {
    const t = tags.find((t) => t.startsWith('gh:pr:'));
    return t ? parseInt(t.slice('gh:pr:'.length)) : null;
  }

  function metrics(tags: string[]): { name: string; value: string }[] {
    return tags
      .filter((t) => t.startsWith('metric:'))
      .map((t) => {
        const rest = t.slice('metric:'.length);
        const sep = rest.indexOf(':');
        return sep === -1
          ? { name: rest, value: '' }
          : { name: rest.slice(0, sep), value: rest.slice(sep + 1) };
      });
  }

  function envTag(tags: string[]): string | null {
    const t = tags.find((t) => t.startsWith('env:'));
    return t ? t.slice('env:'.length) : null;
  }

  function serviceTag(tags: string[]): string | null {
    const t = tags.find((t) => t.startsWith('service:'));
    return t ? t.slice('service:'.length) : null;
  }

  function branchTag(tags: string[]): string | null {
    const t = tags.find((t) => t.startsWith('gh:branch:'));
    return t ? t.slice('gh:branch:'.length) : null;
  }

  function runRef(tags: string[]): number | null {
    const t = tags.find((t) => t.startsWith('gh:run:'));
    return t ? parseInt(t.slice('gh:run:'.length)) : null;
  }
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
          {@const mets = metrics(e.tags)}
          {@const env = envTag(e.tags)}
          {@const svc = serviceTag(e.tags)}
          {@const branch = branchTag(e.tags)}
          {@const run = runRef(e.tags)}
          {@const hasMeta = mets.length > 0 || env || svc || branch || run !== null}
          <div class="event-item" class:event-item-child={child}>
            <div class="row">
              <span class="dot" style="background:{eventDotColor(e.type)};opacity:{child ? 0.6 : 1};"></span>
              <span class="etype" class:etype-muted={child}>{e.type}</span>
              <span class="badge" style={originBadgeStyle(e.origin)}>{e.origin}</span>
              {#if issue}
                <a href="/gh/{organization}/{repoName}/issues/{issue}" class="ref ref-issue">#{issue}</a>
              {:else if pr}
                <a href="/gh/{organization}/{repoName}/pulls/{pr}" class="ref ref-pr">#{pr}</a>
              {/if}
              <span class="time">{relativeTime(e.timeCreated)}</span>
            </div>
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
                {#each mets as m (m.name)}
                  <span class="meta-metric"><span class="meta-metric-name">{m.name}</span>{#if m.value}<span class="meta-metric-sep">:</span><span class="meta-metric-val">{m.value}</span>{/if}</span>
                {/each}
              </div>
            {/if}
          </div>
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

  .row { display: flex; align-items: center; gap: 8px; padding: 4px 0; min-width: 0; }

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
