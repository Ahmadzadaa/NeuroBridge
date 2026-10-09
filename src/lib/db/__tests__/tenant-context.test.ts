import { describe, expect, it, afterEach } from "vitest";
import { isPostgresDatabase } from "@/lib/db/tenant-context";

describe("isPostgresDatabase", () => {
  const original = process.env.DATABASE_URL;

  afterEach(() => {
    process.env.DATABASE_URL = original;
  });

  it("detects PostgreSQL URLs", () => {
    process.env.DATABASE_URL = "postgresql://user:pass@localhost:5432/bizsim";
    expect(isPostgresDatabase()).toBe(true);
  });

  it("detects SQLite URLs", () => {
    process.env.DATABASE_URL = "file:./dev.db";
    expect(isPostgresDatabase()).toBe(false);
  });
});
