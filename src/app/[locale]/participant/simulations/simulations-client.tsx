"use client";

import { useTranslations } from "next-intl";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { SIMULATION_TYPES } from "@/lib/constants";
import { Gamepad2 } from "lucide-react";

interface SimulationsPageClientProps {
  userName: string;
}

export function SimulationsPageClient({ userName }: SimulationsPageClientProps) {
  const t = useTranslations("participant.simulations");
  const ts = useTranslations("tenant.simulationTypes");

  return (
    <DashboardLayout panel="participant" title={t("title")} userName={userName}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {SIMULATION_TYPES.map((sim, i) => (
          <motion.div
            key={sim}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            whileHover={{ y: -4 }}
          >
            <Card className="rounded-2xl border-0 shadow-sm hover:shadow-md transition-all">
              <CardHeader className="flex flex-row items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <Gamepad2 className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-base">{ts(sim)}</CardTitle>
              </CardHeader>
              <CardContent>
                <Progress value={0} className="mb-3 h-2" />
                <Button className="w-full rounded-xl">{t("start")}</Button>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </DashboardLayout>
  );
}
