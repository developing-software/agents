<script lang="ts">
  import { SvelteSet } from 'svelte/reactivity';
  import type { NormalizedIssue } from '@agents/core/git';
  import ProviderLink from './ProviderLink.svelte';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import { issueStateColor, issueStateDotStyle } from '../helpers';
  import { repoContext } from '../context.svelte';

  interface Props {
    issues: NormalizedIssue[];
    selectable?: boolean;
    selected?: Set<number>;
    emptyText?: string;
  }

  let {
    issues,
    selectable = false,
    selected = $bindable(new Set<number>()),
    emptyText = 'No issues found.',
  }: Props = $props();

  const { provider, organization, repoName } = repoContext.get();

  let activeFilter = $state<'all' | 'open' | 'closed'>('open');

  const filterOptions = [
    { value: 'all', label: 'All' },
    { value: 'open', label: 'Open' },
    { value: 'closed', label: 'Closed' },
  ] as const;

  const filtered = $derived(
    activeFilter === 'all' ? issues : issues.filter((i) => i.state === activeFilter)
  );

  const counts = $derived({
    all: issues.length,
    open: issues.filter((i) => i.state === 'open').length,
    closed: issues.filter((i) => i.state === 'closed').length,
  });

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
          <span class="count-badge" class:count-badge-active={activeFilter === opt.value}>{counts[opt.value]}</span>
        </button>
      {/each}
    </div>
  </div>

  <!-- Issue list -->
  {#if filtered.length === 0}
    <EmptyState icon="issues" title={emptyText} />
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

            <!-- Provider link -->
            <div class="shrink-0">
              <ProviderLink href={issue.url} {provider} />
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

            <!-- Provider link -->
            <div class="shrink-0">
              <ProviderLink href={issue.url} {provider} />
            </div>

            <!-- Activity link -->
            <a
              href="/{provider}/{organization}/{repoName}/issues/{issue.number}"
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
    transition: background 0.08s;
  }
  .issue-row:hover {
    background: var(--color-hover);
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

  .count-badge {
    font-size: 9px;
    min-width: 16px;
    padding: 0 4px;
    border-radius: 6px;
    text-align: center;
    line-height: 15px;
    display: inline-block;
    margin-left: 4px;
    background: var(--color-border);
    color: var(--color-dim);
  }
  .count-badge-active {
    background: rgba(255, 255, 255, 0.15);
    color: #fff;
  }
</style>
