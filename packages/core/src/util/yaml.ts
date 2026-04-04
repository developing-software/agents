/**
 * Lightweight YAML-subset parser for frontmatter and simple config files.
 * Handles: key-value pairs, nested objects (indentation-based), simple arrays (- item),
 * strings, numbers, booleans, null. Does NOT handle multi-line strings, anchors, etc.
 */

export function parseYaml(text: string): Record<string, unknown> {
  const lines = text.split("\n");
  return parseBlock(lines, 0, 0).value as Record<string, unknown>;
}

/**
 * Parse YAML frontmatter from a markdown file.
 * Returns the parsed frontmatter and the remaining markdown body.
 */
export function parseFrontmatter(content: string): {
  attributes: Record<string, unknown>;
  body: string;
} {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith("---")) {
    return { attributes: {}, body: content };
  }

  const end = trimmed.indexOf("\n---", 3);
  if (end === -1) {
    return { attributes: {}, body: content };
  }

  const yamlBlock = trimmed.slice(3, end).trim();
  const body = trimmed.slice(end + 4).replace(/^\n/, "");

  return {
    attributes: yamlBlock ? parseYaml(yamlBlock) : {},
    body,
  };
}

function parseBlock(
  lines: string[],
  startIdx: number,
  baseIndent: number,
): { value: Record<string, unknown>; nextIdx: number } {
  const result: Record<string, unknown> = {};
  let i = startIdx;

  while (i < lines.length) {
    const line = lines[i]!;

    if (line.trim() === "" || line.trim().startsWith("#")) {
      i++;
      continue;
    }

    const indent = line.search(/\S/);
    if (indent < baseIndent) break;

    const content = line.trim();

    const colonIdx = content.indexOf(":");
    if (colonIdx === -1) {
      i++;
      continue;
    }

    const key = content.slice(0, colonIdx).trim();
    const rawValue = content.slice(colonIdx + 1).trim();

    if (rawValue === "" || rawValue === "|" || rawValue === ">") {
      const nextNonEmpty = findNextNonEmpty(lines, i + 1);
      if (nextNonEmpty !== null) {
        const nextLine = lines[nextNonEmpty]!;
        const nextIndent = nextLine.search(/\S/);
        if (nextIndent > indent) {
          const nextContent = nextLine.trim();
          if (nextContent.startsWith("- ")) {
            const arr = parseArray(lines, nextNonEmpty, nextIndent);
            result[key] = arr.value;
            i = arr.nextIdx;
            continue;
          } else {
            const nested = parseBlock(lines, nextNonEmpty, nextIndent);
            result[key] = nested.value;
            i = nested.nextIdx;
            continue;
          }
        }
      }
      result[key] = null;
    } else if (rawValue.startsWith("[") && rawValue.endsWith("]")) {
      const inner = rawValue.slice(1, -1);
      result[key] = inner ? inner.split(",").map((s) => parseScalar(s.trim())) : [];
    } else {
      result[key] = parseScalar(rawValue);
    }

    i++;
  }

  return { value: result, nextIdx: i };
}

function parseArray(
  lines: string[],
  startIdx: number,
  baseIndent: number,
): { value: unknown[]; nextIdx: number } {
  const result: unknown[] = [];
  let i = startIdx;

  while (i < lines.length) {
    const line = lines[i]!;

    if (line.trim() === "" || line.trim().startsWith("#")) {
      i++;
      continue;
    }

    const indent = line.search(/\S/);
    if (indent < baseIndent) break;

    const content = line.trim();
    if (!content.startsWith("- ")) break;

    const itemValue = content.slice(2).trim();

    if (itemValue.includes(":")) {
      const nextNonEmpty = findNextNonEmpty(lines, i + 1);
      if (nextNonEmpty !== null && lines[nextNonEmpty]!.search(/\S/) > indent + 1) {
        const obj: Record<string, unknown> = {};
        const [firstKey = "", ...rest] = itemValue.split(":");
        obj[firstKey.trim()] = parseScalar(rest.join(":").trim());
        const nested = parseBlock(lines, nextNonEmpty, lines[nextNonEmpty]!.search(/\S/));
        Object.assign(obj, nested.value);
        result.push(obj);
        i = nested.nextIdx;
        continue;
      }
      const obj: Record<string, unknown> = {};
      const [firstKey = "", ...rest] = itemValue.split(":");
      obj[firstKey.trim()] = parseScalar(rest.join(":").trim());
      result.push(obj);
    } else {
      result.push(parseScalar(itemValue));
    }

    i++;
  }

  return { value: result, nextIdx: i };
}

function parseScalar(value: string): string | number | boolean | null {
  if (value === "null" || value === "~" || value === "") return null;
  if (value === "true") return true;
  if (value === "false") return false;

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }

  return value;
}

function findNextNonEmpty(lines: string[], startIdx: number): number | null {
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.trim() !== "" && !line.trim().startsWith("#")) {
      return i;
    }
  }
  return null;
}
