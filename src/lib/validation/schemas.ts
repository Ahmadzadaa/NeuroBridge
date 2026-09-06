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

/** Same rules as `safeString`, but an empty value is allowed and becomes null. */
const optionalSafeString = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine((val) => !/[<>]/.test(val), "Invalid characters detected")
    .optional()
    .or(z.literal(""));

/** Undergraduate years; universities here run 1–6 depending on the degree. */
export const MIN_STUDY_YEAR = 1;
export const MAX_STUDY_YEAR = 6;

const studyYear = z.coerce
  .number()
  .int()
  .min(MIN_STUDY_YEAR, `Study year must be between ${MIN_STUDY_YEAR} and ${MAX_STUDY_YEAR}`)
  .max(MAX_STUDY_YEAR, `Study year must be between ${MIN_STUDY_YEAR} and ${MAX_STUDY_YEAR}`)
  .optional()
  .nullable();

/**
 * Academic details for university participants. Optional throughout so the
 * same shape works for the open programme flow, where applicants are not
 * necessarily students.
 */
export const academicProfileFields = {
  university: optionalSafeString(200),
  faculty: optionalSafeString(200),
  specialty: optionalSafeString(200),
  studyYear,
};

export const academicProfileSchema = z.object(academicProfileFields);

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

/**
 * Open programme applications. Academic details are collected but optional —
 * applicants here are not always students.
 */
export const registrationSchema = z.object({
  token: z.string().min(1).max(100),
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(128),
  firstName: safeString(100),
  lastName: safeString(100),
  phone: z.string().trim().max(30).optional(),
  // The page the applicant filled in knows their language; without it the
  // welcome email and the account would both default to someone else's.
  locale: z.enum(["az", "tr", "en"]).optional(),
  ...academicProfileFields,
});

export const checkoutSchema = z.object({
  seatCount: z.coerce
    .number()
    .int()
    .refine((value) => [50, 100, 250].includes(value), "Invalid seat package"),
  provider: z.enum(["PAYTR"]).default("PAYTR"),
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

/**
 * Query parameters for the tenant analytics overview.
 *
 * Dates arrive as strings from a URL, so they are coerced and then rejected if
 * they did not parse — an unparseable `from` must not silently widen the
 * window to "everything".
 */
const analyticsDate = z
  .string()
  .trim()
  .min(1)
  .transform((value) => new Date(value))
  .refine((date) => !Number.isNaN(date.getTime()), "Invalid date")
  .optional();

export const analyticsQuerySchema = z.object({
  from: analyticsDate,
  to: analyticsDate,
  courseId: z.string().cuid().optional().nullable(),
  programId: z.string().cuid().optional().nullable(),
});

/**
 * Public demo-request form.
 *
 * This is the only unauthenticated write in the application, so the schema is
 * the entire input boundary. `safeString` already rejects angle brackets;
 * lengths are capped so a bot cannot use the form as free storage.
 *
 * `website` is the honeypot: a real field, hidden from people by CSS and from
 * assistive technology by aria-hidden, that only an automated form-filler
 * completes. Anything non-empty there is a bot.
 */
export const leadSchema = z.object({
  name: safeString(120),
  company: safeString(160),
  email: z.string().trim().toLowerCase().email().max(255),
  phone: optionalSafeString(40),
  seatCount: optionalSafeString(40),
  message: optionalSafeString(2000),
  locale: z.enum(["az", "tr", "en"]).optional(),
  source: optionalSafeString(200),
  website: z.string().max(200).optional(),
});

export const roleChangeSchema = z.object({
  role: z.enum(["TENANT_ADMIN", "TENANT_VIEWER", "PARTICIPANT", "JURY"]),
});

export const addJurySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  firstName: safeString(100).optional(),
  lastName: safeString(100).optional(),
});

/**
 * Students joining through a teacher's invite. Academic details are required
 * here — this is the university flow, and teachers need them to run a class.
 */
export const joinTeacherSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain uppercase, lowercase and a number"
    ),
  firstName: safeString(100),
  lastName: safeString(100),
  university: safeString(200),
  faculty: safeString(200),
  specialty: safeString(200),
  studyYear: z.coerce.number().int().min(MIN_STUDY_YEAR).max(MAX_STUDY_YEAR),
});

export const scenarioSchema = z.object({
  name: safeString(150),
  description: safeString(500).optional(),
  startCash: z.number().int().min(0).max(1_000_000),
  targetCash: z.number().int().min(1).max(10_000_000),
  rounds: z
    .array(
      z.object({
        title: safeString(150),
        context: safeString(2000),
        choices: z
          .array(
            z.object({
              label: safeString(200),
              detail: safeString(300).optional(),
              cashDelta: z.number().int().min(-1_000_000).max(1_000_000),
              satisfactionDelta: z.number().int().min(-100).max(100),
              reputationDelta: z.number().int().min(-100).max(100),
              variance: z.number().int().min(0).max(100_000),
              feedback: safeString(1000),
            })
          )
          .min(2)
          .max(4),
      })
    )
    .min(2)
    .max(15),
});

export const simulationDecideSchema = z.object({
  choiceId: z.string().min(1).max(50),
});

export const simulationGradeSchema = z
  .object({
    grade: z.number().int().min(0).max(1000),
    maxGrade: z.number().int().min(1).max(1000),
    comment: safeString(600).optional(),
  })
  .refine((data) => data.grade <= data.maxGrade, {
    message: "Grade cannot exceed the maximum",
    path: ["grade"],
  });

/**
 * Module flags. Omitted entirely, the tenant type's preset applies; any flag
 * that is sent overrides that preset, so a university can be given a hackathon
 * without changing its type.
 */
const tenantModuleFlags = z.object({
  teachers: z.boolean().optional(),
  hackathon: z.boolean().optional(),
  simulations: z.boolean().optional(),
  trainings: z.boolean().optional(),
  aiTools: z.boolean().optional(),
});

export const provisionTenantSchema = z.object({
  name: safeString(200),
  adminEmail: z.string().trim().toLowerCase().email().max(255),
  adminFirstName: safeString(100),
  adminLastName: safeString(100),
  seatLimit: z.number().int().min(1).max(100000),
  planType: z.enum(["starter", "professional", "enterprise"]),
  tenantType: z.enum(["UNIVERSITY", "TECHNOPARK", "FULL"]).default("FULL"),
  modules: tenantModuleFlags.optional(),
});

export const updateTenantSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "PENDING"]).optional(),
  seatLimit: z.number().int().min(1).max(100000).optional(),
  tenantType: z.enum(["UNIVERSITY", "TECHNOPARK", "FULL"]).optional(),
  modules: tenantModuleFlags.optional(),
});

export const revealSchema = z.object({
  programId: z.string().min(1).max(50),
  /** ISO datetime, null to clear (rankings live again), "now" to announce immediately. */
  revealAt: z.union([z.string().datetime(), z.literal("now"), z.null()]),
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
  ...academicProfileFields,
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
