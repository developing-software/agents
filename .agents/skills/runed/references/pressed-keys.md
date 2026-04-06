# PressedKeys

Tracks which keyboard keys are currently pressed. Supports key combinations and callbacks.

## Usage

```svelte
<script lang="ts">
  import { PressedKeys } from "runed";

  const keys = new PressedKeys();
  const isArrowDown = $derived(keys.has("ArrowDown"));
  const isCtrlA = $derived(keys.has("Control", "a"));
</script>

<p>Arrow Down: {isArrowDown}</p>
<p>Ctrl+A: {isCtrlA}</p>
```

## Register Callbacks for Key Combos

```ts
const keys = new PressedKeys();

keys.onKeys(["meta", "k"], () => {
  console.log("open command palette");
});
```

## API

| Property/Method          | Description                                   |
| ------------------------ | --------------------------------------------- |
| `has(key, ...more)`      | Check if specified keys are currently pressed |
| `all`                    | All currently pressed keys                    |
| `onKeys(keys, callback)` | Register callback for key combination         |
