<script lang="ts">
  import type { LayoutProps } from './$types';
  import './layout.css';
  import favicon from '$lib/assets/favicon.svg';

  let { data, children }: LayoutProps = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<div class="flex min-h-screen flex-col bg-gray-950 text-gray-100">
  <nav class="flex items-center justify-between border-b border-gray-800 bg-gray-900 px-6 py-3">
    <a href="/" class="flex items-center gap-2 text-sm font-semibold text-white">
      <img src={favicon} alt="logo" class="h-5 w-5" />
      Agents
    </a>

    <div class="flex items-center gap-3">
      {#if data.userID}
        <a
          href="/logout"
          class="rounded-md px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          Sign out
        </a>
      {:else}
        <a
          href="/login"
          class="rounded-md bg-gray-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-600 transition-colors"
        >
          Sign in with GitHub
        </a>
      {/if}
    </div>
  </nav>

  {@render children()}
</div>
