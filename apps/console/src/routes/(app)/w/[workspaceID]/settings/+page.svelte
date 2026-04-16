<script lang="ts">
  import type { PageProps } from "./$types";
  import WorkspaceSettingsNav from "$lib/workspace/WorkspaceSettingsNav.svelte";

  let { data }: PageProps = $props();
</script>

<section class="page">
  <header class="header">
    <div>
      <p class="eyebrow">workspace / settings</p>
      <h1>{data.workspace?.name ?? "Settings"}</h1>
      <p class="muted">Workspace-level access, integrations, and team administration live here.</p>
    </div>
    <span class="role">{data.role}</span>
  </header>

  <WorkspaceSettingsNav
    workspaceID={data.workspaceID}
    workspaceName={data.workspace?.name ?? null}
  />

  <section class="overview-grid">
      <a href={`/w/${data.workspaceID}/settings/integrations`} class="overview-card">
        <div class="overview-top">
          <p class="card-label">Integrations</p>
          <p class="card-value">{data.installationCount}</p>
        </div>
        <p class="card-desc">Manage linked Git providers and installation claim flow.</p>
        <p class="card-meta">
          {#if data.inactiveInstallationCount > 0}
            {data.inactiveInstallationCount} inactive
          {:else}
            all active
          {/if}
        </p>
      </a>

      <a href={`/w/${data.workspaceID}/settings/members`} class="overview-card">
        <div class="overview-top">
          <p class="card-label">Members</p>
          <p class="card-value">{data.memberCount}</p>
        </div>
        <p class="card-desc">Review membership, invite teammates, and manage workspace access.</p>
        <p class="card-meta">
          {#if data.pendingInviteCount > 0}
            {data.pendingInviteCount} pending
          {:else}
            {data.adminCount} admins
          {/if}
        </p>
      </a>
  </section>
</section>

<style>
  .page {
    display: grid;
    gap: 1rem;
    padding: 1.5rem;
    max-width: 60rem;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    gap: 1rem;
  }

  .eyebrow,
  .role,
  .card-label,
  .card-meta {
    font-family: "JetBrains Mono", monospace;
  }

  .eyebrow,
  .card-label,
  .card-meta {
    margin: 0;
    font-size: 0.75rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-dim);
  }

  h1,
  .card-value {
    margin: 0;
    color: var(--color-text);
  }

  h1 {
    font-size: 1.6rem;
  }

  .muted,
  .card-desc {
    margin: 0;
    color: var(--color-muted);
  }

  .role {
    display: inline-flex;
    align-items: center;
    min-height: 2rem;
    padding: 0 0.75rem;
    border-radius: 999px;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text);
    font-size: 0.75rem;
    text-transform: uppercase;
  }

  .overview-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
    gap: 0.9rem;
  }

  .overview-card {
    display: grid;
    gap: 0.6rem;
    padding: 1rem;
    border-radius: 0.85rem;
    border: 1px solid var(--color-border);
    background:
      linear-gradient(160deg, color-mix(in srgb, var(--color-accent) 8%, transparent), transparent 45%),
      var(--color-surface);
    text-decoration: none;
  }

  .overview-card:hover {
    border-color: color-mix(in srgb, var(--color-accent) 40%, var(--color-border));
    background: var(--color-elevated);
  }

  .overview-top {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 1rem;
  }

  .card-value {
    font-size: 2rem;
    line-height: 1;
    font-weight: 600;
  }

  @media (max-width: 640px) {
    .header {
      flex-direction: column;
    }
  }
</style>
