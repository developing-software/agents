import { describe, expect, test } from 'bun:test';
import type { AgentDiscovery } from '@agents/core/agent';
import { filterAndSortConfigPairs, generateClaudeTemplate, validateConfigContent } from './helpers';

const pairs: AgentDiscovery.ConfigPair[] = [
  {
    directory: '',
    agents: {
      name: 'AGENTS.md',
      path: 'AGENTS.md',
      sha: 'root-agents',
      isSymlink: false,
      targetPath: null,
      originalPath: 'AGENTS.md',
    },
    claude: null,
    status: 'missing_claude',
    hasSymlink: false,
  },
  {
    directory: 'apps/console',
    agents: {
      name: 'AGENTS.md',
      path: 'apps/console/AGENTS.md',
      sha: 'console-agents',
      isSymlink: false,
      targetPath: null,
      originalPath: 'apps/console/AGENTS.md',
    },
    claude: {
      name: 'CLAUDE.md',
      path: 'apps/console/CLAUDE.md',
      sha: 'console-claude',
      isSymlink: true,
      targetPath: 'apps/console/AGENTS.md',
      originalPath: 'apps/console/AGENTS.md',
    },
    status: 'paired',
    hasSymlink: true,
  },
];

describe('config helpers', () => {
  test('filters and sorts config pairs by status and search', () => {
    expect(
      filterAndSortConfigPairs(pairs, { search: 'console', filter: 'all', sort: 'path' }).map(
        (pair) => pair.directory,
      ),
    ).toEqual(['apps/console']);

    expect(
      filterAndSortConfigPairs(pairs, {
        search: '',
        filter: 'missing_claude',
        sort: 'status',
      }).map((pair) => pair.directory),
    ).toEqual(['']);
  });

  test('validates empty content and unclosed frontmatter', () => {
    expect(validateConfigContent('')).toEqual(['Content cannot be empty.']);
    expect(validateConfigContent(['---', 'title: broken', '# heading'].join('\n'))).toEqual([
      'Frontmatter must be closed with a matching --- line.',
    ]);
  });

  test('generates a CLAUDE.md template with optional context', () => {
    const content = generateClaudeTemplate({
      directory: 'apps/console',
      agentsPath: 'apps/console/AGENTS.md',
      instructions: 'Keep console changes compact.',
    });

    expect(content).toContain('# CLAUDE.md');
    expect(content).toContain('apps/console/AGENTS.md');
    expect(content).toContain('Keep console changes compact.');
  });
});
