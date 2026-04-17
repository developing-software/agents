<script lang="ts">
  let { base }: { base: string } = $props();

  const links = $derived([
    { label: "Plans", href: `${base}/agents/plans` },
    { label: "Agents", href: `${base}/agents` },
    { label: "Skills", href: `${base}/agents/skills` },
    { label: "Health", href: `${base}/health` },
    { label: "Issues", href: `${base}/issues` },
    { label: "Pull Requests", href: `${base}/pulls` },
  ]);
</script>

<nav class="links-grid" aria-label="Quick links">
  {#each links as link (link.label)}
    <a href={link.href} class="link-tile" title={link.label}>
      {link.label}
    </a>
  {/each}
</nav>

<style>
  .links-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }

  .link-tile {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 8px 6px;
    background: var(--color-elevated);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    text-decoration: none;
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-muted);
    text-align: center;
    transition:
      background 0.1s,
      border-color 0.1s,
      color 0.1s;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .link-tile:hover {
    background: var(--color-hover);
    border-color: var(--color-accent);
    color: var(--color-text);
  }
</style>
