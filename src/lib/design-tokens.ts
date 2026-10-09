/**
 * SimStart design tokens — single source of truth for all visual values.
 *
 * CSS consumption: these values are mirrored as CSS variables in
 * `src/app/globals.css` (Tailwind v4 CSS-first config, `@theme inline`).
 * TS consumption: import `tokens` for charts, canvas (confetti), framer-motion
 * transitions, and anywhere a literal value is needed outside of Tailwind.
 *
 * Do not hardcode hex values in components — reference tokens or the
 * semantic Tailwind classes derived from them.
 */
export const tokens = {
  colors: {
    // Backgrounds
    bg: {
      base: "#F7F8FC", // Main app background — slightly blue-tinted white
      surface: "#FFFFFF", // Cards, panels
      elevated: "#FFFFFF", // Modals, dropdowns
      subtle: "#F0F2F8", // Hover states, zebra rows
      overlay: "rgba(15, 15, 20, 0.5)", // Modal backdrop
    },

    // Brand
    brand: {
      DEFAULT: "#4F46E5", // Primary indigo
      light: "#6366F1",
      dark: "#3730A3",
      subtle: "#EEF2FF", // Light tint for badges, chips
      glow: "rgba(79, 70, 229, 0.15)", // For glow effects
    },

    // Semantic
    success: {
      DEFAULT: "#10B981",
      light: "#D1FAE5",
      dark: "#065F46",
    },
    warning: {
      DEFAULT: "#F59E0B",
      light: "#FEF3C7",
      dark: "#92400E",
    },
    danger: {
      DEFAULT: "#EF4444",
      light: "#FEE2E2",
      dark: "#991B1B",
    },

    // Coin / Achievement (the signature accent)
    coin: {
      DEFAULT: "#F59E0B",
      light: "#FEF3C7",
      glow: "rgba(245, 158, 11, 0.25)",
    },

    // Text
    text: {
      primary: "#111827",
      secondary: "#4B5563",
      tertiary: "#9CA3AF",
      inverse: "#FFFFFF",
      link: "#4F46E5",
    },

    // Borders
    border: {
      DEFAULT: "#E5E7EB",
      strong: "#D1D5DB",
      subtle: "#F3F4F6",
    },
  },

  // Dark mode overrides
  dark: {
    bg: {
      base: "#0C0C14",
      surface: "#13131F",
      elevated: "#1A1A2E",
      subtle: "#1E1E30",
      sidebar: "#0F0F1A",
    },
    text: {
      primary: "#F9FAFB",
      secondary: "#9CA3AF",
      tertiary: "#6B7280",
    },
    border: {
      DEFAULT: "#1F2937",
      strong: "#374151",
      subtle: "#111827",
    },
  },

  typography: {
    fontFamily: {
      sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      mono: "'JetBrains Mono', 'Fira Code', monospace",
    },
    fontSize: {
      xs: "11px",
      sm: "13px",
      base: "14px",
      md: "15px",
      lg: "18px",
      xl: "22px",
      "2xl": "28px",
      "3xl": "36px",
    },
    fontWeight: {
      normal: "400",
      medium: "500",
      semibold: "600",
      bold: "700",
      extrabold: "800",
    },
    letterSpacing: {
      tight: "-0.5px",
      normal: "0px",
      wide: "0.3px",
      wider: "0.5px",
      label: "0.6px", // For uppercase labels
    },
    lineHeight: {
      tight: "1.3",
      normal: "1.5",
      relaxed: "1.7",
    },
  },

  spacing: {
    // Multiples of 4
    "1": "4px",
    "2": "8px",
    "3": "12px",
    "4": "16px",
    "5": "20px",
    "6": "24px",
    "8": "32px",
    "10": "40px",
    "12": "48px",
    "16": "64px",
  },

  radius: {
    sm: "6px",
    md: "10px",
    lg: "16px",
    xl: "20px",
    "2xl": "24px",
    full: "9999px",
  },

  shadows: {
    sm: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
    md: "0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)",
    lg: "0 8px 24px rgba(0,0,0,0.10), 0 4px 8px rgba(0,0,0,0.06)",
    xl: "0 16px 48px rgba(0,0,0,0.12), 0 8px 16px rgba(0,0,0,0.08)",
    hover: "0 12px 32px rgba(0,0,0,0.12), 0 4px 8px rgba(0,0,0,0.06)",
    brand: "0 8px 24px rgba(79, 70, 229, 0.20)",
    coin: "0 8px 24px rgba(245, 158, 11, 0.25)",
    glow: "0 0 0 3px rgba(79, 70, 229, 0.15)",
  },

  animation: {
    duration: {
      instant: "80ms",
      fast: "150ms",
      normal: "250ms",
      slow: "400ms",
      slower: "600ms",
    },
    easing: {
      default: "cubic-bezier(0.4, 0, 0.2, 1)",
      spring: "cubic-bezier(0.34, 1.56, 0.64, 1)", // Slight overshoot
      out: "cubic-bezier(0, 0, 0.2, 1)",
      in: "cubic-bezier(0.4, 0, 1, 1)",
    },
  },
} as const;

export type Tokens = typeof tokens;
