<script lang="ts">
  import type { PageProps } from "./$types";
  import WorkspaceSettingsNav from "$lib/features/workspace/WorkspaceSettingsNav.svelte";

  let { data }: PageProps = $props();
</script>

<svelte:head>
  <title>Settings — {data.workspace?.name ?? 'Workspace'}</title>
</svelte:head>

<div class="page">
  <header class="page-header">
    <div class="header-text">
      <p class="eyebrow">workspace · settings</p>
      <h1>{data.workspace?.name ?? "Settings"}</h1>
      <p class="muted">Workspace-level access, integrations, and team administration.</p>
    </div>
    <span class="role-chip">{data.role}</span>
  </header>

  <WorkspaceSettingsNav
    workspaceID={data.workspaceID}
    workspaceName={data.workspace?.name ?? null}
  />

  <div class="card-grid">
    <a href={`/w/${data.workspaceID}/settings/integrations`} class="card">
      <div class="card-top">
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

    <a href={`/w/${data.workspaceID}/settings/members`} class="card">
      <div class="card-top">
        <p class="card-label">Members</p>
        <p class="card-value">{data.memberCount}</p>
      </div>
      <p class="card-desc">Review membership, invite teammates, and manage access.</p>
      <p class="card-meta">
        {#if data.pendingInviteCount > 0}
          {data.pendingInviteCount} pending
        {:else}
          {data.adminCount} admin{data.adminCount === 1 ? "" : "s"}
        {/if}
      </p>
    </a>
  </div>
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

  .role-chip {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    padding: 4px 8px;
    border-radius: 3px;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-muted);
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 10px;
  }

  .card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 14px 16px;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    background: var(--color-surface);
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
    align-items: flex-end;
    justify-content: space-between;
    gap: 12px;
  }

  .card-label {
    margin: 0;
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--color-dim);
  }

  .card-value {
    margin: 0;
    font-size: 22px;
    font-weight: 600;
    line-height: 1;
    color: var(--color-text);
  }

  .card-desc {
    margin: 0;
    color: var(--color-muted);
    font-size: 12px;
    line-height: 1.4;
  }

  .card-meta {
    margin: 0;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-dim);
  }

  @media (max-width: 640px) {
    .page {
      padding: 16px;
    }

    .page-header {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
