# PROLOGUE MAP

## LEGEND

- `[ELEMENT] desk` = unique element name. Actions use this name with `[PROP]`.
- `[SHAPE] rect` = `rect`, `ellipse`, `line`, `window`, `dot`, `text`, or `triangle`.
- `[X]`, `[Y]`, `[WIDTH]`, `[HEIGHT]` = position and size in pixels.
- `[TEXT] ○` = optional character drawn inside an element.
- `[SHOW] coffee` = hidden until an active action uses `[PROP] coffee`.
- `[ATTACH] player` = follows the player when they move.
- `[POSITION] desk 101 154` = named player position used by `[MOVE] desk`.
- `---` = next map item.

[MAP WIDTH] 280
[MAP HEIGHT] 360
[POSITION] desk 101 154
[POSITION] window 177 10

---
[ELEMENT] window
[SHAPE] window
[X] 46
[Y] 0
[WIDTH] 118
[HEIGHT] 9

---
[ELEMENT] desk
[SHAPE] rect
[X] 46
[Y] 44
[WIDTH] 118
[HEIGHT] 62

---
[ELEMENT] laptop
[SHAPE] laptop
[X] 84
[Y] 57
[WIDTH] 43
[HEIGHT] 28

---
[ELEMENT] chair
[SHAPE] ellipse
[X] 83
[Y] 119
[WIDTH] 44
[HEIGHT] 25

---
[ELEMENT] bed
[SHAPE] rect
[X] 46
[Y] 256
[WIDTH] 118
[HEIGHT] 62

---
[ELEMENT] pillow
[SHAPE] rect-muted
[X] 55
[Y] 265
[WIDTH] 31
[HEIGHT] 44

---
[ELEMENT] coffee
[SHAPE] text
[TEXT] ○
[X] 137
[Y] 53
[SHOW] coffee

---
[ELEMENT] pizza
[SHAPE] triangle
[X] 57
[Y] 82
[SHOW] pizza

---
[ELEMENT] cigarette
[SHAPE] line
[X] 25
[Y] 3
[WIDTH] 12
[ATTACH] player
[SHOW] cigarette

---
[ELEMENT] smoke
[SHAPE] smoke
[TEXT] ∿
[X] 44
[Y] -18
[ATTACH] player
[SHOW] smoke
