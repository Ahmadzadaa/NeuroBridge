import { z } from "zod";
import { ValidationError } from "@/lib/auth/permissions";
import {
  AI_TOOLS,
  PROJECT_TYPES,
  SIMULATION_TYPES,
  TRAINING_TYPES,
} from "@/lib/constants";

const safeString = (max: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine((val) => !/[<>]/.test(val), "Invalid characters detected");

export const createProgramSchema = z
  .object({
    name: safeString(200),
    description: z.string().trim().max(5000).optional().nullable(),
    type: z.enum(PROJECT_TYPES),
    applicationStart: z.coerce.date(),
    applicationEnd: z.coerce.date(),
    simulationStart: z.coerce.date().optional().nullable(),
    simulationEnd: z.coerce.date().optional().nullable(),
    participantLimit: z.coerce.number().int().min(1).max(100000),
    simulations: z.array(z.enum(SIMULATION_TYPES)).max(4).default([]),
    trainings: z.array(z.enum(TRAINING_TYPES)).default([]),
    aiTools: z.array(z.enum(AI_TOOLS)).default([]),
  })
  .refine((data) => data.applicationEnd >= data.applicationStart, {
    message: "Application end must be after start",
    path: ["applicationEnd"],
  })
  .refine(
    (data) => {
      if (data.simulationStart && data.simulationEnd) {
        return data.simulationEnd >= data.simulationStart;
      }
      return true;
    },
    { message: "Simulation end must be after start", path: ["simulationEnd"] }
  );

export const aiChatSchema = z.object({
  tool: z.enum(AI_TOOLS),
  message: safeString(4000),
});

export const loginSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().trim().min(8).max(128),
  totpCode: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value && /^\d{6}$/.test(value) ? value : undefined)),
});

export const twoFactorSetupSchema = z.object({
  totpCode: z.string().regex(/^\d{6}$/),
});

export const twoFactorVerifySchema = z.object({
  totpCode: z.string().regex(/^\d{6}$/),
});

export const webhookSeatSchema = z.object({
  tenantId: z.string().cuid(),
  seatCount: z.coerce.number().int().min(1).max(100000),
  providerRef: z.string().min(1).max(255),
  amount: z.coerce.number().min(0),
  currency: z.enum(["TRY", "USD", "EUR", "AZN"]),
});

export const registrationSchema = z.object({
  token: z.string().min(1).max(100),
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(128),
  firstName: safeString(100),
  lastName: safeString(100),
  phone: z.string().trim().max(30).optional(),
});

export const checkoutSchema = z.object({
  seatCount: z.coerce
    .number()
    .int()
    .refine((value) => [50, 100, 250].includes(value), "Invalid seat package"),
  provider: z.enum(["STRIPE", "PAYRIFF", "IYZICO"]),
});

export const updateTenantSettingsSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  website: z.string().trim().max(500).optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
  email: z.string().trim().email().max(320).optional().nullable(),
  address: z.string().trim().max(500).optional().nullable(),
  authorizedContact: z.string().trim().max(200).optional().nullable(),
  participationCertificate: z.boolean().optional(),
  achievementCertificate: z.boolean().optional(),
  completionCertificate: z.boolean().optional(),
  sendInvitationEmail: z.boolean().optional(),
  programStartReminder: z.boolean().optional(),
  programEndReminder: z.boolean().optional(),
  certificateNotification: z.boolean().optional(),
  weeklyProgressNotification: z.boolean().optional(),
});

export const reportExportSchema = z.object({
  programId: z.string().cuid(),
  format: z.enum(["csv", "pdf"]),
  reportType: z.enum(["general", "training", "test", "certificate"]).default("general"),
});

export const roleChangeSchema = z.object({
  role: z.enum(["TENANT_ADMIN", "TENANT_VIEWER", "PARTICIPANT", "JURY"]),
});

export const addJurySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  firstName: safeString(100).optional(),
  lastName: safeString(100).optional(),
});

export const updateProfileSchema = z.object({
  firstName: safeString(100),
  lastName: safeString(100),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[+\d\s()-]*$/, "Invalid phone format")
    .optional()
    .or(z.literal("")),
  language: z.enum(["tr", "en", "az"]),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain uppercase, lowercase and a number"
    ),
});

export const issueCertificateSchema = z.object({
  userId: z.string().cuid(),
  type: z.enum(["PARTICIPATION", "ACHIEVEMENT", "COMPLETION"]),
});

export const auditQuerySchema = z.object({
  tenantId: z.string().cuid().optional(),
  action: z.string().trim().max(100).optional(),
  userId: z.string().cuid().optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export const recoveryCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-F0-9]{10}$/i, "Invalid recovery code format");

export const examAttemptSchema = z.object({
  answers: z
    .record(z.string().min(1).max(50), z.enum(["A", "B", "C", "D"]))
    .refine((val) => Object.keys(val).length <= 100, "Too many answers"),
});

export const createTeamSchema = z.object({
  programId: z.string().min(1).max(50),
  name: safeString(80),
  slogan: safeString(160).optional(),
});

export const juryScoreSchema = z.object({
  scores: z
    .array(
      z.object({
        criterionId: z.string().min(1).max(50),
        score: z.number().int().min(0).max(100),
        comment: safeString(500).optional(),
      })
    )
    .min(1)
    .max(20),
});

export const criteriaSchema = z.object({
  programId: z.string().min(1).max(50),
  criteria: z
    .array(
      z.object({
        name: safeString(100),
        maxScore: z.number().int().min(1).max(100),
        weight: z.number().int().min(1).max(10).default(1),
      })
    )
    .min(1)
    .max(20),
});

export function parseBody<T extends z.ZodType>(
  schema: T,
  body: unknown
): z.infer<T> {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ValidationError("Validation failed", result.error.flatten());
  }
  return result.data;
}
