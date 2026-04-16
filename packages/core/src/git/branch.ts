export const RESERVED_BRANCH_NAMES: ReadonlySet<string> = new Set([
  "main",
  "master",
  "dev",
  "develop",
  "development",
  "prod",
  "production",
  "staging",
  "stage",
  "preview",
  "release",
  "releases",
  "trunk",
  "default",
  "stable",
  "canary",
  "next",
  "qa",
  "uat",
  "hotfix",
]);

export const RESERVED_BRANCH_PATTERNS: readonly RegExp[] = [
  /^release\/.+/i,
  /^hotfix\/.+/i,
  /^env\/.+/i,
];

export function isReservedBranch(name: string): boolean {
  const n = name.toLowerCase();
  if (RESERVED_BRANCH_NAMES.has(n)) return true;
  return RESERVED_BRANCH_PATTERNS.some((re) => re.test(name));
}
