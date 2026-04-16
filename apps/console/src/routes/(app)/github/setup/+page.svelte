<script lang="ts">
  import type { PageProps } from "./$types";
  import { untrack } from "svelte";
  import { goto } from "$app/navigation";
  import { claimInstallation, createWorkspaceAndClaim } from "./setup.remote";

  let { data }: PageProps = $props();

  const REDIRECT_DELAY_MS = 1500;

  let workspaceName = $state(untrack(() => data.suggestedWorkspaceName));
  let submitting = $state<string | null>(null);
  let message = $state<string | null>(null);
  let success = $state<string | null>(null);

  function scheduleRedirect(redirectTo: string) {
    setTimeout(() => {
      goto(redirectTo);
    }, REDIRECT_DELAY_MS);
  }

  async function linkExisting(workspaceID: string) {
    submitting = workspaceID;
    message = null;
    success = null;
    try {
      const { redirectTo } = await claimInstallation({
        workspaceID,
        installationRef: data.installationRef,
      });
      success = "Linked. Redirecting to workspace settings…";
      scheduleRedirect(redirectTo);
    } catch (err) {
      message = err instanceof Error ? err.message : "Failed to link installation.";
      submitting = null;
    }
  }

  async function createAndLink(event: SubmitEvent) {
    event.preventDefault();
    submitting = "__create__";
    message = null;
    success = null;
    try {
      const { redirectTo } = await createWorkspaceAndClaim({
        name: workspaceName,
        installationRef: data.installationRef,
      });
      success = `Workspace "${workspaceName}" created. Redirecting…`;
      scheduleRedirect(redirectTo);
    } catch (err) {
      message = err instanceof Error ? err.message : "Failed to create workspace.";
      submitting = null;
    }
  }
</script>

<svelte:head>
  <title>Link GitHub Installation</title>
</svelte:head>

<div class="page">
  <section class="hero">
    <p class="eyebrow">github / setup</p>
    <h1>Choose a workspace for {data.installation?.providerAccountLogin ?? "this GitHub installation"}</h1>
    <p class="muted">
      GitHub sent this installation without a usable workspace destination. Pick where it should live, or create a new workspace and claim it immediately.
    </p>
  </section>

  {#if success}
    <p class="notice success">{success}</p>
  {/if}

  {#if message}
    <p class="notice error">{message}</p>
  {/if}

  {#if data.stateNeedsSelection}
    <p class="notice">
      The original workspace in the install flow was missing or unavailable for this session. Choose a destination below.
    </p>
  {/if}

  {#if !data.installation}
    <p class="notice">
      We have not received the installation from GitHub yet. Wait a moment, then refresh this page before claiming it.
    </p>
  {/if}

  <section class="panel">
    <div class="panel-header">
      <div>
        <p class="panel-eyebrow">Existing workspaces</p>
        <h2>Link to a workspace you already use</h2>
      </div>
    </div>

    {#if data.workspaces.length === 0}
      <p class="muted">No workspaces found for this session.</p>
    {:else}
      <div class="workspace-list">
        {#each data.workspaces as workspace (workspace.id)}
          <div class="workspace-card">
            <div>
              <p class="workspace-name">{workspace.name}</p>
              <p class="workspace-meta">{workspace.slug ?? workspace.id}</p>
            </div>
            <button
              type="button"
              onclick={() => linkExisting(workspace.id)}
              disabled={!data.installation || submitting !== null}
            >
              {submitting === workspace.id ? "Linking…" : "Link here"}
            </button>
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <section class="panel">
    <div class="panel-header">
      <div>
        <p class="panel-eyebrow">New workspace</p>
        <h2>Create one from this installation</h2>
      </div>
    </div>

    <form onsubmit={createAndLink} class="create-form">
      <label>
        <span>Workspace name</span>
        <input
          name="name"
          type="text"
          bind:value={workspaceName}
          placeholder="Workspace name"
          required
        />
      </label>
      <button type="submit" disabled={!data.installation || submitting !== null}>
        {submitting === "__create__" ? "Creating…" : "Create workspace and link"}
      </button>
    </form>
  </section>
</div>

<style>
  .page {
    max-width: 880px;
    margin: 0 auto;
    padding: 24px 20px 40px;
    display: grid;
    gap: 18px;
  }

  .hero {
    display: grid;
    gap: 8px;
  }

  .eyebrow,
  .panel-eyebrow,
  .workspace-meta {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .eyebrow,
  .panel-eyebrow {
    color: var(--color-dim);
    margin: 0;
  }

  h1,
  h2 {
    margin: 0;
    color: var(--color-text);
  }

  h1 {
    font-size: 28px;
    line-height: 1.1;
  }

  h2 {
    font-size: 17px;
  }

  .muted {
    color: var(--color-muted);
    margin: 0;
    max-width: 64ch;
  }

  .notice {
    margin: 0;
    padding: 12px 14px;
    border-radius: 8px;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text);
  }

  .notice.error {
    border-color: color-mix(in srgb, var(--color-danger) 45%, var(--color-border));
    background: color-mix(in srgb, var(--color-danger) 10%, var(--color-surface));
  }

  .notice.success {
    border-color: color-mix(in srgb, var(--color-success) 45%, var(--color-border));
    background: color-mix(in srgb, var(--color-success) 10%, var(--color-surface));
  }

  .panel {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 18px;
    display: grid;
    gap: 16px;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
  }

  .workspace-list {
    display: grid;
    gap: 10px;
  }

  .workspace-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    padding: 14px;
    border: 1px solid var(--color-border);
    border-radius: 10px;
    background: color-mix(in srgb, var(--color-surface) 85%, white 15%);
  }

  .workspace-name {
    margin: 0 0 4px;
    color: var(--color-text);
    font-size: 15px;
    font-weight: 600;
  }

  .workspace-meta {
    margin: 0;
    color: var(--color-dim);
  }

  .create-form {
    display: grid;
    gap: 14px;
  }

  label {
    display: grid;
    gap: 8px;
    color: var(--color-text);
    font-size: 13px;
  }

  input {
    width: 100%;
    min-height: 42px;
    padding: 10px 12px;
    border-radius: 10px;
    border: 1px solid var(--color-border);
    background: var(--color-background);
    color: var(--color-text);
    font: inherit;
  }

  button {
    justify-self: start;
    min-height: 40px;
    padding: 0 14px;
    border: 1px solid var(--color-border);
    border-radius: 999px;
    background: var(--color-accent);
    color: var(--color-background);
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  @media (max-width: 640px) {
    .page {
      padding-inline: 14px;
    }

    .workspace-card {
      align-items: start;
      flex-direction: column;
    }

    button {
      width: 100%;
      justify-self: stretch;
    }
  }
</style>
