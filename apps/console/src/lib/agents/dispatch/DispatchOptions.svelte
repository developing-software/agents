<script lang="ts">
  import { onClickOutside } from 'runed';
  import type { Plan } from '@agents/core/events/plan';
  import { isNonLatinLevel } from '@agents/core/events/plan/extensions/caveman';

  let {
    title = 'Prepare Dispatch',
    onconfirm,
  }: {
    title?: string;
    onconfirm: (opts: Plan.ToPromptOptions) => Promise<void> | void;
  } = $props();

  type CavemanLevel = NonNullable<Plan.ToPromptOptions['caveman']>;
  const CAVEMAN_OPTIONS: { value: CavemanLevel; label: string }[] = [
    { value: 'lite', label: 'lite — no filler, full sentences' },
    { value: 'full', label: 'full — drop articles, fragments OK' },
    { value: 'ultra', label: 'ultra — abbreviate, arrows, one word' },
    { value: 'wenyan-lite', label: 'wenyan-lite — semi-classical Chinese' },
    { value: 'wenyan-full', label: 'wenyan-full — 文言文, 80–90% reduction' },
    { value: 'wenyan-ultra', label: 'wenyan-ultra — extreme classical' },
  ];

  let isOpen = $state(false);
  let includeIssueDetails = $state(false);
  let includeSkillSummary = $state(false);
  let includeFileScope = $state(false);
  let caveman = $state<CavemanLevel | ''>('');
  let working = $state(false);
  let errorMsg = $state<string | null>(null);
  let dialog = $state<HTMLElement>();

  const cavemanWarning = $derived(caveman && isNonLatinLevel(caveman) ? caveman : null);

  export function open() {
    includeIssueDetails = false;
    includeSkillSummary = false;
    includeFileScope = false;
    caveman = '';
    working = false;
    errorMsg = null;
    isOpen = true;
  }

  function close() {
    if (working) return;
    isOpen = false;
  }

  async function handleConfirm() {
    if (working) return;
    working = true;
    errorMsg = null;
    try {
      await onconfirm({
        includeIssueDetails,
        includeSkillSummary,
        includeFileScope,
        caveman: caveman || undefined,
      });
      isOpen = false;
    } catch (err: unknown) {
      errorMsg = err instanceof Error ? err.message : 'Failed to prepare dispatch';
    } finally {
      working = false;
    }
  }

  onClickOutside(() => dialog, close);
</script>

{#if isOpen}
  <div class="overlay"></div>
  <div bind:this={dialog} class="dialog" role="dialog" aria-modal="true" aria-label={title}>
    <div class="dialog-header">
      <span class="dialog-title">{title}</span>
      <button type="button" class="close-btn" onclick={close} disabled={working}>&times;</button>
    </div>

    <div class="dialog-body">
      <label class="opt-row">
        <input type="checkbox" bind:checked={includeIssueDetails} disabled={working} />
        <div class="opt-text">
          <span class="opt-label">Include issue details</span>
          <span class="opt-hint">Embed linked GitHub issue bodies in the prompt.</span>
        </div>
      </label>

      <label class="opt-row">
        <input type="checkbox" bind:checked={includeSkillSummary} disabled={working} />
        <div class="opt-text">
          <span class="opt-label">Include skill summary</span>
          <span class="opt-hint">Embed SKILL.md bodies for each linked skill.</span>
        </div>
      </label>

      <label class="opt-row">
        <input type="checkbox" bind:checked={includeFileScope} disabled={working} />
        <div class="opt-text">
          <span class="opt-label">Include file scope</span>
          <span class="opt-hint">List files tagged on the plan.</span>
        </div>
      </label>

      <div class="opt-row opt-select">
        <div class="opt-text">
          <span class="opt-label">Caveman mode</span>
          <span class="opt-hint">
            Prepend terse-response directive to cut output tokens. Adapted from
            <a href="https://github.com/JuliusBrussee/caveman" target="_blank" rel="noopener noreferrer">JuliusBrussee/caveman</a>.
          </span>
        </div>
        <select bind:value={caveman} disabled={working} class="level-select">
          <option value="">Off</option>
          {#each CAVEMAN_OPTIONS as opt (opt.value)}
            <option value={opt.value}>{opt.label}</option>
          {/each}
        </select>
      </div>

      {#if cavemanWarning}
        <div class="lang-warning" role="alert">
          <strong>{cavemanWarning}</strong> responds in classical Chinese (文言文). Output will be non-Latin.
        </div>
      {/if}

      {#if errorMsg}
        <div class="error-msg">{errorMsg}</div>
      {/if}
    </div>

    <div class="dialog-footer">
      <button type="button" class="cancel-btn" onclick={close} disabled={working}>
        Cancel
      </button>
      <button type="button" class="confirm-btn" onclick={handleConfirm} disabled={working}>
        {working ? 'Generating…' : 'Generate & Continue'}
      </button>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 100;
  }

  .dialog {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 400px;
    max-width: calc(100vw - 32px);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    z-index: 101;
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
  }

  .dialog-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    border-bottom: 1px solid var(--color-border);
  }

  .dialog-title {
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    color: var(--color-text);
    font-weight: 500;
  }

  .close-btn {
    font-size: 16px;
    line-height: 1;
    background: none;
    border: none;
    color: var(--color-dim);
    cursor: pointer;
    padding: 0 4px;
  }
  .close-btn:hover:not(:disabled) {
    color: var(--color-text);
  }
  .close-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .dialog-body {
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .opt-row {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    cursor: pointer;
  }
  .opt-row input {
    margin: 2px 0 0;
    accent-color: var(--color-accent);
    cursor: pointer;
  }

  .opt-select {
    cursor: default;
    justify-content: space-between;
    align-items: center;
  }

  .level-select {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    padding: 4px 6px;
    border-radius: 3px;
    border: 1px solid var(--color-border);
    background: var(--color-elevated);
    color: var(--color-text);
    cursor: pointer;
  }
  .level-select:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .opt-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .opt-label {
    font-size: 12px;
    color: var(--color-text);
  }

  .opt-hint {
    font-size: 11px;
    color: var(--color-dim);
  }

  .opt-hint a {
    color: var(--color-accent);
    text-decoration: underline;
  }

  .error-msg {
    font-size: 11px;
    color: var(--color-danger);
    padding: 6px 8px;
    border: 1px solid color-mix(in srgb, var(--color-danger) 30%, transparent);
    border-radius: 3px;
    background: color-mix(in srgb, var(--color-danger) 8%, transparent);
  }

  .lang-warning {
    font-size: 11px;
    color: var(--color-warning, #c78200);
    padding: 6px 8px;
    border: 1px solid color-mix(in srgb, var(--color-warning, #c78200) 35%, transparent);
    border-radius: 3px;
    background: color-mix(in srgb, var(--color-warning, #c78200) 10%, transparent);
  }

  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    padding: 10px 14px;
    border-top: 1px solid var(--color-border);
  }

  .cancel-btn {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    padding: 5px 12px;
    border-radius: 4px;
    border: 1px solid var(--color-border);
    background: var(--color-elevated);
    color: var(--color-muted);
    cursor: pointer;
  }
  .cancel-btn:hover:not(:disabled) {
    background: var(--color-hover);
  }
  .cancel-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .confirm-btn {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    padding: 5px 14px;
    border-radius: 4px;
    border: none;
    background: var(--color-accent);
    color: #fff;
    cursor: pointer;
  }
  .confirm-btn:hover:not(:disabled) {
    opacity: 0.9;
  }
  .confirm-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
