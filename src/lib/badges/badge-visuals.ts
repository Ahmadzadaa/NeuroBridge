import {
  ArrowLeftRight, Award, BadgeDollarSign, BarChart3, BookOpen, Brain, Building2, Coins, Compass, Crosshair,
  Dumbbell, FileText, Flag, Flame, Footprints, Gavel, Gem, Globe, GraduationCap, Hammer, Handshake, Heart,
  HeartHandshake, Landmark, LayoutGrid, LifeBuoy, Lightbulb, ListChecks, Magnet, Map as MapIcon, Medal, Megaphone,
  MessageSquareQuote, Mic, PenTool, PieChart, PiggyBank, Plane, Presentation, RefreshCw, Rocket, Route, Scale,
  Search, Settings2, ShieldCheck, Ship, ShoppingBag, Sparkle, Sparkles, Sprout, Star, Target, TrendingUp,
  Trophy, UserCheck, UserPlus, Users, UsersRound, UserSearch, Wallet, Zap, type LucideIcon,
} from "lucide-react";

/**
 * One line icon per badge, drawn from a single icon set so the wall of badges
 * reads as one system instead of a mix of emoji styles. Unknown keys (badges
 * added later) fall back to their category's icon.
 */
const BADGE_ICONS: Record<string, LucideIcon> = {
  // Idea development
  problem_explorer: Search,
  idea_generator: Lightbulb,
  welcome_badge: Sparkles,
  solution_designer: PenTool,
  customer_explorer: UserSearch,
  market_researcher: BarChart3,
  innovation_architect: Rocket,
  // Startup management
  business_model_designer: LayoutGrid,
  mvp_developer: Hammer,
  first_customer_winner: UserCheck,
  operations_expert: Settings2,
  strategy_master: Target,
  startup_architect: Building2,
  // Finance
  budget_planner: Wallet,
  revenue_expert: TrendingUp,
  cash_flow_manager: ArrowLeftRight,
  profitability_expert: PiggyBank,
  finance_strategist: PieChart,
  finance_master: Landmark,
  // Sales & marketing
  target_audience_hunter: Crosshair,
  campaign_designer: Megaphone,
  first_sale_badge: ShoppingBag,
  customer_acquisition_expert: Magnet,
  growth_expert: Sprout,
  marketing_master: Trophy,
  // Pitch & investors
  pitch_preparer: FileText,
  presentation_designer: Presentation,
  took_the_stage: Mic,
  persuasion_expert: MessageSquareQuote,
  investor_favorite: HeartHandshake,
  investment_ready_entrepreneur: BadgeDollarSign,
  // Leadership
  team_founder: UserPlus,
  task_coordinator: ListChecks,
  team_leader: Users,
  crisis_manager: LifeBuoy,
  strategic_leader: Route,
  inspiring_leader: Flag,
  // Founder psychology
  self_awareness_explorer: Brain,
  resilience_builder: Dumbbell,
  change_traveler: RefreshCw,
  decision_maker: Scale,
  strong_founder: Flame,
  mental_resilience_master: ShieldCheck,
  // Globalization
  market_explorer: MapIcon,
  export_initiator: Ship,
  global_customer_hunter: Handshake,
  international_growth_expert: Plane,
  global_strategist: Compass,
  global_entrepreneur: Globe,
  // Special achievements
  growth_traveler: Footprints,
  community_ambassador: UsersRound,
  expertise_traveler: GraduationCap,
  top_10_champion: Medal,
  fastest_finisher: Zap,
  mentor_favorite_1: Heart,
  lifelong_learner: BookOpen,
  mentor_favorite_2: Star,
  jury_champion: Gavel,
  innovation_star: Sparkle,
  coin_millionaire: Coins,
  investors_choice: Gem,
};

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  idea_development: Lightbulb,
  startup_management: Rocket,
  finance: Wallet,
  sales_marketing: Megaphone,
  pitch_investor: Presentation,
  leadership: Users,
  founder_psychology: Brain,
  globalization: Globe,
  special_achievement: Trophy,
};

export function badgeIcon(key: string, category: string): LucideIcon {
  return BADGE_ICONS[key] ?? CATEGORY_ICONS[category] ?? Award;
}

/**
 * One calm accent per category. Classes are spelled out in full so Tailwind
 * keeps them; `soft` is the earned medal, `bar` the progress fill, `chip` the
 * section icon.
 */
export interface CategoryTone {
  soft: string;
  bar: string;
  chip: string;
}

const TONES: Record<string, CategoryTone> = {
  sky: { soft: "bg-sky-500/12 text-sky-600 ring-sky-500/25 dark:text-sky-300", bar: "bg-sky-500", chip: "bg-sky-500/12 text-sky-600 dark:text-sky-300" },
  indigo: { soft: "bg-indigo-500/12 text-indigo-600 ring-indigo-500/25 dark:text-indigo-300", bar: "bg-indigo-500", chip: "bg-indigo-500/12 text-indigo-600 dark:text-indigo-300" },
  emerald: { soft: "bg-emerald-500/12 text-emerald-600 ring-emerald-500/25 dark:text-emerald-300", bar: "bg-emerald-500", chip: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300" },
  rose: { soft: "bg-rose-500/12 text-rose-600 ring-rose-500/25 dark:text-rose-300", bar: "bg-rose-500", chip: "bg-rose-500/12 text-rose-600 dark:text-rose-300" },
  violet: { soft: "bg-violet-500/12 text-violet-600 ring-violet-500/25 dark:text-violet-300", bar: "bg-violet-500", chip: "bg-violet-500/12 text-violet-600 dark:text-violet-300" },
  orange: { soft: "bg-orange-500/12 text-orange-600 ring-orange-500/25 dark:text-orange-300", bar: "bg-orange-500", chip: "bg-orange-500/12 text-orange-600 dark:text-orange-300" },
  fuchsia: { soft: "bg-fuchsia-500/12 text-fuchsia-600 ring-fuchsia-500/25 dark:text-fuchsia-300", bar: "bg-fuchsia-500", chip: "bg-fuchsia-500/12 text-fuchsia-600 dark:text-fuchsia-300" },
  cyan: { soft: "bg-cyan-500/12 text-cyan-600 ring-cyan-500/25 dark:text-cyan-300", bar: "bg-cyan-500", chip: "bg-cyan-500/12 text-cyan-600 dark:text-cyan-300" },
  amber: { soft: "bg-amber-500/12 text-amber-600 ring-amber-500/25 dark:text-amber-300", bar: "bg-amber-500", chip: "bg-amber-500/12 text-amber-600 dark:text-amber-300" },
};

const CATEGORY_TONE: Record<string, keyof typeof TONES> = {
  idea_development: "sky",
  startup_management: "indigo",
  finance: "emerald",
  sales_marketing: "rose",
  pitch_investor: "violet",
  leadership: "orange",
  founder_psychology: "fuchsia",
  globalization: "cyan",
  special_achievement: "amber",
};

export function categoryTone(category: string): CategoryTone {
  return TONES[CATEGORY_TONE[category] ?? "indigo"];
}
