# Design System Specification: The Empathetic Authority

## 1. Overview & Creative North Star
**Creative North Star: "The Curated Sanctuary"**
This design system moves beyond the cold, sterile nature of traditional medical portals. It rejects the "template" look of rigid grids and heavy borders. Instead, it creates a digital environment that feels like a high-end, light-filled clinic—spacious, organized, and deeply human. 

The aesthetic is driven by **Editorial Sophistication**: using intentional asymmetry, generous white space (breathing room), and a hierarchy of layered surfaces rather than structural lines. We use typography as a decorative element and tonal depth to guide the user’s eye, ensuring the experience feels premium, trustworthy, and calm.

---

## 2. Colors & Tonal Depth
We use a refined Material-based palette to establish authority while maintaining warmth.

### The "No-Line" Rule
**Explicit Instruction:** 1px solid borders for sectioning are strictly prohibited. Boundaries must be defined solely through background color shifts or subtle tonal transitions. For example, a `surface-container-low` card sitting on a `surface` background provides all the definition needed without the visual "noise" of a line.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—like stacked sheets of fine paper or frosted glass.
- **Base:** `surface` (#F7FAFC)
- **Primary Containers:** `surface-container-low` (#F1F4F6) for secondary information.
- **Elevated Elements:** `surface-container-lowest` (#FFFFFF) for the most critical interactive cards.
- **High Importance:** `surface-container-high` (#E5E9EB) for subtle navigation sidebars or utility areas.

### The "Glass & Gradient" Rule
To elevate the experience from "standard" to "signature":
- **Glassmorphism:** Use for floating headers or navigation bars. Apply `surface` with 80% opacity and a `backdrop-blur` of 20px.
- **Signature Textures:** Use a subtle linear gradient from `primary` (#002045) to `primary-container` (#1A365D) for Hero CTAs. This adds a "soul" and depth that a flat hex code cannot achieve.

---

## 3. Typography: Editorial Clarity
We pair **Manrope** (for high-impact headings) with **Public Sans** (for high-legibility UI/Body). In a Korean context, these should be mapped to **Pretendard JP/KR** for consistent weight distribution.

- **Display (Large/Med):** Used for "Welcome" messages or hero metrics. These are large, bold, and demand attention.
- **Headlines:** Set the tone for major sections. Use `headline-lg` (2rem) to create a clear entry point for the eye.
- **Body:** All body text must use `body-lg` (1rem) for primary reading or `body-md` (0.875rem) for secondary details. Never go below `label-sm` (11px) for accessibility.
- **Identity through Type:** The wide tracking in Labels and the tight, authoritative leading in Headlines convey a sense of professional curation.

---

## 4. Elevation & Depth
Depth is achieved through **Tonal Layering**, not structural shadows.

### The Layering Principle
Hierarchy is created by "stacking" surface tokens. Place a `surface-container-lowest` card (White) on a `surface-container-low` (Light Grey) section to create a soft, natural lift.

### Ambient Shadows
When an element must "float" (e.g., a modal or a primary action button):
- **Shadow Color:** Must be a tinted version of `on-surface` (e.g., `#181C1E` at 5% opacity).
- **Blur:** Use extra-diffused values (Box-shadow: 0 10px 40px). Avoid dark, muddy "drop shadows."

### The "Ghost Border" Fallback
If a border is required for accessibility:
- Use `outline-variant` (#C4C6CF) at **15% opacity**.
- **Forbidden:** 100% opaque, high-contrast borders.

---

## 5. Components & Interface Elements

### Buttons
- **Primary:** Gradient from `primary` to `primary-container`. `Rounded-md` (12px). White text.
- **Secondary:** `secondary-container` (#79F7EA) background with `on-secondary-container` (#007169) text.
- **Tertiary:** Text-only with an underline on hover, using `primary` color.

### Cards & Lists
- **No Dividers:** Forbid the use of divider lines. Separate list items using `spacing-4` (1rem) or by alternating background tones between `surface` and `surface-container-low`.
- **Corner Radius:** Standardize on `rounded-lg` (16px) for large containers and `rounded-md` (12px) for inner elements to maintain a "soft-medical" feel.

### Input Fields
- **Style:** Background set to `surface-container-highest` (#E0E3E5) with no border. On focus, transition to a 1px "Ghost Border" using the `primary` token at 40% opacity.
- **Labels:** Use `label-md` in `on-surface-variant` for a muted, professional look.

### Specialized Components
- **The "Vitality Chip":** Used for health status. Uses `secondary` (#006A63) with a 10% opacity background of the same color for a soft, glowing effect.
- **Care Timelines:** Use a vertical line in `outline-variant` at 20% opacity, with `primary` dots to signify medical milestones.

---

## 6. Do’s and Don’ts

### Do
- **Do** use the `spacing-12` (3rem) and `spacing-16` (4rem) tokens generously to create an "Editorial" feel.
- **Do** use `tertiary` (#321B00) sparingly for alerts; its warmth provides urgency without the "panic" of pure red.
- **Do** ensure all Korean text uses a minimum of 150% line-height for readability.

### Don’t
- **Don’t** use pure black (#000000) for text. Use `on-surface` (#181C1E) for a softer, premium contrast.
- **Don’t** use a shadow on every card. Only shadow elements that are "floating" or "active."
- **Don’t** use standard 1px grey dividers. If you feel the need for a divider, increase the white space instead.

---

## 7. Token Reference Summary

| Token | Value | Usage |
| :--- | :--- | :--- |
| `primary` | #002045 | Authority, Headers, Main CTAs |
| `secondary` | #006A63 | Vitality, Health Indicators, Success |
| `tertiary` | #321B00 | Important Alerts, Warm Accents |
| `surface` | #F7FAFC | Global background |
| `surface-container-lowest` | #FFFFFF | Active Cards, Input Fields |
| `rounded-md` | 12px | Standard components |
| `rounded-lg` | 16px | Main layout containers |