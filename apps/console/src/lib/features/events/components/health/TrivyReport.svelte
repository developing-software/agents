<script lang="ts">
  import TrivyVulnReport from './TrivyVulnReport.svelte';

  interface Props {
    data: any;
  }

  let { data }: Props = $props();

  const reportType = $derived.by(() => {
    if (!data || typeof data !== 'object') return 'unknown';
    const results = Array.isArray(data.Results) ? data.Results : [];
    if (results.some((r: any) => Array.isArray(r.Vulnerabilities))) return 'vuln';
    if (results.some((r: any) => Array.isArray(r.Secrets))) return 'secret';
    return 'unknown';
  });

  interface SecretFinding {
    RuleID: string;
    Category?: string;
    Severity?: string;
    Title?: string;
    StartLine?: number;
    EndLine?: number;
  }

  interface SecretResult {
    Target: string;
    Class?: string;
    Secrets?: SecretFinding[];
  }

  const secretResults = $derived.by((): SecretResult[] => {
    if (reportType !== 'secret') return [];
    const results: SecretResult[] = Array.isArray(data.Results) ? data.Results : [];
    return results.filter((r) => Array.isArray(r.Secrets) && r.Secrets!.length > 0);
  });

  const SEV_COLORS: Record<string, string> = {
    CRITICAL: 'var(--color-danger, #ff5f56)',
    HIGH: '#ff8c42',
    MEDIUM: 'var(--color-warning, #f5b700)',
    LOW: 'var(--color-dim)',
  };

  function sevColor(sev: string | undefined): string {
    if (!sev) return 'var(--color-muted)';
    return SEV_COLORS[(sev ?? '').toUpperCase()] ?? 'var(--color-muted)';
  }
</script>

{#if reportType === 'vuln'}
  <TrivyVulnReport {data} />
{:else if reportType === 'secret'}
  <div class="secret-report">
    {#if secretResults.length === 0}
      <div class="empty">No secrets found.</div>
    {:else}
      {#each secretResults as result (result.Target)}
        <div class="target-block">
          <div class="target-header">
            <span class="target-path">{result.Target}</span>
            <span class="target-count">{result.Secrets!.length} {result.Secrets!.length === 1 ? 'secret' : 'secrets'}</span>
          </div>
          <div class="secret-list">
            {#each result.Secrets! as secret, i (secret.RuleID + '_' + i)}
              <div class="secret-row">
                <span
                  class="sev-badge"
                  style="color: {sevColor(secret.Severity)}; border-color: color-mix(in srgb, {sevColor(secret.Severity)} 40%, transparent)"
                >{secret.Severity ?? 'UNKNOWN'}</span>
                <span class="secret-rule">{secret.RuleID}</span>
                <span class="secret-title">{secret.Title ?? ''}</span>
                {#if secret.StartLine != null}
                  <span class="secret-line">:{secret.StartLine}</span>
                {/if}
              </div>
            {/each}
          </div>
        </div>
      {/each}
    {/if}
  </div>
{:else}
  <div class="fallback">
    <span class="fallback-text">Unknown Trivy report format.</span>
  </div>
{/if}

<style>
  .secret-report {
    font-family: "JetBrains Mono", monospace;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .target-block {
    border: 1px solid var(--color-border);
    border-radius: 3px;
    overflow: hidden;
    background: var(--color-elevated);
  }

  .target-header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    padding: 5px 8px;
    background: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
  }

  .target-path {
    font-size: 11px;
    color: var(--color-text);
    font-weight: 500;
    word-break: break-all;
    min-width: 0;
    flex: 1;
  }

  .target-count {
    font-size: 10px;
    color: var(--color-dim);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .secret-list {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .secret-row {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    border-bottom: 1px solid var(--color-border);
    flex-wrap: wrap;
  }

  .secret-row:last-child {
    border-bottom: none;
  }

  .sev-badge {
    font-size: 9px;
    padding: 1px 5px;
    border-radius: 2px;
    border: 1px solid var(--color-border);
    white-space: nowrap;
    line-height: 1.5;
    flex-shrink: 0;
  }

  .secret-rule {
    font-size: 10px;
    color: var(--color-muted);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .secret-title {
    font-size: 10px;
    color: var(--color-text);
    flex: 1;
    min-width: 0;
  }

  .secret-line {
    font-size: 9px;
    color: var(--color-dim);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .empty {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-dim);
    padding: 12px;
    text-align: center;
    border: 1px dashed var(--color-border);
    border-radius: 4px;
  }

  .fallback {
    font-family: "JetBrains Mono", monospace;
    padding: 12px;
  }

  .fallback-text {
    font-size: 11px;
    color: var(--color-muted);
  }
</style>
