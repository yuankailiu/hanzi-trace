# Feedback for the sprite pack (from the game side)

Notes from bringing the pack (manifest built 2026-10-21 17:22) into the game with `tools/sync_sprites.py`.
The pack worked as documented: sheets, offsets, mirrored left rows, fx levels and the pivot all line up.

## What the game does with it

| Game moment | Clip used |
|---|---|
| standing on the 擂台, 客棧, 我的俠客 | `idle_R` (looped) |
| a correct stroke, buying or wearing an item | `attack1_R` |
| a finished character, a level-up, a 奇遇 | `attack2_R` |
| a wrong stroke | `idle_R`, shaken sideways in code (no clip) |
| unarmed attacks | the `Fist` body without a weapon layer (`None` has no attacks) |

Only right-facing rows are drawn. Views cropped from the full frame (feet at 134, 122):
bust 48 × 36 at (110, 76) for the small card tile, card 76 × 57 at (90, 69), stage 112 × 84 at (78, 42).

## Requests, most useful first

(Done: shop icons for every item, hair dye, pet and treasure.)


1. **A "hurt" or "miss" clip** (a flinch, 3–4 frames) and a short **"cheer"** (victory pose) for each class would replace
   the code shake and let `attack2` stay for big moments only.
2. **A bust / portrait** (head and shoulders, front or ¾ view, about 32 × 32) per rank would read better in the small
   card tile than a crop of the side-view sprite.
3. **Treasures**: an anchor point (where it floats relative to the pivot) in the manifest would let the art decide the
   placement; the game uses 13 px right of the pivot, 32 px above the feet.
4. The hero is about 36 px tall in a 134 px frame; that is fine for pixel art scaled ×2–×4, no change needed unless
   more detail is wanted on the big stage.
