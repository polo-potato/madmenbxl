# Editing WHAT IF

The files in this folder are loaded directly by the game. Save a file and reload the browser to see the change.

## Legend

| What you write | What the player sees | How it advances |
| --- | --- | --- |
| `[THOUGHT]` | Normal text with `WHAT IF...` above it | The player types |
| `[NARRATION]` | Italic text | Automatically |
| `[ACTION] check phone` anywhere | The story pauses at that exact position | The player clicks, then it continues |
| `[UNLOCK] cigarette` | A permanent button in the HABITS menu | Once unlocked, it stays |

The recurring `WHAT IF...` is configured once at the top of `prologue.md` with `thought-prefix: WHAT IF...`. Never repeat it in each thought.

## Prologue

Edit `prologue.md`. Every screen is separated by `---`.

```md
---
id: a-unique-name
[THOUGHT]
[ACTION] optional button label wherever the story should pause
[UNLOCK] optional permanent habit id
## TEXT
your text here.
```

- `[THOUGHT]` is written by keyboard input.
- `[NARRATION]` is italic and advances automatically.
- Omit action tags when the screen has no interaction.
- Add `[UNLOCK] habit-id` only when that button should remain permanently available.

## Brief copy

Edit the short `key: value` lines in `brief.md`.

## Habits

Edit `habits.md`. Gauge changes are ordinary signed numbers:

```md
---
id: coffee
creativity: 1
energy: 18
stress: 4
## NOTE
still too hot.
```

The `id` is also used as the button label.

## Events

Edit `events.md`. Events can contain any number of choices:

```md
---
id: fly
## TEXT
a fly enters the room.

## CHOICE
label: open the window
effects: stress -4, creativity +2
## RESULT
the fly stays.
```

Supported gauges are `creativity`, `energy`, and `stress`.
