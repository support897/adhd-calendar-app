# Pace logo round — research, concepts, recommendation

Order: Ilse via HQ 13 Oct 22:15. Method: logo-builder skill + the App Checker's
acceptance checks L1-L4 (one geometry everywhere; the mark fills its tile and
reads at 16px; a named font pairing; the tile holds its edge on white).

## Anchor research (sourced; full file: ~/workspace/app-checker/research/pace-comparators.md)
- ANCHOR: Tiimo (ADHD visual planner, iPhone App of the Year 2025 finalist) —
  its icon is three rounded shapes; the app uses icons instead of text and
  colour coding throughout. Lesson: rounded geometry + colour coding IS the
  calm-ADHD category language.
- Things 3: a white checkmark on a saturated blue tile — one glyph, tile fully
  committed to its ground colour. Lesson: fill the tile; no floating marks.
- Streaks: an orange ring of dots on dark — silhouette first, colour second.
- Reminders: coloured dots + lines on white. Structured: blocky S on a grid.
- Three rules learned: (1) the mark fills its tile (full-bleed ground);
  (2) one idea in thick shapes, nothing fine; (3) rounded = calm.

## Font pairing (named, per the standard)
Quicksand Bold for the wordmark "Pace" + Quicksand Regular for the tagline
"Your day, at your pace". Quicksand is a rounded geometric sans (SIL Open Font
License, free for commercial use) — the same family Ilse approved for Meal
Prep's logo; its round letterforms match the mark's rounded geometry. The UI
itself keeps the system font stack (offline-first; the pairing governs the
logo, wordmark and store/listing assets).

## Colours (the app's own level colours — the mark and the check-in agree)
Honey #D9A441 (Low) · Leaf #3FA46A (Steady) · Sky #2F7CF6 (Full) · Ink #26221D (ground)

## The three concepts (hand-coded SVG, logo-round/concept-{a,b,c}.svg; sheet: test-sheet.png — 512/100/48/32/16, light + dark)
- A "Steps, Full Bleed": the shipped three-bars idea rebuilt to fill its tile —
  three rising rounded bars on the ink tile. Reads at 16px. Risk: leans
  bar-chart generic; its defence is it is literally the app's level system.
- B "Three Dots Climbing": three circles rising diagonally. Softest, most
  Tiimo-like; reads at 16px. Risk: least ownable — could be any chart/loader.
- C "One Stepped Path": one thick staircase path climbing in the three level
  colours — "step by step, at your pace" drawn literally. The only one whose
  SILHOUETTE alone is distinctive (a staircase survives pure black/white);
  reads at 16px as a clean zigzag; the rounded joins give the cute-soft feel.

## Recommendation
C. It passes L1-L4 by construction (one path geometry for logo.svg = icon.svg
= in-app mark; the staircase fills the tile's diagonal; Quicksand named; the
ink ground holds its edge on white at 16px), it is ownable in a way bars and
dots are not, and it means the product in one shape. A is the fallback if the
gates prefer continuity with the shipped bars.
On the verdict, the winner wires in one pass: logo.svg (new file), icon.svg
(same geometry, full-bleed), the sprite's i-logo (same geometry), service
worker bump, then the store package regenerates its icons from it.
