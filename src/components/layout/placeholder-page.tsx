import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent } from "@/components/ui/card";

type PanelType = "super-admin" | "tenant" | "participant";

interface PlaceholderPageProps {
  panel: PanelType;
  title: string;
  userName: string;
  description: string;
}

export function PlaceholderPage({
  panel,
  title,
  userName,
  description,
}: PlaceholderPageProps) {
  return (
    <DashboardLayout panel={panel} title={title} userName={userName}>
      <Card className="rounded-2xl border-0 shadow-sm">
        <CardContent className="p-8 text-center text-muted-foreground">
          {description}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
