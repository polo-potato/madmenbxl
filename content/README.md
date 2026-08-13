# WHAT IF content system

`manifest.json` defines the hierarchy. `actions.md` is global. The active era is Prologue, composed of story, gauges, brief, events, reusable elements, and map placement. Agency is reserved for later.

`prologue-elements.md` defines reusable objects as canvases composed from one or more `[PART]` shapes. `prologue-map.md` only places finished elements as uniquely named `[INSTANCE]` copies. Action `[PROP]` tags reference element names, while `[MOVE]` tags reference player positions defined by the map.

## Prologue story

- `[THOUGHT]`: player types; `WHAT IF...` is automatic.
- `[NARRATION]`: automatic italic text.
- `[ACTION] label`: pause exactly here until clicked.
- `[UNLOCK] action-id`: permanently unlock the matching global action.
- `---`: next scene.

```md
---
[NARRATION]
## TEXT
first words.

[ACTION] check phone
[UNLOCK] scroll

the story continues.
```

## Global actions

Every `[UNLOCK] cigarette` must match an `[ACTION] cigarette` in `actions.md`.

```md
---
[ACTION] cigarette
[EFFECT] stress -13
[EFFECT] creativity +2
[EFFECT] energy -3
## NOTE
first drag.
```

## Prologue events

```md
---
[EVENT] fly
## TEXT
a fly enters the room.

## CHOICE
[CHOICE] open the window
[EFFECT] stress -4
## RESULT
the fly stays.
```

Supported gauges: `creativity`, `energy`, `stress`.
