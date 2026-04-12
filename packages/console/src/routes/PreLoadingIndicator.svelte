<script lang="ts">
  import { onDestroy } from 'svelte'
  let p = $state(0)
  let visible = $state(false)
  let timers: ReturnType<typeof setTimeout>[] = []

  function schedule(fn: () => void, ms: number) {
    const id = setTimeout(fn, ms)
    timers.push(id)
    return id
  }

  $effect(() => {
    visible = true
    function next() {
      p += 0.1
      const remaining = 1 - p
      if (remaining > 0.15) schedule(next, 500 / remaining)
    }
    schedule(next, 250)
  })

  onDestroy(() => {
    for (const id of timers) clearTimeout(id)
  })
</script>

{#if visible}
  <div class="progress-container">
    <div class="progress" style="width: {p * 100}%"></div>
  </div>
{/if}

{#if p >= 0.4}
  <div class="fade"></div>
{/if}

<style>
  .progress-container {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 3px;
    z-index: 999;
  }

  .progress {
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    background: var(--color-accent);
    transition: width 0.4s;
  }

  .fade {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.12);
    pointer-events: none;
    z-index: 998;
    animation: fade 0.4s;
  }

  @keyframes fade {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
</style>
