import { withAuthorizedHandler } from "@/lib/auth/authorize";
import { prisma } from "@/lib/prisma";

/** Plans available to subscribe to. Prices are integer kuruş. */
export async function GET() {
  return withAuthorizedHandler("billing:read", async () => {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { pricePerSeatMonthly: "asc" },
      select: {
        id: true,
        name: true,
        pricePerSeatMonthly: true,
        currency: true,
        minSeats: true,
        trialDays: true,
      },
    });

    return { plans };
  });
}
