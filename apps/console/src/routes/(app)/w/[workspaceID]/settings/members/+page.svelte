<script lang="ts">
  import type { ActionData, PageProps } from "./$types";
  import WorkspaceSettingsNav from "$lib/workspace/WorkspaceSettingsNav.svelte";

  let { data, form }: PageProps & { form: ActionData } = $props();
</script>

<section class="page">
  <header class="header">
    <div>
      <p class="eyebrow">workspace / members</p>
      <h1>{data.workspace?.name ?? "Workspace members"}</h1>
      <p class="muted">Manage the people who can access this workspace.</p>
    </div>
  </header>

  <WorkspaceSettingsNav
    workspaceID={data.workspaceID}
    workspaceName={data.workspace?.name ?? null}
  />

  {#if form?.success}
    <p class="notice success">Invitation recorded for {form.invitedEmail}.</p>
  {:else if form?.message}
    <p class="notice error">{form.message}</p>
  {/if}

  {#if data.role === 'admin'}
    <section class="card">
      <div class="card-header">
        <div>
          <h2>Invite someone</h2>
          <p class="muted">Invited emails appear immediately and are claimed when that account signs in.</p>
        </div>
      </div>

      <form method="POST" action="?/invite" class="invite-form">
        <label class="field field-wide">
          <span>Email</span>
          <input name="email" type="email" placeholder="teammate@example.com" required />
        </label>
        <label class="field">
          <span>Role</span>
          <select name="role">
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <button type="submit">Send invite</button>
      </form>
    </section>
  {/if}

  <section class="card">
    <div class="card-header">
      <div>
        <h2>Members</h2>
        <p class="muted">Active users and pending invitations for this workspace.</p>
      </div>
    </div>

    <ul class="member-list">
      {#each data.members as member (member.id)}
        <li class="member-row">
          <div class="member-main">
            <p class="member-name">{member.name ?? member.email ?? member.id}</p>
            <p class="member-meta">
              <span>{member.email ?? "No email"}</span>
              {#if member.accountID}
                <span>joined</span>
              {:else}
                <span>invited</span>
              {/if}
            </p>
          </div>
          <div class="member-side">
            <span class="role">{member.role}</span>
            {#if !member.accountID}
              <span class="pending">pending</span>
            {/if}
          </div>
        </li>
      {/each}
    </ul>
  </section>
</section>

<style>
  .page {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.5rem;
    max-width: 60rem;
  }

  .header,
  .card,
  .invite-form,
  .field {
    display: grid;
    gap: 0.75rem;
  }

  .eyebrow,
  .role,
  .pending {
    margin: 0;
    color: var(--color-dim);
    font-family: "JetBrains Mono", monospace;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  h1,
  h2,
  .member-name {
    margin: 0;
    color: var(--color-text);
  }

  h1 {
    font-size: 1.5rem;
  }

  h2 {
    font-size: 1rem;
  }

  .muted {
    margin: 0;
    color: var(--color-muted);
  }

  .notice {
    margin: 0;
    padding: 0.75rem 0.9rem;
    border: 1px solid var(--color-border);
    border-radius: 0.5rem;
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

  .card-header {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: start;
  }

  .invite-form {
    grid-template-columns: minmax(0, 1.8fr) minmax(10rem, 0.8fr) auto;
    align-items: end;
  }

  .field-wide {
    min-width: 0;
  }

  .field span {
    font-size: 0.85rem;
    color: var(--color-text);
  }

  input,
  select {
    width: 100%;
    min-height: 2.6rem;
    padding: 0.7rem 0.8rem;
    border-radius: 0.65rem;
    border: 1px solid var(--color-border);
    background: var(--color-bg);
    color: var(--color-text);
    font: inherit;
  }

  button {
    min-height: 2.6rem;
    padding: 0 1rem;
    border: 1px solid var(--color-border);
    border-radius: 999px;
    background: var(--color-accent);
    color: var(--color-bg);
    font: inherit;
    font-weight: 600;
    cursor: pointer;
  }

  .member-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .member-row {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: center;
    padding: 0.9rem 1rem;
    border: 1px solid var(--color-border);
    border-radius: 0.65rem;
    background: var(--color-bg);
  }

  .member-main {
    min-width: 0;
  }

  .member-name {
    font-weight: 600;
  }

  .member-meta {
    margin: 0.2rem 0 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    color: var(--color-muted);
    font-size: 0.85rem;
  }

  .member-side {
    display: flex;
    flex-direction: column;
    align-items: end;
    gap: 0.3rem;
  }

  .pending {
    color: #c84c4c;
  }

  @media (max-width: 720px) {
    .invite-form {
      grid-template-columns: 1fr;
    }

    button {
      width: 100%;
    }

    .member-row {
      align-items: start;
      flex-direction: column;
    }

    .member-side {
      align-items: start;
    }
  }
</style>
