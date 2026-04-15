export namespace Prompt {
  export function render(template: string, vars: Record<string, string | number>): string {
    return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
      const v = vars[key];
      return v === undefined || v === null ? "" : String(v);
    });
  }
}
