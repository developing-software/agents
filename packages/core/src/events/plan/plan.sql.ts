export const PlanStatus = [
  "draft",
  "review",
  "approved",
  "implementing",
  "completed",
  "rejected",
] as const;
export type PlanStatus = (typeof PlanStatus)[number];

export const AuthorType = ["human", "llm"] as const;
export type AuthorType = (typeof AuthorType)[number];

export interface PlanEventData {
  title: string;
  body: string;
  status: PlanStatus;
  authorType: AuthorType;
  createdBy?: string;
  [key: string]: unknown;
}
