# ACTIONS

## LEGEND

- `[ACTION] cigarette` = permanent button name.
- `[EFFECT] stress -13` = gauge change after one click.
- `[COOLDOWN] 18` = seconds before this action can be used again. Its room animation stays visible for the same duration.
- `[MOVE] cigarette-1` = temporarily moves the player to that placed Map instance.
- `[PROP] coffee` = temporarily adds a supported object to the room.
- `[ANIMATION] smoke` = optional minimal room animation.
- `[CHANCE] 0.1` = optional lucky outcome probability (0.1 means roughly 1 in 10).
- `[LUCKY EFFECT] creativity +19` = replaces the normal effects when the lucky outcome happens.
- `## NOTE` = normal feedback pool. Each line beginning with `-` is one possible message.
- `## LUCKY NOTE` = lucky feedback pool. Each line beginning with `-` is one possible message.
- `---` = next action.

---
[ACTION] cigarette
[COOLDOWN] 18
[MOVE] cigarette-1
[PROP] cigarette
[ANIMATION] smoke
[EFFECT] creativity +2
[EFFECT] energy -3
[EFFECT] stress -13
## NOTE
- first drag.
- the shoulders drop.

---
[ACTION] scroll
[COOLDOWN] 12
[EFFECT] creativity -5
[EFFECT] energy -5
[EFFECT] stress +5
[CHANCE] 0.1
[LUCKY EFFECT] creativity +19
[LUCKY EFFECT] energy +10
[LUCKY EFFECT] stress -5
## NOTE
- a boring TikTok.
- someone showing off an award.
- a fucking sunset.
- an ad that was annoyingly good.
- another LinkedIn ai slop post.
- why are you looking at pool renovations? you don't own a pool.
- cute dog.
- again a thirst trap.
## LUCKY NOTE
- woooow smart content
- that was actually good.
- now that's a proper social media campaign
---
[ACTION] coffee
[COOLDOWN] 20
[PROP] coffee
[EFFECT] creativity +1
[EFFECT] energy +18
[EFFECT] stress +4
## NOTE
- still too hot.
- then suddenly cold.
- hmmm the smell is amazing
- flat white. oat.

---
[ACTION] eat
[COOLDOWN] 24
[PROP] pizza
[EFFECT] creativity +1
[EFFECT] energy +10
[EFFECT] stress -10
## NOTE
- damn. good sandwich.
- nothing beats a cold pizza.

---
[ACTION] look out the window
[COOLDOWN] 14
[EFFECT] creativity +7
[EFFECT] energy -1
[EFFECT] stress -3
## NOTE
- someone misses the tram.
- a useful sentence appears.

---
[ACTION] take a walk
[COOLDOWN] 30
[EFFECT] creativity +16
[EFFECT] energy +4
[EFFECT] stress -7
## NOTE
- around the block.
- without the laptop, it gets clearer.
