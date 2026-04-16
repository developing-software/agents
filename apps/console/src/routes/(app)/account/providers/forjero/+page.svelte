<script lang="ts">
  import { connectForjero } from "./forjero.remote";

  let baseUrl = $state("");
  let token = $state("");
  let webhookSecret = $state("");
  let submitting = $state(false);
  let result = $state<{ ok: boolean; login: string; synced: number } | null>(null);
  let errorMessage = $state<string | null>(null);

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    submitting = true;
    errorMessage = null;
    result = null;
    try {
      const res = await connectForjero({
        baseUrl: baseUrl || undefined,
        personalAccessToken: token,
        webhookSecret: webhookSecret || undefined,
      });
      result = res;
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : "Failed to connect";
    } finally {
      submitting = false;
    }
  }
</script>

<svelte:head>
  <title>Connect Forgejo</title>
</svelte:head>

<div class="page">
  <header class="page-header">
    <a href="/account/providers" class="back-link">
      <span class="back-arrow">←</span>
      <span>Providers</span>
    </a>
    <p class="eyebrow">account · forgejo</p>
    <h1>Connect Forgejo</h1>
    <p class="muted">
      Link a Forgejo (or Codeberg) account using a Personal Access Token. The PAT is stored as the
      installation reference and used as a Bearer token for API calls.
    </p>
  </header>

  {#if result}
    <p class="notice notice-success">
      Connected as <strong>{result.login}</strong>. Synced {result.synced} repositories.
    </p>
  {/if}
  {#if errorMessage}
    <p class="notice notice-error">{errorMessage}</p>
  {/if}

  <section class="panel">
    <h2 class="section-heading">Connection</h2>

    <form onsubmit={handleSubmit} class="form">
      <label class="field">
        <span>Base URL</span>
        <input
          type="url"
          placeholder="https://codeberg.org"
          autocomplete="off"
          bind:value={baseUrl}
        />
        <small>Leave blank to use https://codeberg.org.</small>
      </label>

      <label class="field">
        <span>Personal Access Token</span>
        <input type="password" required autocomplete="off" bind:value={token} />
        <small>
          Generate one in your Forgejo settings under Applications → Manage Access Tokens. Needs
          repo, issue, and webhook scopes.
        </small>
      </label>

      <label class="field">
        <span>Webhook secret <em class="optional">(optional)</em></span>
        <input type="password" autocomplete="off" bind:value={webhookSecret} />
        <small>
          Used to verify the X-Forgejo-Signature header on incoming webhooks. Falls back to
          FORJERO_WEBHOOK_SECRET if not set.
        </small>
      </label>

      <div class="actions">
        <button type="submit" class="btn-primary" disabled={submitting}>
          {submitting ? "Connecting…" : "Connect"}
        </button>
      </div>
    </form>
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

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-muted);
    text-decoration: none;
    padding: 2px 0;
    margin-bottom: 4px;
    transition: color 0.1s;
    width: fit-content;
  }

  .back-link:hover {
    color: var(--color-text);
  }

  .back-arrow {
    color: var(--color-dim);
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
    line-height: 1.5;
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

  .notice {
    margin: 0;
    padding: 8px 12px;
    border: 1px solid var(--color-border);
    border-radius: 5px;
    font-size: 12px;
    background: var(--color-surface);
  }

  .notice strong {
    color: var(--color-text);
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

  .form {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .field > span {
    font-size: 11px;
    color: var(--color-muted);
    font-weight: 500;
  }

  .optional {
    font-style: normal;
    color: var(--color-dim);
    font-weight: 400;
  }

  .field small {
    font-size: 11px;
    color: var(--color-dim);
    line-height: 1.4;
  }

  .actions {
    display: flex;
    justify-content: flex-start;
    margin-top: 4px;
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

    .btn-primary {
      width: 100%;
      min-height: 32px;
    }
  }
</style>
