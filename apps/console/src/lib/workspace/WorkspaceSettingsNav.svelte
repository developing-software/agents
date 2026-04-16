<script lang="ts">
  import { page } from "$app/state";

  interface Props {
    workspaceID: string;
    workspaceName?: string | null;
  }

  let { workspaceID, workspaceName = null }: Props = $props();

  const items = $derived([
    {
      href: `/w/${workspaceID}/settings`,
      label: "Overview",
      match: "/settings",
      exact: true,
    },
    {
      href: `/w/${workspaceID}/settings/integrations`,
      label: "Integrations",
      match: "/settings/integrations",
      exact: false,
    },
    {
      href: `/w/${workspaceID}/settings/members`,
      label: "Members",
      match: "/settings/members",
      exact: false,
    },
  ]);
</script>

<section class="settings-shell" aria-label="Workspace settings navigation">
  <div class="settings-head">
    <a href={`/w/${workspaceID}`} class="back-link">Workspace</a>
    <div>
      <p class="eyebrow">settings</p>
      <p class="workspace-name">{workspaceName ?? workspaceID}</p>
    </div>
  </div>

  <nav class="settings-nav" aria-label="Workspace settings">
    {#each items as item (item.href)}
      {@const isActive = item.exact
        ? page.url.pathname === item.href
        : page.url.pathname.startsWith(item.href)}
      <a
        href={item.href}
        class="settings-link"
        class:settings-link-active={isActive}
      >
        {item.label}
      </a>
    {/each}
  </nav>
</section>

<style>
  .settings-shell {
    display: grid;
    gap: 0.75rem;
    padding: 0.95rem 1rem;
    border: 1px solid var(--color-border);
    border-radius: 0.85rem;
    background:
      linear-gradient(135deg, color-mix(in srgb, var(--color-accent) 10%, transparent), transparent 40%),
      var(--color-surface);
  }

  .settings-head {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    align-items: center;
  }

  .back-link,
  .eyebrow,
  .workspace-name {
    font-family: "JetBrains Mono", monospace;
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    min-height: 2rem;
    padding: 0 0.8rem;
    border-radius: 999px;
    border: 1px solid var(--color-border);
    text-decoration: none;
    color: var(--color-muted);
    background: var(--color-bg);
    font-size: 0.78rem;
  }

  .back-link:hover {
    color: var(--color-text);
    background: var(--color-elevated);
  }

  .eyebrow {
    margin: 0 0 0.15rem;
    font-size: 0.7rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-dim);
  }

  .workspace-name {
    margin: 0;
    font-size: 0.82rem;
    color: var(--color-text);
  }

  .settings-nav {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .settings-link {
    display: inline-flex;
    align-items: center;
    min-height: 2.1rem;
    padding: 0 0.8rem;
    border: 1px solid var(--color-border);
    border-radius: 999px;
    background: var(--color-surface);
    color: var(--color-muted);
    text-decoration: none;
    font-size: 0.85rem;
  }

  .settings-link:hover {
    color: var(--color-text);
    background: var(--color-elevated);
  }

  .settings-link-active {
    color: var(--color-text);
    border-color: color-mix(in srgb, var(--color-accent) 40%, var(--color-border));
    background: color-mix(in srgb, var(--color-accent) 12%, var(--color-surface));
  }

  @media (max-width: 640px) {
    .settings-head {
      align-items: start;
      flex-direction: column;
    }
  }
</style>
