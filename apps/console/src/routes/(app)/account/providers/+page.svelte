<script lang="ts">
  import type { PageProps } from "./$types";
  import { enhance } from "$app/forms";

  let { data, form }: PageProps = $props();

  const providers = $derived(data.providers.filter((p) => p.provider !== "email"));
</script>

<svelte:head>
  <title>Linked providers</title>
</svelte:head>

<div class="page">
  <header class="page-header">
    <p class="eyebrow">account</p>
    <h1>Linked providers</h1>
    <p class="muted">Sign-in methods connected to your account.</p>
  </header>

  {#if form?.message}
    <p class="notice notice-error">{form.message}</p>
  {/if}

  <section class="panel">
    <h2 class="section-heading">Providers</h2>

    {#if providers.length === 0}
      <p class="empty-text">No providers linked.</p>
    {:else}
      <ul class="provider-list">
        {#each providers as p (p.id)}
          <li class="provider-row">
            <div class="provider-main">
              <p class="provider-name">{p.provider}</p>
              <p class="provider-subject">{p.subject}</p>
            </div>
            <form method="POST" action="?/unlink" use:enhance>
              <input type="hidden" name="id" value={p.id} />
              <button type="submit" class="btn-danger">Unlink</button>
            </form>
          </li>
        {/each}
      </ul>
    {/if}

    <p class="hint">
      Sign in with another provider using the same email to link it automatically.
    </p>
  </section>

  <section class="panel">
    <h2 class="section-heading">Add a provider</h2>
    <ul class="connect-list">
      <li>
        <a href="/account/providers/forjero" class="connect-row">
          <div class="connect-main">
            <p class="connect-name">Forgejo / Codeberg</p>
            <p class="connect-desc">Link via Personal Access Token for self-hosted Forgejo instances.</p>
          </div>
          <span class="connect-arrow">→</span>
        </a>
      </li>
    </ul>
  </section>
</div>

<style>
  .page {
    display: flex;
    flex-direction: column;
    gap: 20px;
    max-width: 720px;
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

  .empty-text,
  .hint {
    margin: 0;
    color: var(--color-dim);
    font-size: 12px;
  }

  .hint {
    margin-top: 10px;
  }

  .provider-list,
  .connect-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
  }

  .provider-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid var(--color-border);
  }

  .provider-row:last-child {
    border-bottom: none;
  }

  .provider-main {
    min-width: 0;
  }

  .provider-name {
    margin: 0;
    font-size: 13px;
    font-weight: 500;
    color: var(--color-text);
    text-transform: capitalize;
  }

  .provider-subject {
    margin: 2px 0 0;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-dim);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .btn-danger {
    min-height: 26px;
    padding: 0 10px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: transparent;
    color: var(--color-danger);
    font-size: 12px;
    cursor: pointer;
    transition: background 0.1s, border-color 0.1s;
  }

  .btn-danger:hover {
    background: var(--color-danger-dim);
    border-color: color-mix(in srgb, var(--color-danger) 50%, var(--color-border));
  }

  .connect-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 12px;
    margin: 4px 0;
    border: 1px solid var(--color-border);
    border-radius: 5px;
    background: var(--color-bg);
    text-decoration: none;
    color: var(--color-text);
    transition: border-color 0.1s, background 0.1s;
  }

  .connect-row:hover {
    border-color: var(--color-border-bright);
    background: var(--color-elevated);
  }

  .connect-main {
    min-width: 0;
  }

  .connect-name {
    margin: 0;
    font-size: 13px;
    font-weight: 500;
  }

  .connect-desc {
    margin: 2px 0 0;
    color: var(--color-muted);
    font-size: 12px;
  }

  .connect-arrow {
    color: var(--color-dim);
    font-size: 14px;
    flex-shrink: 0;
  }

  @media (max-width: 640px) {
    .page {
      padding: 16px;
    }
  }
</style>
