# console/

SvelteKit dashboard (Cloudflare Workers) for tracking GitHub and agent activity — events, metrics, repo views, issue/PR timelines.

## Stack

- **SvelteKit 2** + **Svelte 5** (runes mode) — Cloudflare Workers adapter
- **Tailwind CSS v4** via `@tailwindcss/vite`
- Auth: `src/lib/auth.ts` (token-based, set by server layout load)

## Structure

```
src/
  routes/
    +layout.svelte        — shell: topbar + sidebar + content slot
    +page.svelte          — root redirect
    layout.css            — global theme (CSS variables, base styles)
    (auth)/               — login / logout / callback
    gh/[organization]/    — org overview
    gh/[organization]/[repo]/
      +layout.svelte      — repo tab bar
      +page.svelte        — repo overview
      issues/             — issue list + detail
      pulls/              — PR list + detail
      actions/            — workflow runs
      tree/               — file tree
    repos/                — repo listing
  lib/
    events/
      EventList.svelte    — flat event timeline with filters
      EventTree.svelte    — hierarchical event tree
      events.remote.ts    — SDK calls for event data
    ArtifactViewer.svelte
    GitHubLink.svelte
    auth.ts
```

## Agent Skill Requirement

**Always invoke the `svelte:svelte-file-editor` skill** when creating or editing any `.svelte` file. It validates Svelte 5 syntax and fetches official docs before and after edits.

## Svelte 5 Runes — Required Patterns

Use runes exclusively. Legacy Svelte 4 patterns are not allowed.

```svelte
<!-- Props -->
let { foo, bar = 'default' }: { foo: string; bar?: string } = $props();

<!-- State -->
let count = $state(0);

<!-- Derived -->
const double = $derived(count * 2);
const complex = $derived.by(() => expensiveCalc(count));

<!-- Effects DO NOT USE unless integrating with raw DOM elemensts-->
$effect(() => { /* runs after DOM update */ });

<!-- Snippets (replaces slots)  -->
{#snippet label(text: string)}<span>{text}</span>{/snippet}
{@render label('hello')}

<!-- Events — callback props, not createEventDispatcher -->
let { onclick }: { onclick: () => void } = $props();
```

Never use: `export let`, `$:`, `onMount` for reactive work, `createEventDispatcher`, `<slot>`.

---

## Design Guide — Zed-like Minimalist Dark Theme

The console follows a Zed-inspired aesthetic: dark neutral grays, compact density, monospace-heavy UI, zero decorative chrome.

### CSS Variables

Defined in `src/routes/layout.css` — always use these, never hardcode hex values.

**Surfaces**

| Token | Value | Use |
|---|---|---|
| `--color-bg` | `#111113` | Page background |
| `--color-surface` | `#1a1a1c` | Topbar, sidebar, panels |
| `--color-elevated` | `#222224` | Cards, inputs, active items |
| `--color-hover` | `#2a2a2c` | Hover backgrounds |

**Borders**

| Token | Value | Use |
|---|---|---|
| `--color-border` | `#2c2c2e` | Default borders |
| `--color-border-bright` | `#3c3c3e` | Prominent / focused borders |

**Text**

| Token | Value | Use |
|---|---|---|
| `--color-text` | `#d8d8d8` | Primary text |
| `--color-muted` | `#8c8c8e` | Secondary / inactive text |
| `--color-dim` | `#565658` | Tertiary text, timestamps, placeholders |

**Accent & Semantic**

| Token | Value | Use |
|---|---|---|
| `--color-accent` | `#5c8fcc` | Links, active state, focus ring |
| `--color-accent-dim` | `#5c8fcc1f` | Tinted accent backgrounds |
| `--color-success` | `#4faa70` | Open issues, success |
| `--color-success-dim` | `#4faa701f` | Success tint |
| `--color-danger` | `#c1666b` | Errors, closed issues |
| `--color-danger-dim` | `#c1666b1f` | Danger tint |
| `--color-merged` | `#9068c2` | Merged PRs |
| `--color-merged-dim` | `#9068c21f` | Merged tint |
| `--color-warning` | `#c98e42` | Warnings, CLI badge |
| `--color-warning-dim` | `#c98e421f` | Warning tint |

### Typography

- **UI text:** `system-ui, -apple-system, "Segoe UI", sans-serif`
- **Mono / badges / code / metrics:** `"JetBrains Mono", ui-monospace, monospace`
- Base: `13px` body — `12px` secondary — `11px` timestamps/meta — `10px` badges/labels

### Spacing & Shape

- Border radius: `3px` default, `4px` max — never larger
- No box shadows — use `1px solid var(--color-border)` for separation
- Row padding: `4px 0` for list items, `4px 8px` for padded rows
- Compact gaps: `4px`–`8px` between inline elements

### Color Mixing

Prefer `color-mix()` for tinted backgrounds over opacity:

```css
/* tinted hover */
background: color-mix(in srgb, var(--color-accent) 12%, transparent);

/* or use the -dim variables */
background: var(--color-accent-dim);
```

### Transitions

Max `0.1s`, properties only: `color`, `background`, `border-color`. No transform or size animations.

### Rules

- Monospace font for: event types, badges, branches, metrics, run IDs, timestamps, nav labels
- No emojis unless already present in an existing component
- No shadows, gradients, or glow effects
- Active/selected items: `background: var(--color-elevated)` + `border-left: 2px solid var(--color-accent)`
- Badges: `font-size: 10px`, `padding: 1px 5px`, `border-radius: 3px`, monospace font

## Commands

```sh
bun run dev      # start dev server (vite)
bun typecheck    # type check
```
