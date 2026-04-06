# useIntersectionObserver

Lower-level IntersectionObserver wrapper. Use `IsInViewport` for simple visibility checks; use this when you need access to `IntersectionObserverEntry` details.

## Usage

```ts
import { useIntersectionObserver } from "runed";

let target = $state<HTMLElement | null>(null);
let isIntersecting = $state(false);

useIntersectionObserver(
  () => target,
  (entries) => {
    const entry = entries[0];
    if (!entry) return;
    isIntersecting = entry.isIntersecting;
  },
  { root: () => root, once: true },
);
```

## Controls

```ts
const observer = useIntersectionObserver(/* ... */);
observer.pause();
observer.resume();
observer.stop();
console.log(observer.isActive);
```
