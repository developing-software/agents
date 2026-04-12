<script lang="ts">
  interface Props {
    organization: string;
    repoName: string;
  }

  let { organization, repoName }: Props = $props();

  const base = $derived(`/gh/${organization}/${repoName}`);

  const links = $derived([
    {
      label: 'Plans',
      href: `${base}/agents/plans`,
      icon: '◈',
      description: 'Review and manage plans',
    },
    {
      label: 'Agents',
      href: `${base}/agents`,
      icon: '⬡',
      description: 'Dispatch and monitor agents',
    },
    {
      label: 'Skills',
      href: `${base}/agents/skills`,
      icon: '◇',
      description: 'Configure agent skills',
    },
    {
      label: 'Health',
      href: `${base}/health`,
      icon: '◉',
      description: 'CI and check results',
    },
    {
      label: 'Issues',
      href: `${base}/issues`,
      icon: '○',
      description: 'GitHub issues',
    },
    {
      label: 'Pull Requests',
      href: `${base}/pulls`,
      icon: '⬕',
      description: 'Open pull requests',
    },
  ]);
</script>

<div class="links-grid" role="navigation" aria-label="Quick links">
  {#each links as link (link.href)}
    <a href={link.href} class="link-tile" title={link.description} aria-label={link.label}>
      <span class="link-icon" aria-hidden="true">{link.icon}</span>
      <span class="link-label">{link.label}</span>
    </a>
  {/each}
</div>

<style>
  .links-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 6px;
  }

  @media (max-width: 700px) {
    .links-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  .link-tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 10px 6px 8px;
    background: var(--color-elevated);
    border: 1px solid var(--color-border);
    border-radius: 5px;
    text-decoration: none;
    transition: border-color 0.1s, background 0.1s;
  }

  .link-tile:hover {
    border-color: var(--color-accent);
    background: color-mix(in srgb, var(--color-accent) 6%, var(--color-elevated));
  }

  .link-icon {
    font-size: 14px;
    color: var(--color-dim);
    line-height: 1;
    transition: color 0.1s;
  }

  .link-tile:hover .link-icon {
    color: var(--color-accent);
  }

  .link-label {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    font-weight: 500;
    color: var(--color-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
    transition: color 0.1s;
  }

  .link-tile:hover .link-label {
    color: var(--color-accent);
  }
</style>
