export const ACCOUNT_TYPES = [
  { value: "PROP_FIRM", label: "Prop Firm" },
  { value: "LIVE", label: "Live" },
  { value: "DEMO", label: "Demo" },
] as const;

export const ACCOUNT_STATUSES = [
  { value: "EVALUATION", label: "Active / Evaluation" },
  { value: "FUNDED", label: "Funded" },
  { value: "FAILED", label: "Failed" },
  { value: "CLOSED", label: "Closed" },
] as const;

// Accounts still being traded; failed/closed ones drop out of the totals.
export const ACTIVE_STATUSES = ["EVALUATION", "FUNDED"];
