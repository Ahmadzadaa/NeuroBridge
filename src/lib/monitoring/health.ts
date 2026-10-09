import { prisma } from "@/lib/prisma";

export interface HealthStatus {
  status: "ok" | "degraded" | "error";
  timestamp: string;
  version: string;
  uptime: number;
}

export interface ReadinessStatus extends HealthStatus {
  checks: {
    database: "ok" | "error";
  };
}

const startTime = Date.now();

export function getLivenessStatus(): HealthStatus {
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? "0.1.0",
    uptime: Math.floor((Date.now() - startTime) / 1000),
  };
}

export async function getReadinessStatus(): Promise<ReadinessStatus> {
  const base = getLivenessStatus();
  let database: "ok" | "error" = "error";

  try {
    await prisma.$queryRaw`SELECT 1`;
    database = "ok";
  } catch {
    database = "error";
  }

  return {
    ...base,
    status: database === "ok" ? "ok" : "error",
    checks: { database },
  };
}
