# PROLOGUE / GAUGES

## LEGEND

- `[IDEA BASE] 2` = base IDEA gain for an attempt.
- `[IDEA MINIMUM GAIN] 9` = minimum IDEA gained by a valid attempt.
- `---` = next gauge.
- `[GAUGE] creativity` = gauge identifier.
- `[LABEL] CREATIVITY` = interface label.
- `[COLOR] yellow` = interface theme token.
- `[START] 48` = initial value.
- `[DRIFT] -0.025` = automatic change per second.
- `[TRY MINIMUM] 12` = minimum value required for an attempt.
- `[TRY COST] -12` = value consumed or added by an attempt.
- `[IDEA SOURCE] +0.14` = direct IDEA contribution.
- `[IDEA BOOST] +0.006` = multiplier applied to the IDEA source.
- `## PURPOSE` = human-readable explanation.

## IDEA FORMULA

[IDEA BASE] 2
[IDEA MINIMUM GAIN] 9

Creativity is the source of every IDEA point. Energy and stress only make that creativity work faster.

Each attempt gains: base + (creativity source × energy/stress boosts).
All three gauges must first be discovered. If a required value is too low, the attempt becomes a hint and consumes nothing.

---
[GAUGE] creativity
[LABEL] CREATIVITY
[COLOR] yellow
[START] 48
[DRIFT] -0.025
[TRY MINIMUM] 12
[TRY COST] -12
[IDEA SOURCE] +0.14
## PURPOSE
Creative fuel and the only direct source of IDEA. Actions such as walking or looking outside restore it.

---
[GAUGE] energy
[LABEL] ENERGY
[COLOR] green
[START] 62
[DRIFT] -0.085
[TRY MINIMUM] 6
[TRY COST] -7
[IDEA BOOST] +0.006
## PURPOSE
Capacity to keep working. Energy makes creativity turn into IDEA faster. Every direction consumes it; coffee restores it.

---
[GAUGE] stress
[LABEL] STRESS
[COLOR] purple
[START] 36
[DRIFT] +0.045
[TRY MINIMUM] 6
[TRY COST] +5
[IDEA BOOST] +0.004
## PURPOSE
Pressure and urgency. A little stress makes creativity turn into IDEA faster, but every attempt adds more. Cigarettes and walks lower it.
