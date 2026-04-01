<script lang="ts">
  import { SvelteSet } from 'svelte/reactivity';
  import GitHubLink from '$lib/GitHubLink.svelte';
  import { issueStateColor, issueStateDotStyle } from './github-helpers';

  interface Props {
    organization: string;
    repoName: string;
    issues: Array<{
      number: number;
      title: string;
      state: string;
      labels: string[];
      htmlUrl: string;
    }>;
    selectable?: boolean;
    selected?: Set<number>;
    emptyText?: string;
  }

  let {
    organization,
    repoName,
    issues,
    selectable = false,
    selected = $bindable(new Set<number>()),
    emptyText = 'No issues found.',
  }: Props = $props();

  let activeFilter = $state<'all' | 'open' | 'closed'>('open');

  const filterOptions = [
    { value: 'all', label: 'All' },
    { value: 'open', label: 'Open' },
    { value: 'closed', label: 'Closed' },
  ] as const;

  const filtered = $derived(
    activeFilter === 'all' ? issues : issues.filter((i) => i.state === activeFilter)
  );

  function toggleSelection(issueNumber: number) {
    if (selected.has(issueNumber)) {
      selected.delete(issueNumber);
    } else {
      selected.add(issueNumber);
    }
    selected = new SvelteSet(selected);
  }

  function handleRowKeydown(e: KeyboardEvent, issueNumber: number) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleSelection(issueNumber);
    }
  }
</script>

<div>
  <!-- Header with filter pills -->
  <div class="mb-4 flex items-center justify-between">
    <span class="text-sm font-medium" style="color: var(--color-text);">Issues</span>

    <div
      class="flex gap-px overflow-hidden rounded border p-px"
      style="background: var(--color-elevated); border-color: var(--color-border);"
    >
      {#each filterOptions as opt (opt.value)}
        <button
          onclick={() => (activeFilter = opt.value)}
          class="rounded px-2.5 py-1 font-mono text-xs transition-colors"
          style={activeFilter === opt.value
            ? 'background: var(--color-accent); color: #fff;'
            : 'background: transparent; color: var(--color-dim);'}
          onmouseenter={activeFilter !== opt.value
            ? (e) => ((e.currentTarget as HTMLElement).style.color = 'var(--color-muted)')
            : undefined}
          onmouseleave={activeFilter !== opt.value
            ? (e) => ((e.currentTarget as HTMLElement).style.color = 'var(--color-dim)')
            : undefined}
        >
          {opt.label}
        </button>
      {/each}
    </div>
  </div>

  <!-- Issue list -->
  {#if filtered.length === 0}
    <div
      style="display: flex; align-items: center; justify-content: center; padding: 40px 0; font-size: 12px; color: var(--color-muted); border: 1px solid var(--color-border); border-radius: 4px;"
    >
      {emptyText}
    </div>
  {:else}
    <div
      class="overflow-hidden rounded"
      style="border: 1px solid var(--color-border); background: var(--color-surface);"
    >
      {#each filtered as issue, idx (issue.number)}
        {@const borderTop = idx === 0 ? 'none' : '1px solid var(--color-border)'}
        {#if selectable}
          <div
            class="issue-row issue-row-selectable"
            class:issue-row-selected={selected.has(issue.number)}
            style="border-top: {borderTop};"
            role="button"
            aria-pressed={selected.has(issue.number)}
            tabindex="0"
            onclick={() => toggleSelection(issue.number)}
            onkeydown={(e) => handleRowKeydown(e, issue.number)}
          >
            <!-- Checkbox -->
            <input
              type="checkbox"
              checked={selected.has(issue.number)}
              onclick={(e) => e.stopPropagation()}
              onchange={() => toggleSelection(issue.number)}
              style="flex-shrink: 0;"
            />

            <!-- State dot -->
            <span
              class="h-1.5 w-1.5 shrink-0 rounded-full"
              style={issueStateDotStyle(issue.state)}
            ></span>

            <!-- Number -->
            <span
              class="shrink-0 font-mono"
              style="width: 40px; font-size: 11px; color: var(--color-dim);"
            >#{issue.number}</span>

            <!-- Title -->
            <span
              class="min-w-0 flex-1 truncate text-xs"
              style="color: var(--color-text);"
            >{issue.title}</span>

            <!-- Labels (max 3) -->
            {#if issue.labels && issue.labels.length > 0}
              <div class="flex shrink-0 gap-1">
                {#each issue.labels.slice(0, 3) as label (label)}
                  <span
                    class="rounded font-mono"
                    style="font-size: 10px; padding: 0 5px; line-height: 17px; background: var(--color-elevated); border: 1px solid var(--color-border); color: var(--color-muted);"
                  >{label}</span>
                {/each}
              </div>
            {/if}

            <!-- State text -->
            <span
              class="shrink-0 font-mono capitalize"
              style="font-size: 10px; width: 40px; text-align: right; color: {issueStateColor(issue.state)};"
            >{issue.state}</span>

            <!-- GitHub link -->
            <div class="shrink-0">
              <GitHubLink href={issue.htmlUrl} />
            </div>
          </div>
        {:else}
          <div
            class="issue-row"
            style="border-top: {borderTop};"
            role="listitem"
          >
            <!-- State dot -->
            <span
              class="h-1.5 w-1.5 shrink-0 rounded-full"
              style={issueStateDotStyle(issue.state)}
            ></span>

            <!-- Number -->
            <span
              class="shrink-0 font-mono"
              style="width: 40px; font-size: 11px; color: var(--color-dim);"
            >#{issue.number}</span>

            <!-- Title -->
            <span
              class="min-w-0 flex-1 truncate text-xs"
              style="color: var(--color-text);"
            >{issue.title}</span>

            <!-- Labels (max 3) -->
            {#if issue.labels && issue.labels.length > 0}
              <div class="flex shrink-0 gap-1">
                {#each issue.labels.slice(0, 3) as label (label)}
                  <span
                    class="rounded font-mono"
                    style="font-size: 10px; padding: 0 5px; line-height: 17px; background: var(--color-elevated); border: 1px solid var(--color-border); color: var(--color-muted);"
                  >{label}</span>
                {/each}
              </div>
            {/if}

            <!-- State text -->
            <span
              class="shrink-0 font-mono capitalize"
              style="font-size: 10px; width: 40px; text-align: right; color: {issueStateColor(issue.state)};"
            >{issue.state}</span>

            <!-- GitHub link -->
            <div class="shrink-0">
              <GitHubLink href={issue.htmlUrl} />
            </div>

            <!-- Activity link -->
            <a
              href="/gh/{organization}/{repoName}/issues/{issue.number}"
              class="activity-link"
              title="View activity"
            >activity →</a>
          </div>
        {/if}
      {/each}
    </div>
  {/if}
</div>

<style>
  .issue-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 6px 12px;
    min-height: 36px;
  }

  .issue-row-selectable {
    cursor: pointer;
  }
  .issue-row-selectable:hover {
    background: color-mix(in srgb, var(--color-text) 3%, transparent);
  }

  .issue-row-selected {
    background: color-mix(in srgb, var(--color-accent) 6%, transparent);
  }

  .activity-link {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
    text-decoration: none;
    flex-shrink: 0;
    transition: color 0.1s;
  }
  .activity-link:hover { color: var(--color-accent); }
</style>
