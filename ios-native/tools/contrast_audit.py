#!/usr/bin/env python3
"""Pace contrast audit — WCAG 2.2 ratios computed from the actual
colour values in source (Theme.swift + the views), never estimated.

Method (W3C WCAG 2.2, SC 1.4.3 / 1.4.11): relative luminance
L = 0.2126R + 0.7152G + 0.0722B on linearised sRGB; ratio =
(Llight + 0.05) / (Ldark + 0.05). Values are NOT rounded before
the pass check (WCAG: 4.499 fails 4.5). Opacity pairings are
composited over their real surface first (source-over in sRGB,
as SwiftUI renders them).

Floors: normal text >= 4.5 · large text / icons / meaningful
graphics / control boundaries >= 3.0.

Run: python3 tools/contrast_audit.py
"""
import colorsys

def hx(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) / 255.0 for i in (0, 2, 4))

def lum(rgb):
    def lin(c):
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (lin(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b

def ratio(fg, bg):
    l1, l2 = lum(fg), lum(bg)
    if l1 < l2:
        l1, l2 = l2, l1
    return (l1 + 0.05) / (l2 + 0.05)

def over(fg, alpha, bg):
    return tuple(alpha * f + (1 - alpha) * b for f, b in zip(fg, bg))

def hexof(rgb):
    return '#%02X%02X%02X' % tuple(round(c * 255) for c in rgb)

# ---- palette of record (Theme.swift + SPEC-VISUAL) ----
PORCELAIN = hx('F3F5FA'); STILL = hx('5B6BD5'); WLIGHT = hx('AEB8EC')
APRICOT = hx('F0A868'); PINE = hx('21392E'); WHITE = (1.0, 1.0, 1.0)
DARKBG = hx('14181F'); DARKCARD = hx('1C1C1E'); BEIGE = hx('F3EAD8')
SOFT = hx('5C6B62'); WDEEP = hx('4858C4'); BLACK = (0.0, 0.0, 0.0)
HER_PAGE = hx('F3F4F9'); HER_GLASS = hx('B6B7BB'); HER_CAPSULE = hx('8C8D92')
HER_JOIN = hx('B4B8B7')

def row(name, fg, bg, floor, note=''):
    r = ratio(fg, bg)
    ok = 'PASS' if r >= floor else 'FAIL'
    print(f'{ok}  {r:5.2f}:1  (floor {floor})  {name}' + (f'  — {note}' if note else ''))
    return r >= floor

def deepen_to(rgb, bg, target):
    """Hold hue+sat (HSL), drop lightness until ratio >= target."""
    h, l, s = colorsys.rgb_to_hls(*rgb)
    while l > 0.02:
        cand = colorsys.hls_to_rgb(h, l, s)
        if ratio(cand, bg) >= target:
            return cand
        l -= 0.01
    return colorsys.hls_to_rgb(h, l, s)

print('=' * 78)
print('CANDIDATE TOKENS (searched, hue held, lightest that clears 3.1')
print('on white + porcelain + beige for borders/icons on light surfaces)')
print('=' * 78)
WATERMID = deepen_to(WLIGHT, BEIGE, 3.3)  # soft mid-water for borders + open-state icons
APRIDEEP = deepen_to(APRICOT, BEIGE, 3.1)
for label, cand in [('waterMid (Water Light deepened, hue held)', WATERMID),
                    ('apricotDeep (Apricot deepened, hue held)', APRIDEEP)]:
    print(f'{label}: {hexof(cand)}  on white {ratio(cand, WHITE):.2f} · '
          f'on porcelain {ratio(cand, PORCELAIN):.2f} · on beige {ratio(cand, BEIGE):.2f}')

print()
print('Goal colours on white cards (icon/dot/fill, floor 3.0):')
GOALS = {'stillWater': '5B6BD5', 'apricot': 'F0A868', 'personal': '8E7CC3',
         'home-green': '35704E', 'health': 'E85D75', 'work': '3F536E',
         'money': 'C9920E', 'other': '7A8699'}
for name, h in GOALS.items():
    c = hx(h)
    r = ratio(c, WHITE)
    if r >= 3.2:
        print(f'  keep  {name} #{h}  {r:.2f}')
    else:
        d = deepen_to(c, WHITE, 3.3)
        print(f'  DEEPEN {name} #{h} {r:.2f} -> {hexof(d)} {ratio(d, WHITE):.2f}')

print()
print('=' * 78)
print('BEFORE — the finished build (build 55 bytes), pairings from source')
print('=' * 78)
print('-- Her phone, as rendered (system chrome in dark appearance over')
print('   the app\'s light Porcelain world; pixels measured from her shots)')
row('FAULT 1 nav title: white on page', WHITE, HER_PAGE, 3.0, 'measured #FFFFFF on #F3F4F9')
row('FAULT 2 More row text: Pine on system card', PINE, DARKCARD, 4.5, 'measured ~#26372F on #1C1C1E')
row('FAULT 2 More row icons: Pine on system card', PINE, DARKCARD, 3.0)
row('FAULT 2 Sign out: Still Water on system card', STILL, DARKCARD, 4.5)
row('FAULT 3 tab unselected: white on glass pill', WHITE, HER_GLASS, 4.5, 'measured pill #B6B7BB')
row('FAULT 3 tab selected: Still Water tint on capsule', STILL, HER_CAPSULE, 4.5, 'measured capsule #8C8D92')
row('FAULT 4 Goals Join: tint Still Water on toolbar pill', STILL, HER_JOIN, 4.5, 'measured pill #B4B8B7')
print('-- White theme, as designed in source (light surfaces)')
row('Today greeting: Pine on Porcelain', PINE, PORCELAIN, 3.0, '30pt heading')
row('TaskRow time: Still Water on Porcelain', STILL, PORCELAIN, 4.5)
row('TaskRow title: Pine on Porcelain', PINE, PORCELAIN, 4.5)
row('TaskRow done title: Pine@0.45 on Porcelain', over(PINE, 0.45, PORCELAIN), PORCELAIN, 4.5)
row('TaskRow duration: Pine@0.55 on Porcelain', over(PINE, 0.55, PORCELAIN), PORCELAIN, 4.5)
row('Today parked line: Pine@0.55 on Porcelain', over(PINE, 0.55, PORCELAIN), PORCELAIN, 4.5)
row('Today empty line: Pine@0.6 on Porcelain', over(PINE, 0.6, PORCELAIN), PORCELAIN, 4.5)
row('Today recheck: Still Water on Porcelain', STILL, PORCELAIN, 4.5)
row('Today GOALS header: Still Water on Porcelain', STILL, PORCELAIN, 4.5)
row('Tick open: Water Light on Porcelain', WLIGHT, PORCELAIN, 3.0, 'control icon')
row('Tick done: Still Water on Porcelain', STILL, PORCELAIN, 3.0, 'control icon')
row('FAULT 5 goal next-step: Pine@0.75 on white card', over(PINE, 0.75, WHITE), WHITE, 4.5, 'the "Start:"-class line')
row('Goal card all-done: Pine@0.7 on white card', over(PINE, 0.7, WHITE), WHITE, 4.5)
row('Goal icon/dot/fill apricot: on white card', APRICOT, WHITE, 3.0)
row('Progress ring fill: Still Water on white card', STILL, WHITE, 3.0, 'meaningful graphic')
row('Progress ring track: Water Light@0.4 on white', over(WLIGHT, 0.4, WHITE), WHITE, 3.0, 'decorative track — noted')
row('Week dot filled: Apricot on white card', APRICOT, WHITE, 3.0, 'state graphic')
row('Week dot empty: Water Light@0.45 on white', over(WLIGHT, 0.45, WHITE), WHITE, 3.0, 'state graphic')
row('Habits streak line: Pine@0.55 on white card', over(PINE, 0.55, WHITE), WHITE, 4.5)
row('Habits tick open: Water Light on white card', WLIGHT, WHITE, 3.0, 'control icon')
row('Habits Add: Still Water on Porcelain', STILL, PORCELAIN, 4.5)
row('Talk placeholder: Pine@0.4 on white box', over(PINE, 0.4, WHITE), WHITE, 4.5)
row('Talk mic listening: Apricot on white', APRICOT, WHITE, 3.0, 'state icon')
row('Talk Added: Still Water on Porcelain', STILL, PORCELAIN, 4.5)
row('Todos Add: Still Water on Porcelain', STILL, PORCELAIN, 4.5)
row('Todos tick open: Water Light on Porcelain', WLIGHT, PORCELAIN, 3.0, 'control icon')
row('Todos done text: Pine@0.45 on Porcelain', over(PINE, 0.45, PORCELAIN), PORCELAIN, 4.5)
row('Plus price: Pine@0.7 on white card', over(PINE, 0.7, WHITE), WHITE, 4.5)
row('Plus Restore: Still Water on Porcelain', STILL, PORCELAIN, 4.5)
row('Plus unavailable: Pine@0.6 on Porcelain', over(PINE, 0.6, PORCELAIN), PORCELAIN, 4.5)
row('Kindness amount border: Apricot@0.7 on white card', over(APRICOT, 0.7, WHITE), WHITE, 3.0, 'control boundary')
row('CheckIn chosen: white on Still Water fill', WHITE, STILL, 4.5)
row('Field borders: Water Light@0.7 on white', over(WLIGHT, 0.7, WHITE), WHITE, 3.0, 'input boundary')
row('Door Email instead: Still Water on Porcelain', STILL, PORCELAIN, 4.5)
row('Share link text: Still Water on Porcelain', STILL, PORCELAIN, 4.5)
row('Share assignee line: Pine@0.55 on Porcelain', over(PINE, 0.55, PORCELAIN), PORCELAIN, 4.5)
row('Share other-step icon: Water Light@0.6 on Porcelain', over(WLIGHT, 0.6, PORCELAIN), PORCELAIN, 3.0, 'status icon')
row('GoalDetail week header: Still Water on Porcelain', STILL, PORCELAIN, 4.5)
row('GoalDetail min version: Pine@0.55 on Porcelain', over(PINE, 0.55, PORCELAIN), PORCELAIN, 4.5)
row('Calendar week today: Still Water on Porcelain', STILL, PORCELAIN, 4.5)
row('Calendar +n line: Pine@0.55 on Porcelain', over(PINE, 0.55, PORCELAIN), PORCELAIN, 4.5)
row('Calendar month selected: white on Still Water', WHITE, STILL, 4.5)
row('Calendar month dot fallback: Water Light on white', WLIGHT, WHITE, 3.0, 'event dot')
row('Settings Save: Still Water on white form card', STILL, WHITE, 4.5)
print('-- Beige theme (background pairings)')
row('Beige: Still Water text on Beige', STILL, BEIGE, 4.5)
row('Beige: Pine@0.55 on Beige', over(PINE, 0.55, BEIGE), BEIGE, 4.5)
row('Beige: Water Light icon on Beige', WLIGHT, BEIGE, 3.0)
print('-- Dark theme (background pairings, system surfaces dark)')
row('Dark: greeting Pine on #14181F', PINE, DARKBG, 3.0, '30pt heading')
row('Dark: TaskRow title Pine on #14181F', PINE, DARKBG, 4.5)
row('Dark: TaskRow time Still Water on #14181F', STILL, DARKBG, 4.5)
row('Dark: More rows Pine on #1C1C1E', PINE, DARKCARD, 4.5)
row('Dark: Settings Save Still Water on #1C1C1E', STILL, DARKCARD, 4.5)
row('Dark: Goals Done header Still Water on #14181F', STILL, DARKBG, 4.5)
print('-- Brand theme (background = Still Water)')
row('Brand: greeting Pine on Still Water', PINE, STILL, 3.0, '30pt heading')
row('Brand: TaskRow title Pine on Still Water', PINE, STILL, 4.5)
row('Brand: inkOnBackground token (unused) Porcelain on Still Water', PORCELAIN, STILL, 4.5)
row('Brand: accent Apricot on Still Water', APRICOT, STILL, 3.0)

print()
print('=' * 78)
print('AFTER — the fixed pairings (theme tokens; cards stay white paper)')
print('=' * 78)
MISTSOFT = hx('B9C4BB')  # secondary ink for the dark world
print('-- System chrome, scheme pinned to the theme (nav titles, list/form')
print('   surfaces, tab labels, pickers move WITH the theme world)')
row('White theme nav title: label black on Porcelain', BLACK, PORCELAIN, 3.0)
row('Dark theme nav title: label white on #14181F', WHITE, DARKBG, 3.0)
row('Brand theme nav title: label black on Still Water', BLACK, STILL, 3.0)
row('More rows every theme: Pine on white row (listRowBackground)', PINE, WHITE, 4.5)
row('More Sign out: Water Deep on white row', WDEEP, WHITE, 4.5)
row('Settings Save/Sign out, light worlds: Water Deep on white form card', WDEEP, WHITE, 4.5)
row('Settings Save/Sign out, dark world: Water Light on #1C1C1E', WLIGHT, DARKCARD, 4.5)
print('-- On-background tokens, per theme')
for tname, bg, ink, sec, acc, icon in [
        ('white', PORCELAIN, PINE, SOFT, WDEEP, WATERMID),
        ('beige', BEIGE, PINE, SOFT, WDEEP, WATERMID),
        ('dark', DARKBG, PORCELAIN, MISTSOFT, WLIGHT, WLIGHT),
        ('brand', STILL, WHITE, WHITE, WHITE, WHITE)]:
    row(f'{tname}: primary ink on background', ink, bg, 4.5)
    row(f'{tname}: secondary ink on background', sec, bg, 4.5)
    row(f'{tname}: accent ink on background', acc, bg, 4.5)
    row(f'{tname}: meaningful icon on background', icon, bg, 3.0)
print('-- On-card tokens (white paper cards, every theme)')
row('card primary ink: Pine on white', PINE, WHITE, 4.5)
row('card secondary ink: Soft #5C6B62 on white', SOFT, WHITE, 4.5)
row('card accent ink: Water Deep on white', WDEEP, WHITE, 4.5)
row('card muted icon / boundary: waterMid on white', WATERMID, WHITE, 3.0)
row('field boundary on Porcelain: waterMid', WATERMID, PORCELAIN, 3.0)
row('field boundary on Beige: waterMid', WATERMID, BEIGE, 3.0)
row('Kindness amount boundary: apricotDeep on white', APRIDEEP, WHITE, 3.0)
row('Kindness amount boundary vs page: apricotDeep on Porcelain', APRIDEEP, PORCELAIN, 3.0)
row('Week/habit dot filled: apricotDeep on white', APRIDEEP, WHITE, 3.0)
row('Goal palette deepened: apricot case on white', APRIDEEP, WHITE, 3.0)
row('CheckIn chosen stays: white on Still Water', WHITE, STILL, 4.5)
row('Month selected stays: white on Still Water', WHITE, STILL, 4.5)
row('PacePill prominent stays: white on Pine', WHITE, PINE, 4.5)
print()
print(f'waterMid = {hexof(WATERMID)} · apricotDeep = {hexof(APRIDEEP)}')
