<script lang="ts">
  import type { PageProps } from './$types';
  import GitHubLink from '$lib/GitHubLink.svelte';
  import ArtifactViewer from '$lib/ArtifactViewer.svelte';
  import { SvelteSet } from 'svelte/reactivity';

  let { data }: PageProps = $props();

  let filter = $state<'all' | 'open' | 'closed' | 'merged'>('open');

  const filtered = $derived(
    filter === 'all' ? data.pulls : data.pulls.filter((p) => p.state === filter)
  );

  function stateColor(state: string): string {
    if (state === 'open') return 'var(--color-success)';
    if (state === 'merged') return 'var(--color-merged)';
    return 'var(--color-danger)';
  }

  function stateDotStyle(state: string): string {
    const color = stateColor(state);
    const glow = state === 'open' ? `box-shadow: 0 0 5px ${color};` : '';
    return `background: ${color}; ${glow}`;
  }

  function stateTextStyle(state: string): string {
    if (state === 'open') return 'color: var(--color-success);';
    if (state === 'merged') return 'color: var(--color-merged);';
    return 'color: var(--color-danger);';
  }

  const filterOptions = [
    { value: 'all', label: 'All' },
    { value: 'open', label: 'Open' },
    { value: 'merged', label: 'Merged' },
    { value: 'closed', label: 'Closed' },
  ] as const;

  let expandedPRs = new SvelteSet<number>();
  let expandedEvents = new SvelteSet<string>();
  let expandedArtifacts = new SvelteSet<string>();

  function togglePR(prNumber: number) {
    if (expandedPRs.has(prNumber)) {
      expandedPRs.delete(prNumber);
    } else {
      expandedPRs.add(prNumber);
    }
  }

  function toggleEvent(eventId: string) {
    if (expandedEvents.has(eventId)) {
      expandedEvents.delete(eventId);
    } else {
      expandedEvents.add(eventId);
    }
  }

  function toggleArtifact(eventId: string, artifactName: string) {
    const key = `${eventId}/${artifactName}`;
    if (expandedArtifacts.has(key)) {
      expandedArtifacts.delete(key);
    } else {
      expandedArtifacts.add(key);
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

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
</script>

<div>
  <!-- Header -->
  <div class="mb-4 flex items-center justify-between">
    <span class="text-sm font-medium" style="color: var(--color-text);">Pull Requests</span>

    <!-- Filter pill tabs -->
    <div
      class="flex gap-px overflow-hidden rounded border p-px"
      style="background: var(--color-elevated); border-color: var(--color-border);"
    >
      {#each filterOptions as opt (opt.value)}
        <button
          onclick={() => (filter = opt.value)}
          class="rounded px-2.5 py-1 font-mono text-xs transition-colors"
          style={filter === opt.value
            ? 'background: var(--color-accent); color: #fff;'
            : 'background: transparent; color: var(--color-dim);'}
          onmouseenter={filter !== opt.value
            ? (e) => ((e.currentTarget as HTMLElement).style.color = 'var(--color-muted)')
            : undefined}
          onmouseleave={filter !== opt.value
            ? (e) => ((e.currentTarget as HTMLElement).style.color = 'var(--color-dim)')
            : undefined}
        >
          {opt.label}
        </button>
      {/each}
    </div>
  </div>

  <!-- Pull request list -->
  {#if filtered.length === 0}
    <div
      class="flex items-center justify-center py-10 text-xs"
      style="color: var(--color-muted); border: 1px solid var(--color-border); border-radius: 4px;"
    >
      No {filter === 'all' ? '' : filter} pull requests found.
    </div>
  {:else}
    <div
      class="overflow-hidden rounded"
      style="border: 1px solid var(--color-border); background: var(--color-surface);"
    >
      {#each filtered as pr, idx (pr.number)}
        {@const impls = data.implementsByPR[pr.number] ?? []}
        {@const hasImpls = impls.length > 0}
        {@const isExpanded = expandedPRs.has(pr.number)}

        <div style="border-top: {idx === 0 ? 'none' : '1px solid var(--color-border)'};">
          <!-- PR row -->
          <div
            class="flex items-center gap-3 px-3"
            style="height: 28px; {hasImpls ? 'cursor: pointer;' : ''}"
            onclick={hasImpls ? () => togglePR(pr.number) : undefined}
            onmouseenter={(e) => {
              if (hasImpls) (e.currentTarget as HTMLElement).style.background = 'var(--color-hover)';
            }}
            onmouseleave={(e) => {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
            }}
            role={hasImpls ? 'button' : 'listitem'}
            tabindex={hasImpls ? 0 : undefined}
            onkeydown={hasImpls ? (e) => { if (e.key === 'Enter' || e.key === ' ') togglePR(pr.number); } : undefined}
          >
            <!-- State dot -->
            <span
              class="h-1.5 w-1.5 shrink-0 rounded-full"
              style={stateDotStyle(pr.state)}
            ></span>

            <!-- Number -->
            <span
              class="shrink-0 font-mono"
              style="width: 40px; font-size: 11px; color: var(--color-dim);"
            >#{pr.number}</span>

            <!-- Title -->
            <span
              class="min-w-0 flex-1 truncate text-xs"
              style="color: var(--color-text);"
            >{pr.title}</span>

            <!-- Branch info -->
            <span
              class="shrink-0 font-mono"
              style="font-size: 11px; color: var(--color-dim); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"
            >{pr.headBranch} → {pr.baseBranch}</span>

            <!-- Impl badge -->
            {#if hasImpls}
              <span class="impl-badge shrink-0">{impls.length} impl{impls.length === 1 ? '' : 's'}</span>
            {/if}

            <!-- State text -->
            <span
              class="shrink-0 font-mono capitalize"
              style="font-size: 10px; width: 48px; text-align: right; {stateTextStyle(pr.state)}"
            >{pr.state}</span>

            <!-- Chevron -->
            {#if hasImpls}
              <span class="shrink-0 font-mono" style="font-size: 11px; color: var(--color-dim);">{isExpanded ? '▴' : '▾'}</span>
            {/if}

            <!-- GitHub link -->
            <div class="shrink-0" onclick={(e) => e.stopPropagation()} role="none">
              <GitHubLink href={pr.htmlUrl} />
            </div>
          </div>

          <!-- Expanded impl panel -->
          {#if isExpanded}
            <div class="impl-panel">
              {#each impls as event (event.id)}
                {@const isEventExpanded = expandedEvents.has(event.id)}
                <div class="impl-event">
                  <!-- Event row -->
                  <div
                    class="impl-event-row"
                    class:impl-event-row-clickable={event.artifacts.length > 0}
                    onclick={event.artifacts.length > 0 ? () => toggleEvent(event.id) : undefined}
                    role={event.artifacts.length > 0 ? 'button' : undefined}
                    tabindex={event.artifacts.length > 0 ? 0 : undefined}
                    onkeydown={event.artifacts.length > 0
                      ? (e) => { if (e.key === 'Enter' || e.key === ' ') toggleEvent(event.id); }
                      : undefined}
                  >
                    <span class="impl-dot"></span>
                    <span class="impl-type">{event.type}</span>
                    <span class="impl-time">{relativeTime(event.timeCreated)}</span>
                    {#if event.artifacts.length > 0}
                      <span class="impl-chevron">{isEventExpanded ? '▴' : '▾'}</span>
                    {/if}
                  </div>

                  <!-- Artifacts panel -->
                  {#if event.artifacts.length > 0 && isEventExpanded}
                    <div class="impl-artifacts">
                      <ul class="artifacts-list">
                        {#each event.artifacts as artifact (artifact.name)}
                          {@const artifactKey = `${event.id}/${artifact.name}`}
                          <li class="artifact-item">
                            <div class="artifact-row">
                              <button
                                type="button"
                                class="artifact-pill"
                                class:artifact-pill-active={expandedArtifacts.has(artifactKey)}
                                onclick={() => toggleArtifact(event.id, artifact.name)}
                              >
                                <span>{artifact.name}</span>
                                <span class="artifact-size">({formatBytes(artifact.size)})</span>
                              </button>
                              <a
                                href="/gh/{data.organization}/{data.repoName}/events/{event.id}/artifacts/{artifact.name}"
                                class="artifact-download"
                                title="Download {artifact.name}"
                                onclick={(e) => e.stopPropagation()}
                              >↓</a>
                            </div>
                            {#if expandedArtifacts.has(artifactKey)}
                              <ArtifactViewer
                                name={artifact.name}
                                url="/gh/{data.organization}/{data.repoName}/events/{event.id}/artifacts/{artifact.name}"
                              />
                            {/if}
                          </li>
                        {/each}
                      </ul>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .impl-badge {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 1px 5px;
    border-radius: 3px;
    background: color-mix(in srgb, var(--color-accent) 12%, transparent);
    color: var(--color-accent);
    border: 1px solid color-mix(in srgb, var(--color-accent) 30%, transparent);
    line-height: 1.6;
  }

  .impl-panel {
    background: var(--color-elevated);
    border-top: 1px solid var(--color-border);
    padding: 6px 12px 6px 20px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .impl-event {
    min-width: 0;
  }

  .impl-event-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 3px 4px;
    border-radius: 3px;
    min-width: 0;
  }

  .impl-event-row-clickable {
    cursor: pointer;
    background: none;
    border: none;
    text-align: left;
    font: inherit;
    width: 100%;
  }

  .impl-event-row-clickable:hover {
    background: var(--color-hover);
  }

  .impl-dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    flex-shrink: 0;
    background: var(--color-accent);
  }

  .impl-type {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-text);
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .impl-time {
    font-size: 11px;
    color: var(--color-dim);
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
  }

  .impl-chevron {
    font-size: 11px;
    color: var(--color-dim);
    flex-shrink: 0;
  }

  .impl-artifacts {
    padding: 4px 0 4px 10px;
  }

  .artifacts-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .artifact-item {
    min-width: 0;
  }

  .artifact-row {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .artifact-pill {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    padding: 2px 7px;
    border-radius: 3px;
    border: 1px solid var(--color-border);
    color: var(--color-text);
    background: var(--color-surface);
    cursor: pointer;
    transition: border-color 0.1s, background 0.1s;
  }

  .artifact-pill:hover {
    border-color: var(--color-border-bright, var(--color-dim));
  }

  .artifact-pill-active {
    border-color: color-mix(in srgb, var(--color-accent) 40%, transparent);
    background: color-mix(in srgb, var(--color-accent) 6%, transparent);
    color: var(--color-text);
  }

  .artifact-size {
    color: var(--color-dim);
  }

  .artifact-download {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-dim);
    text-decoration: none;
    padding: 2px 5px;
    border-radius: 3px;
    border: 1px solid transparent;
    transition: color 0.1s, border-color 0.1s;
    flex-shrink: 0;
  }

  .artifact-download:hover {
    color: var(--color-muted);
    border-color: var(--color-border);
  }
</style>
