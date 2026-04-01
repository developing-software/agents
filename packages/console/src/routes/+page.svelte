<script lang="ts">
  import type { PageProps } from './$types';

  let { data }: PageProps = $props();
</script>

{#if data.installation}
  <div class="flex flex-1 items-center justify-center px-6 py-16">
    <div
      class="w-full max-w-sm p-8 text-center"
      style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 4px;"
    >
      <p
        class="mb-2 text-xs font-medium uppercase tracking-widest"
        style="color: var(--color-success);"
      >
        {data.installation.action === 'update' ? 'Installation updated' : 'App installed'}
      </p>
      <h1 class="mb-2 text-base font-semibold" style="color: var(--color-text);">
        GitHub App connected
      </h1>
      <p class="mb-7 text-xs leading-relaxed" style="color: var(--color-muted);">
        The webhook is being processed. Your repository will appear in the console shortly.
      </p>
      <a
        href="/repos"
        class="inline-flex items-center rounded px-4 py-1.5 text-xs font-medium transition-colors"
        style="background: var(--color-accent); color: #fff;"
        onmouseenter={(e) => ((e.currentTarget as HTMLElement).style.opacity = '0.85')}
        onmouseleave={(e) => ((e.currentTarget as HTMLElement).style.opacity = '1')}
      >
        Open Console →
      </a>
    </div>
  </div>
{:else}
  <div class="landing">
    <div class="dot-grid" aria-hidden="true"></div>

    <div class="landing-content">
      <h1 class="landing-title">agents</h1>
      <p class="landing-tagline">
        Monitor and manage your AI-driven GitHub workflows.
      </p>

      <div class="feature-grid">
        <div class="feature-card">
          <div class="feature-header">
            <svg class="feature-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span class="feature-name">Monitor</span>
          </div>
          <p class="feature-desc">Track agent runs, costs, and pass rates</p>
        </div>

        <div class="feature-card">
          <div class="feature-header">
            <svg class="feature-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="4" y1="21" x2="4" y2="14" />
              <line x1="4" y1="10" x2="4" y2="3" />
              <line x1="12" y1="21" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12" y2="3" />
              <line x1="20" y1="21" x2="20" y2="16" />
              <line x1="20" y1="12" x2="20" y2="3" />
              <line x1="1" y1="14" x2="7" y2="14" />
              <line x1="9" y1="8" x2="15" y2="8" />
              <line x1="17" y1="16" x2="23" y2="16" />
            </svg>
            <span class="feature-name">Manage</span>
          </div>
          <p class="feature-desc">Configure agents, skills, and prompts</p>
        </div>

        <div class="feature-card">
          <div class="feature-header">
            <svg class="feature-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            <span class="feature-name">Integrate</span>
          </div>
          <p class="feature-desc">Connect repos with one-click setup</p>
        </div>
      </div>

      {#if data.userID}
        <a
          href="/repos"
          class="cta-primary"
          onmouseenter={(e) => ((e.currentTarget as HTMLElement).style.opacity = '0.85')}
          onmouseleave={(e) => ((e.currentTarget as HTMLElement).style.opacity = '1')}
        >
          Open Console →
        </a>
      {:else}
        <a
          href="/login"
          class="cta-secondary"
          onmouseenter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--color-hover)')}
          onmouseleave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
          Sign in with GitHub →
        </a>
      {/if}
    </div>
  </div>
{/if}

<style>
  .landing {
    position: relative;
    display: flex;
    flex: 1;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 96px 24px;
    overflow: hidden;
  }

  .dot-grid {
    display: none;
    position: absolute;
    inset: 0;
    background-image: radial-gradient(circle, var(--color-border) 1px, transparent 1px);
    background-size: 24px 24px;
    mask-image: radial-gradient(ellipse 60% 50% at 50% 50%, black 20%, transparent 100%);
    -webkit-mask-image: radial-gradient(ellipse 60% 50% at 50% 50%, black 20%, transparent 100%);
    pointer-events: none;
  }

  @media (min-width: 640px) {
    .dot-grid {
      display: block;
    }
  }

  .landing-content {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    z-index: 1;
  }

  .landing-title {
    position: relative;
    font-size: 36px;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: var(--color-text);
    margin-bottom: 12px;
    padding-bottom: 10px;
  }

  .landing-title::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 120px;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--color-accent), transparent);
  }

  .landing-tagline {
    font-size: 12px;
    color: var(--color-muted);
    margin-bottom: 32px;
  }

  .feature-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 10px;
    margin-bottom: 32px;
    width: 100%;
    max-width: 560px;
  }

  @media (min-width: 640px) {
    .feature-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  .feature-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 14px 16px;
  }

  .feature-header {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 6px;
  }

  .feature-icon {
    color: var(--color-accent);
    flex-shrink: 0;
  }

  .feature-name {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text);
  }

  .feature-desc {
    font-size: 11px;
    color: var(--color-muted);
    line-height: 1.4;
  }

  .cta-primary {
    display: inline-flex;
    align-items: center;
    border-radius: 4px;
    padding: 8px 20px;
    font-size: 14px;
    font-weight: 500;
    transition: opacity 0.15s;
    background: var(--color-accent);
    color: #fff;
    text-decoration: none;
  }

  .cta-secondary {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border-radius: 4px;
    padding: 8px 20px;
    font-size: 14px;
    font-weight: 500;
    transition: background 0.15s;
    color: var(--color-text);
    border: 1px solid var(--color-border-bright);
    background: transparent;
    text-decoration: none;
  }
</style>
