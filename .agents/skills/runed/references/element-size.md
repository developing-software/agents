# ElementSize

Reactively tracks an element's width and height, updating automatically via ResizeObserver.

## Usage

```svelte
<script lang="ts">
  import { ElementSize } from "runed";

  let el = $state() as HTMLElement;
  const size = new ElementSize(() => el);
</script>

<textarea bind:this={el}></textarea>
<p>Width: {size.width} Height: {size.height}</p>
```

## API

```ts
const size = new ElementSize(getter: () => HTMLElement);
```

| Property | Description                         |
| -------- | ----------------------------------- |
| `width`  | Current width in pixels (readonly)  |
| `height` | Current height in pixels (readonly) |
