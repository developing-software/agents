<script lang="ts">
  import { untrack } from 'svelte';
  import type { PageProps } from './$types';
  import { beforeNavigate } from '$app/navigation';
  import AgentMdTabs from '$lib/agents/config/AgentMdTabs.svelte';
  import AgentMdEditor from '$lib/agents/config/AgentMdEditor.svelte';
  import RepoTreeNavigator from '$lib/agents/config/RepoTreeNavigator.svelte';
  import ContextFilesList from '$lib/agents/config/ContextFilesList.svelte';
  import ConfigAiChat from '$lib/agents/config/ConfigAiChat.svelte';
  import { getFileContent, saveAgentsMdFile } from '$lib/agents/config/config.remote';
  import type { ContextFile } from '$lib/agents/config/config-types';

  let { data }: PageProps = $props();

  type RepoTreeNode = {
    name: string;
    path: string;
    type: 'dir' | 'file';
    size?: number;
  };

  type AgentFileState = {
    path: string;
    savedContent: string;
    draftContent: string;
    saving: boolean;
    error: string | null;
  };

  let agentFiles = $state<AgentFileState[]>(
    untrack(() =>
      data.agentMdFiles.map((file) => ({
        path: file.path,
        savedContent: file.content,
        draftContent: file.content,
        saving: false,
        error: null,
      })),
    ),
  );

  let activePath = $state<string>(untrack(() => agentFiles[0]?.path ?? ''));
  let selectedTreePath = $state<string | null>(untrack(() => activePath || null));
  let contextFiles = $state<ContextFile[]>([]);
  let previewFile = $state<ContextFile | null>(null);
  let fileCache = $state<Record<string, ContextFile>>({});
  let previewLoading = $state(false);
  let previewError = $state<string | null>(null);
  const repoTreeRoot = $derived(data.repoTreeRoot as RepoTreeNode[]);

  const activeFile = $derived(
    agentFiles.find((file) => file.path === activePath) ?? null,
  );

  const hasDirty = $derived(
    agentFiles.some((file) => file.draftContent !== file.savedContent),
  );

  const treeSelectedPath = $derived(selectedTreePath ?? activePath);

  const chatContext = $derived({
    currentFilePath: activeFile?.path ?? '',
    currentFileContent: activeFile?.draftContent ?? '',
    contextFiles,
    repoPaths: data.repoPaths,
    discovery: {
      agentsFolderExists: !!data.agentsFolder?.exists,
      claudeFiles: data.claudeFolder,
      agentFilePaths: data.agentFiles.map((f) => f.path),
    },
  });

  beforeNavigate((navigation) => {
    if (!hasDirty) return;
    if (navigation.type === 'leave') return;
    if (!confirm('You have unsaved AGENTS.md changes. Leave this page?')) {
      navigation.cancel();
    }
  });

  function handleBeforeUnload(event: BeforeUnloadEvent) {
    if (!hasDirty) return;
    event.preventDefault();
    event.returnValue = '';
  }

  function switchTab(path: string) {
    activePath = path;
    selectedTreePath = path;
    previewFile = null;
    previewError = null;
  }

  function updateDraft(path: string, content: string) {
    agentFiles = agentFiles.map((file) =>
      file.path === path ? { ...file, draftContent: content, error: null } : file,
    );
  }

  function discardFile(path: string) {
    agentFiles = agentFiles.map((file) =>
      file.path === path
        ? { ...file, draftContent: file.savedContent, error: null }
        : file,
    );
  }

  async function saveFile(path: string) {
    const file = agentFiles.find((entry) => entry.path === path);
    if (!file || file.draftContent === file.savedContent) return;

    agentFiles = agentFiles.map((entry) =>
      entry.path === path ? { ...entry, saving: true, error: null } : entry,
    );

    try {
      await saveAgentsMdFile({
        organization: data.organization,
        repoName: data.repoName,
        path,
        content: file.draftContent,
      });

      agentFiles = agentFiles.map((entry) =>
        entry.path === path
          ? { ...entry, savedContent: entry.draftContent, saving: false, error: null }
          : entry,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save file';
      agentFiles = agentFiles.map((entry) =>
        entry.path === path ? { ...entry, saving: false, error: message } : entry,
      );
    }
  }

  function detectLanguage(path: string): string {
    const ext = path.split('.').pop()?.toLowerCase();
    if (!ext) return 'text';
    const map: Record<string, string> = {
      ts: 'typescript',
      js: 'javascript',
      svelte: 'svelte',
      md: 'markdown',
      json: 'json',
      yml: 'yaml',
      yaml: 'yaml',
      toml: 'toml',
      css: 'css',
      html: 'html',
      sh: 'bash',
    };
    return map[ext] ?? ext;
  }

  async function loadFile(path: string): Promise<ContextFile | null> {
    if (fileCache[path]) return fileCache[path];

    const result = await getFileContent({ organization: data.organization, repoName: data.repoName, path });
    if (!result) return null;

    const file: ContextFile = {
      path: result.path,
      content: result.content,
      language: result.language || detectLanguage(path),
      size: result.size,
    };

    fileCache = { ...fileCache, [path]: file };
    return file;
  }

  async function handleTreeSelect(path: string) {
    selectedTreePath = path;
    previewError = null;

    const agentTarget = agentFiles.find((file) => file.path === path);
    if (agentTarget) {
      switchTab(path);
      return;
    }

    previewLoading = true;
    try {
      previewFile = await loadFile(path);
      if (!previewFile) previewError = `Unable to load ${path}`;
    } catch (err) {
      previewError = err instanceof Error ? err.message : 'Failed to load file';
      previewFile = null;
    } finally {
      previewLoading = false;
    }
  }

  async function addContext(path: string) {
    if (contextFiles.some((file) => file.path === path)) return;
    const file = await loadFile(path);
    if (!file) return;
    contextFiles = [...contextFiles, file];
  }

  function removeContext(path: string) {
    contextFiles = contextFiles.filter((file) => file.path !== path);
  }

  function formatSize(size: number): string {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  function escapeHtml(input: string): string {
    return input
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;');
  }

  function highlightCode(input: string, language: string): string {
    let escaped = escapeHtml(input);

    if (language === 'typescript' || language === 'javascript' || language === 'svelte') {
      escaped = escaped
        .replaceAll(/\b(import|from|export|const|let|function|return|if|else|for|while|await|async|type|interface|extends)\b/g, '<span class="tok-key">$1</span>')
        .replaceAll(/(".*?"|'.*?'|`.*?`)/g, '<span class="tok-str">$1</span>')
        .replaceAll(/\b(true|false|null|undefined)\b/g, '<span class="tok-lit">$1</span>');
    }

    if (language === 'json' || language === 'yaml') {
      escaped = escaped
        .replaceAll(/("[^"]*")(?=\s*:)/g, '<span class="tok-key">$1</span>')
        .replaceAll(/("[^"\\]*(?:\\.[^"\\]*)*")/g, '<span class="tok-str">$1</span>')
        .replaceAll(/\b(true|false|null)\b/g, '<span class="tok-lit">$1</span>');
    }

    return escaped;
  }
</script>

<svelte:window onbeforeunload={handleBeforeUnload} />

<section class="config-page">
  <div class="left-panel">
    <RepoTreeNavigator
      organization={data.organization}
      repoName={data.repoName}
      rootNodes={repoTreeRoot}
      allPaths={data.repoPaths}
      selectedPath={treeSelectedPath}
      contextPaths={contextFiles.map((f) => f.path)}
      handleSelectFile={handleTreeSelect}
      handleAddContext={addContext}
      handleRemoveContext={removeContext}
    />
  </div>

  <div class="center-panel">
    <AgentMdTabs
      tabs={agentFiles.map((file) => ({ path: file.path, dirty: file.draftContent !== file.savedContent }))}
      activePath={activePath}
      handleSelect={switchTab}
    />

    {#if activeFile}
      <div class="editor-wrap">
        <AgentMdEditor
          path={activeFile.path}
          value={activeFile.draftContent}
          savedValue={activeFile.savedContent}
          saving={activeFile.saving}
          error={activeFile.error}
          referencedPath={selectedTreePath}
          handleChange={(content) => updateDraft(activeFile.path, content)}
          handleSave={() => saveFile(activeFile.path)}
          handleDiscard={() => discardFile(activeFile.path)}
        />
      </div>
    {:else}
      <div class="empty-editor">No AGENTS.md file found.</div>
    {/if}

    {#if previewLoading}
      <div class="preview-panel">Loading file preview...</div>
    {:else if previewError}
      <div class="preview-panel preview-error">{previewError}</div>
    {:else if previewFile}
      <section class="preview-panel">
        <header class="preview-header">
          <span>{previewFile.path}</span>
          <span>{previewFile.language} · {formatSize(previewFile.size)}</span>
        </header>
        <pre class="preview-code"><code>{@html highlightCode(previewFile.content, previewFile.language)}</code></pre>
      </section>
    {/if}
  </div>

  <div class="right-panel">
    <ContextFilesList
      files={contextFiles}
      maxFiles={10}
      handleRemove={removeContext}
    />

    <div class="chat-wrap">
      <ConfigAiChat
        organization={data.organization}
        repoName={data.repoName}
        context={chatContext}
      />
    </div>
  </div>
</section>

<style>
  .config-page {
    display: grid;
    grid-template-columns: minmax(220px, 1fr) minmax(420px, 2.2fr) minmax(300px, 1.2fr);
    gap: 12px;
    min-height: calc(100vh - 188px);
  }

  .left-panel,
  .center-panel,
  .right-panel {
    min-height: 0;
  }

  .center-panel {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-height: 0;
  }

  .editor-wrap {
    flex: 1;
    min-height: 0;
  }

  .empty-editor {
    border: 1px dashed var(--color-border);
    border-radius: 8px;
    padding: 16px;
    font-size: 12px;
    color: var(--color-dim);
    background: var(--color-surface);
  }

  .preview-panel {
    border: 1px solid var(--color-border);
    border-radius: 8px;
    background: var(--color-surface);
    min-height: 120px;
  }

  .preview-error {
    color: var(--color-danger);
    background: color-mix(in srgb, var(--color-danger) 8%, transparent);
    border-color: color-mix(in srgb, var(--color-danger) 20%, transparent);
    padding: 10px;
    font-size: 12px;
  }

  .preview-header {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    border-bottom: 1px solid var(--color-border);
    padding: 7px 10px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 10px;
    color: var(--color-dim);
  }

  .preview-code {
    margin: 0;
    max-height: 260px;
    overflow: auto;
    padding: 10px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    line-height: 1.5;
    color: var(--color-text);
  }

  .preview-code :global(.tok-key) {
    color: color-mix(in srgb, var(--color-accent) 90%, white 10%);
  }

  .preview-code :global(.tok-str) {
    color: #d09f4b;
  }

  .preview-code :global(.tok-lit) {
    color: #5fa6d2;
  }

  .right-panel {
    min-height: 0;
    display: grid;
    grid-template-rows: minmax(160px, auto) minmax(260px, 1fr);
    gap: 10px;
  }

  .chat-wrap {
    min-height: 0;
  }

  @media (max-width: 1180px) {
    .config-page {
      grid-template-columns: 1fr;
      grid-template-rows: auto auto auto;
      min-height: auto;
    }

    .left-panel,
    .center-panel,
    .right-panel {
      min-height: auto;
    }

    .right-panel {
      grid-template-rows: auto minmax(360px, 1fr);
    }
  }
</style>
