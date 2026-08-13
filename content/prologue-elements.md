# PROLOGUE ELEMENTS

## LEGEND

- `[ELEMENT] bed` = one reusable designed object.
- `[WIDTH]` and `[HEIGHT]` = element canvas size.
- `[PART] pillow` = one shape inside the element.
- A part uses `[SHAPE]`, `[X]`, `[Y]`, `[WIDTH]`, `[HEIGHT]`, and optional `[TEXT]`.
- `[SHOW] coffee` = element only appears while that action prop is active.
- `[ATTACH] player` = the whole element follows the player.
- `---` = next reusable element.

---
[ELEMENT] window
[WIDTH] 118
[HEIGHT] 9
[PART] frame
[SHAPE] window
[X] 0
[Y] 0
[WIDTH] 118
[HEIGHT] 9

---
[ELEMENT] desk
[WIDTH] 118
[HEIGHT] 62
[PART] surface
[SHAPE] rect
[X] 0
[Y] 0
[WIDTH] 118
[HEIGHT] 62

---
[ELEMENT] laptop
[WIDTH] 53
[HEIGHT] 33
[PART] screen
[SHAPE] laptop
[X] 5
[Y] 0
[WIDTH] 43
[HEIGHT] 28

---
[ELEMENT] chair
[WIDTH] 44
[HEIGHT] 25
[PART] seat
[SHAPE] ellipse
[X] 0
[Y] 0
[WIDTH] 44
[HEIGHT] 25

---
[ELEMENT] bed
[WIDTH] 118
[HEIGHT] 62
[PART] frame
[SHAPE] rect
[X] 0
[Y] 0
[WIDTH] 118
[HEIGHT] 62
[PART] pillow
[SHAPE] rect-muted
[X] 9
[Y] 9
[WIDTH] 31
[HEIGHT] 44

---
[ELEMENT] coffee
[WIDTH] 16
[HEIGHT] 16
[SHOW] coffee
[PART] cup
[SHAPE] text
[TEXT] ○
[X] 0
[Y] 0

---
[ELEMENT] pizza
[WIDTH] 18
[HEIGHT] 16
[SHOW] pizza
[PART] slice
[SHAPE] triangle
[X] 0
[Y] 0

---
[ELEMENT] cigarette
[WIDTH] 14
[HEIGHT] 5
[SHOW] cigarette
[ATTACH] player
[PART] cigarette
[SHAPE] line
[X] 0
[Y] 2
[WIDTH] 12

---
[ELEMENT] smoke
[WIDTH] 20
[HEIGHT] 22
[SHOW] smoke
[ATTACH] player
[PART] smoke
[SHAPE] smoke
[TEXT] ∿
[X] 0
[Y] 0
