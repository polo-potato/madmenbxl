# Editing WHAT IF

The files in this folder are loaded directly by the game. Save a file and reload the browser to see the change.

## Legend

| What you write | What the player sees | How it advances |
| --- | --- | --- |
| `kind: thought` | Normal text with `WHAT IF...` above it | The player types |
| `kind: narration` | Italic text | Automatically |
| `gate: check phone` | A button before the scene | The player clicks |
| `action: light a cigarette` | A button after the scene | The player clicks |

The recurring `WHAT IF...` is configured once at the top of `prologue.md` with `thought-prefix: WHAT IF...`. Never repeat it in each thought.

## Prologue

Edit `prologue.md`. Every screen is separated by `---`.

```md
---
id: a-unique-name
kind: thought
action: optional button after the text
gate: optional button before the text
## TEXT
your text here.
```

- `kind: thought` is written by keyboard input.
- `kind: narration` is italic and advances automatically.
- Omit `action` and `gate` when the screen has no interaction.

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
