# ScrollState

Reactive scroll position, direction, and edge state tracking with programmatic scrolling.

## Usage

```svelte
<script lang="ts">
  import { ScrollState } from "runed";

  let el = $state<HTMLElement>();
  const scroll = new ScrollState({ element: () => el });
</script>

<div bind:this={el} style="overflow: auto; height: 200px;">
  <!-- scrollable content -->
</div>

<p>Scroll Y: {scroll.y}</p>
<p>At bottom: {scroll.arrived.bottom}</p>
```

## Programmatic Scrolling

```ts
scroll.scrollTo(0, 100);
scroll.scrollToTop();
scroll.scrollToBottom();

// Or set directly:
scroll.y = 500;
```

## Reactive Properties

| Property     | Description                                           |
| ------------ | ----------------------------------------------------- |
| `x`, `y`     | Current scroll positions (gettable/settable)          |
| `directions` | Active scroll directions                              |
| `arrived`    | Edge arrival state (`top`, `bottom`, `left`, `right`) |
| `progress`   | Scroll percentage on X/Y axes                         |

## Options

| Option     | Default  | Description                         |
| ---------- | -------- | ----------------------------------- |
| `element`  | required | Scroll container getter             |
| `idle`     | `200`    | Debounce time in ms                 |
| `offset`   | `0`      | Pixel thresholds for edge detection |
| `onScroll` | —        | Callback during scroll              |
| `onStop`   | —        | Callback after scrolling stops      |
| `behavior` | `"auto"` | Scroll animation behavior           |
