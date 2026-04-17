<script lang="ts">
  import type { PageProps } from "./$types";
  import WorkspaceSettingsNav from "$lib/features/workspace/WorkspaceSettingsNav.svelte";

  let { data }: PageProps = $props();

  const installUrl = $derived(
    data.appSlug
      ? `https://github.com/apps/${data.appSlug}/installations/new?state=${data.workspaceID}`
      : null,
  );
</script>

<div class="page">
  <header class="page-header">
    <div class="header-text">
      <p class="eyebrow">workspace · integrations</p>
      <h1>GitHub</h1>
      <p class="muted">Link GitHub App installations to this workspace.</p>
    </div>
    {#if installUrl}
      <a class="btn-secondary" href={installUrl}>Install GitHub App</a>
    {/if}
  </header>

  <WorkspaceSettingsNav
    workspaceID={data.workspaceID}
    workspaceName={data.workspace?.name ?? null}
  />

  {#if data.linked}
    <p class="notice notice-success">Linked {data.linked} to this workspace.</p>
  {/if}

  {#if data.error === "already_linked"}
    <p class="notice notice-error">
      {data.org ?? "This installation"} is already linked to another workspace.
    </p>
  {:else if data.error === "installation_not_ready"}
    <p class="notice notice-error">
      The installation webhook has not been processed yet. Retry from this page in a moment.
    </p>
  {/if}

  <section class="panel">
    <h2 class="section-heading">Claimed installations</h2>

    {#if data.installations.length === 0}
      <p class="empty-text">No Git installations are linked to this workspace yet.</p>
    {:else}
      <ul class="installation-list">
        {#each data.installations as installation (installation.id)}
          <li class="installation-row">
            <div class="installation-main">
              <p class="installation-login">{installation.providerAccountLogin}</p>
              <p class="installation-meta">
                <span>{installation.provider}</span>
                <span class="sep">·</span>
                <span>{installation.accountType}</span>
              </p>
            </div>
            {#if !installation.active}
              <span class="chip chip-danger">inactive</span>
            {:else}
              <span class="chip chip-success">active</span>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
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

  .section-heading {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--color-dim);
    margin: 0 0 10px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .section-heading::after {
    content: "";
    flex: 1;
    border-top: 1px solid var(--color-border);
  }

  .notice {
    margin: 0;
    padding: 8px 12px;
    border: 1px solid var(--color-border);
    border-radius: 5px;
    font-size: 12px;
    background: var(--color-surface);
  }

  .notice-success {
    border-color: color-mix(in srgb, var(--color-success) 50%, var(--color-border));
    background: var(--color-success-dim);
  }

  .notice-error {
    border-color: color-mix(in srgb, var(--color-danger) 50%, var(--color-border));
    background: var(--color-danger-dim);
  }

  .panel {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 14px 16px;
  }

  .empty-text {
    margin: 0;
    color: var(--color-dim);
    font-size: 12px;
  }

  .installation-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
  }

  .installation-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid var(--color-border);
  }

  .installation-row:last-child {
    border-bottom: none;
  }

  .installation-main {
    min-width: 0;
  }

  .installation-login {
    margin: 0;
    font-size: 13px;
    font-weight: 500;
    color: var(--color-text);
  }

  .installation-meta {
    margin: 2px 0 0;
    display: flex;
    gap: 6px;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-muted);
  }

  .sep {
    color: var(--color-dim);
  }

  .chip {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    padding: 3px 7px;
    border-radius: 3px;
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .chip-success {
    background: var(--color-success-dim);
    color: var(--color-success);
  }

  .chip-danger {
    background: var(--color-danger-dim);
    color: var(--color-danger);
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
