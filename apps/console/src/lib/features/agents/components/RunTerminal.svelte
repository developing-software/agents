<script lang="ts">
  import '@xterm/xterm/css/xterm.css';
  import type { Attachment } from 'svelte/attachments';
  import { openRunTerminal } from '$lib/features/agents/api/run.remote';

  let {
    organization,
    repoName,
    eventId,
    onclose,
  }: {
    organization: string;
    repoName: string;
    eventId: string;
    onclose: () => void;
  } = $props();

  let error = $state<string | null>(null);

  function cssVar(name: string, fallback: string): string {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  function terminal(params: { organization: string; repoName: string; eventId: string }): Attachment<HTMLDivElement> {
    return (container) => {
      let disposed = false;
      let ws: WebSocket | null = null;
      let observer: ResizeObserver | null = null;
      let term: import('@xterm/xterm').Terminal | null = null;

      (async () => {
        const [{ Terminal }, { FitAddon }] = await Promise.all([
          import('@xterm/xterm'),
          import('@xterm/addon-fit'),
        ]);
        if (disposed) return;

        term = new Terminal({
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 12,
          cursorBlink: true,
          theme: {
            background: cssVar('--color-bg', '#111113'),
            foreground: cssVar('--color-text', '#d8d8d8'),
            cursor: cssVar('--color-accent', '#5c8fcc'),
            selectionBackground: cssVar('--color-elevated', '#222224'),
          },
        });
        const fit = new FitAddon();
        term.loadAddon(fit);
        term.open(container);
        fit.fit();

        let session: { url: string };
        try {
          session = await openRunTerminal(params);
        } catch (e) {
          if (!disposed) error = e instanceof Error ? e.message : 'Failed to open terminal';
          return;
        }
        if (disposed) return;

        const socket = new WebSocket(session.url);
        socket.binaryType = 'arraybuffer';
        ws = socket;
        const t = term;

        const sendResize = () => {
          if (socket.readyState !== WebSocket.OPEN) return;
          socket.send(JSON.stringify({ type: 'resize', cols: t.cols, rows: t.rows }));
        };

        socket.onopen = () => {
          fit.fit();
          sendResize();
          t.focus();
        };
        socket.onmessage = (ev) => {
          if (ev.data instanceof ArrayBuffer) {
            t.write(new Uint8Array(ev.data));
            return;
          }
          try {
            const msg = JSON.parse(ev.data as string) as { type?: string; reason?: string };
            if (msg.type === 'closed') {
              t.write(`\r\n\x1b[2m[session closed: ${msg.reason ?? 'unknown'}]\x1b[0m\r\n`);
            }
          } catch {
            // ignore malformed control frames
          }
        };
        socket.onerror = () => {
          if (!disposed) error = 'Terminal connection error';
        };

        const encoder = new TextEncoder();
        t.onData((d) => {
          if (socket.readyState === WebSocket.OPEN) socket.send(encoder.encode(d));
        });

        observer = new ResizeObserver(() => {
          fit.fit();
          sendResize();
        });
        observer.observe(container);
      })();

      return () => {
        disposed = true;
        observer?.disconnect();
        ws?.close();
        term?.dispose();
      };
    };
  }
</script>

<div class="term-backdrop">
  <div class="term-panel" role="dialog" aria-label="Terminal">
    <div class="term-header">
      <span class="term-title">Terminal</span>
      <span class="term-id">{eventId}</span>
      <button type="button" class="term-close" onclick={onclose}>Close</button>
    </div>
    {#if error}
      <div class="term-error">{error}</div>
    {/if}
    <div class="term-body" {@attach terminal({ organization, repoName, eventId })}></div>
  </div>
</div>

<style>
  .term-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(4px);
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .term-panel {
    font-family: "JetBrains Mono", monospace;
    width: 900px;
    height: 560px;
    max-width: 95vw;
    max-height: 85vh;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .term-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .term-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--color-text);
  }

  .term-id {
    font-size: 11px;
    color: var(--color-dim);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .term-close {
    margin-left: auto;
    font-family: "JetBrains Mono", monospace;
    font-size: 11px;
    padding: 3px 10px;
    border-radius: 4px;
    border: 1px solid var(--color-border);
    background: none;
    color: var(--color-muted);
    cursor: pointer;
  }

  .term-close:hover {
    color: var(--color-text);
    border-color: var(--color-muted);
  }

  .term-error {
    font-size: 11px;
    color: var(--color-danger, var(--color-warning));
    padding: 6px 12px;
    background: color-mix(in srgb, var(--color-danger, var(--color-warning)) 6%, transparent);
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  .term-body {
    flex: 1;
    min-height: 0;
    padding: 6px;
    background: var(--color-bg);
  }
</style>
