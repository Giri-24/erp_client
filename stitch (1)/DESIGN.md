# Design System Specification: The Academic Architect

## 1. Overview & Creative North Star
**Creative North Star: "The Digital Curator"**

In the world of Student ERPs, interfaces are traditionally cluttered, rigid, and exhausting. This design system breaks the "institutional" mold by adopting an editorial, high-end approach. We are not building a database; we are building a sophisticated workspace for academic success. 

The aesthetic is driven by **The Digital Curator**—a philosophy that emphasizes clarity through intentional asymmetry, luxurious whitespace, and a "depth-first" hierarchy. We reject the "spreadsheet" look in favor of a refined, card-based layout that feels more like a premium portfolio than a clerical tool. By utilizing high-contrast typography scales and overlapping surface layers, we create a rhythmic flow that guides the eye naturally through complex data.

---

## 2. Colors & Tonal Depth

Our palette is anchored in **Primary (#00152a)** and **Tertiary (#001813)**—deep, authoritative tones that inspire immediate trust. We contrast these with a sophisticated neutral foundation.

### The "No-Line" Rule
Standard ERPs rely on 1px borders to separate data. This design system **prohibits** 1px solid borders for sectioning. Boundaries must be defined solely through background color shifts. For example, a `surface-container-low` component should sit on a `surface` background to define its edges.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack of premium materials.
- **Base Layer:** `surface` (#f6fafe) for the overall application background.
- **Sectioning:** Use `surface-container-low` (#f0f4f8) for large content areas.
- **Active Cards:** Use `surface-container-lowest` (#ffffff) for the highest visual prominence.
- **Interactive Elements:** Use `surface-container-high` (#e4e9ed) for hover states or inset dashboard widgets.

### The "Glass & Gradient" Rule
To elevate the experience, floating elements (modals, dropdowns) must use **Glassmorphism**. Apply `surface` with 80% opacity and a `20px` backdrop blur. For main CTAs, do not use flat colors; apply a subtle linear gradient from `primary` (#00152a) to `primary_container` (#102a43) at a 135-degree angle to provide a "jewel-toned" depth.

---

## 3. Typography: The Editorial Voice

We utilize a dual-typeface system to balance character with extreme readability.

*   **Display & Headlines (Manrope):** A modern geometric sans-serif used for high-level information. Large scales like `display-lg` (3.5rem) should be used for dashboard welcomes or empty state headers to create an editorial feel.
*   **Body & Labels (Public Sans):** A neutral, highly legible face for dense data. Its slightly wider apertures ensure that even `body-sm` (0.75rem) remains crisp on low-resolution screens.

**The Hierarchy Strategy:**
Always pair a `headline-sm` in **Manrope** with a `body-md` in **Public Sans** to create a clear distinction between "The Subject" and "The Detail." Use `label-md` exclusively for metadata, set in `on_surface_variant` (#43474d) to reduce visual noise.

---

## 4. Elevation & Depth: Tonal Layering

Traditional drop shadows are forbidden. We achieve "lift" through ambient light and tonal shifts.

*   **The Layering Principle:** Place a `surface-container-lowest` card on top of a `surface-container` background. The slight shift in hex value creates a soft, natural edge that is easier on the eyes than a hard border.
*   **Ambient Shadows:** For floating elements like Grade Reports or Profile Popovers, use a hyper-diffused shadow: `box-shadow: 0 20px 40px rgba(1, 29, 53, 0.06)`. Note the use of `on_primary_fixed` (a deep blue) as the shadow tint rather than pure black.
*   **The "Ghost Border" Fallback:** If a container requires extra definition (e.g., in high-contrast accessibility modes), use the `outline_variant` token at **15% opacity**. It should be felt, not seen.

---

## 5. Components: Refined Utility

### Buttons & Interaction
- **Primary:** Gradient-filled (`primary` to `primary_container`) with `xl` (0.75rem) roundedness. Padding: `spacing-4` (horizontal) and `spacing-2.5` (vertical).
- **Secondary:** Transparent background with a `ghost-border`. No fill.
- **Tertiary:** Pure text using `on_primary_fixed_variant` with an icon.

### Cards & Data Lists
- **The Forbiddance of Dividers:** Do not use `<hr>` tags or border-bottoms. Use `spacing-6` (1.5rem) of vertical whitespace or a subtle background toggle between `surface-container-low` and `surface-container-lowest` to separate list items.
- **Student Profile Cards:** Use intentional asymmetry. Place the student photo overlapping the top-left edge of the card container to break the "boxed-in" feel.

### Input Fields
- **Modern Inputs:** Use a "Filled" style using `surface-container-high`. No bottom border. On focus, the background shifts to `surface-container-highest` with a 2px `primary` accent on the left edge only.

### Status Indicators (Vibrant Accents)
- **Success:** Use `tertiary_fixed_dim` (#44ddc1).
- **Error:** Use `error` (#ba1a1a).
- **Warning:** Use custom-blended `primary_fixed` (#d1e4ff) for a "calm alert" feel.

---

## 6. Do’s and Don'ts

### Do:
- **Do** use `spacing-12` and `spacing-16` to create "Gallery" sections for different ERP modules (Grades, Attendance, Finance).
- **Do** use custom-drawn, thick-stroke (2pt) iconography that mirrors the `manrope` font weight.
- **Do** utilize `surface_bright` for tooltips to make them pop against darker backgrounds.

### Don't:
- **Don't** use pure black (#000000) for text. Always use `on_surface` (#171c1f).
- **Don't** use `DEFAULT` (0.25rem) roundedness for large containers; reserve it for small tags. Use `xl` (0.75rem) for cards to maintain a friendly, modern approachable feel.
- **Don't** crowd the dashboard. If a user has 10 modules, use a horizontal "Carousel" layout rather than a 4x4 grid to maintain the editorial "Curator" vibe.

---

## 7. Signature ERP Components

*   **The Progress Ribbon:** Instead of a standard progress bar, use a gradient-filled path that weaves behind content cards, connecting "Current Semester" to "Upcoming Exams."
*   **The Insight Chip:** Floating `surface-container-lowest` chips with `full` roundedness that provide AI-driven suggestions (e.g., "3 Assignments due tomorrow"). These should have the Ambient Shadow applied for maximum "hover" effect.