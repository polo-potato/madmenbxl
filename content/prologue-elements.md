# PROLOGUE ELEMENTS

## LEGEND

- `[ELEMENT] desk` = reusable element name.
- `[SHAPE] rect` = visual primitive.
- `[WIDTH]` and `[HEIGHT]` = default size.
- `[TEXT]` = optional character.
- `[SHOW] coffee` = only visible while that action prop is active.
- `[ATTACH] player` = follows the player.
- `---` = next element.

---
[ELEMENT] window
[SHAPE] window
[WIDTH] 118
[HEIGHT] 9

---
[ELEMENT] desk
[SHAPE] rect
[WIDTH] 118
[HEIGHT] 62

---
[ELEMENT] laptop
[SHAPE] laptop
[WIDTH] 43
[HEIGHT] 28

---
[ELEMENT] chair
[SHAPE] ellipse
[WIDTH] 44
[HEIGHT] 25

---
[ELEMENT] bed
[SHAPE] rect
[WIDTH] 118
[HEIGHT] 62

---
[ELEMENT] pillow
[SHAPE] rect-muted
[WIDTH] 31
[HEIGHT] 44

---
[ELEMENT] coffee
[SHAPE] text
[TEXT] ○
[SHOW] coffee

---
[ELEMENT] pizza
[SHAPE] triangle
[SHOW] pizza

---
[ELEMENT] cigarette
[SHAPE] line
[WIDTH] 12
[ATTACH] player
[SHOW] cigarette

---
[ELEMENT] smoke
[SHAPE] smoke
[TEXT] ∿
[ATTACH] player
[SHOW] smoke
