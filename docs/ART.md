# LINE WAR art bible — "Lantern Night Market"

Tokens: `apps/client/src/art/tokens.ts` + `tokens.css` (keep in sync). Never hard-code another colour or font.

## Idea
Two rival street-food stalls at a night market, seen as a small **3/4 diorama**: chunky, toy-like, hand-painted
vector shapes with real depth (top face + darker front face), soft drop shadows down-right, and **warm lantern light
pooling on cool indigo stone**. Cozy, readable, a little mischievous. Original: no imitation of any existing game.

## Palette
night `#1B1F3A` · slate `#2E3456` · lantern `#FFC857` · bamboo `#C98E5A` · paper `#FFF3D6`.
Crews: **Jade** `#2EC4A6` (crew A) and **Ember** `#FF6B3D` (crew B), distinguishable with colour-vision deficiency;
team identity is also carried by shape/pattern (Jade = rounded scalloped awning, Ember = zig-zag awning).

## Type
Display: **Dela Gothic One** (logo, scores, clock, big moments). UI: **M PLUS Rounded 1c** (everything else).
Sentence case. No all-caps label chrome, no "A · B · C" meta strings, no monospace labels.

## The signature
**The ticket line.** Orders are paper slips clipped to a string of lanterns across the top of the screen. The round
clock is the big lantern in the middle. Slips sway in when they arrive, brown and curl as they age, glow gold for
the Critic, and flutter away when served (tinted with the serving crew's colour). Spend boldness here; keep the rest
quiet and disciplined.

## World (canvas)
- Floors: kitchens = warm wooden planks lightly tinted by crew; market = cool cobblestones with lantern glow pools
  and a few puddle highlights; doorways = stall thresholds with a striped mat.
- Stalls: walls are dark stall frames; each kitchen has a crew-coloured awning along its top edge.
- Stations read at a glance by silhouette: pantries = baskets/crates of produce, boards = wooden chopping blocks,
  pan = black wok with flame when cooking, pot = steaming pot, sink = steel basin with suds, plate rack = stacked
  white plates, pass = crew-coloured serving window with a bell, trash = bin, market crates = rope-tied crates.
- Progress = lantern-gold rings; burn warning = pulsing danger red; fire = animated layered flames + smoke.
- Characters: round chefs seen from above, crew-coloured bandana/hat, little hands holding the item in front,
  soft shadow, bobbing walk, squash & stretch on dash, dizzy stars when dazed, facing readable.
- Items: illustrated food (lettuce leaf, tomato with stem, sesame bun, patty raw pink → cooked brown, marbled steak,
  fish), chopped = sliced variants, burnt = charcoal, plates = white ceramic with rim; cold = blue frost tint.
- Light: warm lantern string lights over the market, gentle vignette. Motion only for game feedback.

## HUD & menus (DOM)
- Top band: crew signs (hanging wooden plaques: crew name, score in display type, Heat as 0–3 flames, rounds won as
  lanterns) left/right; the ticket line between them; the lantern clock centre.
- Phase moments (prep, Dinner Rush, last call, round/match over) as brief, centred paper banners — never covering the
  doorways/market for long.
- Menus share the night-market backdrop (indigo sky, blurred lantern bokeh), wooden/paper buttons, visible focus,
  reduced-motion respected.
