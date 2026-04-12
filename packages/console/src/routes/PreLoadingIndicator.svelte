<script>
  import { onDestroy } from 'svelte'

  let p = $state(0)
  const timers = []

  function next() {
    p += 0.1
    const remaining = 1 - p
    if (remaining > 0.15) {
      timers.push(setTimeout(next, 500 / remaining))
    }
  }

  timers.push(setTimeout(next, 250))

  onDestroy(() => {
    for (const t of timers) clearTimeout(t)
  })
</script>

<div class="progress-container">
  <div class="progress" style="width: {p * 100}%"></div>
</div>

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
    background-color: var(--color-accent);
    transition: width 0.4s;
  }

  .fade {
    position: absolute;
    inset: 0;
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
