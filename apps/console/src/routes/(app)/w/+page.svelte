<script lang="ts">
  import type { ActionData, PageProps } from "./$types";

  let { data, form }: PageProps & { form: ActionData } = $props();
</script>

<svelte:head>
  <title>Workspaces</title>
</svelte:head>

<div class="page">
  <header class="hero">
    <div>
      <p class="eyebrow">workspace switcher</p>
      <h1>Choose a workspace</h1>
      <p class="muted">Pick where you want to work, or create a new workspace for a new team.</p>
    </div>
  </header>

  {#if form?.message}
    <p class="notice error">{form.message}</p>
  {/if}

  <section class="panel">
    <div class="section-header">
      <div>
        <p class="section-eyebrow">Available workspaces</p>
        <h2>Your memberships</h2>
      </div>
    </div>

    {#if data.workspaces.length === 0}
      <p class="muted">This session is not attached to any workspaces yet. Create one below.</p>
    {:else}
      <div class="workspace-grid">
        {#each data.workspaces as workspace (workspace.id)}
          <a class="workspace-card" href={`/w/${workspace.id}`}>
            <div>
              <p class="workspace-name">{workspace.name}</p>
              <p class="workspace-meta">{workspace.slug ?? workspace.id}</p>
            </div>
            {#if data.lastSeenWorkspaceID === workspace.id}
              <span class="badge">recent</span>
            {/if}
          </a>
        {/each}
      </div>
    {/if}
  </section>

  <section class="panel">
    <div class="section-header">
      <div>
        <p class="section-eyebrow">New workspace</p>
        <h2>Create a workspace</h2>
      </div>
    </div>

    <form method="POST" action="?/create" class="create-form">
      <label>
        <span>Workspace name</span>
        <input name="name" type="text" placeholder="Acme Engineering" required />
      </label>
      <button type="submit">Create workspace</button>
    </form>
  </section>
</div>

<style>
  .page {
    max-width: 72rem;
    margin: 0 auto;
    padding: 1.75rem 1.25rem 3rem;
    display: grid;
    gap: 1rem;
  }

  .hero,
  .panel,
  .create-form,
  label {
    display: grid;
    gap: 0.75rem;
  }

  .eyebrow,
  .section-eyebrow,
  .workspace-meta,
  .badge {
    font-family: "JetBrains Mono", monospace;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .eyebrow,
  .section-eyebrow,
  .workspace-meta {
    color: var(--color-dim);
    margin: 0;
  }

  h1,
  h2,
  .workspace-name {
    margin: 0;
    color: var(--color-text);
  }

  h1 {
    font-size: 2rem;
    line-height: 1;
  }

  h2 {
    font-size: 1.05rem;
  }

  .muted {
    margin: 0;
    color: var(--color-muted);
    max-width: 56ch;
  }

  .notice {
    margin: 0;
    padding: 0.8rem 0.9rem;
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    background: var(--color-surface);
  }

  .notice.error {
    border-color: color-mix(in srgb, #c84c4c 45%, var(--color-border));
  }

  .panel {
    padding: 1.1rem;
    border-radius: 0.9rem;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
  }

  .section-header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: start;
  }

  .workspace-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
    gap: 0.85rem;
  }

  .workspace-card {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: start;
    padding: 1rem;
    border-radius: 0.8rem;
    border: 1px solid var(--color-border);
    background: color-mix(in srgb, var(--color-surface) 88%, white 12%);
    text-decoration: none;
  }

  .workspace-card:hover {
    border-color: color-mix(in srgb, var(--color-accent) 40%, var(--color-border));
    background: var(--color-elevated);
  }

  .workspace-name {
    font-size: 1rem;
    font-weight: 600;
  }

  .badge {
    display: inline-flex;
    align-items: center;
    min-height: 1.7rem;
    padding: 0 0.55rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-accent) 14%, var(--color-surface));
    color: var(--color-text);
  }

  label span {
    font-size: 0.85rem;
    color: var(--color-text);
  }

  input {
    width: 100%;
    min-height: 2.7rem;
    padding: 0.75rem 0.85rem;
    border-radius: 0.75rem;
    border: 1px solid var(--color-border);
    background: var(--color-bg);
    color: var(--color-text);
    font: inherit;
  }

  button {
    justify-self: start;
    min-height: 2.5rem;
    padding: 0 0.95rem;
    border: 1px solid var(--color-border);
    border-radius: 999px;
    background: var(--color-accent);
    color: var(--color-bg);
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }

  @media (max-width: 640px) {
    .page {
      padding-inline: 0.9rem;
    }

    button {
      width: 100%;
      justify-self: stretch;
    }
  }
</style>
