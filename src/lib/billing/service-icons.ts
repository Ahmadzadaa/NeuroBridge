import { BookOpen, Briefcase, GraduationCap, Layers, Sparkles, Trophy, type LucideIcon } from "lucide-react";

export type ServiceIcon = { icon: LucideIcon; gradient: string };

/** App-icon glyph and gradient per sellable service, shared by the calculator and the home page. */
const SERVICE_ICONS: Record<string, ServiceIcon> = {
  HACKATHON: { icon: Trophy, gradient: "from-orange-400 to-rose-500" },
  TEACHERS: { icon: GraduationCap, gradient: "from-sky-400 to-blue-600" },
  SIMULATIONS: { icon: Briefcase, gradient: "from-violet-500 to-indigo-600" },
  TRAININGS: { icon: BookOpen, gradient: "from-emerald-400 to-teal-600" },
  AI_TOOLS: { icon: Sparkles, gradient: "from-fuchsia-500 to-purple-600" },
};
const FALLBACK_ICON: ServiceIcon = { icon: Layers, gradient: "from-slate-400 to-slate-600" };

export function serviceIcon(code: string): ServiceIcon {
  return SERVICE_ICONS[code] ?? FALLBACK_ICON;
}
