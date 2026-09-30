import { redirect } from "next/navigation";

/** Programmes are bought, not created here; old links land on the purchase page. */
export default async function NewProgramRedirect({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  redirect(`/${locale}/tenant/programs/buy`);
}
