# WHAT IF content system

`manifest.json` defines the hierarchy. `actions.md` is global. The active era is Prologue, composed of story, gauges, brief, events, reusable elements, and map placement. Agency is reserved for later.

`prologue-elements.md` defines reusable objects as canvases composed from one or more `[PART]` shapes. `prologue-map.md` only places finished elements as uniquely named `[INSTANCE]` copies.

Map anchoring is a shared engine rule:

- `[MOVE] window-1` moves the player to that instance's element anchor, including its Map rotation.
- `[PROP] cigarette` and `[ANIMATION] smoke` activate matching elements.
- Elements tagged `[ATTACH] player` keep the same relative spacing they have in Map, using the current `[MOVE]` instance as their anchor.
- Props and animations remain active for their own action cooldown and follow later player movements.
- Moving the instances in the visual Map editor therefore changes both their preview composition and their in-game composition without code changes.
- The content validator rejects missing movement targets, props, animations, and unplaced player-attached elements.

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
