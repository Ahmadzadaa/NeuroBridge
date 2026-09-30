import { NextResponse } from "next/server";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { assertFeatureEnabled } from "@/lib/tenant/features";
import { prisma } from "@/lib/prisma";

const MAX_TEAM_SIZE = 5;

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  return withAuthorizedHandler("hackathon:submit", async ({ session }) => {
    await assertFeatureEnabled(session.tenantId, "hackathon");
    const team = await prisma.hackathonTeam.findUnique({
      where: { id },
      include: {
        _count: { select: { members: true } },
        program: { select: { id: true, tenantId: true } },
      },
    });
    if (!team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }
    // Fail closed: a tenant-less session must be refused, not waved through.
    if (team.program.tenantId !== session.tenantId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (team._count.members >= MAX_TEAM_SIZE) {
      return NextResponse.json({ error: "Team is full" }, { status: 409 });
    }

    const existingMembership = await prisma.teamMember.findFirst({
      where: { userId: session.id, team: { programId: team.program.id } },
    });
    if (existingMembership) {
      return NextResponse.json(
        { error: "Already in a team for this hackathon" },
        { status: 409 }
      );
    }

    await prisma.teamMember.create({
      data: { teamId: team.id, userId: session.id },
    });

    return NextResponse.json({ joined: true }, { status: 201 });
  });
}
