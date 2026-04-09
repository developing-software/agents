<script lang="ts">
  import GitHubLink from '$lib/ui/GitHubLink.svelte';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import { invalidateAll } from '$app/navigation';
  import { prStateColor, prStateDotStyle } from './github-helpers';
  import {
    deleteBranch,
    deleteBranches,
  } from '../../routes/gh/[organization]/[repo]/branches/branches.remote';

  interface PullRef {
    number: number;
    title: string;
    state: string;
    headBranch: string;
    baseBranch: string;
    htmlUrl: string;
  }

  interface Branch {
    name: string;
    protected: boolean;
    reserved: boolean;
    isDefault: boolean;
    agent: string | null;
    sha: string;
    lastCommitDate: string | null;
    lastCommitAuthor: string | null;
    lastCommitMessage: string | null;
    pullRequest: PullRef | null;
    pullRequestCount: number;
    hasMergedPR: boolean;
  }

  interface Props {
    organization: string;
    repoName: string;
    branches: Branch[];
  }

  let { organization, repoName, branches }: Props = $props();

  type Filter = 'all' | 'active' | 'stale' | 'merged' | 'noPR' | 'agents' | 'protected';
  type Sort = 'recent' | 'oldest' | 'name';

  let activeFilter = $state<Filter>('all');
  let sortKey = $state<Sort>('recent');
  let selected = $state<Set<string>>(new Set());
  let confirmBranch = $state<string | null>(null);
  let bulkConfirmOpen = $state(false);
  let deleteError = $state<string | null>(null);
  let isDeleting = $state(false);

  const STALE_MS = 30 * 86_400_000;

  function isStale(b: Branch): boolean {
    if (!b.lastCommitDate) return false;
    return Date.now() - new Date(b.lastCommitDate).getTime() > STALE_MS;
  }

  function isDeletable(b: Branch): boolean {
    return !b.protected && !b.reserved && !b.isDefault;
  }

  function protectedReason(b: Branch): string {
    if (b.isDefault) return 'default branch';
    if (b.protected) return 'GitHub protected';
    if (b.reserved) return 'reserved name';
    return '';
  }

  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
  function relTime(iso: string | null): string {
    if (!iso) return '—';
    const diff = new Date(iso).getTime() - Date.now();
    const abs = Math.abs(diff);
    const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
      ['year', 365 * 86_400_000],
      ['month', 30 * 86_400_000],
      ['week', 7 * 86_400_000],
      ['day', 86_400_000],
      ['hour', 3_600_000],
      ['minute', 60_000],
    ];
    for (const [unit, ms] of units) {
      if (abs >= ms) return rtf.format(Math.round(diff / ms), unit);
    }
    return 'just now';
  }

  const counts = $derived({
    all: branches.length,
    active: branches.filter((b) => !isStale(b) && !b.hasMergedPR).length,
    stale: branches.filter(isStale).length,
    merged: branches.filter((b) => b.hasMergedPR).length,
    noPR: branches.filter((b) => b.pullRequestCount === 0).length,
    agents: branches.filter((b) => b.agent !== null).length,
    protected: branches.filter((b) => !isDeletable(b)).length,
  });

  const filterOptions: Array<{ value: Filter; label: string }> = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'stale', label: 'Stale' },
    { value: 'merged', label: 'Merged' },
    { value: 'noPR', label: 'No PR' },
    { value: 'agents', label: 'Agents' },
    { value: 'protected', label: 'Protected' },
  ];

  function matchesFilter(b: Branch, f: Filter): boolean {
    switch (f) {
      case 'all':
        return true;
      case 'active':
        return !isStale(b) && !b.hasMergedPR;
      case 'stale':
        return isStale(b);
      case 'merged':
        return b.hasMergedPR;
      case 'noPR':
        return b.pullRequestCount === 0;
      case 'agents':
        return b.agent !== null;
      case 'protected':
        return !isDeletable(b);
    }
  }

  const filtered = $derived(
    branches
      .filter((b) => matchesFilter(b, activeFilter))
      .slice()
      .sort((a, b) => {
        if (sortKey === 'name') return a.name.localeCompare(b.name);
        const da = a.lastCommitDate ? new Date(a.lastCommitDate).getTime() : 0;
        const db = b.lastCommitDate ? new Date(b.lastCommitDate).getTime() : 0;
        return sortKey === 'recent' ? db - da : da - db;
      }),
  );

  function toggleSelect(name: string) {
    const next = new Set(selected);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    selected = next;
  }

  function clearSelection() {
    selected = new Set();
  }

  async function runSingleDelete() {
    if (!confirmBranch) return;
    isDeleting = true;
    deleteError = null;
    try {
      await deleteBranch({ organization, repoName, branch: confirmBranch });
      const next = new Set(selected);
      next.delete(confirmBranch);
      selected = next;
      confirmBranch = null;
      await invalidateAll();
    } catch (e) {
      deleteError = e instanceof Error ? e.message : 'Delete failed';
    } finally {
      isDeleting = false;
    }
  }

  async function runBulkDelete() {
    const names = [...selected];
    if (names.length === 0) return;
    isDeleting = true;
    deleteError = null;
    try {
      const { results } = await deleteBranches({ organization, repoName, branches: names });
      const failed = results.filter((r) => !r.ok);
      if (failed.length) {
        deleteError = `Failed: ${failed.map((f) => `${f.name} (${f.error})`).join(', ')}`;
      }
      selected = new Set(failed.map((f) => f.name));
      bulkConfirmOpen = false;
      await invalidateAll();
    } catch (e) {
      deleteError = e instanceof Error ? e.message : 'Bulk delete failed';
    } finally {
      isDeleting = false;
    }
  }

  function ghUrl(name: string): string {
    return `https://github.com/${organization}/${repoName}/tree/${encodeURIComponent(name)}`;
  }
</script>

<div>
  <!-- Filter + sort bar -->
  <div class="mb-3 flex items-center justify-between gap-3">
    <!-- Sort dropdown -->
    <select
      class="sort-select"
      bind:value={sortKey}
      aria-label="Sort branches"
    >
      <option value="recent">Recently updated</option>
      <option value="oldest">Oldest first</option>
      <option value="name">Name A–Z</option>
    </select>

    <!-- Filter pills -->
    <div
      class="flex gap-px overflow-hidden rounded border p-px"
      style="background: var(--color-elevated); border-color: var(--color-border);"
    >
      {#each filterOptions as opt (opt.value)}
        <button
          type="button"
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
          <span class="count-badge" class:count-badge-active={activeFilter === opt.value}
            >{counts[opt.value]}</span
          >
        </button>
      {/each}
    </div>
  </div>

  <!-- Bulk action bar -->
  {#if selected.size > 0}
    <div class="bulk-bar">
      <span class="bulk-count">{selected.size} selected</span>
      <button
        type="button"
        class="bulk-btn bulk-btn-danger"
        onclick={() => (bulkConfirmOpen = true)}
        disabled={isDeleting}
      >Delete selected</button>
      <button type="button" class="bulk-btn" onclick={clearSelection} disabled={isDeleting}
        >Clear</button
      >
    </div>
  {/if}

  <!-- Error banner -->
  {#if deleteError}
    <div class="error-bar" role="alert">
      {deleteError}
      <button type="button" class="close-error" onclick={() => (deleteError = null)}>&times;</button>
    </div>
  {/if}

  <!-- Branch list -->
  {#if filtered.length === 0}
    <EmptyState icon="default" title="No branches" />
  {:else}
    <div
      class="overflow-hidden rounded"
      style="border: 1px solid var(--color-border); background: var(--color-surface);"
    >
      {#each filtered as b, idx (b.name)}
        <div
          class="branch-row"
          style="border-top: {idx === 0 ? 'none' : '1px solid var(--color-border)'};"
          role="listitem"
        >
          <!-- Checkbox -->
          <span class="col-checkbox">
            {#if isDeletable(b)}
              <input
                type="checkbox"
                aria-label="Select {b.name}"
                checked={selected.has(b.name)}
                onchange={() => toggleSelect(b.name)}
              />
            {/if}
          </span>

          <!-- Lock indicator -->
          <span class="col-lock" title={protectedReason(b)}>
            {#if !isDeletable(b)}
              <svg
                width="12"
                height="12"
                viewBox="0 0 16 16"
                fill="currentColor"
                style="color: var(--color-warning);"
                aria-hidden="true"
              >
                <path
                  d="M4 7V5a4 4 0 1 1 8 0v2h1a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h1zm2 0h4V5a2 2 0 1 0-4 0v2z"
                />
              </svg>
            {/if}
          </span>

          <!-- Branch name -->
          <span class="col-name">{b.name}</span>

          <!-- Agent chip -->
          <span class="col-agent">
            {#if b.agent}
              <span class="agent-chip">{b.agent}</span>
            {/if}
          </span>

          <!-- PR badge -->
          <span class="col-pr">
            {#if b.pullRequest}
              <a
                href="/gh/{organization}/{repoName}/pulls/{b.pullRequest.number}"
                class="pr-link"
                style="color: {prStateColor(b.pullRequest.state)};"
              >
                <span class="pr-dot" style={prStateDotStyle(b.pullRequest.state)}></span>
                #{b.pullRequest.number}
                <span class="pr-state">{b.pullRequest.state}</span>
              </a>
            {:else}
              <span class="pr-empty">no PR</span>
            {/if}
          </span>

          <!-- Relative time -->
          <span class="col-time" title={b.lastCommitDate ?? ''}
            >{relTime(b.lastCommitDate)}</span
          >

          <!-- Author -->
          <span class="col-author" title={b.lastCommitAuthor ?? ''}
            >{b.lastCommitAuthor ?? '—'}</span
          >

          <!-- GitHub link -->
          <span class="col-gh">
            <GitHubLink href={ghUrl(b.name)} />
          </span>

          <!-- Delete button -->
          <span class="col-delete">
            <button
              type="button"
              class="delete-btn"
              aria-label="Delete {b.name}"
              title={isDeletable(b) ? 'Delete branch' : protectedReason(b)}
              disabled={!isDeletable(b)}
              onclick={() => (confirmBranch = b.name)}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M3 4h10" />
                <path d="M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
                <path d="M4 4l.7 9a1 1 0 0 0 1 .9h4.6a1 1 0 0 0 1-.9L12 4" />
              </svg>
            </button>
          </span>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Single delete confirm modal -->
{#if confirmBranch}
  <div
    class="modal-overlay"
    role="button"
    tabindex="-1"
    aria-label="Close dialog"
    onclick={() => (confirmBranch = null)}
    onkeydown={(e) => e.key === 'Escape' && (confirmBranch = null)}
  ></div>
  <div class="modal" role="dialog" aria-modal="true" aria-label="Confirm delete">
    <div class="modal-title">Delete branch?</div>
    <div class="modal-body">
      <code class="branch-code">{confirmBranch}</code>
      <p class="modal-text">This cannot be undone from the console.</p>
    </div>
    <div class="modal-actions">
      <button
        type="button"
        class="bulk-btn"
        onclick={() => (confirmBranch = null)}
        disabled={isDeleting}>Cancel</button
      >
      <button
        type="button"
        class="bulk-btn bulk-btn-danger"
        onclick={runSingleDelete}
        disabled={isDeleting}>{isDeleting ? 'Deleting…' : 'Delete'}</button
      >
    </div>
  </div>
{/if}

<!-- Bulk delete confirm modal -->
{#if bulkConfirmOpen}
  <div
    class="modal-overlay"
    role="button"
    tabindex="-1"
    aria-label="Close dialog"
    onclick={() => (bulkConfirmOpen = false)}
    onkeydown={(e) => e.key === 'Escape' && (bulkConfirmOpen = false)}
  ></div>
  <div class="modal" role="dialog" aria-modal="true" aria-label="Confirm bulk delete">
    <div class="modal-title">Delete {selected.size} branches?</div>
    <div class="modal-body">
      <ul class="bulk-list">
        {#each [...selected] as name (name)}
          <li><code class="branch-code">{name}</code></li>
        {/each}
      </ul>
      <p class="modal-text">This cannot be undone from the console.</p>
    </div>
    <div class="modal-actions">
      <button
        type="button"
        class="bulk-btn"
        onclick={() => (bulkConfirmOpen = false)}
        disabled={isDeleting}>Cancel</button
      >
      <button
        type="button"
        class="bulk-btn bulk-btn-danger"
        onclick={runBulkDelete}
        disabled={isDeleting}
        >{isDeleting ? 'Deleting…' : `Delete ${selected.size}`}</button
      >
    </div>
  </div>
{/if}

<style>
  .branch-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 12px;
    min-height: 36px;
    transition: background 0.08s;
  }
  .branch-row:hover {
    background: var(--color-hover);
  }

  .col-checkbox {
    width: 16px;
    flex-shrink: 0;
    display: inline-flex;
    justify-content: center;
  }
  .col-lock {
    width: 14px;
    flex-shrink: 0;
    display: inline-flex;
    justify-content: center;
  }
  .col-name {
    flex: 1;
    min-width: 0;
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    color: var(--color-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .col-agent {
    width: 72px;
    flex-shrink: 0;
    display: inline-flex;
    justify-content: flex-start;
  }
  .agent-chip {
    font-family: "JetBrains Mono", monospace;
    font-size: 9px;
    padding: 1px 6px;
    border-radius: 8px;
    background: color-mix(in srgb, var(--color-accent) 18%, transparent);
    color: var(--color-accent);
    line-height: 14px;
    letter-spacing: 0.2px;
  }
  .col-pr {
    width: 140px;
    flex-shrink: 0;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
  }
  .pr-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    text-decoration: none;
  }
  .pr-link:hover {
    text-decoration: underline;
  }
  .pr-dot {
    display: inline-block;
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }
  .pr-state {
    text-transform: capitalize;
    font-size: 10px;
    color: var(--color-dim);
  }
  .pr-empty {
    font-size: 10px;
    color: var(--color-dim);
  }
  .col-time {
    width: 100px;
    flex-shrink: 0;
    font-size: 11px;
    color: var(--color-dim);
    text-align: right;
  }
  .col-author {
    width: 90px;
    flex-shrink: 0;
    font-size: 11px;
    color: var(--color-dim);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .col-gh {
    flex-shrink: 0;
    display: inline-flex;
  }
  .col-delete {
    flex-shrink: 0;
    display: inline-flex;
  }
  .delete-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    background: transparent;
    border: none;
    color: var(--color-dim);
    cursor: pointer;
    border-radius: 3px;
    transition: color 0.1s, background 0.1s;
  }
  .delete-btn:hover:not(:disabled) {
    color: var(--color-danger);
    background: color-mix(in srgb, var(--color-danger) 12%, transparent);
  }
  .delete-btn:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  .sort-select {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    padding: 4px 8px;
    background: var(--color-elevated);
    border: 1px solid var(--color-border);
    border-radius: 3px;
    color: var(--color-muted);
    outline: none;
    cursor: pointer;
  }
  .sort-select:focus {
    border-color: var(--color-accent);
  }

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

  .bulk-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    margin-bottom: 8px;
    background: var(--color-elevated);
    border: 1px solid var(--color-border);
    border-radius: 4px;
  }
  .bulk-count {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-muted);
    margin-right: auto;
  }
  .bulk-btn {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    padding: 4px 10px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 3px;
    color: var(--color-muted);
    cursor: pointer;
    transition: color 0.1s, border-color 0.1s;
  }
  .bulk-btn:hover:not(:disabled) {
    color: var(--color-text);
    border-color: var(--color-muted);
  }
  .bulk-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .bulk-btn-danger {
    color: var(--color-danger);
    border-color: color-mix(in srgb, var(--color-danger) 40%, var(--color-border));
  }
  .bulk-btn-danger:hover:not(:disabled) {
    color: #fff;
    background: var(--color-danger);
    border-color: var(--color-danger);
  }

  .error-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    margin-bottom: 8px;
    background: color-mix(in srgb, var(--color-danger) 10%, var(--color-surface));
    border: 1px solid color-mix(in srgb, var(--color-danger) 30%, transparent);
    border-radius: 4px;
    font-size: 11px;
    color: var(--color-danger);
  }
  .close-error {
    margin-left: auto;
    background: transparent;
    border: none;
    color: inherit;
    cursor: pointer;
    font-size: 16px;
    line-height: 1;
  }

  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 200;
  }
  .modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 5px;
    padding: 20px;
    min-width: 360px;
    max-width: 480px;
    max-height: 70vh;
    overflow: auto;
    z-index: 201;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }
  .modal-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text);
    margin-bottom: 12px;
  }
  .modal-body {
    font-size: 12px;
    color: var(--color-muted);
    margin-bottom: 16px;
  }
  .modal-text {
    font-size: 11px;
    color: var(--color-dim);
    margin: 8px 0 0;
  }
  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
  .branch-code {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    padding: 2px 6px;
    background: var(--color-elevated);
    border-radius: 3px;
    color: var(--color-text);
  }
  .bulk-list {
    list-style: none;
    padding: 0;
    margin: 0;
    max-height: 200px;
    overflow: auto;
  }
  .bulk-list li {
    padding: 3px 0;
  }
</style>
