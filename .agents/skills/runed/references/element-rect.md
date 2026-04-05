# ElementRect

Reactively tracks an element's full bounding rectangle (dimensions + position).

## Usage

```svelte
<script lang="ts">
  import { ElementRect } from "runed";

  let el = $state<HTMLElement>();
  const rect = new ElementRect(() => el);
</script>

<div bind:this={el}>...</div>
<p>Position: ({rect.x}, {rect.y}) Size: {rect.width}x{rect.height}</p>
```

## API

```ts
const rect = new ElementRect(getter: () => HTMLElement, options?: { initialRect?: DOMRect });
```

| Property                         | Description        |
| -------------------------------- | ------------------ |
| `current`                        | Full `Rect` object |
| `width`, `height`                | Dimensions         |
| `top`, `left`, `right`, `bottom` | Edge positions     |
| `x`, `y`                         | Coordinates        |
