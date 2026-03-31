// Shared utility functions for event rendering

export type EventMetrics = {
  input_tokens: number | null;
  output_tokens: number | null;
  reasoning_tokens: number | null;
  cache_read_input_tokens: number | null;
  cache_creation_input_tokens: number | null;
  num_turns: number | null;
  cost_usd: number | null;
  model: string | null;
};

export function eventDotColor(type: string): string {
  if (type.startsWith('agent.')) return 'var(--color-accent)';
  if (type.startsWith('tests.')) return 'var(--color-success)';
  if (type.startsWith('lint.')) return 'var(--color-merged)';
  if (type.startsWith('github.issues.')) return 'var(--color-success)';
  if (type.startsWith('github.pull_request.')) return 'var(--color-merged)';
  if (type === 'github.push') return 'var(--color-dim)';
  return 'var(--color-warning)';
}

export function originBadgeStyle(origin: string): string {
  switch (origin) {
    case 'action': return 'background: color-mix(in srgb, var(--color-accent) 15%, transparent); color: var(--color-accent);';
    case 'cli': return 'background: color-mix(in srgb, var(--color-warning) 12%, transparent); color: var(--color-warning);';
    case 'console': return 'background: color-mix(in srgb, var(--color-merged) 12%, transparent); color: var(--color-merged);';
    default: return 'background: var(--color-elevated); color: var(--color-muted);';
  }
}

export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function typePrefix(type: string): string {
  const dot = type.indexOf('.');
  return dot === -1 ? type : type.slice(0, dot);
}

export function issueRef(tags: string[]): number | null {
  const t = tags.find((t) => t.startsWith('gh:issue:'));
  return t ? parseInt(t.slice('gh:issue:'.length)) : null;
}

export function prRef(tags: string[]): number | null {
  const t = tags.find((t) => t.startsWith('gh:pr:'));
  return t ? parseInt(t.slice('gh:pr:'.length)) : null;
}

export function envTag(tags: string[]): string | null {
  const t = tags.find((t) => t.startsWith('env:'));
  return t ? t.slice('env:'.length) : null;
}

export function serviceTag(tags: string[]): string | null {
  const t = tags.find((t) => t.startsWith('service:'));
  return t ? t.slice('service:'.length) : null;
}

export function branchTag(tags: string[]): string | null {
  const t = tags.find((t) => t.startsWith('gh:branch:'));
  return t ? t.slice('gh:branch:'.length) : null;
}

export function runRef(tags: string[]): number | null {
  const t = tags.find((t) => t.startsWith('gh:run:'));
  return t ? parseInt(t.slice('gh:run:'.length)) : null;
}

const KNOWN_PREFIXES = ['env:', 'service:', 'gh:'];

export function otherTags(tags: string[]): string[] {
  return tags.filter((t) => !KNOWN_PREFIXES.some((p) => t.startsWith(p)));
}

export function tagCategoryStyle(tag: string): string {
  if (tag.startsWith('env:'))
    return 'background: color-mix(in srgb, var(--color-success) 10%, transparent); color: var(--color-success); border-color: color-mix(in srgb, var(--color-success) 25%, transparent);';
  if (tag.startsWith('service:'))
    return 'background: color-mix(in srgb, var(--color-accent) 10%, transparent); color: var(--color-accent); border-color: color-mix(in srgb, var(--color-accent) 25%, transparent);';
  if (tag.startsWith('gh:'))
    return 'background: var(--color-elevated); color: var(--color-muted); border-color: var(--color-border);';
  return 'background: var(--color-elevated); color: var(--color-dim); border-color: var(--color-border);';
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function extractMetrics(data: Record<string, unknown>): EventMetrics | null {
  const m = data?.metrics;
  if (!m || typeof m !== 'object') return null;
  const obj = m as Record<string, unknown>;
  return {
    input_tokens: typeof obj.input_tokens === 'number' ? obj.input_tokens : null,
    output_tokens: typeof obj.output_tokens === 'number' ? obj.output_tokens : null,
    reasoning_tokens: typeof obj.reasoning_tokens === 'number' ? obj.reasoning_tokens : null,
    cache_read_input_tokens: typeof obj.cache_read_input_tokens === 'number' ? obj.cache_read_input_tokens : null,
    cache_creation_input_tokens: typeof obj.cache_creation_input_tokens === 'number' ? obj.cache_creation_input_tokens : null,
    num_turns: typeof obj.num_turns === 'number' ? obj.num_turns : null,
    cost_usd: typeof obj.cost_usd === 'number' ? obj.cost_usd : null,
    model: typeof obj.model === 'string' ? obj.model : null,
  };
}

export function formatMetricValue(name: string, value: number): string {
  if (name === 'cost_usd') return `$${value.toFixed(3)}`;
  if (name.includes('tokens')) return value.toLocaleString();
  return String(value);
}
