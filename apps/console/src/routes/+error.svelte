<script lang="ts">
  import { page } from '$app/state';

  const status = $derived(page.status);
  const message = $derived(page.error?.message ?? 'Unexpected error');

  const title = $derived.by(() => {
    if (status === 404) return 'Not found';
    if (status === 403) return 'Forbidden';
    if (status === 401) return 'Unauthorized';
    if (status >= 500) return 'Server error';
    return 'Something went wrong';
  });

  const hint = $derived.by(() => {
    if (status === 404) return 'The page you requested does not exist or has moved.';
    if (status === 403) return 'You do not have access to this resource.';
    if (status === 401) return 'Sign in to continue.';
    if (status >= 500) return 'An unexpected error occurred. Try again in a moment.';
    return 'The request could not be completed.';
  });
</script>

<div class="error-page">
  <div class="error-card">
    <div class="error-status">
      <span class="error-status-code">{status}</span>
      <span class="error-status-label">{title}</span>
    </div>

    <p class="error-message">{message}</p>
    <p class="error-hint">{hint}</p>

    <div class="error-actions">
      <a href="/" class="btn btn-primary">Go home</a>
      <button class="btn" onclick={() => history.back()}>Go back</button>
      {#if status === 401}
        <a href="/login" class="btn">Sign in</a>
      {/if}
    </div>
  </div>
</div>

<style>
  .error-page {
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;
    padding: 64px 24px;
    min-height: 60vh;
  }

  .error-card {
    width: 100%;
    max-width: 440px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 28px 32px;
  }

  .error-status {
    display: flex;
    align-items: baseline;
    gap: 12px;
    padding-bottom: 12px;
    margin-bottom: 16px;
    border-bottom: 1px solid var(--color-border);
  }

  .error-status-code {
    font-family: "JetBrains Mono", monospace;
    font-size: 32px;
    font-weight: 600;
    color: var(--color-danger);
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
  }

  .error-status-label {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-muted);
  }

  .error-message {
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    color: var(--color-text);
    background: var(--color-elevated);
    border: 1px solid var(--color-border);
    border-radius: 3px;
    padding: 8px 10px;
    margin: 0 0 12px;
    word-break: break-word;
    white-space: pre-wrap;
  }

  .error-hint {
    font-size: 12px;
    color: var(--color-muted);
    margin: 0 0 20px;
    line-height: 1.5;
  }

  .error-actions {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .btn {
    display: inline-flex;
    align-items: center;
    font-family: inherit;
    font-size: 12px;
    padding: 5px 12px;
    border-radius: 3px;
    border: 1px solid var(--color-border-bright);
    background: var(--color-surface);
    color: var(--color-text);
    text-decoration: none;
    cursor: pointer;
    transition: background 0.1s, border-color 0.1s;
  }

  .btn:hover {
    background: var(--color-hover);
  }

  .btn-primary {
    background: var(--color-accent);
    border-color: var(--color-accent);
    color: #fff;
  }

  .btn-primary:hover {
    opacity: 0.88;
    background: var(--color-accent);
  }
</style>
