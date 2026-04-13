export interface TreeNode {
  name: string;
  path: string;
  type: "file" | "dir";
  children?: TreeNode[];
}

export interface EditorFile {
  path: string;
  sha: string;
  content: string;
  draftContent: string;
  editMode: boolean;
}

export interface ContextFile {
  path: string;
  content: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

/**
 * Build a hierarchical tree from a flat list of paths.
 */
export function buildTree(entries: Array<{ path: string; type: "file" | "dir" }>): TreeNode[] {
  const root: TreeNode[] = [];
  const dirMap = new Map<string, TreeNode>();

  // Sort so dirs come before files at each level
  const sorted = [...entries].sort((a, b) => {
    const aIsDir = a.type === "dir" ? 0 : 1;
    const bIsDir = b.type === "dir" ? 0 : 1;
    if (aIsDir !== bIsDir) return aIsDir - bIsDir;
    return a.path.localeCompare(b.path);
  });

  for (const entry of sorted) {
    const parts = entry.path.split("/");
    let current = root;
    let builtPath = "";

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]!;
      builtPath = builtPath ? `${builtPath}/${part}` : part;

      let dir = dirMap.get(builtPath);
      if (!dir) {
        dir = { name: part, path: builtPath, type: "dir", children: [] };
        dirMap.set(builtPath, dir);
        current.push(dir);
      }
      current = dir.children!;
    }

    const lastName = parts[parts.length - 1]!;
    if (entry.type === "dir") {
      let dir = dirMap.get(entry.path);
      if (!dir) {
        dir = { name: lastName, path: entry.path, type: "dir", children: [] };
        dirMap.set(entry.path, dir);
        current.push(dir);
      }
    } else {
      current.push({ name: lastName, path: entry.path, type: "file" });
    }
  }

  return root;
}

/**
 * Infer a language label from a file path for display.
 */
export function fileLanguage(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "ts",
    tsx: "tsx",
    js: "js",
    jsx: "jsx",
    svelte: "svelte",
    md: "md",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    toml: "toml",
    sh: "sh",
    py: "py",
    go: "go",
    rs: "rs",
    sql: "sql",
    css: "css",
    html: "html",
  };
  return map[ext] ?? ext;
}

/**
 * Return a short file icon character based on the file path/extension.
 */
export function fileIcon(name: string, type: "file" | "dir"): string {
  if (type === "dir") return "▸";
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (name === "AGENTS.md" || name === "CLAUDE.md") return "◈";
  if (ext === "md") return "◇";
  if (ext === "ts" || ext === "tsx") return "◆";
  if (ext === "js" || ext === "jsx") return "◆";
  if (ext === "svelte") return "◉";
  if (ext === "json") return "◎";
  if (ext === "yaml" || ext === "yml") return "◎";
  return "·";
}
