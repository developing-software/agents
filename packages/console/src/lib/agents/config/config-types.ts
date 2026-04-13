export interface AgentMdFile {
  path: string;
  sha: string;
  content: string;
}

export interface TreeNode {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: TreeNode[];
  /** Whether children have been loaded (for lazy loading) */
  loaded?: boolean;
}

export interface ContextFile {
  path: string;
  content: string;
  language: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export type EditorMode = "preview" | "edit";

export interface EditorTab {
  path: string;
  originalContent: string;
  currentContent: string;
  mode: EditorMode;
}

/** Infer language from file extension */
export function inferLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    svelte: "svelte",
    json: "json",
    md: "markdown",
    yml: "yaml",
    yaml: "yaml",
    css: "css",
    html: "html",
    sql: "sql",
    sh: "shell",
    toml: "toml",
    py: "python",
    rs: "rust",
    go: "go",
  };
  return map[ext] ?? "text";
}
