<script lang="ts">
  import type { PageProps } from './$types';
  import EmptyState from '$lib/ui/EmptyState.svelte';

  let { data }: PageProps = $props();

  const allEmpty = $derived(
    data.agentsSkills.length === 0 && data.claudeSkills.length === 0,
  );
</script>

<svelte:head>
  <title>Skills — {data.organization}/{data.repoName}</title>
</svelte:head>

<h2 class="section-heading">Skills</h2>

{#if allEmpty}
  <EmptyState icon="skills" title="No skills found" description="Add skills in .agents/skills/ or .claude/skills/ to extend agent capabilities." />
{:else}
  {#if data.agentsSkills.length > 0}
    <div class="group">
      <span class="group-label">.agents/skills/</span>
      <div class="card-grid">
        {#each data.agentsSkills as skill (skill.id)}
          <div class="card">
            <div class="card-header">
              <span class="skill-name">{skill.name}</span>
              <span class="source-badge">{skill.source === '.agents' ? '.agents' : '.claude'}</span>
            </div>
            {#if skill.description}
              <p class="skill-description">{skill.description}</p>
            {/if}
            {#if skill.license}
              <span class="skill-license">{skill.license}</span>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}

  {#if data.claudeSkills.length > 0}
    <div class="group">
      <span class="group-label">.claude/skills/</span>
      <div class="card-grid">
        {#each data.claudeSkills as skill (skill.id)}
          <div class="card">
            <div class="card-header">
              <span class="skill-name">{skill.name}</span>
              <span class="source-badge">{skill.source === '.agents' ? '.agents' : '.claude'}</span>
            </div>
            {#if skill.description}
              <p class="skill-description">{skill.description}</p>
            {/if}
            {#if skill.license}
              <span class="skill-license">{skill.license}</span>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  {/if}
{/if}

<style>
  /* ------------------------------------------------------------------ */
  /* Section heading                                                     */
  /* ------------------------------------------------------------------ */
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
    content: '';
    flex: 1;
    border-top: 1px solid var(--color-border);
  }

  /* ------------------------------------------------------------------ */
  /* Empty state                                                         */
  /* ------------------------------------------------------------------ */
  .empty {
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    color: var(--color-dim);
    margin: 8px 0 0;
  }

  /* ------------------------------------------------------------------ */
  /* Group                                                               */
  /* ------------------------------------------------------------------ */
  .group {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 16px;
  }

  .group-label {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--color-dim);
  }

  /* ------------------------------------------------------------------ */
  /* Card grid                                                           */
  /* ------------------------------------------------------------------ */
  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 8px;
  }

  /* ------------------------------------------------------------------ */
  /* Card                                                                */
  /* ------------------------------------------------------------------ */
  .card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 5px;
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .card-header {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* ------------------------------------------------------------------ */
  /* Skill name                                                          */
  /* ------------------------------------------------------------------ */
  .skill-name {
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text);
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* ------------------------------------------------------------------ */
  /* Source badge                                                         */
  /* ------------------------------------------------------------------ */
  .source-badge {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 3px;
    background: var(--color-elevated);
    color: var(--color-muted);
    flex-shrink: 0;
    line-height: 1.6;
  }

  /* ------------------------------------------------------------------ */
  /* Description                                                         */
  /* ------------------------------------------------------------------ */
  .skill-description {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-muted);
    margin: 0;
    line-height: 1.5;
  }

  /* ------------------------------------------------------------------ */
  /* License                                                             */
  /* ------------------------------------------------------------------ */
  .skill-license {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    color: var(--color-dim);
  }
</style>
