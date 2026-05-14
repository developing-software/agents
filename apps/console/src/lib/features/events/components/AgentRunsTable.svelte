<script lang="ts">
  import {
    relativeTime,
    originBadgeStyle,
    issueRef,
    prRef,
    branchTag,
    workflowRef,
    capitalize,
    formatCost,
    formatDuration,
    formatTokensCompact,
  } from '../helpers';
  import ArtifactList from './feed/ArtifactList.svelte';
  import { repoContext } from '$lib/features/git/context.svelte';

  type AgentRun = {
    id: string;
    parentEventId: string | null;
    agent: string;
    finalMessage: string | null;
    model: string | null;
    cost_usd: number | null;
    input_tokens: number | null;
    output_tokens: number | null;
    reasoning_tokens: number | null;
    cache_read_tokens: number | null;
    cache_creation_tokens: number | null;
    turns: number | null;
    durationMs: number | null;
    linesAdded: number | null;
    linesRemoved: number | null;
    prUrl: string | null;
    runUrl: string | null;
    agentStatus: string | null;
    conclusion: string | null;
    provider: string | null;
    pricing_heuristic: string | null;
    checks: Array<{ category: string; name: string; outcome: string }>;
    origin: string;
    tags: string[];
    timeCreated: string;
  };

  let { runs }: { runs: AgentRun[] } = $props();

  const repo = repoContext.get();

  let expandedId = $state<string | null>(null);

  function toggleRow(id: string) {
    expandedId = expandedId === id ? null : id;
  }

  function runStatus(
    checks: Array<{ outcome: string }>,
    conclusion: string | null,
  ): 'pass' | 'fail' | 'cancelled' | 'none' {
    if (conclusion === 'cancelled') return 'cancelled';
    if (conclusion === 'failure') return 'fail';
    if (checks.length > 0 && !checks.every((c) => c.outcome === 'success')) return 'fail';
    if (checks.length > 0 || conclusion === 'success') return 'pass';
    return 'none';
  }

  function statusDotColor(status: 'pass' | 'fail' | 'cancelled' | 'none'): string {
    if (status === 'pass') return 'var(--color-success)';
    if (status === 'fail') return 'var(--color-danger)';
    if (status === 'cancelled') return 'var(--color-warning)';
    return 'var(--color-dim)';
  }
</script>

<table class="runs-table">
  <colgroup>
    <col class="col-dot" />
    <col class="col-agent" />
    <col class="col-model" />
    <col class="col-cost" />
    <col class="col-dur" />
    <col class="col-tokens" />
    <col class="col-turns" />
    <col class="col-origin" />
    <col class="col-ref" />
    <col class="col-time" />
  </colgroup>

  <thead>
    <tr class="header-row">
      <th></th>
      <th>Agent</th>
      <th>Model</th>
      <th>Cost</th>
      <th>Duration</th>
      <th>Tokens</th>
      <th>Turns</th>
      <th>Origin</th>
      <th>Ref</th>
      <th>Time</th>
    </tr>
  </thead>

  <tbody>
    {#each runs as run (run.id)}
      {@const status = runStatus(run.checks, run.conclusion)}
      {@const issue = issueRef(run.tags)}
      {@const pr = prRef(run.tags)}
      {@const branch = branchTag(run.tags)}
      {@const ghWorkflow = workflowRef(run.tags)}
      {@const isExpanded = expandedId === run.id}
      {@const estimated = run.pricing_heuristic !== null && run.pricing_heuristic !== 'agent-reported'}

      <tr
        class="run-row"
        class:run-row-expanded={isExpanded}
        onclick={() => toggleRow(run.id)}
        onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && toggleRow(run.id)}
        role="button"
        tabindex="0"
      >
        <td class="td-dot">
          <span class="status-dot" style="background:{statusDotColor(status)};"></span>
        </td>

        <td class="td-agent">{capitalize(run.agent)}</td>

        <td class="td-model">
          {#if run.model}
            <span class="model-name" title={run.model}>{run.model}</span>
          {/if}
        </td>

        <td class="td-cost">
          {#if run.cost_usd !== null}
            <span
              class="cost"
              class:cost-estimated={estimated}
              title={estimated ? 'Estimated from model pricing' : 'Agent-reported cost'}
            >{#if estimated}~{/if}{formatCost(run.cost_usd)}</span>
          {/if}
        </td>

        <td class="td-dur">
          {#if run.durationMs !== null}
            <span class="duration">{formatDuration(run.durationMs)}</span>
          {/if}
        </td>

        <td class="td-tokens">
          {#if run.input_tokens !== null || run.output_tokens !== null || run.reasoning_tokens !== null}
            <span class="tokens">
              {#if run.input_tokens !== null}{formatTokensCompact(run.input_tokens)} in{/if}
              {#if run.input_tokens !== null && (run.output_tokens !== null || run.reasoning_tokens !== null)}
                <span class="token-sep">/</span>
              {/if}
              {#if run.output_tokens !== null}{formatTokensCompact(run.output_tokens)} out{/if}
              {#if run.reasoning_tokens !== null}
                <span class="token-sep">/</span>
                {formatTokensCompact(run.reasoning_tokens)} rsn
              {/if}
            </span>
          {/if}
        </td>

        <td class="td-turns">
          {#if run.turns !== null}
            <span class="turns">{run.turns}t</span>
          {/if}
        </td>

        <td class="td-origin">
          <span class="badge" style={originBadgeStyle(run.origin)}>{run.origin}</span>
        </td>

        <td class="td-ref">
          {#if issue !== null}
            <a
              href="/{repo.provider}/{repo.organization}/{repo.repoName}/issues/{issue}"
              class="ref ref-issue"
              onclick={(ev) => ev.stopPropagation()}
            >#{issue}</a>
          {:else if pr !== null}
            <a
              href="/{repo.provider}/{repo.organization}/{repo.repoName}/pulls/{pr}"
              class="ref ref-pr"
              onclick={(ev) => ev.stopPropagation()}
            >#{pr}</a>
          {/if}
        </td>

        <td class="td-time">{relativeTime(run.timeCreated)}</td>
      </tr>

      {#if isExpanded}
        <tr class="detail-tr">
          <td colspan="10">
            <div class="detail-panel">
              {#if run.finalMessage}
                <div class="detail-section">
                  <span class="detail-label">Final message</span>
                  <pre class="final-message">{run.finalMessage}</pre>
                </div>
              {/if}

              {#if run.checks.length > 0}
                <div class="detail-section">
                  <span class="detail-label">Checks</span>
                  <div class="checks-list">
                    {#each run.checks as check (`${check.category}/${check.name}`)}
                      <div class="check-item">
                        <span
                          class="check-dot"
                          style="background:{check.outcome === 'success' ? 'var(--color-success)' : 'var(--color-danger)'};"
                        ></span>
                        <span class="check-category">{check.category}</span>
                        <span class="check-sep">/</span>
                        <span class="check-name">{check.name}</span>
                        <span
                          class="check-outcome"
                          class:check-passed={check.outcome === 'success'}
                          class:check-failed={check.outcome !== 'success'}
                        >{check.outcome}</span>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}

              <div class="detail-section">
                <span class="detail-label">Tokens</span>
                <div class="token-breakdown">
                  {#if run.input_tokens !== null}
                    <div class="token-row">
                      <span class="token-key">Input</span>
                      <span class="token-val">{run.input_tokens.toLocaleString()}</span>
                    </div>
                  {/if}
                  {#if run.output_tokens !== null}
                    <div class="token-row">
                      <span class="token-key">Output</span>
                      <span class="token-val">{run.output_tokens.toLocaleString()}</span>
                    </div>
                  {/if}
                  {#if run.reasoning_tokens !== null}
                    <div class="token-row">
                      <span class="token-key">Reasoning</span>
                      <span class="token-val">{run.reasoning_tokens.toLocaleString()}</span>
                    </div>
                  {/if}
                  {#if run.cache_read_tokens !== null}
                    <div class="token-row">
                      <span class="token-key">Cache read</span>
                      <span class="token-val">{run.cache_read_tokens.toLocaleString()}</span>
                    </div>
                  {/if}
                  {#if run.cache_creation_tokens !== null}
                    <div class="token-row">
                      <span class="token-key">Cache write</span>
                      <span class="token-val">{run.cache_creation_tokens.toLocaleString()}</span>
                    </div>
                  {/if}
                </div>
              </div>

              {#if run.provider || run.pricing_heuristic}
                <div class="detail-section">
                  <span class="detail-label">Pricing</span>
                  <div class="pricing-info">
                    {#if run.provider}
                      <div class="pricing-row">
                        <span class="pricing-key">Provider</span>
                        <span class="pricing-val">{run.provider}</span>
                      </div>
                    {/if}
                    {#if run.pricing_heuristic}
                      {@const isReported = run.pricing_heuristic === 'agent-reported'}
                      <div class="pricing-row">
                        <span class="pricing-key">Cost source</span>
                        <span class="pricing-val">
                          <span class="heuristic-dot" style="background:{isReported ? 'var(--color-success)' : 'var(--color-warning)'};"></span>
                          {isReported ? 'agent-reported' : run.pricing_heuristic === 'models-dev' ? 'estimated (model pricing)' : run.pricing_heuristic}
                        </span>
                      </div>
                    {/if}
                  </div>
                </div>
              {/if}

              {#if run.conclusion || run.agentStatus || branch || ghWorkflow !== null || run.linesAdded !== null || run.linesRemoved !== null || run.prUrl !== null || run.runUrl !== null}
                <div class="detail-section">
                  <span class="detail-label">Context</span>
                  <div class="context-items">
                    {#if run.conclusion}
                      <span
                        class="context-status"
                        class:status-success={run.conclusion === 'success'}
                        class:status-failure={run.conclusion === 'failure'}
                        class:status-cancelled={run.conclusion === 'cancelled'}
                      >workflow: {run.conclusion}</span>
                    {/if}
                    {#if run.agentStatus}
                      <span
                        class="context-status"
                        class:status-success={run.agentStatus === 'success'}
                        class:status-failure={run.agentStatus === 'failure'}
                        class:status-cancelled={run.agentStatus === 'cancelled'}
                      >agent: {run.agentStatus}</span>
                    {/if}
                    {#if branch}
                      <span class="context-branch">&#x2387; {branch}</span>
                    {/if}
                    {#if ghWorkflow !== null}
                      <span class="context-dim">workflow #{ghWorkflow}</span>
                    {/if}
                    {#if run.linesAdded !== null || run.linesRemoved !== null}
                      <span class="context-lines">
                        {#if run.linesAdded !== null}<span class="lines-added">+{run.linesAdded}</span>{/if}{#if run.linesAdded !== null && run.linesRemoved !== null} / {/if}{#if run.linesRemoved !== null}<span class="lines-removed">-{run.linesRemoved}</span>{/if}
                      </span>
                    {/if}
                    {#if run.prUrl !== null}
                      <a href={run.prUrl} class="context-link" target="_blank" rel="noopener">PR</a>
                    {/if}
                    {#if run.runUrl !== null}
                      <a href={run.runUrl} class="context-link" target="_blank" rel="noopener">GH Run</a>
                    {/if}
                  </div>
                </div>
              {/if}

              {#if run.tags.length > 0}
                <div class="detail-section">
                  <span class="detail-label">Tags</span>
                  <div class="tag-list">
                    {#each run.tags as tag (tag)}
                      <span class="tag-pill">{tag}</span>
                    {/each}
                  </div>
                </div>
              {/if}

              <ArtifactList eventId={run.id} />
            </div>
          </td>
        </tr>
      {/if}
    {/each}
  </tbody>
</table>

<style>
  .runs-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }

  /* Column widths — tokens column is auto (takes remaining) */
  .col-dot    { width: 20px; }
  .col-agent  { width: 100px; }
  .col-model  { width: 148px; }
  .col-cost   { width: 68px; }
  .col-dur    { width: 68px; }
  .col-turns  { width: 32px; }
  .col-origin { width: 64px; }
  .col-ref    { width: 40px; }
  .col-time   { width: 76px; }

  /* Header */
  .header-row th {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-dim);
    padding: 0 6px 6px;
    text-align: left;
    border-bottom: 1px solid var(--color-border);
    white-space: nowrap;
    overflow: hidden;
  }

  .header-row th.th-num {
    text-align: right;
  }

  /* Data rows */
  .run-row {
    cursor: pointer;
  }

  .run-row:hover td {
    background: color-mix(in srgb, var(--color-text) 3%, transparent);
  }

  .run-row-expanded td {
    background: color-mix(in srgb, var(--color-accent) 4%, transparent);
  }

  .run-row td,
  .detail-tr td {
    padding: 5px 6px;
    vertical-align: middle;
  }

  /* Dot column */
  .td-dot {
    text-align: center;
    padding-left: 2px !important;
    padding-right: 2px !important;
  }

  .status-dot {
    display: inline-block;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    vertical-align: middle;
  }

  /* Agent */
  .td-agent {
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Model */
  .model-name {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: block;
  }

  /* Cost */
  .td-cost {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .cost {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-accent);
  }

  .cost-estimated {
    color: var(--color-warning);
  }

  /* Duration */
  .td-dur {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .duration {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-text);
  }

  /* Tokens */
  .td-tokens {
    overflow: hidden;
  }

  .tokens {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: block;
    font-variant-numeric: tabular-nums;
  }

  .token-sep {
    color: var(--color-dim);
    margin: 0 2px;
  }

  /* Turns */
  .td-turns {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  .turns {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
  }

  /* Origin badge */
  .badge {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 1px 5px;
    border-radius: 3px;
    line-height: 1.6;
    white-space: nowrap;
  }

  /* Ref */
  .ref {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    text-decoration: none;
  }

  .ref:hover {
    text-decoration: underline;
  }

  .ref-issue { color: var(--color-success); }
  .ref-pr    { color: var(--color-merged); }

  /* Time */
  .td-time {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-dim);
    text-align: right;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  /* Detail expansion row */
  .detail-tr td {
    padding: 0 !important;
  }

  .detail-panel {
    padding: 4px 8px 10px 26px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .detail-section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .detail-label {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-dim);
  }

  .final-message {
    margin: 0;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 3px;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    line-height: 1.5;
    max-height: 220px;
    overflow-y: auto;
    padding: 8px 10px;
    white-space: pre-wrap;
    word-break: break-word;
    color: var(--color-text);
  }

  .checks-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .check-item {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .check-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .check-category {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-muted);
  }

  .check-sep {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
  }

  .check-name {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-text);
  }

  .check-outcome {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    margin-left: auto;
    font-variant-numeric: tabular-nums;
  }

  .check-passed { color: var(--color-success); }
  .check-failed { color: var(--color-danger); }

  .token-breakdown {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .token-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .token-key {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-muted);
    width: 72px;
    flex-shrink: 0;
  }

  .token-val {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-text);
    font-variant-numeric: tabular-nums;
  }

  .pricing-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .pricing-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .pricing-key {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-muted);
    width: 72px;
    flex-shrink: 0;
  }

  .pricing-val {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-text);
    display: flex;
    align-items: center;
    gap: 5px;
  }

  .heuristic-dot {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .context-items {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }

  .context-branch {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-muted);
  }

  .context-dim {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
  }

  .context-status {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
  }

  .status-success  { color: var(--color-success); }
  .status-failure  { color: var(--color-danger); }
  .status-cancelled { color: var(--color-warning); }

  .context-lines {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    font-variant-numeric: tabular-nums;
  }

  .lines-added   { color: var(--color-success); }
  .lines-removed { color: var(--color-danger); }

  .context-link {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-accent);
    text-decoration: none;
  }

  .context-link:hover {
    text-decoration: underline;
  }

  .tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  }

  .tag-pill {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 0 4px;
    border-radius: 3px;
    border: 1px solid var(--color-border);
    background: var(--color-elevated);
    color: var(--color-muted);
    line-height: 1.6;
  }
</style>
