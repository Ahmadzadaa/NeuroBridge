"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  className?: string;
  gradient?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  className,
  gradient = "from-indigo-500/10 to-blue-500/10",
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <Card
        className={cn(
          "rounded-2xl border-0 shadow-sm transition-shadow hover:shadow-md",
          "bg-gradient-to-br",
          gradient,
          className
        )}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/60 dark:bg-white/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold tracking-tight">{value}</div>
          {trend && (
            <p className="mt-1 text-xs text-muted-foreground">{trend}</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
