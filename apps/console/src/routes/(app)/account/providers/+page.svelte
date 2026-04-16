<script lang="ts">
  import type { PageProps } from "./$types";
  import { enhance } from "$app/forms";

  let { data, form }: PageProps = $props();

  const providers = $derived(data.providers.filter((p) => p.provider !== "email"));
</script>

<section class="stack">
  <header>
    <h1>Linked providers</h1>
    <p class="muted">Sign-in methods connected to your account.</p>
  </header>

  {#if form?.message}
    <p class="error">{form.message}</p>
  {/if}

  <ul class="list">
    {#each providers as p (p.id)}
      <li class="row">
        <div>
          <div class="provider">{p.provider}</div>
          <div class="subject muted">{p.subject}</div>
        </div>
        <form method="POST" action="?/unlink" use:enhance>
          <input type="hidden" name="id" value={p.id} />
          <button type="submit" class="danger">Unlink</button>
        </form>
      </li>
    {:else}
      <li class="muted">No providers linked.</li>
    {/each}
  </ul>

  <p class="muted">Sign in with another provider using the same email to link it automatically.</p>
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
  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
  }
  .provider {
    font-weight: 600;
    text-transform: capitalize;
  }
  .subject {
    font-size: 0.75rem;
    font-family: var(--font-mono, monospace);
  }
  .error {
    color: var(--color-danger, #c00);
  }
  .danger {
    color: var(--color-danger, #c00);
    background: transparent;
    border: 1px solid var(--color-border);
    padding: 0.25rem 0.75rem;
    border-radius: 4px;
    cursor: pointer;
  }
</style>
