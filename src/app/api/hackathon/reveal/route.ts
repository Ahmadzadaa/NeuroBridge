import { NextResponse } from "next/server";
import { notifyUsers } from "@/lib/notifications/notification-service";
import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { assertFeatureEnabled } from "@/lib/tenant/features";
import { revealSchema, parseBody } from "@/lib/validation/schemas";
import { prisma } from "@/lib/prisma";
import { localeUrl } from "@/lib/app-url";
import { computeRankings } from "@/lib/hackathon/ranking";
import { resultsVisible } from "@/lib/hackathon/reveal";
import { sendEmail } from "@/lib/email/email-service";
import { resultsAnnouncedEmail } from "@/lib/email/templates";

function appBaseUrl(request: Request): string {
  return process.env.APP_BASE_URL ?? new URL(request.url).origin;
}

export async function PATCH(request: Request) {
  return withAuthorizedHandler(
    "hackathon:manage",
    async ({ session }) => {
      await assertFeatureEnabled(session.tenantId, "hackathon");
      const body = parseBody(revealSchema, await request.json());

      const program = await prisma.program.findUnique({
        where: { id: body.programId },
        select: { id: true, name: true, type: true, tenantId: true, resultsRevealAt: true },
      });
      if (!program || program.type !== "hackathon") {
        return NextResponse.json({ error: "Hackathon not found" }, { status: 404 });
      }
      if (program.tenantId !== session.tenantId) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const wasVisible = resultsVisible(program.resultsRevealAt);
      const revealAt =
        body.revealAt === null
          ? null
          : body.revealAt === "now"
            ? new Date()
            : new Date(body.revealAt);

      const updated = await prisma.program.update({
        where: { id: program.id },
        data: { resultsRevealAt: revealAt },
        select: { resultsRevealAt: true },
      });

      // Announcing right now (hidden → visible): notify every team member.
      const nowVisible = resultsVisible(updated.resultsRevealAt);
      let emailed = 0;
      if (!wasVisible && nowVisible) {
        const [rankings, teams] = await Promise.all([
          computeRankings(program.id),
          prisma.hackathonTeam.findMany({
            where: { programId: program.id },
            include: {
              members: {
                include: {
                  user: { select: { email: true, language: true } },
                },
              },
            },
          }),
        ]);
        const rankByTeam = new Map(rankings.map((r) => [r.teamId, r]));

        await Promise.all(
          teams.flatMap((team) => {
            const ranking = rankByTeam.get(team.id);
            if (!ranking) return [];
            return team.members.map(async (member) => {
              const mail = resultsAnnouncedEmail({
                programName: program.name,
                teamName: team.name,
                rank: ranking.rank,
                total: ranking.total,
                resultsUrl: localeUrl(
                  appBaseUrl(request),
                  "/participant/hackathon",
                  member.user.language
                ),
                language: member.user.language,
              });
              const result = await sendEmail({ to: member.user.email, ...mail });
              if (result.sent) emailed += 1;
            });
          })
        );
        await notifyUsers(
          teams.flatMap((team) => team.members.map((member) => member.userId)),
          { type: "HACKATHON_RESULTS", params: { program: program.name }, link: "/participant/hackathon" }
        );
      }

      return NextResponse.json({
        resultsRevealAt: updated.resultsRevealAt?.toISOString() ?? null,
        emailed,
      });
    },
    { requireTenant: true }
  );
}
