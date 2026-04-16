<script lang="ts">
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
</script>

<svelte:head>
  <title>{data.workspace?.name ?? "Workspace"}</title>
</svelte:head>

<section class="page">
  <header class="hero">
    <div>
      <p class="eyebrow">workspace</p>
      <h1>{data.workspace?.name ?? data.workspaceID}</h1>
      <p class="muted">Choose a provider view or jump into workspace settings.</p>
    </div>
    <a href={`/w/${data.workspaceID}/settings`} class="settings-link">Open settings</a>
  </header>

  <section class="summary-grid">
    <article class="summary-card">
      <p class="summary-label">Repositories</p>
      <p class="summary-value">{data.repoCount}</p>
    </article>
    <article class="summary-card">
      <p class="summary-label">Providers</p>
      <p class="summary-value">{data.providers.length}</p>
    </article>
  </section>

  <section class="panel">
    <div class="panel-head">
      <div>
        <p class="panel-eyebrow">Providers</p>
        <h2>Repository views</h2>
      </div>
    </div>

    {#if data.providers.length === 0}
      <p class="muted">No repositories are linked to this workspace yet.</p>
      <a href={`/w/${data.workspaceID}/settings/integrations`} class="empty-link">
        Set up integrations
      </a>
    {:else}
      <div class="provider-grid">
        {#each data.providers as provider (provider.provider)}
          <a href={`/w/${data.workspaceID}/${provider.provider}`} class="provider-card">
            <div class="provider-top">
              <p class="provider-name">{provider.provider}</p>
              <span class="provider-arrow">›</span>
            </div>
            <p class="provider-meta">{provider.repoCount} repos</p>
            <p class="provider-meta">{provider.orgCount} orgs</p>
          </a>
        {/each}
      </div>
    {/if}
  </section>

  <section class="panel">
    <div class="panel-head">
      <div>
        <p class="panel-eyebrow">Settings</p>
        <h2>Workspace administration</h2>
      </div>
    </div>

    <div class="settings-grid">
      <a href={`/w/${data.workspaceID}/settings`} class="settings-card">
        <p class="settings-name">Overview</p>
        <p class="settings-desc">See workspace-level summaries and admin entry points.</p>
      </a>
      <a href={`/w/${data.workspaceID}/settings/integrations`} class="settings-card">
        <p class="settings-name">Integrations</p>
        <p class="settings-desc">Connect providers and manage installation linking.</p>
      </a>
      <a href={`/w/${data.workspaceID}/settings/members`} class="settings-card">
        <p class="settings-name">Members</p>
        <p class="settings-desc">Invite teammates and review access for this workspace.</p>
      </a>
    </div>
  </section>
</section>

<style>
  .page {
    display: grid;
    gap: 1rem;
    padding: 1.5rem;
    max-width: 60rem;
  }

  .hero {
    display: flex;
    justify-content: space-between;
    align-items: start;
    gap: 1rem;
  }

  .eyebrow,
  .panel-eyebrow,
  .summary-label,
  .provider-meta {
    margin: 0;
    font-family: "JetBrains Mono", monospace;
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-dim);
  }

  h1,
  h2,
  .summary-value,
  .provider-name,
  .settings-name {
    margin: 0;
    color: var(--color-text);
  }

  h1 {
    font-size: 1.6rem;
  }

  h2 {
    font-size: 1rem;
  }

  .muted,
  .settings-desc {
    margin: 0;
    color: var(--color-muted);
  }

  .settings-link,
  .empty-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 2.4rem;
    padding: 0 0.9rem;
    border: 1px solid var(--color-border);
    border-radius: 999px;
    background: var(--color-surface);
    color: var(--color-text);
    text-decoration: none;
  }

  .settings-link:hover,
  .empty-link:hover {
    background: var(--color-elevated);
  }

  .summary-grid,
  .provider-grid,
  .settings-grid {
    display: grid;
    gap: 0.9rem;
  }

  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .summary-card,
  .panel,
  .provider-card,
  .settings-card {
    border: 1px solid var(--color-border);
    background: var(--color-surface);
  }

  .summary-card {
    padding: 1rem;
    border-radius: 0.8rem;
  }

  .summary-value {
    font-size: 2rem;
    line-height: 1;
    font-weight: 600;
  }

  .panel {
    border-radius: 0.85rem;
    padding: 1rem;
    display: grid;
    gap: 0.9rem;
  }

  .provider-grid,
  .settings-grid {
    grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
  }

  .provider-card,
  .settings-card {
    display: grid;
    gap: 0.55rem;
    padding: 1rem;
    border-radius: 0.75rem;
    text-decoration: none;
  }

  .provider-card:hover,
  .settings-card:hover {
    border-color: color-mix(in srgb, var(--color-accent) 40%, var(--color-border));
    background: var(--color-elevated);
  }

  .provider-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }

  .provider-arrow {
    color: var(--color-dim);
    font-size: 1.2rem;
  }

  .settings-name {
    font-weight: 600;
  }

  @media (max-width: 640px) {
    .hero {
      flex-direction: column;
    }

    .summary-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
