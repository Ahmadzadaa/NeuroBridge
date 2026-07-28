import { NextResponse } from "next/server";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { assertFeatureEnabled } from "@/lib/tenant/features";
import { createTeamSchema, parseBody } from "@/lib/validation/schemas";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  return withAuthorizedHandler("hackathon:submit", async ({ session }) => {
    await assertFeatureEnabled(session.tenantId, "hackathon");
    const body = parseBody(createTeamSchema, await request.json());

    const program = await prisma.program.findUnique({
      where: { id: body.programId },
      select: { id: true, tenantId: true, type: true },
    });
    if (!program || program.type !== "hackathon") {
      return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
    }
    if (session.tenantId && program.tenantId !== session.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const existingMembership = await prisma.teamMember.findFirst({
      where: { userId: session.id, team: { programId: program.id } },
    });
    if (existingMembership) {
      return NextResponse.json(
        { error: "Already in a team for this hackathon" },
        { status: 409 }
      );
    }

    const nameTaken = await prisma.hackathonTeam.findUnique({
      where: { programId_name: { programId: program.id, name: body.name } },
    });
    if (nameTaken) {
      return NextResponse.json({ error: "Team name taken" }, { status: 409 });
    }

    const team = await prisma.hackathonTeam.create({
      data: {
        programId: program.id,
        name: body.name,
        slogan: body.slogan,
        members: {
          create: { userId: session.id, isLeader: true },
        },
      },
    });

    return NextResponse.json({ id: team.id, name: team.name }, { status: 201 });
  });
}
