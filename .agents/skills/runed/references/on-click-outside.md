# onClickOutside

Detect clicks outside a specified element. Commonly used for dismissible dropdowns, modals, and drawers.

## Basic Usage

```svelte
<script lang="ts">
  import { onClickOutside } from "runed";

  let container = $state<HTMLElement>()!;

  onClickOutside(
    () => container,
    () => console.log("clicked outside")
  );
</script>

<div bind:this={container}>
  <!-- content -->
</div>
```

## Controlled Listener

Start/stop manually — useful for dialogs that open/close:

```svelte
<script lang="ts">
  import { onClickOutside } from "runed";

  let dialog = $state<HTMLDialogElement>()!;

  const clickOutside = onClickOutside(
    () => dialog,
    () => {
      dialog.close();
      clickOutside.stop();
    },
    { immediate: false } // don't listen until start() is called
  );

  function openDialog() {
    dialog.showModal();
    clickOutside.start();
  }
</script>
```

## Options

| Option         | Default | Description                      |
| -------------- | ------- | -------------------------------- |
| `immediate`    | `true`  | Start listening immediately      |
| `detectIframe` | `false` | Detect focus events from iframes |

## Return Object

| Property/Method | Description               |
| --------------- | ------------------------- |
| `stop()`        | Stop listening            |
| `start()`       | Start listening           |
| `enabled`       | Read-only reactive status |
