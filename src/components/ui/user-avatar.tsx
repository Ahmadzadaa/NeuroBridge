"use client";

import { useState } from "react";
import { avatarTone } from "@/components/ui/avatar-tone";
import { cn } from "@/lib/utils";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

/**
 * A person's photo, or their initials on a stable gradient. Falls back to the
 * initials when the photo cannot be loaded, so a missing file or a failed
 * request never shows the browser's broken-image icon.
 */
export function UserAvatar({
  userId,
  name,
  hasAvatar,
  className,
}: {
  userId: string;
  name: string;
  hasAvatar: boolean;
  /** Size and text size, e.g. "h-11 w-11 text-[14px]". */
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (hasAvatar && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/profile/avatar/${userId}`}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className={cn("shrink-0 rounded-full object-cover", className)}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white",
        avatarTone(userId),
        className
      )}
    >
      {initials(name)}
    </span>
  );
}
