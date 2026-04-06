# StateHistory

Undo/redo capabilities for reactive state.

## Usage

```svelte
<script lang="ts">
  import { StateHistory } from "runed";

  let count = $state(0);
  const history = new StateHistory(() => count, (c) => (count = c));
</script>

<p>{count}</p>
<button onclick={() => count++}>Increment</button>
<button disabled={!history.canUndo} onclick={history.undo}>Undo</button>
<button disabled={!history.canRedo} onclick={history.redo}>Redo</button>
<button onclick={history.clear}>Clear History</button>
```

## API

```ts
const history = new StateHistory(
  getter: () => T,
  setter: (value: T) => void
);
```

| Property/Method | Description                                |
| --------------- | ------------------------------------------ |
| `undo()`        | Revert to previous state                   |
| `redo()`        | Restore previously undone state            |
| `clear()`       | Clear history and redo stack               |
| `log`           | Array of `{ snapshot, timestamp }` entries |
| `canUndo`       | `true` when undo is possible               |
| `canRedo`       | `true` when redo is possible               |
