# PROLOGUE ELEMENTS

## LEGEND

- `[ELEMENT] bed` = one reusable designed object.
- `[WIDTH]` and `[HEIGHT]` = element canvas size.
- `[PART] pillow` = one visible, independently editable layer inside the element.
- `[SHAPE]` is the fixed geometry of a part: `line`, `rect`, `circle`, `text`, `triangle`, `dot`, or `smoke`.
- `[STYLE] pure` is its compatible visual effect. `pure` is the default and never changes the geometry.
- A part also uses `[X]`, `[Y]`, `[WIDTH]`, `[HEIGHT]`, and optional `[TEXT]`.
- Every visible piece must have its own `[PART]`. Do not hide several pieces inside one shape.
- In the visual editor, create new layers with the line, rectangle, or circle icons.
- `[SHOW] coffee` = element only appears while that action prop is active.
- `[ATTACH] player` = the whole element follows the player while keeping its Map-relative offset from the active `[MOVE]` anchor.
- `---` = next reusable element.

---
[ELEMENT] window
[WIDTH] 118
[HEIGHT] 9
[PART] line
[SHAPE] line
[STYLE] pure
[X] -31
[Y] 8
[WIDTH] 183
[HEIGHT] 4

---
[ELEMENT] desk
[WIDTH] 118
[HEIGHT] 62
[PART] surface
[SHAPE] rect
[STYLE] pure
[X] 0
[Y] 0
[WIDTH] 118
[HEIGHT] 62

---
[ELEMENT] laptop
[WIDTH] 53
[HEIGHT] 33
[PART] screen
[SHAPE] rect
[STYLE] pure
[X] 5
[Y] 0
[WIDTH] 43
[HEIGHT] 28
[PART] circle
[SHAPE] circle
[STYLE] pure
[X] 22
[Y] 10
[WIDTH] 8
[HEIGHT] 8

---
[ELEMENT] chair
[WIDTH] 36
[HEIGHT] 36
[PART] seat
[SHAPE] circle
[STYLE] pure
[X] 0
[Y] 0
[WIDTH] 36
[HEIGHT] 36

---
[ELEMENT] bed
[WIDTH] 118
[HEIGHT] 62
[PART] frame
[SHAPE] rect
[STYLE] pure
[X] 0
[Y] 0
[WIDTH] 118
[HEIGHT] 62
[PART] pillow
[SHAPE] rect
[STYLE] pure
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
[STYLE] pure
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
[STYLE] pure
[X] 8
[Y] 0
[WIDTH] 9
[HEIGHT] 4

---
[ELEMENT] cigarette
[WIDTH] 14
[HEIGHT] 5
[SHOW] cigarette
[ATTACH] player
[PART] cigarette
[SHAPE] line
[STYLE] slanted
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
[STYLE] animated
[TEXT] ∿
[X] 0
[Y] 0
