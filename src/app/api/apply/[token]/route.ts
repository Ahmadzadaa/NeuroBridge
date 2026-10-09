import { NextResponse } from "next/server";
import {
  getProgramByApplicationToken,
  registrationAvailability,
} from "@/lib/seats/registration-service";
import {
  CacheKeys,
  CacheTTL,
  getCached,
  setCached,
} from "@/lib/cache/cache-service";
import { enforceRateLimit, getClientIdentifier } from "@/lib/security/rate-limit";

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    await enforceRateLimit("api", getClientIdentifier(request));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Rate limited" },
      { status: 429 }
    );
  }

  const { token } = await context.params;
  const cacheKey = CacheKeys.applyToken(token);
  const cached = await getCached<Record<string, unknown>>(cacheKey);
  if (cached) {
    return NextResponse.json(cached);
  }

  const program = await getProgramByApplicationToken(token);

  if (!program) {
    return NextResponse.json({ error: "Program not found" }, { status: 404 });
  }

  const availability = registrationAvailability(program);

  const response = {
    id: program.id,
    name: program.name,
    description: program.description,
    type: program.type,
    applicationStart: program.applicationStart,
    applicationEnd: program.applicationEnd,
    participantLimit: program.participantLimit,
    enrolledCount: program._count.participants,
    tenantName: program.tenant.name,
    ...availability,
  };

  await setCached(cacheKey, response, CacheTTL.apply);
  return NextResponse.json(response);
}
