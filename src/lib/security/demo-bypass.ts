const DEMO_ACCOUNT_EMAILS = new Set([
  "admin@bizsim.com",
  "tenant@demo-tekno.com",
  "participant@demo.com",
  "admin@demo-teknopark.com",
  "viewer@demo-teknopark.com",
]);

/**
 * Demo accounts may skip 2FA to simplify local development and demos.
 * SECURITY: this must never apply in production — a leaked demo admin
 * password would otherwise grant admin access with no second factor.
 */
export function isDemoDevBypass(email: string): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    DEMO_ACCOUNT_EMAILS.has(email.toLowerCase())
  );
}
