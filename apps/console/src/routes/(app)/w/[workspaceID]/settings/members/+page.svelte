<script lang="ts">
  import type { ActionData, PageProps } from "./$types";
  import WorkspaceSettingsNav from "$lib/workspace/WorkspaceSettingsNav.svelte";

  let { data, form }: PageProps & { form: ActionData } = $props();
</script>

<div class="page">
  <header class="page-header">
    <div class="header-text">
      <p class="eyebrow">workspace · members</p>
      <h1>{data.workspace?.name ?? "Workspace members"}</h1>
      <p class="muted">Manage the people who can access this workspace.</p>
    </div>
  </header>

  <WorkspaceSettingsNav
    workspaceID={data.workspaceID}
    workspaceName={data.workspace?.name ?? null}
  />

  {#if form?.success}
    <p class="notice notice-success">Invitation recorded for {form.invitedEmail}.</p>
  {:else if form?.message}
    <p class="notice notice-error">{form.message}</p>
  {/if}

  {#if data.role === "admin"}
    <section class="panel">
      <h2 class="section-heading">Invite someone</h2>
      <p class="muted small">Invited emails appear immediately and are claimed when that account signs in.</p>

      <form method="POST" action="?/invite" class="invite-form">
        <label class="field field-email">
          <span>Email</span>
          <input name="email" type="email" placeholder="teammate@example.com" required />
        </label>
        <label class="field field-role">
          <span>Role</span>
          <select name="role">
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <button type="submit" class="btn-primary">Send invite</button>
      </form>
    </section>
  {/if}

  <section class="panel">
    <h2 class="section-heading">Members</h2>

    {#if data.members.length === 0}
      <p class="empty-text">No members yet.</p>
    {:else}
      <ul class="member-list">
        {#each data.members as member (member.id)}
          <li class="member-row">
            <div class="member-main">
              <p class="member-name">{member.name ?? member.email ?? member.id}</p>
              <p class="member-meta">
                <span>{member.email ?? "No email"}</span>
                <span class="sep">·</span>
                <span>{member.accountID ? "joined" : "invited"}</span>
              </p>
            </div>
            <div class="member-side">
              <span class="role-chip">{member.role}</span>
              {#if !member.accountID}
                <span class="chip chip-warning">pending</span>
              {/if}
            </div>
          </li>
        {/each}
      </ul>
    {/if}
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

  .small {
    font-size: 11px;
    margin-top: -6px;
    margin-bottom: 4px;
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

  .invite-form {
    display: grid;
    grid-template-columns: minmax(0, 1.6fr) minmax(120px, 0.8fr) auto;
    gap: 8px;
    align-items: end;
    margin-top: 8px;
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

  .invite-form input,
  .invite-form select {
    width: 100%;
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

  .btn-primary:hover {
    opacity: 0.9;
  }

  .empty-text {
    margin: 0;
    color: var(--color-dim);
    font-size: 12px;
  }

  .member-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
  }

  .member-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 1px solid var(--color-border);
  }

  .member-row:last-child {
    border-bottom: none;
  }

  .member-main {
    min-width: 0;
  }

  .member-name {
    margin: 0;
    font-size: 13px;
    font-weight: 500;
    color: var(--color-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .member-meta {
    margin: 2px 0 0;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    color: var(--color-muted);
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
  }

  .sep {
    color: var(--color-dim);
  }

  .member-side {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  .role-chip {
    display: inline-flex;
    align-items: center;
    padding: 3px 7px;
    border-radius: 3px;
    border: 1px solid var(--color-border);
    background: var(--color-bg);
    color: var(--color-muted);
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    padding: 3px 7px;
    border-radius: 3px;
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .chip-warning {
    background: var(--color-warning-dim);
    color: var(--color-warning);
  }

  @media (max-width: 720px) {
    .page {
      padding: 16px;
    }

    .invite-form {
      grid-template-columns: 1fr;
    }

    .btn-primary {
      width: 100%;
      min-height: 32px;
    }

    .member-row {
      flex-direction: column;
      align-items: flex-start;
    }

    .member-side {
      align-items: flex-start;
    }
  }
</style>
