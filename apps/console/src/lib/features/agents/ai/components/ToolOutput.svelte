<script lang="ts">
	let { name, output }: { name: string; output: unknown } = $props();

	function format(): string {
		if (output == null) return '';
		if (typeof output === 'string') return `${output.length} chars`;
		try {
			const data = output as Record<string, unknown>;
			switch (name) {
				case 'listIssues': {
					const items = Array.isArray(data) ? data : [];
					return `${items.length} issue${items.length === 1 ? '' : 's'}`;
				}
				case 'getIssue':
					return `#${data.number} ${data.title}`;
				case 'createPlan':
					return `${data.title} (${data.id})`;
				case 'updatePlan':
					return `updated ${(data.updated as string[])?.join(', ')}`;
				case 'listPlans': {
					const items = Array.isArray(data) ? data : [];
					return `${items.length} plan${items.length === 1 ? '' : 's'}`;
				}
				case 'getRepoTree': {
					const entries = Array.isArray(data) ? data : [];
					return `${entries.length} entries`;
				}
				case 'readFile':
					return 'file read';
				case 'labelIssue':
					return `#${data.number}`;
				default:
					return JSON.stringify(data).slice(0, 120);
			}
		} catch {
			return JSON.stringify(output).slice(0, 120);
		}
	}
</script>

<span class="tool-summary">{format()}</span>

<style>
	.tool-summary {
		font-family: 'JetBrains Mono', monospace;
		word-break: break-all;
	}
</style>
