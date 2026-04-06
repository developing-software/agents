<script lang="ts">
  import { originBadgeStyle, eventDotColor } from '../helpers';
  import TagList from '$lib/ui/tag/TagList.svelte';

  let {
    event,
    organization,
    repoName,
    onclose,
  }: {
    event: {
      id: string;
      type: string;
      origin: string;
      tags: string[];
      parentEventId: string | null;
      data: Record<string, unknown>;
      timeCreated: string;
    };
    organization: string;
    repoName: string;
    onclose: () => void;
  } = $props();

  // ── Derived ──────────────────────────────────────────────────────────

  const hasData = $derived(Object.keys(event.data).length > 0);
  const prettyData = $derived(hasData ? JSON.stringify(event.data, null, 2) : '');

  const formattedTime = $derived(
    new Date(event.timeCreated).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }),
  );

</script>

<div class="detail-panel">
  <!-- Header -->
  <div class="header">
    <span class="dot" style="background:{eventDotColor(event.type)};"></span>
    <span class="event-type">{event.type}</span>
    <span class="badge" style={originBadgeStyle(event.origin)}>{event.origin}</span>
    <button type="button" class="close-btn" onclick={onclose}>&times;</button>
  </div>

  <!-- Info grid -->
  <div class="info-grid">
    <span class="info-label">ID</span>
    <span class="info-value mono truncate">{event.id}</span>
    <span class="info-label">Parent</span>
    <span class="info-value mono">{event.parentEventId ?? '\u2014'}</span>
    <span class="info-label">Time</span>
    <span class="info-value">{formattedTime}</span>
  </div>

  <!-- Tags -->
  {#if event.tags.length > 0}
    <div class="section">
      <span class="section-heading">TAGS</span>
      <TagList tags={event.tags} />
    </div>
  {/if}

  <!-- Data -->
  {#if hasData}
    <div class="section">
      <span class="section-heading">DATA</span>
      <pre class="data-pre">{prettyData}</pre>
    </div>
  {/if}

</div>

<style>
  .detail-panel {
    margin: 2px 0 6px 13px;
    padding: 10px 12px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  /* ── Header ── */
  .header {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .event-type {
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    color: var(--color-text);
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .badge {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 1px 5px;
    border-radius: 3px;
    flex-shrink: 0;
    line-height: 1.6;
  }

  .close-btn {
    background: none;
    border: none;
    color: var(--color-dim);
    font-size: 16px;
    line-height: 1;
    cursor: pointer;
    padding: 0 2px;
    flex-shrink: 0;
  }
  .close-btn:hover {
    color: var(--color-text);
  }

  /* ── Info grid ── */
  .info-grid {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 2px 10px;
    font-size: 11px;
  }

  .info-label {
    color: var(--color-dim);
    font-family: "JetBrains Mono", monospace;
    white-space: nowrap;
  }

  .info-value {
    color: var(--color-muted);
    min-width: 0;
  }

  .mono {
    font-family: "JetBrains Mono", monospace;
  }

  .truncate {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* ── Sections ── */
  .section {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .section-heading {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--color-dim);
  }

  /* ── Tags ── */
  /* ── Data ── */
  .data-pre {
    margin: 0;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 3px;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    max-height: 200px;
    overflow-y: auto;
    padding: 8px;
    white-space: pre-wrap;
    word-break: break-word;
    color: var(--color-text);
  }

</style>
