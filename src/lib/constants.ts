export const PROJECT_TYPES = [
  "entrepreneurship_training",
  "business_idea_development",
  "startup_challenge",
  "hackathon",
  "competition",
  "innovation_program",
  "other",
] as const;

export const SIMULATION_TYPES = [
  "idea_development",
  "startup_management",
  "leadership",
  "investor_readiness",
] as const;

export const TRAINING_TYPES = [
  "finance",
  "sales_marketing",
  "team_management",
  "pitch_preparation",
  "leadership",
  "innovation_tools",
  "business_model",
  "customer_validation",
  "ai_tools",
] as const;

export const AI_TOOLS = [
  "ai_mentor",
  "ai_jury",
  "ai_evaluation",
  "ai_analysis",
  "ai_reporting",
  "ai_pitch_coach",
  "ai_finance_advisor",
] as const;

export const SEAT_PACKAGES = [
  { id: "50", seats: 50, pricePerSeat: 29 },
  { id: "100", seats: 100, pricePerSeat: 25 },
  { id: "250", seats: 250, pricePerSeat: 22 },
] as const;

export const BADGE_CATEGORIES = [
  "idea_development",
  "startup_management",
  "finance",
  "sales_marketing",
  "pitch_investor",
  "leadership",
  "founder_psychology",
  "globalization",
  "special_achievement",
] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number];
export type SimulationType = (typeof SIMULATION_TYPES)[number];
export type TrainingType = (typeof TRAINING_TYPES)[number];
export type AiTool = (typeof AI_TOOLS)[number];
