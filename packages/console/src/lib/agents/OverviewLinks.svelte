<script lang="ts">
  let { organization, repoName }: { organization: string; repoName: string } = $props();

  const base = $derived(`/gh/${organization}/${repoName}`);

  const links = $derived([
    { label: "Plans", href: `${base}/agents/plans`, icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
    { label: "Agents", href: `${base}/agents`, icon: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" },
    { label: "Skills", href: `${base}/agents/skills`, icon: "M13 10V3L4 14h7v7l9-11h-7z" },
    { label: "Health", href: `${base}/health`, icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
    { label: "Issues", href: `${base}/issues`, icon: "M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
    { label: "Pull Requests", href: `${base}/pulls`, icon: "M4 6h16M4 12h16M4 18h7" },
  ]);
</script>

<div class="links-grid" role="navigation" aria-label="Quick links">
  {#each links as link (link.href)}
    <a href={link.href} class="link-tile" title="Go to {link.label}">
      <svg
        class="link-icon"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d={link.icon} />
      </svg>
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
    gap: 6px;
    padding: 7px 10px;
    border-radius: 4px;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    text-decoration: none;
    color: var(--color-muted);
    font-size: 11px;
    font-weight: 500;
    transition: background 0.1s, color 0.1s, border-color 0.1s;
  }

  .link-tile:hover {
    background: var(--color-elevated);
    color: var(--color-text);
    border-color: color-mix(in srgb, var(--color-accent) 30%, var(--color-border));
  }

  .link-icon {
    width: 14px;
    height: 14px;
    flex-shrink: 0;
    opacity: 0.6;
  }

  .link-tile:hover .link-icon {
    opacity: 1;
  }

  .link-label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (max-width: 500px) {
    .links-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
