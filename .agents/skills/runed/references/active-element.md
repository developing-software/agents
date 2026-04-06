# activeElement

Reactive tracking of the currently focused DOM element. A reactive alternative to `document.activeElement`.

## Usage

```svelte
<script lang="ts">
  import { activeElement } from "runed";
</script>

<p>Focused: {activeElement.current?.localName ?? "none"}</p>
```

## Custom Document / Shadow Root

```ts
import { ActiveElement } from "runed";

const active = new ActiveElement({ document: shadowRoot });
```

## Notes

- Updates synchronously with DOM focus changes
- Returns `null` when no element has focus
- Searches through Shadow DOM boundaries
- SSR safe
