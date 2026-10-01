/** Sales pipeline of a demo request, moved by the platform team. */
export const LEAD_STATUSES = ["NEW", "CONTACTED", "QUALIFIED", "CLOSED"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];
