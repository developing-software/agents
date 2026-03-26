<script lang="ts">
  import { enhance } from '$app/forms';
  import type { PageProps } from './$types';
  let { data, form }: PageProps = $props();

  let expandedEvents = $state(new Set<string>());

  function toggleArtifacts(eventId: string) {
    if (expandedEvents.has(eventId)) {
      expandedEvents.delete(eventId);
    } else {
      expandedEvents.add(eventId);
    }
    expandedEvents = new Set(expandedEvents);
  }

  function eventDotColor(type: string): string {
    if (type.startsWith('implement.')) return 'bg-blue-500';
    if (type.startsWith('issues.')) return 'bg-green-500';
    if (type.startsWith('pull_request.')) return 'bg-purple-500';
    if (type === 'push') return 'bg-gray-500';
    return 'bg-yellow-500';
  }

  function sourceBadgeClass(source: string): string {
    switch (source) {
      case 'action': return 'bg-blue-900 text-blue-300';
      case 'webhook': return 'bg-gray-800 text-gray-300';
      case 'cli': return 'bg-yellow-900 text-yellow-300';
      case 'console': return 'bg-purple-900 text-purple-300';
      default: return 'bg-gray-800 text-gray-400';
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

  // Group child events under their parents for indentation
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

<!-- Event Feed -->
<section class="mb-6">
  <div class="mb-3 flex items-center justify-between">
    <h2 class="text-sm font-semibold uppercase tracking-wide text-gray-400">Recent Events</h2>
  </div>
  {#if data.events.length === 0}
    <p class="text-sm text-gray-500">No events recorded yet.</p>
  {:else}
    <ul class="divide-y divide-gray-800 rounded-lg border border-gray-800">
      {#each topLevelEvents as event}
        {@const children = childEventsByParent[event.id] ?? []}
        <li>
          <!-- Parent event row -->
          <div
            class="flex items-center gap-3 px-4 py-3 {event.artifacts.length > 0
              ? 'cursor-pointer hover:bg-gray-800/50'
              : ''}"
            role={event.artifacts.length > 0 ? 'button' : undefined}
            tabindex={event.artifacts.length > 0 ? 0 : undefined}
            onclick={() => event.artifacts.length > 0 && toggleArtifacts(event.id)}
            onkeydown={(e) =>
              e.key === 'Enter' && event.artifacts.length > 0 && toggleArtifacts(event.id)}
          >
            <span class="h-2 w-2 shrink-0 rounded-full {eventDotColor(event.type)}"></span>
            <span class="min-w-0 flex-1 truncate text-sm text-gray-100">{event.type}</span>
            <span class="rounded px-1.5 py-0.5 text-xs {sourceBadgeClass(event.source)}"
              >{event.source}</span
            >
            {#if event.issueNumber}
              <a
                href="/gh/{data.organization}/{data.repoName}/issues"
                class="text-xs text-green-400 hover:underline"
                onclick={(e) => e.stopPropagation()}
              >
                #{event.issueNumber}
              </a>
            {:else if event.pullRequestNumber}
              <a
                href="/gh/{data.organization}/{data.repoName}/pulls"
                class="text-xs text-purple-400 hover:underline"
                onclick={(e) => e.stopPropagation()}
              >
                #{event.pullRequestNumber}
              </a>
            {/if}
            <span class="shrink-0 text-xs text-gray-500">{relativeTime(event.timeCreated)}</span>
            {#if event.artifacts.length > 0}
              <span class="shrink-0 text-xs text-gray-500">
                {expandedEvents.has(event.id) ? '▲' : '▼'}
              </span>
            {/if}
          </div>

          <!-- Artifacts sub-row -->
          {#if event.artifacts.length > 0 && expandedEvents.has(event.id)}
            <div class="border-t border-gray-800 bg-gray-900/50 px-4 py-2">
              <p class="mb-1.5 text-xs text-gray-500">Artifacts</p>
              <ul class="flex flex-wrap gap-2">
                {#each event.artifacts as artifact}
                  <li>
                    <a
                      href="/gh/{data.organization}/{data.repoName}/events/{event.id}/artifacts/{artifact.name}"
                      class="flex items-center gap-1.5 rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:border-gray-600 hover:text-white"
                    >
                      <span>{artifact.name}</span>
                      <span class="text-gray-500">({formatBytes(artifact.size)})</span>
                    </a>
                  </li>
                {/each}
              </ul>
            </div>
          {/if}

          <!-- Child events (indented) -->
          {#if children.length > 0}
            <ul class="border-t border-gray-800">
              {#each children as child}
                <li>
                  <div
                    class="flex items-center gap-3 py-2 pl-10 pr-4 {child.artifacts.length > 0
                      ? 'cursor-pointer hover:bg-gray-800/50'
                      : ''}"
                    role={child.artifacts.length > 0 ? 'button' : undefined}
                    tabindex={child.artifacts.length > 0 ? 0 : undefined}
                    onclick={() => child.artifacts.length > 0 && toggleArtifacts(child.id)}
                    onkeydown={(e) =>
                      e.key === 'Enter' &&
                      child.artifacts.length > 0 &&
                      toggleArtifacts(child.id)}
                  >
                    <span class="h-1.5 w-1.5 shrink-0 rounded-full {eventDotColor(child.type)}"
                    ></span>
                    <span class="min-w-0 flex-1 truncate text-xs text-gray-300">{child.type}</span>
                    <span class="rounded px-1.5 py-0.5 text-xs {sourceBadgeClass(child.source)}"
                      >{child.source}</span
                    >
                    {#if child.issueNumber}
                      <a
                        href="/gh/{data.organization}/{data.repoName}/issues"
                        class="text-xs text-green-400 hover:underline"
                        onclick={(e) => e.stopPropagation()}
                      >
                        #{child.issueNumber}
                      </a>
                    {:else if child.pullRequestNumber}
                      <a
                        href="/gh/{data.organization}/{data.repoName}/pulls"
                        class="text-xs text-purple-400 hover:underline"
                        onclick={(e) => e.stopPropagation()}
                      >
                        #{child.pullRequestNumber}
                      </a>
                    {/if}
                    <span class="shrink-0 text-xs text-gray-500"
                      >{relativeTime(child.timeCreated)}</span
                    >
                    {#if child.artifacts.length > 0}
                      <span class="shrink-0 text-xs text-gray-500">
                        {expandedEvents.has(child.id) ? '▲' : '▼'}
                      </span>
                    {/if}
                  </div>

                  {#if child.artifacts.length > 0 && expandedEvents.has(child.id)}
                    <div class="border-t border-gray-800 bg-gray-900/50 py-2 pl-10 pr-4">
                      <p class="mb-1.5 text-xs text-gray-500">Artifacts</p>
                      <ul class="flex flex-wrap gap-2">
                        {#each child.artifacts as artifact}
                          <li>
                            <a
                              href="/gh/{data.organization}/{data.repoName}/events/{child.id}/artifacts/{artifact.name}"
                              class="flex items-center gap-1.5 rounded border border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-200 hover:border-gray-600 hover:text-white"
                            >
                              <span>{artifact.name}</span>
                              <span class="text-gray-500">({formatBytes(artifact.size)})</span>
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

<!-- Issues + PRs -->
<div class="grid gap-6 md:grid-cols-2">
  <section>
    <div class="mb-3 flex items-center justify-between">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-gray-400">Recent Issues</h2>
      <a
        href="/gh/{data.organization}/{data.repoName}/issues"
        class="text-xs text-blue-400 hover:underline"
      >
        View all
      </a>
    </div>
    {#if data.issues.length === 0}
      <p class="text-sm text-gray-500">No issues synced yet.</p>
    {:else}
      <ul class="divide-y divide-gray-800 rounded-lg border border-gray-800">
        {#each data.issues as issue}
          <li class="flex items-start gap-3 px-4 py-3">
            <span
              class="mt-0.5 h-2 w-2 shrink-0 rounded-full {issue.state === 'open'
                ? 'bg-green-500'
                : 'bg-purple-500'}"
            ></span>
            <div class="min-w-0">
              <p class="truncate text-sm text-gray-100">#{issue.number} {issue.title}</p>
              {#if issue.labels && issue.labels.length > 0}
                <div class="mt-1 flex flex-wrap gap-1">
                  {#each issue.labels as label}
                    <span class="rounded px-1.5 py-0.5 text-xs bg-gray-700 text-gray-300"
                      >{label}</span
                    >
                  {/each}
                </div>
              {/if}
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section>
    <div class="mb-3 flex items-center justify-between">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-gray-400">
        Recent Pull Requests
      </h2>
      <a
        href="/gh/{data.organization}/{data.repoName}/pulls"
        class="text-xs text-blue-400 hover:underline"
      >
        View all
      </a>
    </div>
    {#if data.pulls.length === 0}
      <p class="text-sm text-gray-500">No pull requests synced yet.</p>
    {:else}
      <ul class="divide-y divide-gray-800 rounded-lg border border-gray-800">
        {#each data.pulls as pr}
          <li class="flex items-start gap-3 px-4 py-3">
            <span
              class="mt-0.5 h-2 w-2 shrink-0 rounded-full {pr.state === 'open'
                ? 'bg-green-500'
                : pr.state === 'merged'
                  ? 'bg-purple-500'
                  : 'bg-red-500'}"
            ></span>
            <div class="min-w-0">
              <p class="truncate text-sm text-gray-100">#{pr.number} {pr.title}</p>
              <p class="mt-0.5 text-xs text-gray-500">
                {pr.headBranch} → {pr.baseBranch}
              </p>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</div>

<!-- Agent Token -->
<section class="mt-6 rounded-lg border border-gray-800 p-4">
  <div class="flex items-center justify-between">
    <div>
      <h2 class="text-sm font-semibold text-gray-200">Agent Token</h2>
      <p class="mt-0.5 text-xs text-gray-500">
        Generate a token and add it as <code class="text-gray-300">AGENTS_TOKEN</code> in your repo's Actions secrets.
      </p>
    </div>
    <form method="POST" action="?/installToken" use:enhance>
      <button
        type="submit"
        class="rounded bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
      >
        Generate token
      </button>
    </form>
  </div>

  {#if form?.token}
    <div class="mt-3 rounded bg-gray-900 p-3">
      <p class="mb-1 text-xs text-gray-400">Copy this token — it won't be shown again.</p>
      <code class="break-all text-xs text-green-400">{form.token}</code>
    </div>
  {/if}
</section>
