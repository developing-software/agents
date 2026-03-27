<script lang="ts">
  import type { PageProps } from './$types';
  import { generateToken } from './repo.remote';
  import GitHubLink from '$lib/GitHubLink.svelte';
  import { SvelteSet } from 'svelte/reactivity';

  let { data }: PageProps = $props();

  let token = $state<string | null>(null);
  let tokenError = $state<string | null>(null);

  async function handleGenerateToken() {
    tokenError = null;
    try {
      const result = await generateToken({});
      token = result.token;
    } catch (err) {
      tokenError = err instanceof Error ? err.message : 'Failed to generate token.';
    }
  }

  let expandedEvents = new SvelteSet<string>();

  function toggleArtifacts(eventId: string) {
    if (expandedEvents.has(eventId)) {
      expandedEvents.delete(eventId);
    } else {
      expandedEvents.add(eventId);
    }
  }

  function eventDotColor(type: string): string {
    if (type.startsWith('implement.')) return 'var(--color-accent)';
    if (type.startsWith('issues.')) return 'var(--color-success)';
    if (type.startsWith('pull_request.')) return 'var(--color-merged)';
    if (type === 'push') return 'var(--color-dim)';
    return 'var(--color-warning)';
  }

  function sourceBadgeStyle(source: string): string {
    switch (source) {
      case 'action':
        return 'background: var(--color-accent-dim, color-mix(in srgb, var(--color-accent) 15%, transparent)); color: var(--color-accent);';
      case 'webhook':
        return 'background: var(--color-elevated); color: var(--color-muted);';
      case 'cli':
        return 'background: color-mix(in srgb, var(--color-warning) 12%, transparent); color: var(--color-warning);';
      case 'console':
        return 'background: color-mix(in srgb, var(--color-merged) 12%, transparent); color: var(--color-merged);';
      default:
        return 'background: var(--color-elevated); color: var(--color-dim);';
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

  const topLevelEvents = $derived(data.events.filter((e) => !e.parentEventId));
  const childEventsByParent = $derived(
    data.events.reduce(
      (acc, e) => {
        if (e.parentEventId) {
          (acc[e.parentEventId] ??= []).push(e);
        }
        return acc;
      },
      {} as Record<string, typeof data.events>,
    ),
  );
</script>

<!-- ------------------------------------------------------------------ -->
<!-- Activity Feed -->
<!-- ------------------------------------------------------------------ -->
<section class="mb-8">
  <div class="mb-3 flex items-center justify-between">
    <h2 class="text-xs font-semibold uppercase tracking-widest text-muted">Activity</h2>
  </div>

  {#if data.events.length === 0}
    <div class="flex items-center justify-center py-12 text-sm text-muted">
      No events recorded yet
    </div>
  {:else}
    <ul
      class="rounded-lg overflow-hidden border divide-y"
      style="background: var(--color-surface); border-color: var(--color-border); --tw-divide-opacity: 1;"
    >
      {#each topLevelEvents as event (event.id)}
        {@const eventChildren = childEventsByParent[event.id] ?? []}
        <li>
          <!-- Parent event row -->
          {#snippet eventRowContent(ev: typeof event)}
            <span
              class="h-1.5 w-1.5 shrink-0 rounded-full"
              style="background: {eventDotColor(ev.type)}; box-shadow: 0 0 6px {eventDotColor(ev.type)};"
            ></span>
            <span class="font-mono text-xs text-text min-w-0 flex-1 truncate">{ev.type}</span>
            <span
              class="font-mono text-xs px-1.5 py-0.5 rounded shrink-0"
              style={sourceBadgeStyle(ev.source)}
            >{ev.source}</span>
            {#if ev.issueNumber}
              <a
                href="/gh/{data.organization}/{data.repoName}/issues"
                class="font-mono text-xs shrink-0 hover:underline"
                style="color: var(--color-success);"
                onclick={(e) => e.stopPropagation()}
              >#{ev.issueNumber}</a>
            {:else if ev.pullRequestNumber}
              <a
                href="/gh/{data.organization}/{data.repoName}/pulls"
                class="font-mono text-xs shrink-0 hover:underline"
                style="color: var(--color-merged);"
                onclick={(e) => e.stopPropagation()}
              >#{ev.pullRequestNumber}</a>
            {/if}
            <span class="shrink-0 text-xs text-dim tabular-nums">{relativeTime(ev.timeCreated)}</span>
            {#if ev.artifacts.length > 0}
              <span class="shrink-0 text-xs text-dim">{expandedEvents.has(ev.id) ? '▴' : '▾'}</span>
            {/if}
          {/snippet}
          {#if event.artifacts.length > 0}
            <div
              class="flex items-center gap-3 px-4 py-3 cursor-pointer event-row"
              role="button"
              tabindex="0"
              onclick={() => toggleArtifacts(event.id)}
              onkeydown={(e) => e.key === 'Enter' && toggleArtifacts(event.id)}
            >
              {@render eventRowContent(event)}
            </div>
          {:else}
            <div class="flex items-center gap-3 px-4 py-3 event-row">
              {@render eventRowContent(event)}
            </div>
          {/if}

          <!-- Artifacts panel -->
          {#if event.artifacts.length > 0 && expandedEvents.has(event.id)}
            <div
              class="border-t px-4 py-3"
              style="background: var(--color-elevated); border-color: var(--color-border);"
            >
              <p class="mb-2 text-xs text-dim uppercase tracking-wider">Artifacts</p>
              <ul class="flex flex-wrap gap-2">
                {#each event.artifacts as artifact (artifact.name)}
                  <li>
                    <a
                      href="/gh/{data.organization}/{data.repoName}/events/{event.id}/artifacts/{artifact.name}"
                      class="flex items-center gap-1.5 rounded border px-2 py-1 font-mono text-xs transition-colors artifact-link"
                      style="border-color: var(--color-border); color: var(--color-text);"
                    >
                      <span>{artifact.name}</span>
                      <span class="text-dim">({formatBytes(artifact.size)})</span>
                    </a>
                  </li>
                {/each}
              </ul>
            </div>
          {/if}

          <!-- Child events -->
          {#if eventChildren.length > 0}
            <ul
              class="border-t divide-y"
              style="border-color: var(--color-border);"
            >
              {#each eventChildren as child (child.id)}
                <li>
                  {#snippet childRowContent(ch: typeof child)}
                    <span
                      class="h-1 w-1 shrink-0 rounded-full"
                      style="background: {eventDotColor(ch.type)}; box-shadow: 0 0 4px {eventDotColor(ch.type)};"
                    ></span>
                    <span class="font-mono text-xs text-muted min-w-0 flex-1 truncate">{ch.type}</span>
                    <span
                      class="font-mono text-xs px-1.5 py-0.5 rounded shrink-0"
                      style={sourceBadgeStyle(ch.source)}
                    >{ch.source}</span>
                    {#if ch.issueNumber}
                      <a
                        href="/gh/{data.organization}/{data.repoName}/issues"
                        class="font-mono text-xs shrink-0 hover:underline"
                        style="color: var(--color-success);"
                        onclick={(e) => e.stopPropagation()}
                      >#{ch.issueNumber}</a>
                    {:else if ch.pullRequestNumber}
                      <a
                        href="/gh/{data.organization}/{data.repoName}/pulls"
                        class="font-mono text-xs shrink-0 hover:underline"
                        style="color: var(--color-merged);"
                        onclick={(e) => e.stopPropagation()}
                      >#{ch.pullRequestNumber}</a>
                    {/if}
                    <span class="shrink-0 text-xs text-dim tabular-nums">{relativeTime(ch.timeCreated)}</span>
                    {#if ch.artifacts.length > 0}
                      <span class="shrink-0 text-xs text-dim">{expandedEvents.has(ch.id) ? '▴' : '▾'}</span>
                    {/if}
                  {/snippet}
                  {#if child.artifacts.length > 0}
                    <div
                      class="flex items-center gap-3 py-2 pl-10 pr-4 cursor-pointer event-row"
                      role="button"
                      tabindex="0"
                      onclick={() => toggleArtifacts(child.id)}
                      onkeydown={(e) => e.key === 'Enter' && toggleArtifacts(child.id)}
                    >
                      {@render childRowContent(child)}
                    </div>
                  {:else}
                    <div class="flex items-center gap-3 py-2 pl-10 pr-4 event-row">
                      {@render childRowContent(child)}
                    </div>
                  {/if}

                  {#if child.artifacts.length > 0 && expandedEvents.has(child.id)}
                    <div
                      class="border-t py-3 pl-10 pr-4"
                      style="background: var(--color-elevated); border-color: var(--color-border);"
                    >
                      <p class="mb-2 text-xs text-dim uppercase tracking-wider">Artifacts</p>
                      <ul class="flex flex-wrap gap-2">
                        {#each child.artifacts as artifact (artifact.name)}
                          <li>
                            <a
                              href="/gh/{data.organization}/{data.repoName}/events/{child.id}/artifacts/{artifact.name}"
                              class="flex items-center gap-1.5 rounded border px-2 py-1 font-mono text-xs transition-colors artifact-link"
                              style="border-color: var(--color-border); color: var(--color-text);"
                            >
                              <span>{artifact.name}</span>
                              <span class="text-dim">({formatBytes(artifact.size)})</span>
                            </a>
                          </li>
                        {/each}
                      </ul>
                    </div>
                  {/if}
                </li>
              {/each}
            </ul>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</section>

<!-- ------------------------------------------------------------------ -->
<!-- Issues + Pull Requests -->
<!-- ------------------------------------------------------------------ -->
<div class="grid gap-6 md:grid-cols-2 mb-8">
  <!-- Issues -->
  <section>
    <div class="mb-3 flex items-center justify-between">
      <h2 class="text-xs font-semibold uppercase tracking-widest text-muted">Issues</h2>
      <a
        href="/gh/{data.organization}/{data.repoName}/issues"
        class="text-xs text-accent hover:underline"
      >View all →</a>
    </div>

    {#if data.issues.length === 0}
      <p class="text-sm text-muted py-4">No issues synced yet.</p>
    {:else}
      <ul
        class="rounded-lg overflow-hidden border divide-y"
        style="background: var(--color-surface); border-color: var(--color-border);"
      >
        {#each data.issues as issue (issue.number)}
          <li class="flex items-start gap-3 px-4 py-3 hover:bg-hover transition-colors">
            <span
              class="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
              style="background: {issue.state === 'open' ? 'var(--color-success)' : 'var(--color-danger)'};"
            ></span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm text-text leading-snug">{issue.title}</p>
              <p class="font-mono text-xs text-dim mt-0.5">#{issue.number}</p>
              {#if issue.labels && issue.labels.length > 0}
                <div class="mt-1.5 flex flex-wrap gap-1">
                  {#each issue.labels as label (label)}
                    <span
                      class="font-mono text-xs px-1.5 py-0.5 rounded border"
                      style="background: var(--color-elevated); border-color: var(--color-border); color: var(--color-muted);"
                    >{label}</span>
                  {/each}
                </div>
              {/if}
            </div>
            <GitHubLink href={issue.htmlUrl} />
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <!-- Pull Requests -->
  <section>
    <div class="mb-3 flex items-center justify-between">
      <h2 class="text-xs font-semibold uppercase tracking-widest text-muted">Pull Requests</h2>
      <a
        href="/gh/{data.organization}/{data.repoName}/pulls"
        class="text-xs text-accent hover:underline"
      >View all →</a>
    </div>

    {#if data.pulls.length === 0}
      <p class="text-sm text-muted py-4">No pull requests synced yet.</p>
    {:else}
      <ul
        class="rounded-lg overflow-hidden border divide-y"
        style="background: var(--color-surface); border-color: var(--color-border);"
      >
        {#each data.pulls as pr (pr.number)}
          <li class="flex items-start gap-3 px-4 py-3 hover:bg-hover transition-colors">
            <span
              class="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
              style="background: {pr.state === 'open'
                ? 'var(--color-success)'
                : pr.state === 'merged'
                  ? 'var(--color-merged)'
                  : 'var(--color-danger)'};"
            ></span>
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm text-text leading-snug">{pr.title}</p>
              <p class="font-mono text-xs text-dim mt-0.5">
                #{pr.number}
                <span class="text-dim mx-1">·</span>
                <span>{pr.headBranch}</span>
                <span class="mx-1">→</span>
                <span>{pr.baseBranch}</span>
              </p>
            </div>
            <GitHubLink href={pr.htmlUrl} />
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</div>

<!-- ------------------------------------------------------------------ -->
<!-- Agent Token -->
<!-- ------------------------------------------------------------------ -->
<section
  class="rounded-lg border p-5"
  style="background: var(--color-surface); border-color: var(--color-border);"
>
  <div class="flex items-start justify-between gap-4">
    <div>
      <h2 class="text-sm font-semibold text-text">Agent Token</h2>
      <p class="mt-1 text-xs text-muted max-w-sm">
        Generate a token and add it as
        <code
          class="font-mono px-1 py-0.5 rounded"
          style="background: var(--color-elevated); color: var(--color-text);"
        >AGENTS_TOKEN</code>
        in your repo's Actions secrets.
      </p>
    </div>
    <button
      onclick={handleGenerateToken}
      class="shrink-0 rounded px-3 py-1.5 text-xs font-medium transition-colors generate-btn"
    >
      Generate token
    </button>
  </div>

  {#if token}
    <div
      class="mt-4 rounded-md border p-3"
      style="background: var(--color-elevated); border-color: var(--color-border);"
    >
      <p class="mb-2 text-xs text-dim">Copy this token — it won't be shown again.</p>
      <code
        class="font-mono text-xs break-all"
        style="color: var(--color-success);"
      >{token}</code>
    </div>
  {/if}

  {#if tokenError}
    <p class="mt-3 text-xs" style="color: var(--color-danger);">{tokenError}</p>
  {/if}
</section>

<style>
  .event-row:hover {
    background: var(--color-hover);
  }

  .artifact-link:hover {
    border-color: var(--color-border-bright);
    color: var(--color-text);
  }

  .generate-btn {
    background: var(--color-accent);
    color: #fff;
  }

  .generate-btn:hover {
    background: color-mix(in srgb, var(--color-accent) 85%, white);
  }
</style>
