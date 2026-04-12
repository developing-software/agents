<script lang="ts">
  interface Props {
    organization: string;
    repo: string;
  }


  let { organization, repo }: Props = $props();

  const links = $derived.by(() => [
    {
      label: 'Plans',
      href: `/gh/${organization}/${repo}/plans`,
      icon: '📋',
    },
    {
      label: 'Agents',
      href: `/gh/${organization}/${repo}/agents`,
      icon: '⚡',
    },
    {
      label: 'Skills',
      href: `/gh/${organization}/${repo}/skills`,
      icon: '🎯',
    },
    {
      label: 'Health',
      href: `/gh/${organization}/${repo}/health`,
      icon: '❤️',
    },
    {
      label: 'Issues',
      href: `/gh/${organization}/${repo}/issues`,
      icon: '📌',
    },
    {
      label: 'Pull Requests',
      href: `/gh/${organization}/${repo}/pulls`,
      icon: '🔀',
    },
  ]);
</script>

<div class="links-grid">
  {#each links as link (link.href)}
    <a href={link.href} class="link-tile">
      <span class="link-icon">{link.icon}</span>
      <span class="link-label">{link.label}</span>
    </a>
  {/each}
</div>

<style>
  .links-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(60px, 1fr));
    gap: 8px;
    margin-bottom: 12px;
  }

  .link-tile {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 10px 8px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-elevated);
    text-decoration: none;
    color: var(--color-text);
    font-size: 11px;
    font-weight: 500;
    transition: all 0.15s ease;
    cursor: pointer;
  }

  .link-tile:hover {
    background: var(--color-hover);
    border-color: var(--color-accent);
    color: var(--color-accent);
    transform: translateY(-1px);
  }

  .link-icon {
    font-size: 18px;
    line-height: 1;
  }

  .link-label {
    text-align: center;
    line-height: 1.2;
    white-space: normal;
  }
</style>
