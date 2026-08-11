// Human-editable narrative lives in /content/*.md. This file only parses it.
const loadText = name => fetch(new URL(`../content/${name}`, import.meta.url)).then(r => {
  if (!r.ok) throw new Error(`Could not load content/${name}`);
  return r.text();
});

const meta = source => Object.fromEntries(source.split("\n").map(line => {
  const colon = line.indexOf(":");
  return colon < 0 ? null : [line.slice(0, colon).trim(), line.slice(colon + 1).trim()];
}).filter(Boolean));

const blocks = source => source.split(/^---$/m).map(s => s.trim()).filter(s => s.includes("## TEXT") || s.includes("## NOTE"));
const effects = source => Object.fromEntries((source || "").split(",").map(item => {
  const [key, value] = item.trim().split(/\s+/);
  return key && value ? [key, Number(value)] : null;
}).filter(Boolean));

function parsePrologue(source) {
  return blocks(source).map(block => {
    const [head, text] = block.split("## TEXT");
    const data = meta(head);
    return { id: data.id, kind: data.kind, text: text.trim(), ...(data.action ? { action: data.action } : {}), ...(data.gate ? { gateAction: data.gate } : {}) };
  });
}

function parseHabits(source) {
  return Object.fromEntries(blocks(source).map(block => {
    const [head, note] = block.split("## NOTE");
    const data = meta(head);
    return [data.id, { creativity: Number(data.creativity || 0), energy: Number(data.energy || 0), stress: Number(data.stress || 0), note: note.trim() }];
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
      return { label: choice.label, effects: effects(choice.effects), result: result.trim() };
    });
    return { id: data.id, text: eventText.trim(), choices };
  });
}

const [prologueSource, briefSource, habitsSource, eventsSource] = await Promise.all([
  loadText("prologue.md"), loadText("brief.md"), loadText("habits.md"), loadText("events.md")
]);

export const introBeats = parsePrologue(prologueSource);
export const briefCopy = meta(briefSource);
export const personalActions = parseHabits(habitsSource);
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
