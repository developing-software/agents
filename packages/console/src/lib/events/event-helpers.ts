// Shared utility functions for event rendering

export type EventMetrics = {
  tokens: {
    input: number | null;
    output: number | null;
    reasoning: number | null;
    cache_read: number | null;
    cache_creation: number | null;
  };
  turns: number | null;
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

// Tag utilities — re-exported from shared $lib/tag module
export {
  tagCategoryStyle,
  otherTags,
  envTag,
  serviceTag,
  branchTag,
  workflowRef,
  issueRef,
  prRef,
} from '$lib/ui/tag/tag-helpers';

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function extractMetrics(data: Record<string, unknown>): EventMetrics | null {
  const agent = data?.agent as Record<string, unknown> | undefined;
  const m = agent?.metrics as Record<string, unknown> | undefined;
  if (!m || typeof m !== 'object') return null;
  const tokens = m.tokens as Record<string, unknown> | undefined;
  return {
    tokens: {
      input: typeof tokens?.input === 'number' ? tokens.input : null,
      output: typeof tokens?.output === 'number' ? tokens.output : null,
      reasoning: typeof tokens?.reasoning === 'number' ? tokens.reasoning : null,
      cache_read: typeof tokens?.cache_read === 'number' ? tokens.cache_read : null,
      cache_creation: typeof tokens?.cache_creation === 'number' ? tokens.cache_creation : null,
    },
    turns: typeof m.turns === 'number' ? m.turns : null,
    cost_usd: typeof m.cost_usd === 'number' ? m.cost_usd : null,
    model: typeof m.model === 'string' ? m.model : null,
  };
}

export function formatMetricValue(name: string, value: number): string {
  if (name === 'cost_usd') return `$${value.toFixed(3)}`;
  if (name === 'tokens') return value.toLocaleString();
  return String(value);
}

export function flattenChecks(raw: unknown): Array<{ category: string; name: string; outcome: string }> {
  if (!raw || typeof raw !== 'object') return [];
  const result: Array<{ category: string; name: string; outcome: string }> = [];
  for (const [category, names] of Object.entries(raw)) {
    if (!names || typeof names !== 'object') continue;
    for (const [name, checkData] of Object.entries(names as Record<string, unknown>)) {
      const outcome = typeof (checkData as Record<string, unknown>)?.outcome === 'string'
        ? (checkData as Record<string, unknown>).outcome as string
        : 'unknown';
      result.push({ category, name, outcome });
    }
  }
  return result;
}
