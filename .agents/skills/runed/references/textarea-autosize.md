# TextareaAutosize

Automatically adjusts textarea height based on content. Mirrors the textarea off-screen for accurate measurement.

## Usage

```svelte
<script lang="ts">
  import { TextareaAutosize } from "runed";

  let el = $state<HTMLTextAreaElement>(null!);
  let value = $state("");

  new TextareaAutosize({
    element: () => el,
    input: () => value
  });
</script>

<textarea bind:this={el} bind:value></textarea>
```

## Grow-Only (Never Shrink)

```ts
new TextareaAutosize({
  element: () => el,
  input: () => value,
  styleProp: "minHeight",
});
```

## Options

| Option      | Type                      | Description                                   |
| ----------- | ------------------------- | --------------------------------------------- |
| `element`   | `() => HTMLElement`       | Target textarea (required)                    |
| `input`     | `() => string`            | Reactive input value (required)               |
| `onResize`  | `() => void`              | Callback when height updates                  |
| `styleProp` | `"height" \| "minHeight"` | CSS property to control (default: `"height"`) |
| `maxHeight` | `number`                  | Max height in px before scrolling             |
