# SECURITY AUDIT PROMPT — EXPOSED SECRETS, RATE LIMITING, INPUT VALIDATION

You are a Senior Security Engineer and Penetration Tester.

Your job is NOT to add new features.
Your job is to find and FIX every security vulnerability in these 3 critical categories.

For every issue found:
1. Show the exact file and line number
2. Show the vulnerable code (before)
3. Show the fixed code (after)
4. Write a test that proves the fix works
5. Mark severity: CRITICAL / HIGH / MEDIUM

Do not describe fixes. Implement them.

---

## AUDIT CATEGORY 1 — EXPOSED SECRETS

### What to scan for:

Search every file in the codebase (including .env, .env.local, .env.example, config files, source code, comments, git history if accessible) for:

- Hardcoded API keys (Stripe secret key, Payriff key, iyzico key)
- Hardcoded database connection strings (PostgreSQL URLs with credentials)
- Hardcoded AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
- Hardcoded JWT secrets or session secrets
- Hardcoded Anthropic API keys (Claude API)
- Hardcoded SMTP credentials (email service passwords)
- Hardcoded Resend / SendGrid / AWS SES keys
- Any string matching patterns like: `sk_live_`, `sk_test_`, `pk_live_`, `AKIA`, `password=`, `secret=`, `token=` hardcoded in source files
- .env files that are NOT in .gitignore (critical — these get committed to git)
- Any secret that appears in frontend/client-side code (exposed to browser)

### Fixes to implement:

1. Move ALL secrets to environment variables — no exceptions
2. Verify `.env`, `.env.local`, `.env.production` are in `.gitignore`
3. Create a `.env.example` file with placeholder values (no real secrets) for documentation
4. Add a startup check: if any required environment variable is missing, the app must refuse to start and log which variable is missing
5. For client-side code: verify no secret keys are exposed in `NEXT_PUBLIC_` variables — only public-safe keys (Stripe publishable key, etc.) should be there
6. Scan `next.config.js` or equivalent — ensure no secrets leak into the client bundle

### Generate:

```typescript
// Example of what the startup check should look like:
// lib/env-check.ts
const REQUIRED_SERVER_ENV_VARS = [
  'DATABASE_URL',
  'JWT_SECRET',
  'STRIPE_SECRET_KEY',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'ANTHROPIC_API_KEY',
  // add all required vars
];

const REQUIRED_CLIENT_ENV_VARS = [
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  // only truly public vars here
];

export function validateEnv() {
  const missing = REQUIRED_SERVER_ENV_VARS.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
```

Run `validateEnv()` at app startup (in `app/layout.tsx` server component or `instrumentation.ts`).

---

## AUDIT CATEGORY 2 — RATE LIMITING

### What to scan for:

Check every API route and identify which ones have NO rate limiting:

**Critical endpoints that MUST have rate limiting:**
- `POST /api/auth/login` — brute force password attacks
- `POST /api/auth/register` — mass account creation / seat exhaustion attacks
- `POST /api/auth/forgot-password` — email bombing
- `POST /api/auth/reset-password` — token brute force
- `POST /api/auth/verify-2fa` — 2FA bypass attempts
- `POST /api/webhooks/stripe` — webhook replay attacks
- `POST /api/webhooks/payriff` — webhook replay attacks
- `POST /api/ai/*` — all AI endpoints (Claude API calls cost money — abuse = financial damage)
- `POST /api/programs/*/apply` — application spam
- Any endpoint that sends an email (invite, notification, reset)

### Fixes to implement:

Use Upstash Rate Limit (recommended for Next.js / serverless) OR a Redis-based limiter.

**Install:**
```bash
npm install @upstash/ratelimit @upstash/redis
```

**Implement a reusable rate limiter:**

```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export const rateLimiters = {
  // Auth endpoints: 5 attempts per 15 minutes per IP
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    prefix: 'rl:auth',
  }),

  // Password reset: 3 attempts per hour per IP
  passwordReset: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '60 m'),
    prefix: 'rl:password-reset',
  }),

  // AI endpoints: 20 requests per minute per user
  ai: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1 m'),
    prefix: 'rl:ai',
  }),

  // Registration: 3 per hour per IP
  registration: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, '60 m'),
    prefix: 'rl:registration',
  }),

  // General API: 100 requests per minute per user
  general: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    prefix: 'rl:general',
  }),
};

export async function checkRateLimit(
  limiter: Ratelimit,
  identifier: string // IP address or user ID
): Promise<{ success: boolean; remaining: number; reset: number }> {
  const result = await limiter.limit(identifier);
  return {
    success: result.success,
    remaining: result.remaining,
    reset: result.reset,
  };
}
```

**Apply to every critical route:**

```typescript
// Example: app/api/auth/login/route.ts
import { checkRateLimit, rateLimiters } from '@/lib/rate-limit';
import { headers } from 'next/headers';

export async function POST(request: Request) {
  // Get IP address
  const headersList = headers();
  const ip = headersList.get('x-forwarded-for') ?? 
              headersList.get('x-real-ip') ?? 
              '127.0.0.1';

  // Check rate limit
  const { success, remaining, reset } = await checkRateLimit(
    rateLimiters.auth,
    ip
  );

  if (!success) {
    return Response.json(
      { error: 'Too many attempts. Please try again later.' },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
          'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
        }
      }
    );
  }

  // ... rest of login logic
}
```

Apply this pattern to ALL endpoints listed above. No exceptions.

**If Upstash is not available**, implement using the `rate-limiter-flexible` package with Redis:
```bash
npm install rate-limiter-flexible ioredis
```

### Generate tests:

```typescript
// __tests__/rate-limiting.test.ts
describe('Rate Limiting', () => {
  it('should block login after 5 failed attempts', async () => {
    for (let i = 0; i < 5; i++) {
      await fetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'test@test.com', password: 'wrong' })
      });
    }
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@test.com', password: 'wrong' })
    });
    expect(response.status).toBe(429);
  });

  it('should block AI endpoint abuse', async () => {
    // Send 21 requests (limit is 20 per minute)
    const requests = Array(21).fill(null).map(() =>
      fetch('/api/ai/mentor', { method: 'POST', body: JSON.stringify({ message: 'test' }) })
    );
    const responses = await Promise.all(requests);
    const lastResponse = responses[responses.length - 1];
    expect(lastResponse.status).toBe(429);
  });
});
```

---

## AUDIT CATEGORY 3 — INPUT VALIDATION

### What to scan for:

Check every API route for missing or incomplete input validation. Look for:

- Routes that use `req.body.field` or `await request.json()` WITHOUT validating the shape first
- Missing type validation (string sent where number expected — or vice versa)
- Missing length limits (someone sends a 10MB string as a "program name")
- Missing enum validation (invalid `role`, `status`, `type` values accepted)
- Missing date validation (end date before start date, dates in the past, invalid formats)
- Missing numeric validation (negative seat counts, zero seat counts, float where int expected)
- XSS payloads not sanitized (HTML/script tags in user-submitted text fields)
- SQL injection attempts not blocked (Prisma handles most, but raw queries must be checked)
- Missing file upload validation (wrong MIME type, oversized files)
- Webhook payload validation missing (Stripe/Payriff signatures not verified)

### Fixes to implement:

**1. Create a central Zod schema library:**

```typescript
// lib/validations/index.ts
import { z } from 'zod';

// Common reusable schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const uuidSchema = z.string().uuid('Invalid ID format');

// Program schemas
export const createProgramSchema = z.object({
  name: z.string()
    .min(3, 'Program name must be at least 3 characters')
    .max(200, 'Program name must not exceed 200 characters')
    .trim(),
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .max(2000, 'Description must not exceed 2000 characters')
    .trim(),
  type: z.enum([
    'entrepreneurship_training',
    'idea_development',
    'startup_challenge',
    'hackathon',
    'competition',
    'innovation_program',
    'other'
  ]),
  applicationStartDate: z.string().datetime(),
  applicationEndDate: z.string().datetime(),
  simulationStartDate: z.string().datetime(),
  simulationEndDate: z.string().datetime(),
  participantLimit: z.number().int().min(1).max(10000),
  selectedSimulations: z.array(z.enum([
    'idea_development',
    'startup_management',
    'leadership',
    'investor_readiness'
  ])).min(1).max(4),
  selectedTrainings: z.array(z.enum([
    'finance',
    'sales_marketing',
    'team_management',
    'pitch_preparation',
    'leadership',
    'innovation_tools',
    'business_model',
    'customer_validation',
    'ai_tools'
  ])),
  selectedAiTools: z.array(z.enum([
    'ai_mentor',
    'ai_jury',
    'ai_evaluation',
    'ai_analysis',
    'ai_reporting',
    'ai_pitch_coach',
    'ai_finance_advisor'
  ])),
}).refine(data => {
  // End date must be after start date
  return new Date(data.applicationEndDate) > new Date(data.applicationStartDate);
}, {
  message: 'Application end date must be after start date',
  path: ['applicationEndDate'],
}).refine(data => {
  return new Date(data.simulationEndDate) > new Date(data.simulationStartDate);
}, {
  message: 'Simulation end date must be after start date',
  path: ['simulationEndDate'],
});

// Seat purchase schema
export const seatPurchaseSchema = z.object({
  tenantId: uuidSchema,
  seatCount: z.number()
    .int('Seat count must be a whole number')
    .min(1, 'Must purchase at least 1 seat')
    .max(10000, 'Cannot purchase more than 10,000 seats at once'),
  packageType: z.enum(['starter_50', 'growth_100', 'enterprise_250', 'custom']),
});

// Auth schemas
export const loginSchema = z.object({
  email: z.string()
    .email('Invalid email address')
    .max(255)
    .toLowerCase()
    .trim(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password too long'),
});

export const registerSchema = z.object({
  email: z.string().email().max(255).toLowerCase().trim(),
  password: z.string()
    .min(8)
    .max(128)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  firstName: z.string().min(1).max(100).trim(),
  lastName: z.string().min(1).max(100).trim(),
  language: z.enum(['tr', 'en', 'az']).default('az'),
});

// AI request schema
export const aiRequestSchema = z.object({
  message: z.string()
    .min(1, 'Message cannot be empty')
    .max(2000, 'Message too long — maximum 2000 characters'),
  toolType: z.enum([
    'ai_mentor',
    'ai_jury',
    'ai_evaluation',
    'ai_pitch_coach',
    'ai_finance_advisor'
  ]),
  context: z.object({
    simulationId: uuidSchema.optional(),
    taskId: uuidSchema.optional(),
  }).optional(),
});

// Tenant creation schema (Super Admin only)
export const createTenantSchema = z.object({
  name: z.string().min(2).max(200).trim(),
  contactEmail: z.string().email().max(255).toLowerCase().trim(),
  seatLimit: z.number().int().min(1).max(100000),
  planType: z.enum(['starter', 'professional', 'enterprise']),
});
```

**2. Create a validation middleware:**

```typescript
// lib/validations/middleware.ts
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

export function validateBody<T>(
  schema: z.ZodSchema<T>
) {
  return async (request: NextRequest): Promise<{ data: T } | NextResponse> => {
    try {
      const body = await request.json();
      const data = schema.parse(body);
      return { data };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: 'Validation failed',
            details: error.errors.map(e => ({
              field: e.path.join('.'),
              message: e.message,
            })),
          },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
  };
}
```

**3. Apply to every API route:**

```typescript
// Example: app/api/programs/route.ts
import { validateBody } from '@/lib/validations/middleware';
import { createProgramSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  const validation = await validateBody(createProgramSchema)(request);
  
  if (validation instanceof NextResponse) {
    return validation; // Return 400 with error details
  }
  
  const { data } = validation; // data is fully typed and validated
  // ... rest of handler
}
```

**4. Verify Stripe/Payriff webhook signatures:**

```typescript
// app/api/webhooks/stripe/route.ts
import Stripe from 'stripe';

export async function POST(request: Request) {
  const body = await request.text(); // Must be raw text, not parsed JSON
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return Response.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Now process the verified event
  // ...
}
```

**5. XSS sanitization for rich text fields:**

```bash
npm install isomorphic-dompurify
```

```typescript
// lib/sanitize.ts
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'u', 'p', 'br', 'ul', 'ol', 'li', 'strong', 'em'],
    ALLOWED_ATTR: [],
  });
}

// Use for any field that accepts rich text (descriptions, lesson content, etc.)
```

### Generate tests:

```typescript
// __tests__/input-validation.test.ts
describe('Input Validation', () => {
  describe('Program Creation', () => {
    it('should reject program with end date before start date', async () => {
      const response = await fetch('/api/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({
          name: 'Test Program',
          applicationStartDate: '2026-12-01',
          applicationEndDate: '2026-01-01', // Before start date
          // ...
        }),
      });
      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.details).toContainEqual(
        expect.objectContaining({ field: 'applicationEndDate' })
      );
    });

    it('should reject negative seat count', async () => {
      const response = await fetch('/api/programs', {
        method: 'POST',
        body: JSON.stringify({ participantLimit: -5 }),
      });
      expect(response.status).toBe(400);
    });

    it('should reject XSS in program name', async () => {
      const response = await fetch('/api/programs', {
        method: 'POST',
        body: JSON.stringify({ name: '<script>alert("xss")</script>' }),
      });
      expect(response.status).toBe(400);
    });

    it('should reject invalid simulation type enum', async () => {
      const response = await fetch('/api/programs', {
        method: 'POST',
        body: JSON.stringify({ selectedSimulations: ['invalid_simulation'] }),
      });
      expect(response.status).toBe(400);
    });
  });

  describe('Seat Purchase', () => {
    it('should reject zero seat purchase', async () => {
      const response = await fetch('/api/seats/purchase', {
        method: 'POST',
        body: JSON.stringify({ seatCount: 0 }),
      });
      expect(response.status).toBe(400);
    });

    it('should reject float seat count', async () => {
      const response = await fetch('/api/seats/purchase', {
        method: 'POST',
        body: JSON.stringify({ seatCount: 5.5 }),
      });
      expect(response.status).toBe(400);
    });
  });

  describe('Webhook Security', () => {
    it('should reject Stripe webhook with invalid signature', async () => {
      const response = await fetch('/api/webhooks/stripe', {
        method: 'POST',
        headers: { 'stripe-signature': 'invalid_signature' },
        body: JSON.stringify({ type: 'payment_intent.succeeded' }),
      });
      expect(response.status).toBe(400);
    });
  });
});
```

---

## FINAL CHECKLIST

After implementing all fixes above, verify:

- [ ] No hardcoded secrets anywhere in the codebase (`grep -r "sk_live\|sk_test\|AKIA\|password=" --include="*.ts" --include="*.tsx" --include="*.js" .`)
- [ ] `.env` is in `.gitignore` and NOT committed to git
- [ ] App refuses to start if required env vars are missing
- [ ] Every auth endpoint returns 429 after rate limit exceeded
- [ ] Every AI endpoint has rate limiting per user
- [ ] Every API route has Zod validation — no unvalidated `request.json()` calls
- [ ] Stripe/Payriff webhook signatures are verified before processing
- [ ] XSS payloads are rejected or sanitized in all text inputs
- [ ] All tests pass: `npm run test`

Report every finding with: file path, line number, severity, before code, after code, test result.