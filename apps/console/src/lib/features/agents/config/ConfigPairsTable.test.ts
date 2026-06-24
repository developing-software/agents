/// <reference lib="dom" />

import { describe, expect, test } from 'bun:test';
import { fireEvent, render, screen } from '@testing-library/svelte';
import type { AgentDiscovery } from '@agents/core/agent';
import ConfigPairsTable from './ConfigPairsTable.svelte';

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

describe('ConfigPairsTable', () => {
  test('renders paired rows and supports filtering', async () => {
    render(ConfigPairsTable, {
      pairs,
      provider: 'github',
      organization: 'agents',
      repoName: 'repo',
      defaultBranch: 'main',
    });

    expect(screen.getByText('repo root')).toBeTruthy();
    expect(screen.getAllByText('apps/console').length).toBeGreaterThan(0);
    expect(screen.getAllByText('CLAUDE.md missing').length).toBeGreaterThan(0);
    expect(screen.getByText('paired with symlink')).toBeTruthy();

    await fireEvent.input(screen.getByLabelText('Filter config pairs'), {
      target: { value: 'console' },
    });

    expect(screen.queryByText('repo root')).toBeNull();
    expect(screen.getAllByText('apps/console').length).toBeGreaterThan(0);
  });
});
