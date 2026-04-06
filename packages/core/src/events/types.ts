export const OriginType = ["api", "webhook", "action", "console", "cli", "cron"] as const;
export type OriginType = (typeof OriginType)[number];
