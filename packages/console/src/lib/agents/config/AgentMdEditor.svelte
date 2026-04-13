<script lang="ts">
  import Markdown from "$lib/ui/Markdown.svelte";
  import type { EditorFile } from "./config-types";

  interface Props {
    file: EditorFile;
    organization: string;
    repoName: string;
    saving?: boolean;
    saveResult?: { mode: string; pr?: { number: number; url: string } } | null;
    onupdate: (draftContent: string) => void;
    onsave: (mode: "direct" | "pr") => void;
    ondiscard: () => void;
  }

  let {
    file,
    organization,
    repoName,
    saving = false,
    saveResult = null,
    onupdate,
    onsave,
    ondiscard,
  }: Props = $props();

  const isDirty = $derived(file.draftContent !== file.content);

  function handleKeydown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      if (isDirty && !saving) onsave("pr");
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="editor-wrap">
  <!-- Toolbar -->
  <div class="toolbar">
    <span class="file-path">
      <span class="path-prefix">{organization}/{repoName}</span>/{file.path}
      {#if isDirty}
        <span class="dirty-dot" title="Unsaved changes">●</span>
      {/if}
    </span>
    <div class="actions">
      {#if file.editMode}
        {#if isDirty}
          <button
            class="btn btn-ghost"
            onclick={ondiscard}
            disabled={saving}
          >Discard</button>
          <button
            class="btn btn-outline"
            onclick={() => onsave("direct")}
            disabled={saving}
          >{saving ? "Saving…" : "Save direct"}</button>
          <button
            class="btn btn-primary"
            onclick={() => onsave("pr")}
            disabled={saving}
          >{saving ? "Saving…" : "Save via PR"}</button>
        {/if}
      {:else}
        <button
          class="btn btn-outline"
          onclick={() => onupdate(file.content)}
        >Edit</button>
      {/if}
    </div>
  </div>

  {#if saveResult?.pr}
    <div class="save-banner">
      <span class="save-icon">✓</span>
      PR created:
      <a href={saveResult.pr.url} target="_blank" rel="noopener noreferrer" class="pr-link">
        #{saveResult.pr.number}
      </a>
    </div>
  {/if}

  <!-- Content area -->
  <div class="content-area">
    {#if file.editMode}
      <textarea
        class="editor-textarea"
        value={file.draftContent}
        oninput={(e) => onupdate((e.currentTarget as HTMLTextAreaElement).value)}
        spellcheck={false}
        placeholder="Write your AGENTS.md content here…"
      ></textarea>
    {:else if file.content}
      <div class="preview-wrap">
        <Markdown source={file.content} />
      </div>
    {:else}
      <div class="empty-file">
        <span class="empty-icon">◇</span>
        <span class="empty-text">File is empty</span>
        <button class="btn btn-outline" onclick={() => onupdate("")}>Start editing</button>
      </div>
    {/if}
  </div>
</div>

<style>
  /* ------------------------------------------------------------------ */
  /* Wrapper                                                             */
  /* ------------------------------------------------------------------ */
  .editor-wrap {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 5px;
    overflow: hidden;
  }

  /* ------------------------------------------------------------------ */
  /* Toolbar                                                             */
  /* ------------------------------------------------------------------ */
  .toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-elevated);
    flex-shrink: 0;
    min-height: 34px;
  }

  .file-path {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-muted);
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 0;
  }

  .path-prefix {
    color: var(--color-dim);
  }

  .dirty-dot {
    color: var(--color-warning, #e89c3c);
    margin-left: 6px;
    font-size: 8px;
    flex-shrink: 0;
  }

  .actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  /* ------------------------------------------------------------------ */
  /* Save banner                                                         */
  /* ------------------------------------------------------------------ */
  .save-banner {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    background: color-mix(in srgb, var(--color-success) 12%, transparent);
    border-bottom: 1px solid color-mix(in srgb, var(--color-success) 30%, transparent);
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    color: var(--color-success);
    flex-shrink: 0;
  }

  .save-icon {
    font-size: 12px;
  }

  .pr-link {
    color: var(--color-success);
    text-decoration: underline;
  }

  /* ------------------------------------------------------------------ */
  /* Content area                                                        */
  /* ------------------------------------------------------------------ */
  .content-area {
    flex: 1;
    min-height: 0;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  /* ------------------------------------------------------------------ */
  /* Textarea editor                                                     */
  /* ------------------------------------------------------------------ */
  .editor-textarea {
    flex: 1;
    width: 100%;
    padding: 14px 16px;
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    line-height: 1.6;
    color: var(--color-text);
    background: transparent;
    border: none;
    outline: none;
    resize: none;
    tab-size: 2;
  }

  /* ------------------------------------------------------------------ */
  /* Preview                                                             */
  /* ------------------------------------------------------------------ */
  .preview-wrap {
    flex: 1;
    padding: 16px 20px;
    overflow-y: auto;
  }

  /* ------------------------------------------------------------------ */
  /* Empty state                                                         */
  /* ------------------------------------------------------------------ */
  .empty-file {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 40px;
  }

  .empty-icon {
    font-size: 24px;
    color: var(--color-dim);
    line-height: 1;
  }

  .empty-text {
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    color: var(--color-dim);
  }

  /* ------------------------------------------------------------------ */
  /* Buttons                                                             */
  /* ------------------------------------------------------------------ */
  .btn {
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    padding: 3px 10px;
    border-radius: 3px;
    cursor: pointer;
    border: 1px solid transparent;
    line-height: 1.6;
    transition: opacity 0.1s;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-ghost {
    background: transparent;
    color: var(--color-muted);
    border-color: transparent;
  }

  .btn-ghost:hover:not(:disabled) {
    color: var(--color-text);
  }

  .btn-outline {
    background: transparent;
    color: var(--color-text);
    border-color: var(--color-border);
  }

  .btn-outline:hover:not(:disabled) {
    border-color: var(--color-muted);
  }

  .btn-primary {
    background: var(--color-accent);
    color: var(--color-bg);
    border-color: var(--color-accent);
  }

  .btn-primary:hover:not(:disabled) {
    opacity: 0.85;
  }
</style>
