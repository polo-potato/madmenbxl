// Human-editable narrative lives in /content/*.md. This file only parses it.
const loadText = name => fetch(new URL(`../content/${name}`, import.meta.url)).then(r => {
  if (!r.ok) throw new Error(`Could not load content/${name}`);
  return r.text();
});

const meta = source => Object.fromEntries(source.split("\n").map(line => {
  const colon = line.indexOf(":");
  return colon < 0 ? null : [line.slice(0, colon).trim(), line.slice(colon + 1).trim()];
}).filter(Boolean));

const blocks = source => source.split(/^---$/m).map(s => s.trim()).filter(s => /^## (TEXT|NOTE)$/m.test(s));
const effects = source => Object.fromEntries((source || "").split(",").map(item => {
  const [key, value] = item.trim().split(/\s+/);
  return key && value ? [key, Number(value)] : null;
}).filter(Boolean));

function parsePrologue(source) {
  const settingsSource = source.split(/^---$/m)[0];
  const settings = meta(settingsSource);
  const thoughtPrefix = settings["thought-prefix"] || "WHAT IF...";
  return blocks(source).map(block => {
    const [head, body = ""] = block.split("## TEXT");
    const data = meta(head);
    const kind = /^\[NARRATION\]$/m.test(head) ? "narration" : /^\[THOUGHT\]$/m.test(head) ? "thought" : data.kind;
    const actions = [];
    const before = head.match(/^\[ACTION\]\s+(.+)$/m)?.[1]?.trim();
    if (before) actions.push({ offset: 0, label: before, unlock: head.match(/^\[UNLOCK\]\s+(.+)$/m)?.[1]?.trim() || "" });
    const raw = body.trim();
    const tag = /^\[ACTION\]\s+(.+?)(?:\n\[UNLOCK\]\s+(.+))?$/gm;
    let cleanText = "", last = 0, match;
    while ((match = tag.exec(raw))) {
      cleanText = (cleanText + raw.slice(last, match.index)).trimEnd();
      actions.push({ offset: cleanText.length, label: match[1].trim(), unlock: match[2]?.trim() || "" });
      last = match.index + match[0].length;
    }
    cleanText = (cleanText + raw.slice(last)).trim();
    const prefixedText = kind === "thought" && !cleanText.startsWith(`${thoughtPrefix}\n\n`)
      ? `${thoughtPrefix}\n\n${cleanText}`
      : cleanText;
    const prefixOffset = kind === "thought" ? thoughtPrefix.length + 2 : 0;
    return { kind, text: prefixedText, actions: actions.map(action => ({ ...action, offset: action.offset + prefixOffset })) };
  });
}

function parseActions(source) {
  return Object.fromEntries(blocks(source).map(block => {
    const [head, note] = block.split("## NOTE");
    const data = meta(head);
    const id = head.match(/^\[ACTION\]\s+(.+)$/m)?.[1]?.trim() || data.id;
    const tagged = Object.fromEntries([...head.matchAll(/^\[EFFECT\]\s+(creativity|energy|stress)\s+([+-]?\d+)$/gm)].map(match => [match[1], Number(match[2])]));
    return [id, { creativity: tagged.creativity ?? Number(data.creativity || 0), energy: tagged.energy ?? Number(data.energy || 0), stress: tagged.stress ?? Number(data.stress || 0), note: note.trim() }];
  }));
}

function parseEvents(source) {
  return source.split(/^---$/m).map(s => s.trim()).filter(s => s.includes("## TEXT")).map(block => {
    const [head, body] = block.split("## TEXT");
    const data = meta(head);
    const [eventText, ...choiceParts] = body.split("## CHOICE");
    const choices = choiceParts.map(part => {
      const [choiceHead, result] = part.split("## RESULT");
      const choice = meta(choiceHead);
      const label = choiceHead.match(/^\s*(?:\[CHOICE\]\s+(.+)|label:\s*(.+))$/m);
      const taggedEffects = Object.fromEntries([...choiceHead.matchAll(/^\[EFFECT\]\s+(creativity|energy|stress)\s+([+-]?\d+)$/gm)].map(match => [match[1], Number(match[2])]));
      const unlock = choiceHead.match(/^\[UNLOCK\]\s+(.+)$/m)?.[1]?.trim();
      return { label: label?.[1]?.trim() || label?.[2]?.trim() || choice.label, effects: Object.keys(taggedEffects).length ? taggedEffects : effects(choice.effects), result: result.trim(), ...(unlock ? { unlock } : {}) };
    });
    return { text: eventText.trim(), choices };
  });
}

function parseBrief(source) {
  const legacy = meta(source);
  const tag = name => source.match(new RegExp(`^\\[${name}\\]\\s+(.+)$`, "m"))?.[1]?.trim();
  return { label: tag("LABEL") || legacy.label, anchor: tag("PREFIX") || legacy.anchor, prompt: tag("PROMPT") || legacy.prompt, attempt: tag("ACTION") || legacy.attempt, idea: tag("METER") || legacy.idea, completion: tag("COMPLETE") || legacy.completion, send: tag("SEND") || legacy.send };
}

const [prologueSource, briefSource, actionsSource, eventsSource] = await Promise.all([
  loadText("prologue.md"), loadText("brief.md"), loadText("actions.md"), loadText("events.md")
]);

export const introBeats = parsePrologue(prologueSource);
export const briefCopy = parseBrief(briefSource);
export const personalActions = parseActions(actionsSource);
export const briefEvents = parseEvents(eventsSource);

export const peopleSeed = [
  { id: "maya", name: "MAYA", role: "Creative", state: "ON FIRE", className: "fire", status: "ON PROJECT", salary: 3900 },
  { id: "louis", name: "LOUIS", role: "Creative", state: "CREATIVE BLOCK", className: "block", status: "ON PROJECT", salary: 3500 },
  { id: "thomas", name: "THOMAS", role: "Strategist", state: "SICK", className: "sick", status: "UNAVAILABLE", salary: 4200 },
  { id: "julie", name: "JULIE", role: "Account", state: "AVAILABLE", className: "", status: "CLIENT MAINTENANCE", salary: 4100 },
  { id: "ines", name: "INÈS", role: "Designer", state: "AVAILABLE", className: "", status: "ON PROJECT", salary: 3700 },
  { id: "nils", name: "NILS", role: "Producer", state: "AVAILABLE", className: "", status: "PRODUCTION SUPPORT", salary: 4000 },
];

export const eventPool = [
  "someone brought croissants.\n\nmorale ↑",
  "Adobe crashed.\n\nagain.",
  "the creative director has been standing\nbehind someone for four minutes.",
  "the coffee machine made a noise\nno coffee machine should make.",
  "something clicked.\n\nthen the client called.",
];
