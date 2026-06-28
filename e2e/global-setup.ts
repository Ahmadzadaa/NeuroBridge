import { seedE2EFixtures } from "./helpers/db";

export default async function globalSetup(): Promise<void> {
  if (!process.env.DATABASE_URL && !process.env.TEST_DATABASE_URL) {
    console.warn("E2E global setup skipped: DATABASE_URL not configured");
    return;
  }

  if (process.env.TEST_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  }

  await seedE2EFixtures();
}
