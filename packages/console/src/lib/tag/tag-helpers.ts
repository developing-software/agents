// Shared tag utility functions for rendering tags across plans and events

const KNOWN_PREFIXES = ['env:', 'service:', 'gh:', 'plan:', 'scope:', 'type:', 'harness:'];

/** Style string for a tag pill based on its prefix category */
export function tagCategoryStyle(tag: string): string {
  if (tag.startsWith('env:'))
    return 'background: color-mix(in srgb, var(--color-success) 10%, transparent); color: var(--color-success); border-color: color-mix(in srgb, var(--color-success) 25%, transparent);';
  if (tag.startsWith('service:'))
    return 'background: color-mix(in srgb, var(--color-accent) 10%, transparent); color: var(--color-accent); border-color: color-mix(in srgb, var(--color-accent) 25%, transparent);';
  if (tag.startsWith('plan:'))
    return 'background: color-mix(in srgb, var(--color-merged) 10%, transparent); color: var(--color-merged); border-color: color-mix(in srgb, var(--color-merged) 25%, transparent);';
  if (tag.startsWith('scope:'))
    return 'background: color-mix(in srgb, var(--color-warning) 10%, transparent); color: var(--color-warning); border-color: color-mix(in srgb, var(--color-warning) 25%, transparent);';
  if (tag.startsWith('gh:'))
    return 'background: var(--color-elevated); color: var(--color-muted); border-color: var(--color-border);';
  return 'background: var(--color-elevated); color: var(--color-dim); border-color: var(--color-border);';
}

/** Filter out tags with known prefixes, returning only "other" tags */
export function otherTags(tags: string[]): string[] {
  return tags.filter((t) => !KNOWN_PREFIXES.some((p) => t.startsWith(p)));
}

/** Extract a single tag value by prefix */
export function extractTag(tags: string[], prefix: string): string | null {
  const t = tags.find((t) => t.startsWith(prefix));
  return t ? t.slice(prefix.length) : null;
}

/** Extract a numeric tag value by prefix */
export function extractNumericTag(tags: string[], prefix: string): number | null {
  const v = extractTag(tags, prefix);
  return v ? parseInt(v) : null;
}

// Convenience extractors
export const envTag = (tags: string[]) => extractTag(tags, 'env:');
export const serviceTag = (tags: string[]) => extractTag(tags, 'service:');
export const branchTag = (tags: string[]) => extractTag(tags, 'gh:branch:');
export const runRef = (tags: string[]) => extractNumericTag(tags, 'gh:run:');
export const issueRef = (tags: string[]) => extractNumericTag(tags, 'gh:issue:');
export const prRef = (tags: string[]) => extractNumericTag(tags, 'gh:pr:');
export const planRef = (tags: string[]) => extractTag(tags, 'plan:');
