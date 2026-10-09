import {
  BarChart3,
  Bot,
  Building2,
  ClipboardCheck,
  Compass,
  FileText,
  Gavel,
  GraduationCap,
  LayoutGrid,
  Lightbulb,
  Medal,
  Megaphone,
  MessageCircle,
  Mic,
  PiggyBank,
  Presentation,
  Rocket,
  Shapes,
  Sparkles,
  TrendingUp,
  Trophy,
  UserCheck,
  Users,
  UsersRound,
  Wallet,
  Wrench,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * An icon per selectable option on the programme builder.
 *
 * Fifteen identical rows of text and a switch are hard to scan; a distinct
 * glyph makes each module recognisable at a glance and is what lets the
 * picker work as a grid of cards instead of a list.
 *
 * Keys mirror the constants in `lib/constants.ts`. `iconFor()` falls back to a
 * neutral glyph so adding a constant can never crash the page.
 */
const ICONS: Record<string, LucideIcon> = {
  // Project types
  entrepreneurship_training: GraduationCap,
  business_idea_development: Lightbulb,
  startup_challenge: Rocket,
  hackathon: Trophy,
  competition: Medal,
  innovation_program: Sparkles,
  other: Shapes,

  // Simulations
  idea_development: Lightbulb,
  startup_management: Building2,
  leadership: Users,
  investor_readiness: TrendingUp,

  // Trainings
  finance: Wallet,
  sales_marketing: Megaphone,
  team_management: UsersRound,
  pitch_preparation: Presentation,
  innovation_tools: Wrench,
  business_model: LayoutGrid,
  customer_validation: UserCheck,
  ai_tools: Bot,

  // AI tools
  ai_mentor: MessageCircle,
  ai_jury: Gavel,
  ai_evaluation: ClipboardCheck,
  ai_analysis: BarChart3,
  ai_reporting: FileText,
  ai_pitch_coach: Mic,
  ai_finance_advisor: PiggyBank,
};

/**
 * `leadership` is both a simulation and a training, and the two lists want
 * different glyphs — the scope disambiguates them.
 */
const SCOPED: Record<string, LucideIcon> = {
  "training:leadership": Compass,
};

export function iconFor(key: string, scope?: string): LucideIcon {
  return (scope && SCOPED[`${scope}:${key}`]) || ICONS[key] || Shapes;
}
