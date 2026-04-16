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
      exact: true,
    },
    {
      href: `/w/${workspaceID}/settings/integrations`,
      label: "Integrations",
      exact: false,
    },
    {
      href: `/w/${workspaceID}/settings/members`,
      label: "Members",
      exact: false,
    },
  ]);
</script>

<nav class="settings-nav" aria-label="Workspace settings">
  <a href={`/w/${workspaceID}`} class="back-link" title={workspaceName ?? workspaceID}>
    <span class="back-arrow">←</span>
    <span class="back-label">{workspaceName ?? workspaceID}</span>
  </a>
  <div class="nav-sep"></div>
  <div class="nav-links">
    {#each items as item (item.href)}
      {@const isActive = item.exact
        ? page.url.pathname === item.href
        : page.url.pathname.startsWith(item.href)}
      <a
        href={item.href}
        class="nav-link"
        class:nav-link-active={isActive}
        aria-current={isActive ? "page" : undefined}
      >
        {item.label}
      </a>
    {/each}
  </div>
</nav>

<style>
  .settings-nav {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 2px;
    border-bottom: 1px solid var(--color-border);
    overflow-x: auto;
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 4px;
    color: var(--color-muted);
    text-decoration: none;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    white-space: nowrap;
    transition: color 0.1s;
  }

  .back-link:hover {
    color: var(--color-text);
  }

  .back-arrow {
    color: var(--color-dim);
  }

  .back-label {
    max-width: 180px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .nav-sep {
    width: 1px;
    height: 16px;
    background: var(--color-border);
    flex-shrink: 0;
  }

  .nav-links {
    display: flex;
    gap: 2px;
  }

  .nav-link {
    position: relative;
    display: inline-flex;
    align-items: center;
    padding: 8px 10px;
    font-size: 12px;
    color: var(--color-muted);
    text-decoration: none;
    white-space: nowrap;
    transition: color 0.1s;
  }

  .nav-link:hover {
    color: var(--color-text);
  }

  .nav-link-active {
    color: var(--color-text);
  }

  .nav-link-active::after {
    content: "";
    position: absolute;
    left: 8px;
    right: 8px;
    bottom: -1px;
    height: 2px;
    background: var(--color-accent);
    border-radius: 1px 1px 0 0;
  }
</style>
