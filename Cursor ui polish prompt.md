# SIMSTART — UI POLISH & PROFESSIONAL DESIGN SYSTEM PROMPT

You are a Senior Product Designer and Frontend Engineer who has shipped design systems at Stripe, Linear, and Vercel. You have a sharp eye for the details that separate amateur interfaces from products people trust with their business.

Your job is NOT to rebuild the platform from scratch.
Your job is to elevate every visual and interactive detail so that when an institutional client (technopark director, university rector, government official) opens SimStart for the first time, their immediate, involuntary reaction is: "This is serious software."

Do not add features. Polish what exists. Every change must be production-grade — no placeholder animations, no TODO comments, no "you can customize this later."

Work through each section below in order. After completing each section, show a before/after comparison of the changed files.

---

## DESIGN PHILOSOPHY FOR THIS PRODUCT

SimStart is sold to institutions — technoparks, universities, government bodies. The buyer is a director or manager, 35-55 years old, who evaluates software by asking: "Does this look like something I can trust my organization to?" 

The visual language must communicate: **precision, reliability, and ambition** — not playfulness, not startup chaos.

Reference points (study these, do not copy):
- **Linear** (linear.app) — motion, dark mode, sidebar
- **Stripe Dashboard** — data density done right, typography hierarchy
- **Vercel Dashboard** — stat cards, minimal but informative
- **Apple** — micro-interactions, spacing discipline, nothing feels accidental

The ONE signature element of SimStart: **the gamification layer (badges, coins, leaderboard) rendered with premium 3D depth** — this is the unique tension that makes the platform memorable. Everything else is restrained and institutional; the gamification elements are the single place where visual richness is earned and deployed.

---

## SECTION 1 — DESIGN TOKEN SYSTEM (DO THIS FIRST)

Create a single source of truth for all visual values. Every color, spacing, radius, shadow, and animation in the codebase must reference these tokens — no hardcoded hex values anywhere else.

Create `lib/design-tokens.ts`:

```typescript
export const tokens = {
  colors: {
    // Backgrounds
    bg: {
      base: '#F7F8FC',        // Main app background — slightly blue-tinted white
      surface: '#FFFFFF',      // Cards, panels
      elevated: '#FFFFFF',     // Modals, dropdowns
      subtle: '#F0F2F8',      // Hover states, zebra rows
      overlay: 'rgba(15, 15, 20, 0.5)', // Modal backdrop
    },

    // Brand
    brand: {
      DEFAULT: '#4F46E5',      // Primary indigo
      light: '#6366F1',
      dark: '#3730A3',
      subtle: '#EEF2FF',       // Light tint for badges, chips
      glow: 'rgba(79, 70, 229, 0.15)', // For glow effects
    },

    // Semantic
    success: {
      DEFAULT: '#10B981',
      light: '#D1FAE5',
      dark: '#065F46',
    },
    warning: {
      DEFAULT: '#F59E0B',
      light: '#FEF3C7',
      dark: '#92400E',
    },
    danger: {
      DEFAULT: '#EF4444',
      light: '#FEE2E2',
      dark: '#991B1B',
    },

    // Coin / Achievement (the signature accent)
    coin: {
      DEFAULT: '#F59E0B',
      light: '#FEF3C7',
      glow: 'rgba(245, 158, 11, 0.25)',
    },

    // Text
    text: {
      primary: '#111827',
      secondary: '#4B5563',
      tertiary: '#9CA3AF',
      inverse: '#FFFFFF',
      link: '#4F46E5',
    },

    // Borders
    border: {
      DEFAULT: '#E5E7EB',
      strong: '#D1D5DB',
      subtle: '#F3F4F6',
    },
  },

  // Dark mode overrides
  dark: {
    bg: {
      base: '#0C0C14',
      surface: '#13131F',
      elevated: '#1A1A2E',
      subtle: '#1E1E30',
    },
    text: {
      primary: '#F9FAFB',
      secondary: '#9CA3AF',
      tertiary: '#6B7280',
    },
    border: {
      DEFAULT: '#1F2937',
      strong: '#374151',
      subtle: '#111827',
    },
  },

  typography: {
    fontFamily: {
      sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      mono: "'JetBrains Mono', 'Fira Code', monospace",
    },
    fontSize: {
      xs: '11px',
      sm: '13px',
      base: '14px',
      md: '15px',
      lg: '18px',
      xl: '22px',
      '2xl': '28px',
      '3xl': '36px',
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      extrabold: '800',
    },
    letterSpacing: {
      tight: '-0.5px',
      normal: '0px',
      wide: '0.3px',
      wider: '0.5px',
      label: '0.6px',  // For uppercase labels
    },
    lineHeight: {
      tight: '1.3',
      normal: '1.5',
      relaxed: '1.7',
    },
  },

  spacing: {
    // Use multiples of 4
    '1': '4px',
    '2': '8px',
    '3': '12px',
    '4': '16px',
    '5': '20px',
    '6': '24px',
    '8': '32px',
    '10': '40px',
    '12': '48px',
    '16': '64px',
  },

  radius: {
    sm: '6px',
    md: '10px',
    lg: '16px',
    xl: '20px',
    '2xl': '24px',
    full: '9999px',
  },

  shadows: {
    sm: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
    md: '0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)',
    lg: '0 8px 24px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.06)',
    xl: '0 16px 48px rgba(0,0,0,0.12), 0 8px 16px rgba(0,0,0,0.08)',
    hover: '0 12px 32px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.06)',
    brand: '0 8px 24px rgba(79, 70, 229, 0.20)',
    coin: '0 8px 24px rgba(245, 158, 11, 0.25)',
    glow: '0 0 0 3px rgba(79, 70, 229, 0.15)',
  },

  animation: {
    duration: {
      instant: '80ms',
      fast: '150ms',
      normal: '250ms',
      slow: '400ms',
      slower: '600ms',
    },
    easing: {
      default: 'cubic-bezier(0.4, 0, 0.2, 1)',
      spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',  // Slight overshoot
      out: 'cubic-bezier(0, 0, 0.2, 1)',
      in: 'cubic-bezier(0.4, 0, 1, 1)',
    },
  },
} as const;
```

Update `tailwind.config.ts` to use these tokens as the Tailwind theme. Every Tailwind class must reference the token system.

---

## SECTION 2 — TYPOGRAPHY SYSTEM

Install Inter font via `next/font/google`. Apply globally.

```typescript
// app/layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});
```

Create typography component variants in `components/ui/typography.tsx`:

```typescript
// Usage examples that must exist and work:
// <Heading level={1}>Dashboard</Heading>          → 28px, 700, -0.5px tracking
// <Heading level={2}>Program Reports</Heading>    → 22px, 600, -0.3px tracking
// <Heading level={3}>General Report</Heading>     → 18px, 600
// <Label>ACTIVE PROGRAMS</Label>                  → 11px, 600, 0.6px tracking, uppercase
// <Body>Description text</Body>                   → 14px, 400, 1.6 line-height
// <Caption>Last updated 2 hours ago</Caption>     → 12px, 400, tertiary color
```

Every heading across the platform must use these — no arbitrary `text-xl font-bold` scattered through components.

---

## SECTION 3 — LOGIN / AUTHENTICATION PAGE

This is the first thing every user sees. It must be flawless.

**Layout:**
- Full-screen split: Left 55% = visual/brand side. Right 45% = login form.
- On mobile: full-screen form with subtle brand elements behind.

**Left side (brand panel):**
- Background: deep indigo gradient — `linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 100%)`
- Animated mesh gradient overlay (subtle, slow-moving — use CSS `@keyframes` with `background-position`)
- SimStart logo + wordmark, centered, white
- Below logo: 3 feature highlights with icons, each fading in with 150ms stagger:
  - "Simulation-based learning" 
  - "Real-time progress tracking"
  - "AI-powered mentorship"
- Bottom: logos of trust signals if any (Microsoft Founders Hub badge, Teknofest 2024 badge)

**Right side (form panel):**
- Pure white, generous padding (48px all sides)
- "Welcome back" in `text-2xl font-semibold text-primary`
- "Sign in to your SimStart account" in `text-sm text-tertiary`
- Email + password fields with floating labels (label moves up on focus/fill)
- Password field: show/hide toggle
- "Forgot password?" link right-aligned
- Primary CTA button: full width, indigo, `Sign in` — on hover: slight brightness increase + shadow grows
- On loading: button shows spinner, text stays visible, button disabled
- Language switcher: top-right corner, flag icons (🇦🇿 🇹🇷 🇬🇧)
- Dark/light mode toggle: top-right corner

**Micro-interactions:**
- Input focus: border turns brand indigo + subtle glow ring (`box-shadow: 0 0 0 3px rgba(79,70,229,0.15)`)
- Error state: input border turns red, error message slides down with `height` animation (not `display:none` toggle)
- Success: brief green flash before redirect

---

## SECTION 4 — SIDEBAR NAVIGATION

The sidebar sets the tone for the entire admin experience.

**Dimensions:** 240px wide (desktop), icon-only 64px (tablet), hidden with bottom tab bar (mobile).

**Structure:**
```
[SimStart Logo + wordmark]          ← top, 64px height header area
─────────────────────────────
[User avatar + name + role chip]    ← compact user block
─────────────────────────────
MAIN NAVIGATION
  📊 Dashboard
  🗂 Programs  
  👥 Participants
  📈 Reports
  ⚙️ Settings
─────────────────────────────
[Seat counter widget]               ← shows "47 / 100 seats used" with progress bar
─────────────────────────────
[Help & Support]                    ← bottom
[Sign out]
```

**Visual details:**
- Active nav item: brand indigo background (`#EEF2FF`), left border `3px solid #4F46E5`, text indigo
- Hover: `bg-subtle` + item slides right `2px` (transform: translateX(2px))
- Icons: 18px, same color as text, slightly reduced opacity when inactive
- Seat counter widget: mini card with progress bar — green when <70% used, amber 70-90%, red >90%
- Collapse button: right edge of sidebar, chevron icon, smooth 250ms width transition

**Mobile bottom tab bar:**
- Fixed bottom, blur backdrop (`backdrop-filter: blur(20px)`), slightly transparent background
- 5 icons max: Dashboard, Programs, Participants, Reports, More
- Active tab: icon scales up to 1.1, label appears, brand color

---

## SECTION 5 — DASHBOARD STAT CARDS (ANIMATED COUNTERS)

This is the most impactful single change — implement it perfectly.

**Card design:**
```
┌─────────────────────────────────┐
│  ░░░░░░░░░░░░  ← subtle top gradient accent (4px height, brand color)
│                                 │
│  [Icon]    TOTAL PARTICIPANTS   │  ← icon left, label right (uppercase, 11px, tertiary)
│                                 │
│  150                            │  ← large number, 36px, 700 weight
│  ↑ +12 this week                │  ← trend indicator, 12px, success green
│                                 │
└─────────────────────────────────┘
```

**The 4 main KPI cards:**

| Card | Icon | Color Accent | Trend |
|------|------|-------------|-------|
| Total Participants | 👥 | Indigo | "+X registered this week" |
| Simulation Completion | 🎯 | Green | "+X% from last week" |
| Badges Awarded | 🏅 | Gold/Amber | "+X badges today" |
| Certificates Earned | 🎓 | Purple | "X pending" |

**Animated counter implementation:**

```typescript
// components/ui/animated-counter.tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  suffix?: string;
  prefix?: string;
}

export function AnimatedCounter({ 
  value, 
  duration = 1200, 
  suffix = '', 
  prefix = '' 
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });

  useEffect(() => {
    if (!isInView) return;
    
    let startTime: number;
    const startValue = 0;
    
    const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);
    
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutQuart(progress);
      
      setDisplayValue(Math.round(startValue + (value - startValue) * easedProgress));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [isInView, value, duration]);

  return (
    <span ref={ref}>
      {prefix}{displayValue.toLocaleString()}{suffix}
    </span>
  );
}
```

**Card hover interaction:**
```css
.stat-card {
  transition: transform 250ms cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow 250ms cubic-bezier(0.4, 0, 0.2, 1);
}
.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 12px 32px rgba(0,0,0,0.10);
}
```

---

## SECTION 6 — DATA TABLES (REPORTS SCREENS)

Tables are where institutional users spend most of their time. They must be readable and scannable.

**Table design rules:**
- Row height: 52px (comfortable, not cramped)
- Header: 11px uppercase, `letter-spacing: 0.6px`, tertiary text color, `font-weight: 600`
- Body rows: 14px, primary text
- Alternating rows: every other row gets `bg-subtle` (#F7F8FC) — subtle, not jarring
- Hover row: left border appears `3px solid transparent` → `3px solid brand` + row gets `bg-subtle`
- Status chips:
  - 🟢 Active: `bg-success-light text-success-dark`, rounded-full, 11px
  - 🔴 Inactive: `bg-danger-light text-danger-dark`
  - ⚠️ Needs Improvement: `bg-warning-light text-warning-dark`
  - ✅ Passed: `bg-success-light text-success-dark`
  - ❌ Failed: `bg-danger-light text-danger-dark`

**Progress bars in tables:**
```typescript
// components/ui/progress-bar.tsx
// Animated on mount, smooth fill
// Color: green <70%, amber 70-85%, red >85% (for test scores — inverse for completion rates)
// Height: 6px, rounded-full
// Background: border-subtle
// Fill: animated width transition 600ms ease-out
```

**Empty state:**
When a table has no data, show:
- Centered illustration (simple SVG, not stock photo)
- "No participants yet" headline
- "Share the program link to invite participants" subtext
- CTA button if applicable

**Pagination:**
- Previous / Next with page numbers
- "Showing 1-20 of 150 participants" text
- Rows-per-page selector (20, 50, 100)

---

## SECTION 7 — BADGE SYSTEM UI (THE SIGNATURE ELEMENT)

This is SimStart's most distinctive visual element. Execute it with full attention.

**Badge card design (participant panel):**

```
┌──────────────────┐
│                  │
│   [3D Icon]      │  ← 48x48, rendered with CSS depth effect
│                  │
│  Problem         │  ← badge name, 13px, semibold
│  Explorer        │
│                  │
│  🪙 50 coins     │  ← coin value, amber color
│                  │
│  ████░░░░░░      │  ← progress bar (if in progress)
│  2/3 tasks       │
└──────────────────┘
```

**3D effect for badge icons (CSS — no external assets needed):**
```css
.badge-icon-wrapper {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: linear-gradient(145deg, #ffffff, #e6e6e6);
  box-shadow: 
    4px 4px 8px rgba(0,0,0,0.12),
    -2px -2px 6px rgba(255,255,255,0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  transition: transform 200ms ease, box-shadow 200ms ease;
}

.badge-icon-wrapper:hover {
  transform: translateY(-2px) rotate(-3deg);
  box-shadow: 
    6px 8px 12px rgba(0,0,0,0.15),
    -2px -2px 6px rgba(255,255,255,0.8);
}

/* Locked/unearned badge */
.badge-icon-wrapper.locked {
  filter: grayscale(1) opacity(0.4);
}

/* Earned badge — glow effect */
.badge-icon-wrapper.earned {
  box-shadow: 
    4px 4px 8px rgba(0,0,0,0.12),
    -2px -2px 6px rgba(255,255,255,0.8),
    0 0 20px rgba(245, 158, 11, 0.35);  /* gold glow */
}

/* Crown / mastery badges (👑) — special treatment */
.badge-icon-wrapper.crown {
  background: linear-gradient(145deg, #fef3c7, #fbbf24);
  box-shadow: 
    4px 4px 8px rgba(0,0,0,0.15),
    -2px -2px 6px rgba(255,255,255,0.6),
    0 0 30px rgba(245, 158, 11, 0.4);
}
```

**Badge earn animation (Framer Motion):**
```typescript
// When a badge is earned (triggered by API response):
// 1. Badge flips from grayscale locked state to colored earned state
// 2. Coin counter increments with animated counter
// 3. Brief confetti burst (use canvas-confetti library)
// 4. Toast notification: "🏅 New badge earned: Problem Explorer (+50 coins)"

import confetti from 'canvas-confetti';

export function triggerBadgeEarnAnimation(badgeName: string, coinValue: number) {
  // Confetti
  confetti({
    particleCount: 60,
    spread: 70,
    origin: { y: 0.7 },
    colors: ['#4F46E5', '#F59E0B', '#10B981'],
  });
  
  // Toast — implement with your toast library
}
```

**Leaderboard — top 3 special treatment:**
```typescript
// 1st place: golden card with gradient background, crown icon, larger avatar
// 2nd place: silver treatment
// 3rd place: bronze treatment
// 4th+: standard list rows
```

**Coin balance in header/topbar:**
- Always visible when logged in as participant
- Format: `🪙 1,250` in amber color
- On coin earn: number animates up with `+50` floating above and fading out (CSS keyframe)

---

## SECTION 8 — PAGE TRANSITIONS & MICRO-INTERACTIONS

**Page transitions (Framer Motion):**
```typescript
// components/layout/page-transition.tsx
import { motion, AnimatePresence } from 'framer-motion';

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

const pageTransition = {
  duration: 0.2,
  ease: [0.4, 0, 0.2, 1],
};

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
    >
      {children}
    </motion.div>
  );
}

// Wrap every page component with <PageTransition>
```

**Button interactions (apply globally to all Button components):**
```css
.btn {
  transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.btn:hover {
  filter: brightness(1.05);
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);
}

.btn:active {
  transform: scale(0.97);
  filter: brightness(0.98);
}

/* Loading state — spinner inside button */
.btn.loading {
  cursor: not-allowed;
  opacity: 0.8;
}
```

**Skeleton loading (replace all spinners with skeleton screens):**
```typescript
// components/ui/skeleton.tsx
// Show skeleton layout matching the actual content shape
// while data is loading — never show a full-page spinner
// Cards: rectangular skeleton with shimmer animation
// Tables: 5-8 skeleton rows matching actual row height
// Stat cards: skeleton matching card dimensions

// Shimmer animation:
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.skeleton {
  background: linear-gradient(
    90deg,
    #f0f2f8 25%,
    #e8eaf0 50%,
    #f0f2f8 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 6px;
}
```

**Form field interactions:**
- Focus: ring appears (`box-shadow: 0 0 0 3px rgba(79,70,229,0.15)`)
- Error: ring turns red, message slides down (animate height from 0 to auto)
- Success: brief green ring flash
- All transitions: 150ms

---

## SECTION 9 — DARK MODE

Implement system-preference-aware dark mode with manual override.

```typescript
// Use next-themes
npm install next-themes

// app/providers.tsx
import { ThemeProvider } from 'next-themes';

export function Providers({ children }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange={false}
    >
      {children}
    </ThemeProvider>
  );
}
```

**Dark mode design rules:**
- Background: `#0C0C14` (not pure black — slightly blue-tinted)
- Cards: `#13131F`
- Borders: `#1F2937`
- No stark contrast — everything is tonal, layered depth
- Badge glow effects become more dramatic in dark mode (they pop against dark backgrounds)
- Sidebar in dark mode: `#0F0F1A` — slightly different from main bg to create depth
- All color tokens must have dark mode variants (use CSS variables, switch via `.dark` class)

**Toggle button:**
- Sun / Moon icon, top-right of every page
- Smooth transition: icon rotates and fades as it switches
- Preference saved to localStorage + user profile

---

## SECTION 10 — RESPONSIVE FINE-TUNING

After implementing all above sections, verify at these exact breakpoints:

**375px (iPhone SE):**
- [ ] Bottom tab bar visible and functional
- [ ] Stat cards: 2-column grid (not 4)
- [ ] Tables: horizontal scroll OR stacked card view
- [ ] Login page: single column, full-screen form
- [ ] Badge grid: 2 columns
- [ ] All text readable (no overflow, no truncation of important content)
- [ ] Touch targets minimum 44x44px

**768px (iPad):**
- [ ] Sidebar: icon-only (64px)
- [ ] Stat cards: 2x2 grid
- [ ] Tables: full table view with horizontal scroll if needed
- [ ] Badge grid: 3-4 columns

**1280px (Laptop):**
- [ ] Sidebar: full 240px
- [ ] Stat cards: 4-column row
- [ ] Tables: full view, all columns visible
- [ ] Badge grid: 5-6 columns

**1920px (Desktop):**
- [ ] Max content width: 1400px centered
- [ ] No elements stretch awkwardly on ultra-wide

---

## SECTION 11 — PERFORMANCE & ACCESSIBILITY

**Performance (these affect perceived quality):**
- All images: use `next/image` with proper `width`, `height`, `loading="lazy"`
- Icon imports: import only used icons from lucide-react (no barrel imports)
- Animations: respect `prefers-reduced-motion`:
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```
- Font: Inter loaded via `next/font` (zero layout shift)
- No animation should block interaction or affect Core Web Vitals

**Accessibility:**
- All interactive elements: visible focus ring (never `outline: none` without replacement)
- Color is never the only indicator of state (also use icon + text)
- ARIA labels on icon-only buttons
- Contrast ratio: minimum 4.5:1 for normal text, 3:1 for large text

---

## FINAL VERIFICATION CHECKLIST

Before marking this prompt complete, verify every item:

**Visual Quality:**
- [ ] Login page: animated gradient, glass form card, language switcher
- [ ] Sidebar: correct active states, hover animations, seat counter widget
- [ ] Stat cards: animated counters trigger on scroll-into-view, hover lift effect
- [ ] Tables: row hover with left border indicator, status chips, skeleton loading
- [ ] Badge cards: 3D CSS effect, locked/earned/crown states, earn animation
- [ ] Page transitions: smooth fade+rise between routes
- [ ] Button interactions: hover brightness, active scale, loading state
- [ ] Dark mode: all screens look intentional (not just color inverted)

**Responsive:**
- [ ] 375px: bottom tab bar, 2-col cards, stacked tables
- [ ] 768px: icon sidebar, 2x2 cards
- [ ] 1280px: full sidebar, 4-col cards
- [ ] 1920px: max-width container, no awkward stretching

**Technical:**
- [ ] Design tokens used everywhere — no hardcoded hex values
- [ ] `prefers-reduced-motion` respected
- [ ] `next/font` for Inter — zero layout shift
- [ ] All focus states visible
- [ ] Skeleton screens instead of spinners
- [ ] `canvas-confetti` installed for badge earn animation

**The test:** Open the app fresh, as if you are a technopark director seeing it for the first time. Within 10 seconds, do you feel: "This is serious, professional software"? If not, identify what breaks that impression and fix it before closing this task.