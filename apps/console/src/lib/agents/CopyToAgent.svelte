<script lang="ts">
	import { onClickOutside } from 'runed';
	import { AGENT_TARGETS, type AgentTarget } from './targets';

	interface Props {
		/** The raw prompt. The agent target decides how to wrap it. */
		prompt: string | (() => string);
		/** Button label. Defaults to "copy". */
		label?: string;
		/** Visual style. `row` = dim inline button, `bar` = emphasized bar button. */
		variant?: 'row' | 'bar';
		/** Menu alignment relative to the trigger. */
		align?: 'left' | 'right';
		/** Override the target list (e.g. to filter by project policy). */
		targets?: AgentTarget[];
		disabled?: boolean;
		/** Optional title shown above the menu items. */
		menuTitle?: string;
	}

	let {
		prompt,
		label = 'copy',
		variant = 'row',
		align = 'right',
		targets = AGENT_TARGETS,
		disabled = false,
		menuTitle = 'Copy to agent',
	}: Props = $props();

	let open = $state(false);
	let copiedId = $state<string | null>(null);
	let menuRoot = $state<HTMLElement>();

	onClickOutside(() => menuRoot, () => { open = false; });

	function resolvePrompt(): string {
		return typeof prompt === 'function' ? prompt() : prompt;
	}

	async function pick(target: AgentTarget) {
		const text = target.format(resolvePrompt());
		try {
			await navigator.clipboard.writeText(text);
			copiedId = target.id;
			setTimeout(() => {
				if (copiedId === target.id) copiedId = null;
			}, 1200);
			setTimeout(() => {
				if (copiedId === target.id || copiedId === null) open = false;
			}, 500);
		} catch {
			copiedId = null;
		}
	}

	function toggle(e: MouseEvent) {
		if (disabled) return;
		e.stopPropagation();
		open = !open;
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') open = false;
	}
</script>

<div class="copy-to-agent" bind:this={menuRoot} onkeydown={onKeydown} role="presentation">
	<button
		type="button"
		class="trigger"
		class:trigger-bar={variant === 'bar'}
		class:trigger-row={variant === 'row'}
		class:trigger-active={open}
		onclick={toggle}
		{disabled}
		aria-haspopup="menu"
		aria-expanded={open}
	>
		<span class="trigger-label">{label}</span>
		<span class="trigger-caret" class:caret-open={open}>▾</span>
	</button>

	{#if open}
		<div
			class="menu"
			class:menu-right={align === 'right'}
			class:menu-left={align === 'left'}
			role="menu"
		>
			<div class="menu-header">{menuTitle}</div>
			{#each targets as target (target.id)}
				<button
					type="button"
					class="menu-item"
					class:menu-item-copied={copiedId === target.id}
					onclick={() => pick(target)}
					role="menuitem"
				>
					<span class="menu-item-name">{target.name}</span>
					{#if target.description}
						<span class="menu-item-desc">{target.description}</span>
					{/if}
					<span class="menu-item-check">{copiedId === target.id ? '✓' : ''}</span>
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.copy-to-agent {
		position: relative;
		display: inline-flex;
	}

	.trigger {
		font-family: "JetBrains Mono", monospace;
		font-size: 10px;
		display: inline-flex;
		align-items: center;
		gap: 4px;
		border-radius: 3px;
		border: 1px solid var(--color-border);
		background: none;
		color: var(--color-dim);
		cursor: pointer;
		transition: color 0.1s, border-color 0.1s, background 0.1s;
		white-space: nowrap;
		line-height: 1;
	}

	.trigger:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.trigger-row {
		padding: 2px 6px;
	}

	.trigger-bar {
		padding: 2px 8px;
		color: var(--color-text);
	}

	.trigger:hover:not(:disabled) {
		color: var(--color-accent);
		border-color: var(--color-accent);
	}

	.trigger-active {
		color: var(--color-accent);
		border-color: var(--color-accent);
		background: color-mix(in srgb, var(--color-accent) 8%, transparent);
	}

	.trigger-caret {
		font-size: 8px;
		color: currentColor;
		opacity: 0.7;
		transition: transform 0.15s ease;
		display: inline-block;
	}

	.caret-open {
		transform: rotate(180deg);
	}

	.menu {
		position: absolute;
		top: calc(100% + 4px);
		z-index: 20;
		min-width: 200px;
		background: var(--color-elevated);
		border: 1px solid var(--color-border-bright, var(--color-border));
		border-radius: 4px;
		box-shadow: 0 8px 24px -8px rgba(0, 0, 0, 0.5);
		padding: 4px;
		display: flex;
		flex-direction: column;
		gap: 1px;
		animation: menu-in 0.12s ease-out;
	}

	.menu-right {
		right: 0;
	}

	.menu-left {
		left: 0;
	}

	@keyframes menu-in {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.menu-header {
		font-family: "JetBrains Mono", monospace;
		font-size: 9px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--color-muted);
		padding: 4px 6px 6px;
	}

	.menu-item {
		font-family: "JetBrains Mono", monospace;
		font-size: 11px;
		display: grid;
		grid-template-columns: 1fr auto auto;
		align-items: baseline;
		gap: 8px;
		padding: 5px 6px;
		border: none;
		border-radius: 3px;
		background: none;
		color: var(--color-text);
		text-align: left;
		cursor: pointer;
		transition: background 0.08s;
	}

	.menu-item:hover {
		background: var(--color-hover);
	}

	.menu-item-copied {
		background: color-mix(in srgb, var(--color-accent) 14%, transparent);
		color: var(--color-accent);
	}

	.menu-item-name {
		font-weight: 500;
	}

	.menu-item-desc {
		font-size: 9px;
		color: var(--color-dim);
		font-weight: 400;
	}

	.menu-item-check {
		font-size: 10px;
		min-width: 10px;
		color: var(--color-accent);
		text-align: right;
	}
</style>
