<script lang="ts">
  import type { PageProps } from "./$types";
  import { createWorkspace } from "$lib/features/workspace/api/workspaces.remote";

  let { data }: PageProps = $props();
</script>

<svelte:head>
  <title>Workspaces</title>
</svelte:head>

<div class="page">
  <header class="page-header">
    <p class="eyebrow">workspaces</p>
    <h1>Choose a workspace</h1>
    <p class="muted">Pick where you want to work, or create a new workspace for a new team.</p>
  </header>

  <section class="panel">
    <h2 class="section-heading">Your memberships</h2>

    {#if data.workspaces.length === 0}
      <p class="empty-text">This session is not attached to any workspaces yet. Create one below.</p>
    {:else}
      <div class="workspace-grid">
        {#each data.workspaces as workspace (workspace.id)}
          <a class="workspace-card" href={`/w/${workspace.id}`}>
            <div class="workspace-main">
              <p class="workspace-name">{workspace.name}</p>
              <p class="workspace-meta">{workspace.slug ?? workspace.id}</p>
            </div>
            {#if data.lastSeenWorkspaceID === workspace.id}
              <span class="chip">recent</span>
            {/if}
          </a>
        {/each}
      </div>
    {/if}
  </section>

  <section class="panel">
    <h2 class="section-heading">Create a workspace</h2>

    <form {...createWorkspace} class="create-form">
      <label class="field">
        <span>Workspace name</span>
        <input {...createWorkspace.fields.name.as("text")} placeholder="Acme Engineering" />
        {#each createWorkspace.fields.name.issues() as issue (issue.message)}
          <small class="issue">{issue.message}</small>
        {/each}
      </label>
      <button type="submit" class="btn-primary" disabled={!!createWorkspace.pending}>
        {createWorkspace.pending ? "Creating…" : "Create workspace"}
      </button>
    </form>
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
    flex-direction: column;
    gap: 4px;
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

  .workspace-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 8px;
  }

  .workspace-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 12px;
    border: 1px solid var(--color-border);
    border-radius: 5px;
    background: var(--color-bg);
    text-decoration: none;
    color: var(--color-text);
    transition: border-color 0.1s, background 0.1s;
  }

  .workspace-card:hover {
    border-color: var(--color-border-bright);
    background: var(--color-elevated);
  }

  .workspace-main {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .workspace-name {
    margin: 0;
    font-size: 13px;
    font-weight: 500;
    color: var(--color-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .workspace-meta {
    margin: 0;
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .chip {
    flex-shrink: 0;
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 2px 6px;
    border-radius: 3px;
    background: var(--color-accent-dim);
    color: var(--color-accent);
  }

  .create-form {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
    align-items: end;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .field > span {
    font-size: 11px;
    color: var(--color-muted);
  }

  .create-form input {
    width: 100%;
  }

  .issue {
    color: var(--color-danger);
    font-size: 11px;
  }

  .btn-primary {
    min-height: 28px;
    padding: 0 14px;
    border: 1px solid var(--color-accent);
    border-radius: 4px;
    background: var(--color-accent);
    color: #fff;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.1s;
  }

  .btn-primary:hover:not(:disabled) {
    opacity: 0.9;
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: progress;
  }

  @media (max-width: 640px) {
    .page {
      padding: 16px;
    }

    .create-form {
      grid-template-columns: 1fr;
    }

    .btn-primary {
      width: 100%;
      min-height: 32px;
    }
  }
</style>
