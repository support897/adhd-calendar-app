# Pace — Icon Law + Promo Home Page: prep note

## LAW E — user-chosen backgrounds (Ilse via Quality, 14 Oct 17:46)
Rides Pace's NEXT build (the rebrand build). Every user can pick their
background: WHITE · BLACK · the app's BRAND COLOURS · UPLOAD THEIR OWN
IMAGE/STYLE. Contrast adapts automatically (WCAG AA floor; over an
uploaded image a soft veil sits behind text so words always read).
Placement: Settings/Appearance, quiet (Law D calm) — Pace's existing
"My looks" theme system is the seed and grows into these four choices;
the board look stays the default. An uploaded background is USER DATA
under Law B (saved under the user's account, deleted only by the user).
Build notes: downscale on pick (max ~1024px, JPEG) — localStorage room
today, and under accounts an image rides the user document, where the
~1 MiB Firestore ceiling from MULTIUSER-DESIGN §3 applies; the veil +
AA adaptation get their own checks in the build's test battery, and
Quality cites Law E from that build on.

> LOGO PAUSE (Ilse's direct order via HQ, 14 Oct 15:48): she does not
> like the logo for ANY app — Pace's logo C and its C1–C5 PASS are
> superseded by her veto. NO logo work (no retint, no board logo slot)
> until Store Review's logo research lands and Ilse picks. Skip the
> guide/mascot is NOT vetoed — marks only. The sealed AAB is untouched.
> The rebrand board therefore carries: palette, fonts, icon set tint,
> Skip, mood line — the mark's slot waits for the research.

Directives from Ilse via HQ, 14 Oct 2026. Sequenced BEHIND the store work
(signed AAB first — Ilse's key step). Gates apply to the page too.
Nothing in this note changes the sealed pace-v9 build.

## 1. Icon Law — inventory (14 Oct)
- 29 icons in the app today: 18 UI icons + 11 habit icons (h-* set) + the
  logo mark, all one hand-drawn stroke family in an SVG sprite,
  currentColor (brand-tintable by construction).
- The retrofit question for the build phase: do the hand-drawn paths meet
  the "luxury premium" bar, or swap the UI set to a proven premium open
  set (Phosphor / Lucide class, vendored SVG, brand-tinted) keeping the
  habit set + logo as Pace's own? Route decided at build start with a
  side-by-side at 16/24/48px; the swap is paths-only (ids unchanged, zero
  JS touched).
- No AI-generated icon art anywhere — vendored vector only.

## 2. Promo home page — waiting on inputs
- Pattern: public front door in Pace's brand (Honey/Leaf/Sky/Ink,
  Quicksand, staircase mark), one job = "Open the app".
- Flavour: calm delight, not noise — rush = fast, clear, proven
  (research's words). No "dopamine colours", no invented lifts.
- BINDING RESEARCH (HQ 14 Oct 14:49; full report
  ~/workspace/research_notes/homepage-founder-why-and-conversion-rese-20261014-0445/report.md):
  - Structure, in order: slim header (one CTA) → hero → problem→solution
    → 3 steps → benefits → real proof only → founder story → honest
    pricing → FAQ (5–8, answers 40–60 words) → final CTA → sticky mobile
    CTA bar.
  - Hero: outcome headline ≤8–10 words, plain grade 5–7 words (measured
    ~double the conversion of polished copy); ONE CTA + "Free · No card"
    microcopy; real product shot (the store screenshots) as the LCP
    image; rating chip ONLY when a real rating exists — Pace has none
    yet, so the chip ships empty of numbers until the stores provide one.
    No founder content in the hero beyond at most one credibility line.
  - Founder spot: AFTER benefits + first proof, BEFORE pricing/FAQ.
    100–200 words (or 30–60s captioned tap-to-play video); 5 beats —
    lived problem → failed alternatives → decided to build → ONE real
    proof number → same CTA. Real photo + full name. It builds trust; no
    published test proves a sign-up number for it — expect none claimed.
  - Proof: real only. Reviews are never invented; until real store
    reviews exist, the proof block carries only true statements (what
    the app does, on-device privacy) — no counts, no quotes.
  - Pricing block = honest free: what free includes, in plain words.
  - Speed/mobile law: LCP ≤2.5s, INP ≤200ms, CLS ≤0.1; design for
    70–85% phone visitors; tap targets ≥44px; video 21–30s, captioned,
    tap-to-play (facade, no player JS until tapped); OG tags rendered
    in the static HTML, og:image 1200×630.
  - Folklore, skipped by law: "dopamine colours", 80%-video-lift claims,
    2,000-word rules, llms.txt tricks, FAQ schema promises.
- Inputs owed before the build starts:
  1. App Promo desk's Pace market wave (running 14 Oct) + the App Growth
     pack's Pace material (~/workspace/app-growth/ has meal-prep + nanny
     folders today; no Pace folder yet).
  2. Ilse's exact "why I made this app" line — arrives from HQ; never
     invented here.
  3. Her photo for the founder spot — locked real-photo assets only.
- Shape when built: one static page in this repo (promo.html), linked
  from nothing inside the sealed app build; screenshots of the real app
  (the store set) as the imagery; Skip may cameo at the dock line only,
  per his spec.

## PROMO BUILD STATE (14 Oct evening)
promo.html built to the binding blueprint (header → hero → problem/3
steps → benefits → honest-free pricing → FAQ 6 → final CTA → sticky
mobile bar; OG tags static; NO rating chip — none exists yet; founder
block is a shaped slot in the markup, ships only with Ilse's why-line).
Imagery slots (promo/shot-month.png, shot-day.png, shot-habits.png,
og.png) fill from the rebrand re-shoot. PUBLISH FENCE: the FAQ import
answer describes "Bring my calendar in" — if the page goes live before
the import build lands, soften that answer first; never overclaim.

## LAW E — BUILD ASSIGNMENT (filed 14 Oct 2026; renumbered the same night)
Law E (backgrounds: WHITE · BLACK · BRAND COLOURS · UPLOAD OWN IMAGE,
adaptive contrast, AA floor, veil over photos) rides its OWN build:
**pace-v14**, on Meal Prep's proven pattern (their v17–v19 line:
theme set + veil-from-luminance + AA battery). Filed first as v13;
Ilse's direct feel-build order took v13 the same night, so Law E
renumbered to v14 — one feature per gate either way, not folded into
v12 (import) or v13 (feel), and not dropped. Quality holds the
renumber filing; this note is the on-disk record.
