# Feedback for the sprite pack (from the game side)

Notes from bringing the pack (manifest built 2026-10-21 17:04) into the game with `tools/sync_sprites.py`.
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

1. **Shop icons still missing** (`shopArt: null`): 8 hair dyes, all 65 pets, all 23 treasures. Until they exist the game
   shows the pet's first idle frame, the treasure image and the hair layer, scaled up.
2. **A "hurt" or "miss" clip** (a flinch, 3–4 frames) and a short **"cheer"** (victory pose) for each class would replace
   the code shake and let `attack2` stay for big moments only.
3. **A bust / portrait** (head and shoulders, front or ¾ view, about 32 × 32) per rank would read better in the small
   card tile than a crop of the side-view sprite.
4. **Pets based on other companies' characters** are left out of the public site: 皮卡丘, 耀西, 迪迪金剛, 小精靈, 卡比,
   菇菇寶貝, 綠水靈, 嫩寶, 緞帶肥肥. Original designs in their place would be welcome.
5. **Treasures**: an anchor point (where it floats relative to the pivot) in the manifest would let the art decide the
   placement; the game uses 13 px right of the pivot, 32 px above the feet.
6. The hero is about 36 px tall in a 134 px frame; that is fine for pixel art scaled ×2–×4, no change needed unless
   more detail is wanted on the big stage.
