const AVATAR_TONES = [
  "from-indigo-500 to-blue-600",
  "from-violet-500 to-fuchsia-600",
  "from-sky-400 to-blue-600",
  "from-emerald-400 to-teal-600",
  "from-amber-400 to-orange-500",
  "from-rose-400 to-pink-600",
];

/** A stable gradient per person, so the same user keeps the same avatar colour everywhere. */
export function avatarTone(id: string): string {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return AVATAR_TONES[Math.abs(hash) % AVATAR_TONES.length];
}
