import { UserAvatar } from "@/components/ui/user-avatar";
import { cn } from "@/lib/utils";

/** Overlapping team-member avatars; the rest collapse into a "+n" bubble. */
export function AvatarStack({
  members,
  max = 4,
  className,
  ringClassName = "ring-card",
}: {
  members: { userId: string; name: string; hasAvatar: boolean }[];
  max?: number;
  className?: string;
  ringClassName?: string;
}) {
  const shown = members.slice(0, max);
  const rest = members.length - shown.length;
  return (
    <span className={cn("flex -space-x-2", className)} title={members.map((m) => m.name).join(", ")}>
      {shown.map((m) => (
        <UserAvatar key={m.userId} userId={m.userId} name={m.name} hasAvatar={m.hasAvatar} className={cn("h-8 w-8 text-[11px] ring-2", ringClassName)} />
      ))}
      {rest > 0 && (
        <span className={cn("flex h-8 w-8 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground ring-2", ringClassName)}>
          +{rest}
        </span>
      )}
    </span>
  );
}
