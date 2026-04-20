<script lang="ts">
  let { base }: { base: string } = $props();

  const links = [
    { label: 'Plans', href: `${base}/agents/plans`, icon: 'PL' },
    { label: 'Agents', href: `${base}/agents`, icon: 'AG' },
    { label: 'Skills', href: `${base}/agents/skills`, icon: 'SK' },
    { label: 'Health', href: `${base}/health`, icon: 'HE' },
    { label: 'Issues', href: `${base}/issues`, icon: 'IS' },
    { label: 'Pull Requests', href: `${base}/pulls`, icon: 'PR' },
  ];
</script>

<section class="panel links-panel" aria-label="Quick Links">
  <h3 class="overview-heading">Quick Links</h3>
  <div class="links-grid">
    {#each links as link (link.href)}
      <a class="link-tile" href={link.href} title={link.label} aria-label={link.label}>
        <span class="link-icon" aria-hidden="true">{link.icon}</span>
        <span class="link-label">{link.label}</span>
      </a>
    {/each}
  </div>
</section>

<style>
  .panel {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 5px;
    padding: 12px 14px;
  }

  .links-panel {
    min-width: 0;
  }

  .overview-heading {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--color-dim);
    margin: 0 0 10px;
  }

  .links-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  @media (min-width: 1200px) {
    .links-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  .link-tile {
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 8px 10px;
    background: var(--color-elevated);
    text-decoration: none;
    color: var(--color-text);
    min-height: 36px;
    transition: border-color 0.1s, background 0.1s;
  }

  .link-tile:hover {
    border-color: color-mix(in srgb, var(--color-accent) 30%, var(--color-border));
    background: color-mix(in srgb, var(--color-accent) 8%, var(--color-elevated));
  }

  .link-icon {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-accent);
    border: 1px solid color-mix(in srgb, var(--color-accent) 30%, transparent);
    background: color-mix(in srgb, var(--color-accent) 10%, transparent);
    border-radius: 3px;
    padding: 1px 4px;
    line-height: 1;
  }

  .link-label {
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
