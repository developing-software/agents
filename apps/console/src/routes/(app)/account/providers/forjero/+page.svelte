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

<section class="stack">
  <header>
    <h1>Connect Forgejo</h1>
    <p class="muted">
      Link a Forgejo (or Codeberg) account using a Personal Access Token. The PAT is stored as the
      installation reference and used as a Bearer token for API calls.
    </p>
  </header>

  {#if result}
    <p class="success">
      Connected as <strong>{result.login}</strong>. Synced {result.synced} repositories.
    </p>
  {/if}
  {#if errorMessage}
    <p class="error">{errorMessage}</p>
  {/if}

  <form onsubmit={handleSubmit}>
    <label>
      <span>Base URL</span>
      <input
        type="url"
        placeholder="https://codeberg.org"
        autocomplete="off"
        bind:value={baseUrl}
      />
      <small class="muted">Leave blank to use https://codeberg.org.</small>
    </label>

    <label>
      <span>Personal Access Token</span>
      <input
        type="password"
        required
        autocomplete="off"
        bind:value={token}
      />
      <small class="muted">
        Generate one in your Forgejo settings under Applications &rarr; Manage Access Tokens. Needs
        repo, issue, and webhook scopes.
      </small>
    </label>

    <label>
      <span>Webhook secret <em class="muted">(optional)</em></span>
      <input
        type="password"
        autocomplete="off"
        bind:value={webhookSecret}
      />
      <small class="muted">
        Used to verify the X-Forgejo-Signature header on incoming webhooks. Falls back to
        FORJERO_WEBHOOK_SECRET if not set.
      </small>
    </label>

    <button type="submit" disabled={submitting}>
      {submitting ? "Connecting..." : "Connect"}
    </button>
  </form>
</section>

<style>
  .stack {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    padding: 1.5rem;
    max-width: 36rem;
  }
  .muted {
    color: var(--color-muted);
  }
  form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }
  label > span {
    font-size: 0.85rem;
    font-weight: 600;
  }
  input {
    padding: 0.5rem 0.75rem;
    background: var(--color-surface);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    font-family: var(--font-mono, monospace);
    font-size: 0.85rem;
  }
  input:focus {
    outline: none;
    border-color: var(--color-accent);
  }
  small {
    font-size: 0.7rem;
  }
  button {
    align-self: flex-start;
    padding: 0.5rem 1rem;
    background: var(--color-accent);
    color: #fff;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 500;
  }
  button:disabled {
    opacity: 0.6;
    cursor: progress;
  }
  .error {
    color: var(--color-danger, #c00);
  }
  .success {
    color: var(--color-success, #0a0);
  }
</style>
