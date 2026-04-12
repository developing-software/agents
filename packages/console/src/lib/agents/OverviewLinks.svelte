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
    { label: "Plans",   href: `${base}/agents/plans`,  title: "View plans" },
    { label: "Agents",  href: `${base}/agents`,         title: "View agents" },
    { label: "Skills",  href: `${base}/agents/skills`,  title: "View skills" },
    { label: "Health",  href: `${base}/health`,         title: "View health" },
    { label: "Issues",  href: `${base}/issues`,         title: "View issues" },
    { label: "PRs",     href: `${base}/pulls`,          title: "View pull requests" },
  ]);
</script>

<nav class="links-grid" aria-label="Repository quick links">
  {#each links as link (link.href)}
    <a href={link.href} class="link-tile" title={link.title} aria-label={link.title}>
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
    padding: 6px 4px;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    font-weight: 500;
    color: var(--color-muted);
    background: var(--color-elevated);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    text-decoration: none;
    transition: color 0.1s, border-color 0.1s, background 0.1s;
    white-space: nowrap;
  }

  .link-tile:hover {
    color: var(--color-text);
    border-color: var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 8%, var(--color-elevated));
  }
</style>
