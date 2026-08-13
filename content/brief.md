# FIRST BRIEF

## LEGEND

- `## VISIBLE ACTIONS` = starts the module action menu.
- `- cigarette` = one visible action. Its name must match an `[ACTION]` in this era's Actions file.
- `[BRIEF]` = starts the brief configuration.
- `[LABEL] BRIEF` = small interface label.
- `[PREFIX] WHAT IF...` = recurring line above the thought.
- `[PROMPT] waiting felt useful?` = text the player types.
- `[ACTION] try a direction` = button used to attempt an idea.
- `[METER] IDEA` = idea gauge name.
- `[COMPLETE] there it is.` = text shown when the gauge is full.
- `[SEND] send it` = final button.
- `[TARGET] 100` = objective value required to complete the brief.
- `[MISSING creativity] Creativity is missing.` = discovery hint when a required gauge is hidden or too low.
- `[LOG START] Find a direction for the brief.` = event-log copy. `LOG PROMPT`, `LOG TRY`, and `LOG READY` work the same way.
- `[MAIL] Hey, / / is it still ok for later?` = inbox copy; `/` creates a new line. `[REPLY] yes` defines its button.
- `[AFTER TEXT] one thought survived.` = transition copy. `[AFTER LABEL]` and `[AFTER PREFIX]` configure the same screen.
- `[NEXT] enter the office` = transition button.

## VISIBLE ACTIONS

- cigarette
- scroll
- coffee
- look out the window
- eat

[BRIEF]
[LABEL] BRIEF
[PREFIX] WHAT IF...
[PROMPT] waiting felt useful?
[ACTION] try a direction
[METER] IDEA
[COMPLETE] there it is. / simple enough to sound obvious.
[SEND] send it
[TARGET] 100
[MISSING creativity] Creativity is missing. / Maybe look somewhere else.
[MISSING energy] Your energy is low. / Coffee is still there.
[MISSING stress] You have no motivation. / A little pressure might help.
[LOG START] Find a direction for the brief.
[LOG PROMPT] Fill the IDEA gauge.
[LOG TRY] Tried a direction.
[LOG READY] The direction is ready to send.
[MAIL] Hey, / / is it still ok for later?
[REPLY] yes
[AFTER LABEL] BRIEF SENT
[AFTER PREFIX] WHAT IF...
[AFTER TEXT] one thought survived.
[NEXT] enter the office
