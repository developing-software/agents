<script lang="ts">
  import type { PageProps } from './$types';
  import WorkspaceSettingsNav from '$lib/workspace/WorkspaceSettingsNav.svelte';

  let { data }: PageProps = $props();

  const installUrl = $derived(
    data.appSlug
      ? `https://github.com/apps/${data.appSlug}/installations/new?state=${data.workspaceID}`
      : null,
  );
</script>

<section class="page">
  <header class="header">
    <div>
      <p class="eyebrow">workspace / integrations</p>
      <h1>GitHub</h1>
      <p class="muted">Link GitHub App installations to this workspace.</p>
    </div>
    {#if installUrl}
      <a class="install-link" href={installUrl}>Install GitHub App</a>
    {/if}
  </header>

  <WorkspaceSettingsNav
    workspaceID={data.workspaceID}
    workspaceName={data.workspace?.name ?? null}
  />

  {#if data.linked}
    <p class="notice success">Linked {data.linked} to this workspace.</p>
  {/if}

  {#if data.error === 'already_linked'}
    <p class="notice error">{data.org ?? 'This installation'} is already linked to another workspace.</p>
  {:else if data.error === 'installation_not_ready'}
    <p class="notice error">The installation webhook has not been processed yet. Retry from this page in a moment.</p>
  {/if}

  <section class="card">
    <h2>Claimed installations</h2>
    {#if data.installations.length === 0}
      <p class="muted">No Git installations are linked to this workspace yet.</p>
    {:else}
      <ul class="installation-list">
        {#each data.installations as installation (installation.id)}
          <li class="installation-row">
            <div>
              <div class="login">{installation.providerAccountLogin}</div>
              <div class="meta">
                <span>{installation.provider}</span>
                <span>{installation.accountType}</span>
                {#if !installation.active}
                  <span class="status">inactive</span>
                {/if}
              </div>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</section>

<style>
  .page {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.5rem;
    max-width: 56rem;
  }

  .header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }

  .eyebrow {
    margin: 0 0 0.25rem 0;
    color: var(--color-dim);
    font-family: "JetBrains Mono", monospace;
    font-size: 0.75rem;
  }

  h1 {
    margin: 0;
    font-size: 1.5rem;
  }

  h2 {
    margin: 0 0 0.75rem 0;
    font-size: 1rem;
  }

  .muted {
    color: var(--color-muted);
  }

  .install-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.625rem 0.9rem;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
    text-decoration: none;
    color: var(--color-text);
    background: var(--color-surface);
  }

  .install-link:hover {
    background: var(--color-elevated);
  }

  .notice {
    margin: 0;
    padding: 0.75rem 0.9rem;
    border-radius: 0.5rem;
    border: 1px solid var(--color-border);
  }

  .notice.success {
    border-color: color-mix(in srgb, var(--color-accent) 40%, var(--color-border));
  }

  .notice.error {
    border-color: color-mix(in srgb, #c84c4c 45%, var(--color-border));
  }

  .card {
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    padding: 1rem;
    background: var(--color-surface);
  }

  .installation-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .installation-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.875rem 1rem;
    border: 1px solid var(--color-border);
    border-radius: 0.625rem;
    background: var(--color-bg);
  }

  .login {
    font-weight: 600;
  }

  .meta {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    color: var(--color-muted);
    font-size: 0.85rem;
  }

  .status {
    color: #c84c4c;
  }

  @media (max-width: 640px) {
    .header {
      flex-direction: column;
    }
  }
</style>
