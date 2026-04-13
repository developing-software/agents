<script lang="ts">
  import ArtifactCard from './ArtifactCard.svelte';

  type ArtifactInfo = {
    key: string;
    name: string;
    size: number;
    uploaded: string;
  };

  let {
    eventId,
    organization,
    repoName,
  }: {
    eventId: string;
    organization: string;
    repoName: string;
  } = $props();

  const artifactsPromise = $derived(
    fetch(`/gh/${organization}/${repoName}/events/artifact?eventId=${eventId}`)
      .then(r => r.ok ? r.json() as Promise<ArtifactInfo[]> : [] as ArtifactInfo[])
      .catch(() => [] as ArtifactInfo[])
  );
</script>

{#await artifactsPromise then artifacts}
  {#if artifacts.length > 0}
    <div class="section">
      <span class="section-heading">ARTIFACTS</span>
      <div class="artifact-list">
        {#each artifacts as artifact (artifact.key)}
          <ArtifactCard
            name={artifact.name}
            size={artifact.size}
            uploaded={artifact.uploaded}
            contentUrl={`/gh/${organization}/${repoName}/events/artifact?key=${encodeURIComponent(artifact.key)}`}
          />
        {/each}
      </div>
    </div>
  {/if}
{/await}

<style>
  .section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .section-heading {
    font-family: "JetBrains Mono", monospace;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--color-dim);
  }

  .artifact-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
</style>
