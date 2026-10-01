# ArtVault — Design System

> **Principle:** Art first. Market second. Technology underneath.

---

## 1. Visual Theme & Atmosphere

ArtVault is an **editorial art marketplace**. It should feel like a premium gallery catalogue meets a
thoughtful marketplace — not a social feed, not a crypto dashboard, not a SaaS product.

**Emotional targets:**
- Premium, contemporary, artistic
- Trustworthy, human, community-driven
- Immersive without being theatrical
- Clean without being sterile

**Anti-targets (never feel like):**
- Instagram / Pinterest clone
- NFT / crypto marketplace
- Generic SaaS dashboard
- Trading terminal
- Startup landing page

---

## 2. Color Palette & Roles

### Base Palette (Dark Mode — Primary)

| Token | Value | Role |
|---|---|---|
| `--color-bg` | `#0F0E0D` | Page background — near-black warm |
| `--color-surface` | `#1A1916` | Cards, panels, surfaces |
| `--color-surface-elevated` | `#232220` | Elevated states, modals |
| `--color-border` | `#2E2C2A` | Default borders |
| `--color-border-subtle` | `#232220` | Dividers, subtle separators |

### Text

| Token | Value | Role |
|---|---|---|
| `--color-text-primary` | `#F5F2EE` | Headlines, key labels |
| `--color-text-secondary` | `#9E9A95` | Supporting text, metadata |
| `--color-text-tertiary` | `#5C5A57` | Placeholder, disabled |

### Brand

| Token | Value | Role |
|---|---|---|
| `--color-accent` | `#C8A96E` | Warm gold — primary brand accent |
| `--color-accent-hover` | `#D4B97A` | Hover state |
| `--color-accent-muted` | `rgba(200, 169, 110, 0.12)` | Accent backgrounds |
| `--color-accent-border` | `rgba(200, 169, 110, 0.3)` | Accent borders |

### Semantic

| Token | Value | Role |
|---|---|---|
| `--color-positive` | `#6BAF8C` | Positive change, owned, success |
| `--color-negative` | `#C4614A` | Negative change, error |
| `--color-warning` | `#D4935A` | Warning states |
| `--color-info` | `#5A8FC4` | Info, neutral market data |

### Gemini

| Token | Value | Role |
|---|---|---|
| `--color-gemini` | `#8B9FE8` | Gemini AI accent color |
| `--color-gemini-muted` | `rgba(139, 159, 232, 0.1)` | Gemini panel backgrounds |
| `--color-gemini-border` | `rgba(139, 159, 232, 0.25)` | Gemini panel borders |

---

## 3. Typography

### Fonts

- **Display / Headings:** `'DM Serif Display', serif` — editorial, artistic weight
- **Body / UI:** `'Inter', system-ui, sans-serif` — clean, legible, modern
- **Mono / Data:** `'JetBrains Mono', monospace` — prices, IDs, numbers

---

## 4. Component Styling

### Buttons

- **Primary:** background: accent gold; color: near-black
- **Secondary:** transparent + border
- **Ghost:** Text only
- Height: 40px default

### Cards

- Background: surface
- Border: 1px border
- Radius: 12px
- No box-shadow by default
- Hover: border brightens + 1px translate up

---

## 5. Layout Principles

- Max width: 1280px
- Artwork space: always >= 50% on detail pages
- Grid: CSS Grid, asymmetric where appropriate

---

## 6. Motion

- Transitions: 200-300ms ease-out for UI
- No floating/bouncing animations
- Artwork hover: subtle scale(1.02)
- Modal: fade + translate Y 8px

---

## 7. Do NOT

- No purple gradients
- No glassmorphism everywhere
- No neon colors
- No NFT/crypto/blockchain visual language
- No generic SaaS grid of icon-cards
