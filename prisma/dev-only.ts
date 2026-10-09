/**
 * Demo seeds and helpers create accounts with a shared, published password.
 * They must never touch a live database.
 */
export function assertNotProduction(script: string) {
  if (process.env.NODE_ENV === "production") {
    console.error(`${script} creates demo data and is disabled in production.`);
    process.exit(1);
  }
}
