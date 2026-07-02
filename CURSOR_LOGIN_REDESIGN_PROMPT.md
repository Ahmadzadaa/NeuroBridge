# SIMSTART — LOGIN PAGE REDESIGN PROMPT

## CONTEXT

You are redesigning the SimStart login page. The current version uses a dark 55/45 split layout. We are replacing it entirely with a cleaner, lighter, more institutional design.

**Design reference studied:** Reflektif.net — clean centered card on light background, no dark panels, minimal noise.

**What we are NOT doing:** Copying Reflektif. SimStart serves a different audience (technoparks, universities, government institutions) and must feel more structured, data-driven, and authoritative — not a consumer app.

**The SimStart difference:** Reflektif is a career tool for students. SimStart is enterprise B2B software sold to institutions. The login page must communicate: "This is serious infrastructure your organization is buying into."

Do not touch any authentication logic, session handling, 2FA flow, or NextAuth configuration. CSS and layout only.

---

## DESIGN DIRECTION — "INSTITUTIONAL CLARITY"

The feeling we are going for: the login page of a well-funded European govtech or edtech company. Think Notion meets a government portal — clean, structured, trustworthy, with one moment of visual identity that makes it memorable.

**The SimStart signature on this page:** A subtle animated particle/dot grid in the background that slowly drifts — low opacity (0.06), indigo color. It is barely visible but creates a sense of an active, intelligent system running underneath. This is the ONE decorative element. Everything else is restrained.

---

## COLOR SYSTEM (use existing design tokens — do not introduce new hex values)

```
Page background:    var(--bg-base)          /* #F7F8FC — slightly blue-tinted white */
Card background:    var(--bg-surface)        /* #FFFFFF */
Card border:        var(--border-default)    /* #E5E7EB */
Primary text:       var(--text-primary)      /* #111827 */
Secondary text:     var(--text-secondary)    /* #4B5563 */
Tertiary text:      var(--text-tertiary)     /* #9CA3AF */
Brand:              var(--brand)             /* #4F46E5 */
Brand subtle:       var(--brand-subtle)      /* #EEF2FF */
Input border:       var(--border-default)
Input focus:        var(--brand)
Button bg:          var(--brand)
Button text:        #FFFFFF
```

Dark mode: all of the above automatically switch via the existing CSS variable system. No additional dark mode code needed.

---

## LAYOUT STRUCTURE

```
┌─────────────────────────────────────────────────────────┐
│  [Language 🌐]  [Dark mode 🌙]          ← top-right, 16px from edge  │
│                                                         │
│          ·  ·  ·  ·  ·  ·  ·  ·  ·  ·                 │
│       ·     ·     ·     ·     ·     ·                   │  ← animated
│          ·  ·  ·  ·  ·  ·  ·  ·  ·  ·                 │     dot grid
│                                                         │     opacity 0.06
│              ┌─────────────────────┐                    │
│              │   [SimStart Logo]   │                    │
│              │      SimStart       │                    │
│              │  ───────────────    │                    │
│              │  Hesabınıza         │                    │
│              │  Daxil Olun         │                    │
│              │                     │                    │
│              │  [Email field]      │                    │
│              │  [Password field]   │                    │
│              │                     │                    │
│              │  [        Daxil ol ]│                    │
│              │                     │                    │
│              │  Şifrəni unutdun?   │                    │
│              └─────────────────────┘                    │
│                                                         │
│         ← Powered by SimStart  ·  2026 →               │  ← footer
└─────────────────────────────────────────────────────────┘
```

**Card dimensions:**
- Max width: 420px
- Padding: 40px (desktop), 24px (mobile)
- Border radius: 16px (var(--radius-lg))
- Border: 1px solid var(--border-default)
- Box shadow: var(--shadow-md)
- Position: horizontally and vertically centered on page

**Page:**
- Min height: 100vh
- Display: flex, align-items: center, justify-content: center
- Background: var(--bg-base)
- Position: relative (for the dot grid overlay)

---

## CARD CONTENT — TOP TO BOTTOM

### 1. Logo block
```
[S]  SimStart
```
- Logo: 36x36px rounded square, background: var(--brand), white "S" letter, font-weight 800, font-size 18px
- "SimStart" wordmark: 18px, font-weight 700, color: var(--text-primary), margin-left: 10px
- Layout: flex row, align-items center
- Bottom margin: 28px

### 2. Divider line
- 1px solid var(--border-subtle)
- Full width of card content
- Margin bottom: 24px
- This creates a visual "header" section above the form — makes the card feel structured like a dashboard component, not a consumer app

### 3. Heading block
- Main heading: "Hesabınıza Daxil Olun" — 22px, font-weight 700, color: var(--text-primary), letter-spacing: -0.3px
- Subtext: locale-aware (use existing i18n keys):
  - AZ: "Sahibkarlıq simulasiya platformasına xoş gəlmisiniz"
  - TR: "Girişimcilik simülasyon platformuna hoş geldiniz"
  - EN: "Welcome to the entrepreneurship simulation platform"
- Subtext style: 13px, color: var(--text-secondary), margin-top: 4px
- Bottom margin: 28px

### 4. Email field
- Label: "E-poçt" / "E-posta" / "Email" — 12px, font-weight 600, color: var(--text-secondary), display block, margin-bottom 6px
- Input: full width, height 44px, border: 1px solid var(--border-default), border-radius: 8px, padding: 0 14px, font-size: 14px, background: var(--bg-surface), color: var(--text-primary)
- Focus state: border-color: var(--brand), box-shadow: 0 0 0 3px var(--brand-glow)
- Transition: border-color 150ms ease, box-shadow 150ms ease
- Autocomplete: email
- Bottom margin: 16px

### 5. Password field
- Label row: flex, space-between
  - Left: "Şifrə" / "Şifre" / "Password" — same label style as above
  - Right: "Şifrəni unutdun?" / "Şifremi unuttum?" / "Forgot password?" — 12px, color: var(--brand), font-weight 500, hover: underline
- Input: same as email field + right padding 44px for the eye toggle
- Eye toggle button: absolute right-14px, 20px icon, color: var(--text-tertiary), hover: var(--text-secondary)
- Error state: border-color: var(--danger), below input: error message in 12px var(--danger) that animates in with height transition (0 → auto, 150ms)
- Bottom margin: 24px

### 6. Submit button
- Full width, height: 44px
- Background: var(--brand), color: #FFFFFF
- Border radius: 8px
- Font size: 14px, font-weight: 600
- Text: "Daxil ol" / "Giriş yap" / "Sign in" (i18n)
- Hover: brightness(1.08), box-shadow: var(--shadow-brand)
- Active: scale(0.98)
- Loading state: spinner (16px, white) on left side of text, button disabled, opacity: 0.85
- Transition: all 150ms ease
- Bottom margin: 20px

### 7. Divider (optional social/SSO section — skip if no SSO implemented)
If no SSO: skip entirely. Do not add placeholder "or continue with Google" if it does not exist in the codebase.

### 8. 2FA field (conditional — existing logic)
Keep the existing 2FA slide-open animation exactly as it is. Do not change the 2FA flow.

### 9. Institution badge (UNIQUE SimStart element — not in Reflektif)
Below the submit button, add a subtle trust signal row:

```
🔒  256-bit şifrələmə  ·  KVKK/GDPR uyğun  ·  Enterprise SaaS
```

- Font size: 11px, color: var(--text-tertiary)
- Text-align: center
- Icons: 10px lock icon from lucide-react
- This communicates "institutional software" without cluttering the form
- Do NOT show this on mobile (hide with `hidden sm:flex`)

### 10. Demo accounts block (development only)
```typescript
{process.env.NODE_ENV === 'development' && (
  <div className="demo-accounts-block">
    {/* existing demo accounts content */}
  </div>
)}
```
- In production: completely invisible, zero DOM presence
- In development: styled as a dashed-border info card, tertiary text, clearly labeled "Dev only"

---

## ANIMATED DOT GRID (THE SIGNATURE BACKGROUND ELEMENT)

Implement as a `<canvas>` element positioned absolute, full page, pointer-events none, z-index 0. The card sits at z-index 1.

```typescript
// components/auth/dot-grid-background.tsx
'use client';
import { useEffect, useRef } from 'react';

export function DotGridBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Respect prefers-reduced-motion
    const prefersReduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    const SPACING = 36;      // Distance between dots
    const DOT_RADIUS = 1.2;  // Dot size
    const OPACITY = 0.07;    // Very subtle
    const SPEED = prefersReduced ? 0 : 0.3;  // Drift speed
    
    let offset = 0;
    let animationId: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Detect dark mode
      const isDark = document.documentElement.classList.contains('dark');
      ctx.fillStyle = isDark 
        ? `rgba(99, 102, 241, ${OPACITY})`   // indigo in dark mode
        : `rgba(79, 70, 229, ${OPACITY})`;    // indigo in light mode

      const cols = Math.ceil(canvas.width / SPACING) + 2;
      const rows = Math.ceil(canvas.height / SPACING) + 2;

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * SPACING + (offset % SPACING) - SPACING;
          const y = j * SPACING + (offset * 0.4 % SPACING) - SPACING;
          ctx.beginPath();
          ctx.arc(x, y, DOT_RADIUS, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      offset += SPEED;
      animationId = requestAnimationFrame(draw);
    };

    resize();
    draw();

    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
      aria-hidden="true"
    />
  );
}
```

Use `<DotGridBackground />` in the login page layout, behind everything.

---

## TOP BAR (language + dark mode toggles)

Position: fixed top-right, always visible above the card.

```
┌──────────────────────────────────────────────────────┐
│                              [🌐 AZ ▾]  [🌙]        │
└──────────────────────────────────────────────────────┘
```

- Container: fixed, top: 16px, right: 20px, z-index: 50, flex row, gap: 8px
- Language button: existing language switcher component — keep as is
- Dark mode toggle: existing toggle component — keep as is
- Do NOT move these inside the card

---

## FOOTER

Below the card, centered, position: absolute bottom or below flex content:

```
© 2026 SimStart  ·  Bütün hüquqlar qorunur
```

- Font size: 11px, color: var(--text-tertiary)
- Margin top: 24px from card bottom

---

## MOBILE (≤640px)

- Page background: var(--bg-base) — NOT gradient, NOT dark
- Card: no border, no shadow, full width with 0px border-radius and 0 horizontal margin (edge to edge), or 16px horizontal padding with border-radius kept
- Card fills most of the screen
- Dot grid: still visible, same opacity
- Top bar toggles: top-right, same position
- Institution badge: hidden (too small to read on mobile)
- Logo block and all form elements: same as desktop, no changes except padding reduced to 24px

---

## WHAT NOT TO DO

- Do NOT add a hero image or illustration inside the card
- Do NOT add a "Sign up" link — this is an invitation-only platform (institutions invite participants)
- Do NOT add social login buttons unless they already exist in the codebase
- Do NOT use any color not already in the design token system
- Do NOT change the dark mode colors — they are already handled by CSS variables
- Do NOT add marketing copy inside the login card
- Do NOT copy Reflektif's teal/green color — SimStart uses indigo

---

## IMPLEMENTATION STEPS

1. Create `components/auth/dot-grid-background.tsx` as specified above
2. Replace the current login page JSX layout with the new centered-card structure
3. Keep all existing: form submission logic, validation display, 2FA conditional rendering, loading states, error states, language switching, dark mode — all untouched
4. Add the institution badge row
5. Wrap demo accounts in `process.env.NODE_ENV === 'development'` check
6. Run `npm run build` — must pass with 0 new errors
7. Run `npm run test` — all 124 tests must still pass
8. Visually verify at 375px, 768px, 1280px, 1920px

---

## ACCEPTANCE CRITERIA

The redesign is complete when:

- [ ] Light background (#F7F8FC) replaces dark background everywhere on login page
- [ ] Single centered white card, max-width 420px, with divider line between logo and form
- [ ] Dot grid background animates slowly and is barely visible (opacity ~0.07)
- [ ] Language switcher and dark mode toggle are fixed top-right
- [ ] All form interactions work: focus glow, error messages, show/hide password, loading spinner
- [ ] 2FA conditional section still slides open correctly
- [ ] Institution badge row visible on desktop, hidden on mobile
- [ ] Demo accounts block invisible in production, visible in development
- [ ] Dark mode: card becomes #13131F, page becomes #0C0C14, dots become indigo
- [ ] 124 tests still pass, 0 new build errors
- [ ] The overall impression: a director opening this for the first time sees serious enterprise software, not a consumer app
