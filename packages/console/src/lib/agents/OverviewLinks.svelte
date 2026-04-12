<script lang="ts">
  let {
    organization,
    repoName,
  }: {
    organization: string;
    repoName: string;
  } = $props();

  const base = $derived(`/gh/${organization}/${repoName}`);

  const links = $derived([
    { label: "Plans", href: `${base}/agents/plans`, icon: "P" },
    { label: "Agents", href: `${base}/agents`, icon: "A" },
    { label: "Skills", href: `${base}/agents/skills`, icon: "S" },
    { label: "Health", href: `${base}/health`, icon: "H" },
    { label: "Issues", href: `${base}/issues`, icon: "I" },
    { label: "Pull Requests", href: `${base}/pulls`, icon: "R" },
  ]);
</script>

<div class="links-grid" role="navigation" aria-label="Quick links">
  {#each links as link (link.href)}
    <a href={link.href} class="link-tile" title="Go to {link.label}">
      <span class="link-icon" aria-hidden="true">{link.icon}</span>
      <span class="link-label">{link.label}</span>
    </a>
  {/each}
</div>

<style>
  .links-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  }

  .link-tile {
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 7px 10px;
    border-radius: 4px;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    text-decoration: none;
    transition: border-color 0.1s, background 0.1s;
  }

  .link-tile:hover {
    border-color: var(--color-accent);
    background: var(--color-hover);
  }

  .link-icon {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 3px;
    background: color-mix(in srgb, var(--color-accent) 12%, transparent);
    color: var(--color-accent);
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    font-weight: 700;
    flex-shrink: 0;
  }

  .link-label {
    font-size: 12px;
    color: var(--color-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
