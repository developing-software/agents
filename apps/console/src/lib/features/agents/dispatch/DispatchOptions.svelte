<script lang="ts">
  import type { Plan } from "@agents/core/events/plan";
  import { isNonLatinLevel } from "@agents/core/events/plan/extensions/caveman";

  let {
    disabled = false,
  }: {
    disabled?: boolean;
  } = $props();

  type CavemanLevel = NonNullable<Plan.ToPromptOptions["caveman"]>;
  const CAVEMAN_OPTIONS: { value: CavemanLevel; label: string }[] = [
    { value: "lite", label: "lite — no filler, full sentences" },
    { value: "full", label: "full — drop articles, fragments OK" },
    { value: "ultra", label: "ultra — abbreviate, arrows, one word" },
    { value: "wenyan-lite", label: "wenyan-lite — semi-classical Chinese" },
    { value: "wenyan-full", label: "wenyan-full — 文言文, 80–90% reduction" },
    { value: "wenyan-ultra", label: "wenyan-ultra — extreme classical" },
  ];

  let includeIssueDetails = $state(false);
  let includeSkillSummary = $state(false);
  let includeFileScope = $state(false);
  let karpathy = $state(false);
  let caveman = $state<CavemanLevel | "">("");

  const cavemanWarning = $derived(
    caveman && isNonLatinLevel(caveman) ? caveman : null,
  );

  export function getOptions(): Plan.ToPromptOptions {
    return {
      includeIssueDetails,
      includeSkillSummary,
      includeFileScope,
      karpathy,
      caveman: caveman || undefined,
    };
  }
</script>

<div class="embed-body">
  <label class="opt-row">
    <input type="checkbox" bind:checked={includeIssueDetails} {disabled} />
    <div class="opt-text">
      <span class="opt-label">Include issue details</span>
      <span class="opt-hint"
        >Embed linked GitHub issue bodies in the prompt.</span
      >
    </div>
  </label>

  <label class="opt-row">
    <input type="checkbox" bind:checked={includeSkillSummary} {disabled} />
    <div class="opt-text">
      <span class="opt-label">Include skill summary</span>
      <span class="opt-hint">Embed SKILL.md bodies for each linked skill.</span>
    </div>
  </label>

  <label class="opt-row">
    <input type="checkbox" bind:checked={includeFileScope} {disabled} />
    <div class="opt-text">
      <span class="opt-label">Include file scope</span>
      <span class="opt-hint">List files tagged on the plan.</span>
    </div>
  </label>

  <label class="opt-row">
    <input type="checkbox" bind:checked={karpathy} {disabled} />
    <div class="opt-text">
      <span class="opt-label">Karpathy guidelines</span>
      <span class="opt-hint">
        Prepend behavioral rules (think-first, simplicity, surgical changes).
        Derived from
        <a
          href="https://x.com/karpathy/status/2015883857489522876"
          target="_blank"
          rel="noopener noreferrer">Karpathy's observations</a
        >.
      </span>
    </div>
  </label>

  <div class="opt-select">
    <div class="opt-text">
      <span class="opt-label">Caveman mode</span>
      <span class="opt-hint">
        Prepend terse-response directive to cut output tokens. Adapted from
        <a
          href="https://github.com/JuliusBrussee/caveman"
          target="_blank"
          rel="noopener noreferrer">JuliusBrussee/caveman</a
        >.
      </span>
    </div>
    <select bind:value={caveman} {disabled} class="level-select">
      <option value="">Off</option>
      {#each CAVEMAN_OPTIONS as opt (opt.value)}
        <option value={opt.value}>{opt.label}</option>
      {/each}
    </select>
  </div>

  {#if cavemanWarning}
    <div class="lang-warning" role="alert">
      <strong>{cavemanWarning}</strong> responds in classical Chinese (文言文). Output
      will be non-Latin.
    </div>
  {/if}
</div>

<style>
  .embed-body {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .opt-row {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 18px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    cursor: pointer;
    background-color: var(--color-elevated);
    transition:
      border-color 0.12s ease,
      background-color 0.12s ease;
  }
  .opt-row:has(input[type="checkbox"]):hover {
    border-color: color-mix(
      in srgb,
      var(--color-accent) 40%,
      var(--color-border)
    );
  }
  .opt-row:has(input:checked) {
    border-color: var(--color-accent);
    background-color: color-mix(
      in srgb,
      var(--color-accent) 10%,
      var(--color-elevated)
    );
  }
  .opt-row:has(input:disabled) {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .opt-row input[type="checkbox"] {
    appearance: none;
    -webkit-appearance: none;
    flex-shrink: 0;
    margin: 1px 0 0;
    width: 16px;
    height: 16px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-surface);
    cursor: pointer;
    display: grid;
    place-content: center;
    transition:
      border-color 0.12s ease,
      background-color 0.12s ease;
  }
  .opt-row input[type="checkbox"]:hover:not(:disabled) {
    border-color: var(--color-accent);
  }
  .opt-row input[type="checkbox"]:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--color-accent) 50%, transparent);
    outline-offset: 1px;
  }
  .opt-row input[type="checkbox"]:checked {
    border-color: var(--color-accent);
    background: var(--color-accent);
  }
  .opt-row input[type="checkbox"]:checked::after {
    content: "";
    width: 4px;
    height: 8px;
    border: solid #fff;
    border-width: 0 2px 2px 0;
    transform: rotate(45deg) translate(-0.5px, -1px);
  }
  .opt-row input[type="checkbox"]:disabled {
    cursor: not-allowed;
  }

  .opt-select {
    display: flex;
    border-top: 1px solid var(--color-border);
    padding: 12px 0;
    margin-top: 12px;
    cursor: default;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }

  .opt-select .opt-text {
    flex: 1;
    min-width: 0;
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
    flex-shrink: 0;
    max-width: 55%;
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

  .lang-warning {
    font-size: 11px;
    color: var(--color-warning, #c78200);
    padding: 6px 8px;
    border: 1px solid
      color-mix(in srgb, var(--color-warning, #c78200) 35%, transparent);
    border-radius: 3px;
    background: color-mix(
      in srgb,
      var(--color-warning, #c78200) 10%,
      transparent
    );
  }
</style>
