<script lang="ts">
  import type { PageProps } from './$types';
  import EmptyState from '$lib/ui/EmptyState.svelte';
  import { updateAudit, createPlanFromAudit } from './audits.remote';
  import DispatchDrawer from '$lib/agents/dispatch/DispatchDrawer.svelte';
  import DispatchOptions from '$lib/agents/dispatch/DispatchOptions.svelte';
  import { previewPrompt } from '$lib/agents/dispatch/dispatch.remote';
  import type { Plan } from '@agents/core/events/plan';
  import { Tags } from '@agents/core/events/tag';
  import { relativeTime, type PlanItem } from '$lib/agents/plans/plan-helpers';
  import { invalidateAll } from '$app/navigation';

  let { data }: PageProps = $props();

  let expandedName = $state<string | null>(null);
  let editBodies = $state<Record<string, string>>({});
  let saving = $state<Record<string, boolean>>({});

  // Run Audit state
  let creatingPlan = $state<Record<string, boolean>>({});
  let dispatched = $state<Record<string, boolean>>({});
  let drawer = $state<DispatchDrawer>();
  let options = $state<DispatchOptions>();
  let drawerPlan = $state<PlanItem | null>(null);
  let pendingAudit = $state<{ planId: string; tags: string[] } | null>(null);

  function toggle(name: string, body: string) {
    if (expandedName === name) {
      expandedName = null;
    } else {
      expandedName = name;
      if (!(name in editBodies)) {
        editBodies[name] = body;
      }
    }
  }

  async function save(audit: { name: string; title: string; description?: string }, mode: 'direct' | 'pr') {
    saving[audit.name] = true;
    try {
      await updateAudit({
        organization: data.organization,
        repoName: data.repoName,
        name: audit.name,
        title: audit.title,
        description: audit.description,
        body: editBodies[audit.name] ?? '',
        mode,
      });
      await invalidateAll();
    } finally {
      saving[audit.name] = false;
    }
  }

  async function runAudit(audit: { name: string; title: string; body: string }) {
    creatingPlan[audit.name] = true;
    try {
      const result = await createPlanFromAudit({
        organization: data.organization,
        repoName: data.repoName,
        auditName: audit.name,
        auditTitle: audit.title,
        auditBody: audit.body,
      });

      const now = new Date().toISOString();
      drawerPlan = {
        id: result.id,
        title: `Audit: ${audit.title}`,
        body: audit.body,
        status: 'approved',
        authorType: 'human',
        tags: [
          Tags.Git.provider(data.provider),
          Tags.Git.repo(data.provider, `${data.organization}/${data.repoName}`),
          `type:audit-${audit.name}`,
        ],
        data: {},
        source: 'repository',
        sourceId: null,
        createdBy: null,
        parentEventId: null,
        timeCreated: now,
        timeUpdated: now,
      };
      pendingAudit = {
        planId: result.id,
        tags: [`plan:${result.id}`, ...drawerPlan.tags],
      };
      options!.open();
    } finally {
      creatingPlan[audit.name] = false;
    }
  }

  async function handleGenerate(options: Plan.ToPromptOptions) {
    if (!pendingAudit) return;
    const { planId, tags } = pendingAudit;
    const { prompt, tags: extTags } = await previewPrompt({
      organization: data.organization,
      repoName: data.repoName,
      planId,
      options,
    });
    drawer!.open({
      title: 'Dispatch Audit',
      prompt,
      tags: [...tags, ...extTags],
      planId,
    });
  }

  function handleDispatched() {
    if (drawerPlan) {
      const tag = drawerPlan.tags.find((t) => t.startsWith('type:audit-'));
      if (tag) {
        const auditName = tag.slice('type:audit-'.length);
        dispatched[auditName] = true;
      }
    }
    invalidateAll();
  }

  // Per-audit runs derived from data.runs
  type Run = (typeof data.runs)[number];
  const auditRunsMap = $derived.by(() => {
    const map: Record<string, Run[]> = {};
    for (const run of data.runs) {
      const tag = run.tags.find((t) => t.startsWith('type:audit-'));
      if (tag) {
        const name = tag.slice('type:audit-'.length);
        const list = (map[name] ??= []);
        list.push(run);
      }
    }
    return map;
  });

  const auditRuns = $derived(
    data.runs.filter((r) => r.type === 'audit'),
  );

  function extractAuditName(run: { tags: string[] }): string {
    const tag = run.tags.find((t) => t.startsWith('type:audit-'));
    return tag ? tag.slice('type:audit-'.length) : 'unknown';
  }

  function extractAgentName(run: { tags: string[]; data: Record<string, unknown> }): string {
    const agentTag = run.tags.find((t) => t.startsWith('agent:'));
    if (agentTag) return agentTag.slice('agent:'.length);
    const agentData = run.data?.agent;
    if (agentData && typeof agentData === 'object' && 'name' in agentData) {
      return String((agentData as { name: unknown }).name);
    }
    return '--';
  }

  function extractPlanId(run: { tags: string[] }): string | null {
    const tag = run.tags.find((t) => t.startsWith('plan:'));
    return tag ? tag.slice('plan:'.length) : null;
  }

  function formatDuration(run: { data: Record<string, unknown> }): string {
    const workflow = run.data?.workflow;
    if (workflow && typeof workflow === 'object' && 'durationMs' in workflow) {
      const ms = Number((workflow as { durationMs: unknown }).durationMs);
      if (Number.isNaN(ms)) return '--';
      if (ms < 1000) return `${ms}ms`;
      const secs = ms / 1000;
      if (secs < 60) return `${secs.toFixed(1)}s`;
      const mins = Math.floor(secs / 60);
      const remainSecs = Math.round(secs % 60);
      return `${mins}m ${remainSecs}s`;
    }
    return '--';
  }

  function formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
      ' ' +
      d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
</script>

<h2 class="page-heading">Audits</h2>

{#if data.audits.length === 0}
  <EmptyState icon="default" title="No audits found" description="Add audit scope files in .agents/audits/ to define what agents should review." />
{:else}
  <div class="audit-list">
    {#each data.audits as audit (audit.name)}
      {@const isExpanded = expandedName === audit.name}
      {@const isSaving = saving[audit.name] ?? false}
      {@const isCreating = creatingPlan[audit.name] ?? false}
      {@const isDispatched = dispatched[audit.name] ?? false}
      {@const runs = auditRunsMap[audit.name] ?? []}
      {@const recentRuns = runs.slice(0, 5)}
      <div class="audit-item" class:audit-expanded={isExpanded}>
        <button
          type="button"
          class="audit-row"
          onclick={() => toggle(audit.name, audit.body)}
        >
          <div class="audit-info">
            <span class="audit-title">{audit.title}</span>
            {#if audit.description}
              <span class="audit-description">{audit.description}</span>
            {/if}
          </div>
          <span class="audit-path">{audit.path}</span>
          <span class="expand-icon">{isExpanded ? '\u2212' : '+'}</span>
        </button>

        <!-- Mini timeline of recent runs -->
        <div class="audit-timeline">
          {#if recentRuns.length > 0}
            <div class="timeline-runs">
              {#each recentRuns as run (run.id)}
                {@const outcome = run.data?.outcome}
                <span
                  class="timeline-badge"
                  class:timeline-pass={outcome === 'pass'}
                  class:timeline-fail={outcome === 'fail'}
                  title="{outcome ?? 'no outcome'} - {formatTime(run.timeCreated)}"
                >
                  {outcome ?? '--'} <span class="timeline-time">{relativeTime(run.timeCreated)}</span>
                </span>
              {/each}
            </div>
          {:else}
            <span class="timeline-empty">No runs yet</span>
          {/if}

          <div class="audit-run-actions">
            {#if isDispatched}
              <span class="dispatched-badge">Dispatched</span>
            {/if}
            <button
              type="button"
              class="btn-run"
              onclick={() => runAudit(audit)}
              disabled={isCreating}
            >
              {isCreating ? 'Creating...' : 'Run Audit'}
            </button>
          </div>
        </div>

        {#if isExpanded}
          <div class="audit-body">
            <textarea
              class="audit-textarea"
              rows="14"
              value={editBodies[audit.name] ?? audit.body}
              oninput={(e) => { editBodies[audit.name] = e.currentTarget.value; }}
              disabled={isSaving}
            ></textarea>
            <div class="audit-actions">
              <button
                type="button"
                class="btn-save"
                onclick={() => save(audit, 'direct')}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                class="btn-pr"
                onclick={() => save(audit, 'pr')}
                disabled={isSaving}
              >
                {isSaving ? 'Opening...' : 'Open PR'}
              </button>
            </div>
          </div>
        {/if}
      </div>
    {/each}
  </div>
{/if}

{#if auditRuns.length > 0}
  <h2 class="page-heading section-gap">Recent Runs</h2>
  <div class="runs-table">
    <div class="runs-header">
      <span class="col-name">Audit</span>
      <span class="col-agent">Agent</span>
      <span class="col-outcome">Outcome</span>
      <span class="col-duration">Duration</span>
      <span class="col-time">Time</span>
    </div>
    {#each auditRuns as run (run.id)}
      {@const planId = extractPlanId(run)}
      {#if planId}
        <a
          class="runs-row runs-row-link"
          href="/{data.provider}/{data.organization}/{data.repoName}/agents/plans/{planId}"
        >
          <span class="col-name">{extractAuditName(run)}</span>
          <span class="col-agent">{extractAgentName(run)}</span>
          <span class="col-outcome">
            {#if run.data?.outcome}
              <span class="outcome-badge" class:outcome-pass={run.data.outcome === 'pass'} class:outcome-fail={run.data.outcome === 'fail'}>
                {run.data.outcome}
              </span>
            {:else}
              <span class="outcome-badge">--</span>
            {/if}
          </span>
          <span class="col-duration">{formatDuration(run)}</span>
          <span class="col-time">{formatTime(run.timeCreated)}</span>
        </a>
      {:else}
        <div class="runs-row">
          <span class="col-name">{extractAuditName(run)}</span>
          <span class="col-agent">{extractAgentName(run)}</span>
          <span class="col-outcome">
            {#if run.data?.outcome}
              <span class="outcome-badge" class:outcome-pass={run.data.outcome === 'pass'} class:outcome-fail={run.data.outcome === 'fail'}>
                {run.data.outcome}
              </span>
            {:else}
              <span class="outcome-badge">--</span>
            {/if}
          </span>
          <span class="col-duration">{formatDuration(run)}</span>
          <span class="col-time">{formatTime(run.timeCreated)}</span>
        </div>
      {/if}
    {/each}
  </div>
{/if}

<DispatchOptions
  bind:this={options}
  title="Prepare Audit Dispatch"
  onconfirm={handleGenerate}
/>

<DispatchDrawer
  bind:this={drawer}
  ondispatched={handleDispatched}
/>

<style>
  /* ------------------------------------------------------------------ */
  /* Page heading                                                        */
  /* ------------------------------------------------------------------ */
  .page-heading {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--color-dim);
    margin: 0 0 14px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .page-heading::after {
    content: '';
    flex: 1;
    border-top: 1px solid var(--color-border);
  }

  .section-gap {
    margin-top: 28px;
  }

  /* ------------------------------------------------------------------ */
  /* Audit list                                                          */
  /* ------------------------------------------------------------------ */
  .audit-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .audit-item {
    border: 1px solid var(--color-border);
    border-radius: 5px;
    background: var(--color-surface);
  }

  .audit-expanded {
    border-color: color-mix(in srgb, var(--color-accent) 30%, var(--color-border));
  }

  /* ------------------------------------------------------------------ */
  /* Audit row (clickable header)                                        */
  /* ------------------------------------------------------------------ */
  .audit-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    width: 100%;
    background: none;
    border: none;
    cursor: pointer;
    text-align: left;
  }

  .audit-row:hover {
    background: color-mix(in srgb, var(--color-text) 3%, transparent);
    border-radius: 4px;
  }

  .audit-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .audit-title {
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text);
  }

  .audit-description {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-muted);
    line-height: 1.4;
  }

  .audit-path {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
    flex: 1;
    text-align: right;
  }

  .expand-icon {
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    color: var(--color-muted);
    flex-shrink: 0;
  }

  /* ------------------------------------------------------------------ */
  /* Mini timeline (per-audit recent runs)                               */
  /* ------------------------------------------------------------------ */
  .audit-timeline {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px 12px 8px;
    flex-wrap: wrap;
  }

  .timeline-runs {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
    flex: 1;
    min-width: 0;
  }

  .timeline-badge {
    font-family: "JetBrains Mono", monospace;
    font-size: 9px;
    padding: 1px 5px;
    border-radius: 3px;
    background: var(--color-elevated);
    color: var(--color-muted);
    display: inline-flex;
    align-items: center;
    gap: 3px;
    white-space: nowrap;
  }

  .timeline-pass {
    background: color-mix(in srgb, var(--color-success) 12%, transparent);
    color: var(--color-success);
    border: 1px solid color-mix(in srgb, var(--color-success) 25%, transparent);
  }

  .timeline-fail {
    background: color-mix(in srgb, #e55 12%, transparent);
    color: #e55;
    border: 1px solid color-mix(in srgb, #e55 25%, transparent);
  }

  .timeline-time {
    color: var(--color-dim);
    font-size: 9px;
  }

  .timeline-empty {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
    flex: 1;
  }

  .audit-run-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  .dispatched-badge {
    font-family: "JetBrains Mono", monospace;
    font-size: 9px;
    padding: 1px 5px;
    border-radius: 3px;
    background: color-mix(in srgb, var(--color-success) 12%, transparent);
    color: var(--color-success);
    border: 1px solid color-mix(in srgb, var(--color-success) 25%, transparent);
  }

  .btn-run {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 2px 8px;
    border-radius: 4px;
    border: 1px solid color-mix(in srgb, var(--color-accent) 35%, transparent);
    background: color-mix(in srgb, var(--color-accent) 12%, transparent);
    color: var(--color-accent);
    cursor: pointer;
    transition: background 0.1s;
    white-space: nowrap;
  }

  .btn-run:hover {
    background: color-mix(in srgb, var(--color-accent) 20%, transparent);
  }

  .btn-run:disabled {
    opacity: 0.5;
    cursor: default;
  }

  /* ------------------------------------------------------------------ */
  /* Expanded body                                                       */
  /* ------------------------------------------------------------------ */
  .audit-body {
    border-top: 1px solid var(--color-border);
    padding: 12px 14px;
    background: var(--color-bg);
    border-radius: 0 0 4px 4px;
  }

  .audit-textarea {
    width: 100%;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-text);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 10px 12px;
    resize: vertical;
    line-height: 1.5;
    box-sizing: border-box;
  }

  .audit-textarea:focus {
    outline: none;
    border-color: color-mix(in srgb, var(--color-accent) 50%, var(--color-border));
  }

  .audit-textarea:disabled {
    opacity: 0.5;
  }

  /* ------------------------------------------------------------------ */
  /* Action buttons                                                      */
  /* ------------------------------------------------------------------ */
  .audit-actions {
    display: flex;
    gap: 8px;
    margin-top: 10px;
  }

  .btn-save {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    padding: 3px 10px;
    border-radius: 4px;
    border: 1px solid color-mix(in srgb, var(--color-accent) 35%, transparent);
    background: color-mix(in srgb, var(--color-accent) 12%, transparent);
    color: var(--color-accent);
    cursor: pointer;
    transition: background 0.1s;
  }

  .btn-save:hover {
    background: color-mix(in srgb, var(--color-accent) 20%, transparent);
  }

  .btn-save:disabled {
    opacity: 0.5;
    cursor: default;
  }

  .btn-pr {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    padding: 3px 10px;
    border-radius: 4px;
    border: 1px solid var(--color-border);
    background: transparent;
    color: var(--color-muted);
    cursor: pointer;
    transition: background 0.1s, color 0.1s;
  }

  .btn-pr:hover {
    background: color-mix(in srgb, var(--color-text) 5%, transparent);
    color: var(--color-text);
  }

  .btn-pr:disabled {
    opacity: 0.5;
    cursor: default;
  }

  /* ------------------------------------------------------------------ */
  /* Recent runs table                                                   */
  /* ------------------------------------------------------------------ */
  .runs-table {
    border: 1px solid var(--color-border);
    border-radius: 5px;
    overflow: hidden;
  }

  .runs-header,
  .runs-row {
    display: grid;
    grid-template-columns: 1fr 100px 80px 80px 140px;
    padding: 6px 12px;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    align-items: center;
  }

  .runs-header {
    background: var(--color-elevated);
    font-weight: 600;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-dim);
    border-bottom: 1px solid var(--color-border);
  }

  .runs-row {
    background: var(--color-surface);
    color: var(--color-text);
    border-bottom: 1px solid var(--color-border);
  }

  .runs-row:last-child {
    border-bottom: none;
  }

  a.runs-row-link {
    text-decoration: none;
    color: inherit;
    cursor: pointer;
  }

  a.runs-row-link:hover {
    background: color-mix(in srgb, var(--color-text) 3%, transparent);
  }

  .col-name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .col-agent {
    font-size: 10px;
    color: var(--color-muted);
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .col-outcome {
    text-align: center;
  }

  .col-duration {
    text-align: center;
    font-size: 10px;
    color: var(--color-dim);
  }

  .col-time {
    text-align: right;
    color: var(--color-dim);
    font-size: 10px;
  }

  .outcome-badge {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 3px;
    background: var(--color-elevated);
    color: var(--color-muted);
  }

  .outcome-pass {
    background: color-mix(in srgb, var(--color-success) 12%, transparent);
    color: var(--color-success);
    border: 1px solid color-mix(in srgb, var(--color-success) 25%, transparent);
  }

  .outcome-fail {
    background: color-mix(in srgb, #e55 12%, transparent);
    color: #e55;
    border: 1px solid color-mix(in srgb, #e55 25%, transparent);
  }
</style>
