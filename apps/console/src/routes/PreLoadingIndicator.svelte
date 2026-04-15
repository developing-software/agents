<script lang="ts">
  let p = $state(0)
  let visible = $state(false)

  $effect(() => {
    visible = true
    const handles: ReturnType<typeof setTimeout>[] = []

    function next() {
      p += 0.1
      const remaining = 1 - p
      if (remaining > 0.15) {
        const handle = setTimeout(next, 500 / remaining)
        handles.push(handle)
      }
    }

    const initialHandle = setTimeout(next, 250)
    handles.push(initialHandle)

    return () => {
      handles.forEach(handle => clearTimeout(handle))
    }
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
    height: 4px;
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
