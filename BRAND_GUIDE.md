# ZERA Brand Identity Guide

## Overview

ZERA — "Your New Era of Learning" — is an AI-powered personalized learning platform. This guide documents the visual identity system designed to communicate intelligence, progression, trust, and accessibility.

---

## Logo System

### Primary Logo
**File:** `logo-primary.svg` (light background) / `logo-primary-dark.svg` (dark background)

The primary logo combines the ZERA symbol with the custom wordmark. The symbol represents the learning journey: Foundation → Transformation → Mastery.

### Horizontal Logo
**File:** `logo-horizontal.svg` (light) / `logo-horizontal-dark.svg` (dark)

Compact version for navigation bars and constrained horizontal spaces.

### Standalone Symbol
**File:** `logo-symbol.svg` (light) / `logo-symbol-dark.svg` (dark)

The symbol alone for app icons, favicons, and brand marks where the wordmark is redundant.

### Monochrome Variants
**Files:** `logo-monochrome.svg`, `logo-horizontal-mono.svg`

Single-color versions using `currentColor` for maximum flexibility across backgrounds.

---

## Symbol Meaning

The ZERA symbol is an original geometric mark composed of three connected elements:

1. **Foundation Bar (bottom horizontal)** — The starting point: syllabus, basics, groundwork
2. **Transformation Diagonal** — The active learning phase: practice, struggle, growth, AI-assisted understanding
3. **Mastery Bar (top horizontal)** — Achievement: retention, application, confidence
4. **Accent Dot** — The "spark" of insight; the moment a concept clicks

Together they form a stylized **Z** — the brand initial — while telling the story of every learner's progression.

---

## Color System

### Primary Brand Colors
| Name | Hex | Usage |
|------|-----|-------|
| Midnight Navy | `#06121F` | Primary dark background, text on light |
| Deep Navy | `#0A1727` | Secondary dark surfaces |
| Electric Indigo | `#3B82F6` | Primary brand, CTAs, links |
| Indigo | `#6366F1` | Gradient midpoint |
| Violet | `#8B5CF6` | Gradient end, accents |
| Cyan Accent | `#22C3FF` | Spark dot, highlights, focus states |

### Light Mode Colors
| Name | Hex | Usage |
|------|-----|-------|
| White | `#FFFFFF` | Primary background |
| Soft Blue | `#F4F9FF` | Secondary backgrounds, cards |
| Light Navy | `#E8EEFB` | Subtle borders, dividers |
| Dark Text | `#0D1D30` | Primary text |
| Muted Text | `#526A86` | Secondary text |

### Dark Mode Colors
| Name | Hex | Usage |
|------|-----|-------|
| Midnight | `#06121F` | Primary background |
| Dark Panel | `#0C1B2D` | Cards, panels |
| Text Primary | `#E8EEFB` | Primary text |
| Text Muted | `#9AB0CC` | Secondary text |
| Border | `rgba(255,255,255,0.09)` | Borders, dividers |

### Semantic Colors
| Name | Hex | Usage |
|------|-----|-------|
| Success | `#10B981` | Completed, positive states |
| Warning | `#F59E0B` | In progress, attention needed |
| Danger | `#EF4444` | Errors, destructive actions |
| Demo | `#F59E0B` | Demo mode indicators |

---

## Typography

### Primary Font
**Inter** — Modern, highly legible, excellent at all sizes
- Weights: 400 (Regular), 500 (Medium), 600 (Semibold), 700 (Bold), 800 (ExtraBold)
- Fallback: `"Segoe UI", system-ui, sans-serif`

### Wordmark Treatment
- **Font:** Inter ExtraBold (800)
- **Letter-spacing:** -0.04em (tight for cohesion)
- **Special:** The letter "Z" receives a subtle gradient overlay (15% opacity) as a brand signature

### Scale
| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| Display Hero | clamp(2.7rem, 5vw, 4.9rem) | 800 | 0.98 |
| Page Title | clamp(2rem, 3vw, 3rem) | 700 | 1.1 |
| Section Title | clamp(1.5rem, 2.5vw, 2rem) | 700 | 1.2 |
| Body Large | 1.125rem | 400 | 1.7 |
| Body | 1rem | 400 | 1.6 |
| Small | 0.875rem | 400 | 1.5 |
| Label | 0.75rem | 600 | 1.4 |

---

## Spacing System

Base unit: **4px**

| Token | Value | Usage |
|-------|-------|-------|
| space-1 | 4px | Micro spacing |
| space-2 | 8px | Tight element gaps |
| space-3 | 12px | Standard gaps |
| space-4 | 16px | Component padding |
| space-5 | 20px | Card padding |
| space-6 | 24px | Section element gaps |
| space-8 | 32px | Major section gaps |
| space-10 | 40px | Page section padding |
| space-12 | 48px | Large layout gaps |
| space-16 | 64px | Hero vertical padding |

---

## Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| radius-sm | 8px | Buttons, inputs, badges |
| radius-md | 12px | Cards, panels |
| radius-lg | 16px | Large cards, modals |
| radius-xl | 22px | Hero containers, major sections |
| radius-2xl | 28px | Dashboard visual window |
| radius-full | 999px | Pills, avatar, progress bars |

---

## Shadows & Depth

| Token | Value | Usage |
|-------|-------|-------|
| shadow-sm | `0 2px 8px rgba(3,8,20,0.08)` | Subtle elevation |
| shadow-md | `0 8px 24px rgba(3,8,20,0.12)` | Cards, dropdowns |
| shadow-lg | `0 16px 32px rgba(3,8,20,0.16)` | Modals, major panels |
| shadow-xl | `0 24px 50px rgba(3,8,20,0.25)` | Hero visual, app shell |
| glow-primary | `0 0 0 3px rgba(59,130,246,0.12)` | Focus rings |

---

## Clear Space

Maintain clear space around the logo equal to the height of the symbol's foundation bar (the bottom horizontal element).

- **Primary logo:** Clear space = symbol height (≈20% of logo height)
- **Symbol alone:** Clear space = symbol width × 0.25

---

## Minimum Sizes

| Variant | Minimum Width | Minimum Height |
|---------|---------------|----------------|
| Primary Logo | 200px | 50px |
| Horizontal Logo | 140px | 28px |
| Symbol Alone | 24px | 24px |
| Favicon | 16px | 16px |

Below minimum sizes, use the symbol alone.

---

## Logo Usage Rules

### Do
- Use the appropriate variant for the background (light/dark/monochrome)
- Maintain clear space
- Scale proportionally
- Use SVG for all digital applications

### Don't
- Stretch, skew, or rotate the logo
- Change colors outside the defined variants
- Add effects (drop shadows, glows, outlines)
- Place on busy backgrounds without sufficient contrast
- Use the wordmark without the symbol (except in very constrained spaces)
- Recreate the logo from scratch

---

## Iconography Style

- **Style:** Outlined, 2px stroke weight, rounded caps/corners
- **Corner radius:** 2px minimum
- **Optical sizing:** Icons sit in a 24×24px grid, 2px padding
- **Color:** Inherit text color or use primary brand color for emphasis

---

## Motion Principles

- **Duration:** 200-300ms for micro-interactions, 400-600ms for page transitions
- **Easing:** `cubic-bezier(0.2, 0.6, 0.2, 1)` (ease-out-expo-like)
- **Respect:** `prefers-reduced-motion` — disable non-essential animation
- **Purpose:** Every animation communicates state change, hierarchy, or feedback

---

## Accessibility

- **Contrast:** All text meets WCAG AA (4.5:1) or AAA (7:1) on designated backgrounds
- **Focus:** Visible focus rings using `glow-primary` (3px offset)
- **Color:** Never rely on color alone for meaning; pair with icons/text
- **Scaling:** UI supports 200% zoom without horizontal scrolling

---

## File Inventory

```
assets/icons/
├── favicon.svg                 # 64×64 favicon
├── app-icon-180.svg           # 180×180 app icon (iOS/Android)
├── logo-primary.svg           # Primary logo (light bg)
├── logo-primary-dark.svg      # Primary logo (dark bg)
├── logo-horizontal.svg        # Horizontal logo (light bg)
├── logo-horizontal-dark.svg   # Horizontal logo (dark bg)
├── logo-symbol.svg            # Symbol alone (light bg)
├── logo-symbol-dark.svg       # Symbol alone (dark bg)
├── logo-monochrome.svg        # Monochrome primary
└── logo-horizontal-mono.svg   # Monochrome horizontal
```

---

## Implementation Notes

### CSS Custom Properties (in `style.css`)
```css
:root {
  /* Brand Colors */
  --brand-midnight: #06121F;
  --brand-deep-navy: #0A1727;
  --brand-indigo: #3B82F6;
  --brand-indigo-2: #6366F1;
  --brand-violet: #8B5CF6;
  --brand-cyan: #22C3FF;
  
  /* Logo gradient */
  --logo-gradient: linear-gradient(135deg, var(--brand-indigo), var(--brand-indigo-2), var(--brand-violet));
  --logo-gradient-dark: linear-gradient(135deg, #60A5FA, #818CF8, #A78BFA);
  
  /* Typography */
  --font-sans: 'Inter', 'Segoe UI', system-ui, sans-serif;
  
  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  
  /* Radius */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 22px;
  --radius-2xl: 28px;
  --radius-full: 999px;
  
  /* Shadows */
  --shadow-sm: 0 2px 8px rgba(3,8,20,0.08);
  --shadow-md: 0 8px 24px rgba(3,8,20,0.12);
  --shadow-lg: 0 16px 32px rgba(3,8,20,0.16);
  --shadow-xl: 0 24px 50px rgba(3,8,20,0.25);
  --glow-primary: 0 0 0 3px rgba(59,130,246,0.12);
}
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-10-12 | Initial brand identity system |

---

*This brand guide is a living document. Update as the product evolves.*