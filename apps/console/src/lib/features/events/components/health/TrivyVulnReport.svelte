<script lang="ts">
	import { SvelteMap } from 'svelte/reactivity';
	import MetricList from './MetricList.svelte';
	import ReportLayout from './ReportLayout.svelte';

	interface Vulnerability {
		VulnerabilityID: string;
		PkgName: string;
		InstalledVersion: string;
		FixedVersion?: string;
		Severity: string;
		Title?: string;
		Description?: string;
		PrimaryURL?: string;
		Status?: string;
		CVSS?: Record<string, { V3Score?: number }>;
	}

	interface Result {
		Target: string;
		Type?: string;
		Vulnerabilities?: Vulnerability[];
	}

	interface Props {
		data: { Results?: Result[] };
	}

	let { data }: Props = $props();

	const SEVERITY_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'UNKNOWN'];

	const SEVERITY_COLORS: Record<string, string> = {
		CRITICAL: 'var(--color-danger, #ff5f56)',
		HIGH: '#ff8c42',
		MEDIUM: 'var(--color-warning, #f5b700)',
		LOW: 'var(--color-dim)',
		UNKNOWN: 'var(--color-muted)',
	};

	const allVulns = $derived.by((): Vulnerability[] => {
		const results = data.Results ?? [];
		return results.flatMap((r) => r.Vulnerabilities ?? []);
	});

	const counts = $derived.by(() => {
		const c: Record<string, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, UNKNOWN: 0 };
		for (const v of allVulns) {
			const sev = (v.Severity ?? 'UNKNOWN').toUpperCase();
			c[sev in c ? sev : 'UNKNOWN'] += 1;
		}
		return c;
	});

	const packagesAffected = $derived.by(() => {
		return new Set(allVulns.map((v) => v.PkgName)).size;
	});

	const fixableCount = $derived.by(() => {
		return allVulns.filter((v) => v.FixedVersion && v.FixedVersion.trim() !== '').length;
	});

	const summaryMetrics = $derived.by(() => [
		{ label: 'total', value: allVulns.length, emphasized: true },
		{ label: 'critical', value: counts.CRITICAL },
		{ label: 'high', value: counts.HIGH },
		{ label: 'medium', value: counts.MEDIUM },
		{ label: 'low', value: counts.LOW },
		{ label: 'packages affected', value: packagesAffected },
		{ label: 'fixable', value: fixableCount },
	]);

	const grouped = $derived.by(() => {
		const map = new SvelteMap<string, Vulnerability[]>();
		for (const sev of SEVERITY_ORDER) {
			map.set(sev, []);
		}
		for (const v of allVulns) {
			const sev = (v.Severity ?? 'UNKNOWN').toUpperCase();
			const key = SEVERITY_ORDER.includes(sev) ? sev : 'UNKNOWN';
			map.get(key)!.push(v);
		}
		return SEVERITY_ORDER.map((sev) => ({ sev, vulns: map.get(sev)! })).filter(
			({ vulns }) => vulns.length > 0
		);
	});

	function cvssScore(v: Vulnerability): string {
		if (!v.CVSS) return '';
		for (const src of Object.values(v.CVSS)) {
			if (src?.V3Score != null) return src.V3Score.toFixed(1);
		}
		return '';
	}

	let expanded = $state<Record<string, boolean>>({});

	function toggleVuln(key: string) {
		expanded[key] = !expanded[key];
	}
</script>

<ReportLayout>
	{#snippet sidebar()}
		<MetricList title="Summary" metrics={summaryMetrics} />
		<div class="legend">
			<div class="legend-title">Fix by version bump</div>
			<p class="legend-body">
				Fixable vulns have a known patched version. Update the package to the listed fixed version
				to resolve.
			</p>
		</div>
	{/snippet}

	{#if grouped.length === 0}
		<div class="empty">No vulnerabilities found.</div>
	{:else}
		{#each grouped as { sev, vulns } (sev)}
			<div class="section-head">
				<span class="section-title" style="color: {SEVERITY_COLORS[sev]}">{sev}</span>
				<span class="section-sub">{vulns.length} {vulns.length === 1 ? 'vuln' : 'vulns'}</span>
			</div>
			<ol class="vuln-list">
				{#each vulns as vuln, idx (vuln.VulnerabilityID + '_' + idx)}
					{@const key = vuln.VulnerabilityID + '_' + idx}
					{@const score = cvssScore(vuln)}
					{@const isOpen = expanded[key] ?? false}
					<li class="vuln-item">
						<button
							type="button"
							class="vuln-row"
							style="--sev-color: {SEVERITY_COLORS[sev]}"
							onclick={() => toggleVuln(key)}
						>
							<div class="vuln-main">
								<div class="vuln-head">
									<span class="pkg-name">{vuln.PkgName}</span>
									<span class="version-from">{vuln.InstalledVersion}</span>
									{#if vuln.FixedVersion}
										<span class="arrow">→</span>
										<span class="version-to">{vuln.FixedVersion}</span>
									{/if}
									<div class="vuln-badges">
										<span class="badge badge-cve">{vuln.VulnerabilityID}</span>
										{#if score}
											<span class="badge badge-score">{score}</span>
										{/if}
									</div>
								</div>
								{#if isOpen}
									<div class="vuln-detail">
										{#if vuln.Title}
											<div class="detail-title">{vuln.Title}</div>
										{/if}
										{#if vuln.Description}
											<div class="detail-desc">{vuln.Description}</div>
										{/if}
										{#if vuln.PrimaryURL}
											<a
												class="detail-link"
												href={vuln.PrimaryURL}
												target="_blank"
												rel="noopener noreferrer"
												onclick={(e) => e.stopPropagation()}
											>{vuln.PrimaryURL}</a>
										{/if}
									</div>
								{/if}
							</div>
						</button>
					</li>
				{/each}
			</ol>
		{/each}
	{/if}
</ReportLayout>

<style>
	.legend {
		font-family: "JetBrains Mono", monospace;
		padding: 8px;
		border: 1px solid var(--color-border);
		border-radius: 3px;
		background: var(--color-surface);
	}
	.legend-title {
		font-size: 9px;
		text-transform: uppercase;
		letter-spacing: 0.5px;
		color: var(--color-accent);
		margin-bottom: 4px;
	}
	.legend-body {
		margin: 0;
		font-size: 10px;
		color: var(--color-dim);
		line-height: 1.5;
	}

	.section-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 8px;
		padding-bottom: 4px;
		border-bottom: 1px solid var(--color-border);
	}
	.section-title {
		font-family: "JetBrains Mono", monospace;
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.6px;
	}
	.section-sub {
		font-family: "JetBrains Mono", monospace;
		font-size: 10px;
		color: var(--color-dim);
	}

	.vuln-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 3px;
	}

	.vuln-item {
		display: block;
	}

	.vuln-row {
		position: relative;
		display: block;
		width: 100%;
		padding: 5px 8px 5px 10px;
		border: 1px solid var(--color-border);
		border-radius: 3px;
		background: var(--color-elevated);
		cursor: pointer;
		transition: background 0.1s;
		overflow: hidden;
		text-align: left;
		color: inherit;
		font-family: inherit;
	}

	.vuln-row::before {
		content: '';
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		width: 3px;
		background: var(--sev-color);
	}

	.vuln-row:hover {
		background: var(--color-hover);
	}

	.vuln-main {
		min-width: 0;
	}

	.vuln-head {
		display: flex;
		align-items: center;
		gap: 6px;
		flex-wrap: wrap;
	}

	.pkg-name {
		font-family: "JetBrains Mono", monospace;
		font-size: 11px;
		font-weight: 600;
		color: var(--color-text);
		white-space: nowrap;
	}

	.version-from {
		font-family: "JetBrains Mono", monospace;
		font-size: 10px;
		color: var(--color-muted);
		white-space: nowrap;
	}

	.arrow {
		font-family: "JetBrains Mono", monospace;
		font-size: 10px;
		color: var(--color-dim);
	}

	.version-to {
		font-family: "JetBrains Mono", monospace;
		font-size: 10px;
		color: var(--color-success);
		white-space: nowrap;
	}

	.vuln-badges {
		display: flex;
		align-items: center;
		gap: 4px;
		margin-left: auto;
		flex-wrap: wrap;
	}

	.badge {
		font-family: "JetBrains Mono", monospace;
		font-size: 9px;
		padding: 1px 5px;
		border-radius: 2px;
		border: 1px solid var(--color-border);
		white-space: nowrap;
		line-height: 1.5;
	}

	.badge-cve {
		color: var(--color-muted);
	}

	.badge-score {
		color: var(--sev-color);
		border-color: color-mix(in srgb, var(--sev-color) 40%, transparent);
	}

	.vuln-detail {
		margin-top: 6px;
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.detail-title {
		font-family: "JetBrains Mono", monospace;
		font-size: 11px;
		color: var(--color-text);
		font-weight: 500;
	}

	.detail-desc {
		font-family: "JetBrains Mono", monospace;
		font-size: 10px;
		color: var(--color-muted);
		line-height: 1.5;
		max-height: 200px;
		overflow-y: auto;
		white-space: pre-wrap;
		word-break: break-word;
		border-left: 2px solid var(--color-border);
		padding-left: 8px;
	}

	.detail-link {
		font-family: "JetBrains Mono", monospace;
		font-size: 10px;
		color: var(--color-accent);
		text-decoration: none;
		word-break: break-all;
	}

	.detail-link:hover {
		text-decoration: underline;
	}

	.empty {
		font-family: "JetBrains Mono", monospace;
		font-size: 11px;
		color: var(--color-dim);
		padding: 12px;
		text-align: center;
		border: 1px dashed var(--color-border);
		border-radius: 4px;
	}
</style>
