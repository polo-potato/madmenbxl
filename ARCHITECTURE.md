# Project architecture

The project has three layers and two levels of gameplay code.

## Content

`content/manifest.json` declares eras and their modules. Each module chooses a file and an editor type. The active era also names its gameplay controller.

Markdown files describe copy and data: actions, requirements, gauge discovery, cooldowns, objectives, events, maps and elements. Changing those values must not require a game-engine edit.

## Shared engine

The shared engine only owns mechanics that keep the same meaning across eras: loading content, parsing tags, saves, event logs and controller dispatch.

`js/markdown.js` is shared by the game and Writer's Room so Map and Element files cannot be interpreted differently by each side.

`js/era-runtime.js` routes the current mode to an era controller. It does not know how an era works.

## Era controllers

Each era owns its gameplay and may be completely different from another era.

- `js/eras/prologue-controller.js` handles the solitary narrative, first brief and room transition.
- `js/eras/agency-controller.js` handles the agency simulation.

Do not force era-specific concepts into a universal abstraction. Extract a shared service only when two eras need the same behaviour with the same meaning.

## Writer's Room

The Writer's Room builds its navigation from `content/manifest.json`. It does not know Prologue filenames. An era can reuse an existing editor type or introduce a new visual editor for a genuinely different module.

To add an era:

1. Add the era and its modules to the manifest.
2. Add its content files.
3. Add one era controller and register it in `js/game.js`.
4. Reuse existing editor types where their syntax matches; otherwise add a dedicated editor type.
