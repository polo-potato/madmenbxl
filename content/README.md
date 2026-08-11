# WHAT IF content system

`manifest.json` defines the hierarchy. `actions.md` is global. The active era is Prologue, composed of `prologue.md`, `brief.md`, and `events.md`. Agency is reserved for later.

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
