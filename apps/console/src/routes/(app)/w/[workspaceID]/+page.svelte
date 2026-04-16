<script lang="ts">
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
</script>

<svelte:head>
  <title>{data.workspace?.name ?? "Workspace"}</title>
</svelte:head>

<div class="page">
  <header class="page-header">
    <div class="header-text">
      <p class="eyebrow">workspace</p>
      <h1>{data.workspace?.name ?? data.workspaceID}</h1>
      <p class="muted">Choose a provider view or jump into workspace settings.</p>
    </div>
    <a href={`/w/${data.workspaceID}/settings`} class="btn-secondary">Settings</a>
  </header>

  <div class="stats">
    <div class="stat">
      <p class="stat-label">Repositories</p>
      <p class="stat-value">{data.repoCount}</p>
    </div>
    <div class="stat">
      <p class="stat-label">Providers</p>
      <p class="stat-value">{data.providers.length}</p>
    </div>
  </div>

  <section class="panel">
    <h2 class="section-heading">Providers</h2>

    {#if data.providers.length === 0}
      <div class="empty">
        <p class="empty-text">No repositories are linked to this workspace yet.</p>
        <a href={`/w/${data.workspaceID}/settings/integrations`} class="btn-secondary">
          Set up integrations
        </a>
      </div>
    {:else}
      <div class="card-grid">
        {#each data.providers as provider (provider.provider)}
          <a href={`/w/${data.workspaceID}/${provider.provider}`} class="card">
            <div class="card-top">
              <p class="card-title">{provider.provider}</p>
              <span class="card-arrow">→</span>
            </div>
            <p class="card-meta">
              <span>{provider.repoCount} repos</span>
              <span class="sep">·</span>
              <span>{provider.orgCount} orgs</span>
            </p>
          </a>
        {/each}
      </div>
    {/if}
  </section>

  <section class="panel">
    <h2 class="section-heading">Administration</h2>

    <div class="card-grid">
      <a href={`/w/${data.workspaceID}/settings`} class="card">
        <p class="card-title">Overview</p>
        <p class="card-desc">Workspace-level summaries and admin entry points.</p>
      </a>
      <a href={`/w/${data.workspaceID}/settings/integrations`} class="card">
        <p class="card-title">Integrations</p>
        <p class="card-desc">Connect providers and manage installation linking.</p>
      </a>
      <a href={`/w/${data.workspaceID}/settings/members`} class="card">
        <p class="card-title">Members</p>
        <p class="card-desc">Invite teammates and review workspace access.</p>
      </a>
    </div>
  </section>
</div>

<style>
  .page {
    display: flex;
    flex-direction: column;
    gap: 20px;
    max-width: 1100px;
    margin: 0 auto;
    padding: 20px 24px 32px;
  }

  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
  }

  .header-text {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .eyebrow {
    margin: 0;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--color-dim);
  }

  h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--color-text);
  }

  .muted {
    margin: 0;
    color: var(--color-muted);
    font-size: 12px;
  }

  .section-heading {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--color-dim);
    margin: 0 0 12px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .section-heading::after {
    content: "";
    flex: 1;
    border-top: 1px solid var(--color-border);
  }

  .btn-secondary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 28px;
    padding: 0 12px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-surface);
    color: var(--color-text);
    font-size: 12px;
    text-decoration: none;
    white-space: nowrap;
    transition: background 0.1s, border-color 0.1s;
  }

  .btn-secondary:hover {
    background: var(--color-hover);
    border-color: var(--color-border-bright);
  }

  .stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 8px;
  }

  .stat {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px 14px;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background: var(--color-surface);
  }

  .stat-label {
    margin: 0;
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--color-dim);
  }

  .stat-value {
    margin: 0;
    font-size: 22px;
    font-weight: 600;
    color: var(--color-text);
    line-height: 1.1;
  }

  .panel {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 14px 16px;
  }

  .empty {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  .empty-text {
    margin: 0;
    color: var(--color-dim);
    font-size: 12px;
  }

  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 8px;
  }

  .card {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px 12px;
    border: 1px solid var(--color-border);
    border-radius: 5px;
    background: var(--color-bg);
    text-decoration: none;
    color: var(--color-text);
    transition: border-color 0.1s, background 0.1s;
  }

  .card:hover {
    border-color: var(--color-border-bright);
    background: var(--color-elevated);
  }

  .card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }

  .card-title {
    margin: 0;
    font-size: 13px;
    font-weight: 500;
    color: var(--color-text);
    text-transform: capitalize;
  }

  .card-arrow {
    color: var(--color-dim);
    font-size: 12px;
  }

  .card-meta {
    margin: 0;
    display: flex;
    gap: 6px;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-muted);
  }

  .sep {
    color: var(--color-dim);
  }

  .card-desc {
    margin: 0;
    color: var(--color-muted);
    font-size: 12px;
    line-height: 1.4;
  }

  @media (max-width: 640px) {
    .page {
      padding: 16px;
    }

    .page-header {
      flex-direction: column;
      align-items: stretch;
    }
  }
</style>
