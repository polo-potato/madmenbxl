// Human-editable narrative lives in /content/*.md. This file only parses it.
const loadText = name => fetch(new URL(`../content/${name}?v=9`, import.meta.url)).then(r => {
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
  const notePool = text => {
    const items=[...(text||"").matchAll(/^\s*-\s+(.+)$/gm)].map(match=>match[1].trim()).filter(Boolean);
    return items.length?items:[text.trim()].filter(Boolean);
  };
  return Object.fromEntries(blocks(source).map(block => {
    const [normalBlock, luckyNote = ""] = block.split("## LUCKY NOTE");
    const [head, note = ""] = normalBlock.split("## NOTE");
    const data = meta(head);
    const id = head.match(/^\[ACTION\]\s+(.+)$/m)?.[1]?.trim() || data.id;
    const tagged = Object.fromEntries([...head.matchAll(/^\[EFFECT\]\s+(creativity|energy|stress)\s+([+-]?\d+)$/gm)].map(match => [match[1], Number(match[2])]));
    const lucky = Object.fromEntries([...head.matchAll(/^\[LUCKY EFFECT\]\s+(creativity|energy|stress)\s+([+-]?\d+)$/gm)].map(match => [match[1], Number(match[2])]));
    const chance = Number(head.match(/^\[CHANCE\]\s+([\d.]+)$/m)?.[1] || 0);
    const cooldown = Math.max(0, Number(head.match(/^\[COOLDOWN\]\s+([\d.]+)$/m)?.[1] || 0));
    const move = head.match(/^\[MOVE\]\s+(.+)$/m)?.[1]?.trim() || "desk";
    const props = [...head.matchAll(/^\[PROP\]\s+(.+)$/gm)].map(match=>match[1].trim()).filter(Boolean);
    const animation = head.match(/^\[ANIMATION\]\s+(.+)$/m)?.[1]?.trim() || "";
    return [id, { creativity: tagged.creativity ?? Number(data.creativity || 0), energy: tagged.energy ?? Number(data.energy || 0), stress: tagged.stress ?? Number(data.stress || 0), cooldown, room:{move,props,animation}, notes: notePool(note), chance, luckyEffects: lucky, luckyNotes: notePool(luckyNote) }];
  }));
}

function parseEvents(source) {
  return source.split(/^---$/m).map(s => s.trim()).filter(s => /^\[EVENT\]\s+.+$/m.test(s) && /^## TEXT$/m.test(s)).map(block => {
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
  const visibleSource=source.match(/^## VISIBLE ACTIONS\s*\n([\s\S]*?)(?=^\[BRIEF\])/m)?.[1]||"";
  const visibleActions=[...visibleSource.matchAll(/^\s*-\s+(.+)$/gm)].map(match=>match[1].trim()).filter(Boolean);
  return { label: tag("LABEL") || legacy.label, anchor: tag("PREFIX") || legacy.anchor, prompt: tag("PROMPT") || legacy.prompt, attempt: tag("ACTION") || legacy.attempt, idea: tag("METER") || legacy.idea, completion: tag("COMPLETE") || legacy.completion, send: tag("SEND") || legacy.send, visibleActions };
}

function parseGauges(source) {
  const numberTag=(text,name,fallback=0)=>Number(text.match(new RegExp(`^\\[${name}\\]\\s+([+-]?[\\d.]+)$`,"m"))?.[1] ?? fallback);
  const gauges=Object.fromEntries(source.split(/^---$/m).slice(1).map(block=>{
    const id=block.match(/^\[GAUGE\]\s+(.+)$/m)?.[1]?.trim();
    return [id,{start:numberTag(block,"START"),drift:numberTag(block,"DRIFT"),tryMinimum:numberTag(block,"TRY MINIMUM"),tryCost:numberTag(block,"TRY COST"),ideaSource:numberTag(block,"IDEA SOURCE"),ideaBoost:numberTag(block,"IDEA BOOST"),purpose:block.split("## PURPOSE")[1]?.trim()||""}];
  }).filter(([id])=>id));
  return {gauges,idea:{base:numberTag(source,"IDEA BASE",8),minimumGain:numberTag(source,"IDEA MINIMUM GAIN",9)}};
}

function parseElements(source) {
  const numberTag=(text,name,fallback=0)=>Number(text.match(new RegExp(`^\\[${name}\\]\\s+([+-]?[\\d.]+)$`,"m"))?.[1] ?? fallback);
  return Object.fromEntries(source.split(/^---$/m).slice(1).map(block=>{
    const id=block.match(/^\[ELEMENT\]\s+(.+)$/m)?.[1]?.trim();
    if(!id)return null;
    const tag=name=>block.match(new RegExp(`^\\[${name}\\]\\s+(.+)$`,"m"))?.[1]?.trim()||"";
    const firstPart=block.search(/^\[PART\]/m),head=firstPart<0?block:block.slice(0,firstPart);
    const parts=[...block.matchAll(/^\[PART\]\s+(.+?)\n([\s\S]*?)(?=^\[PART\]|$)/gm)].map(match=>{const body=match[2];const partTag=name=>body.match(new RegExp(`^\\[${name}\\]\\s+(.+)$`,"m"))?.[1]?.trim()||"";return{id:match[1].trim(),shape:partTag("SHAPE")||"rect",x:numberTag(body,"X"),y:numberTag(body,"Y"),width:numberTag(body,"WIDTH"),height:numberTag(body,"HEIGHT"),text:partTag("TEXT")};});
    return [id,{id,width:numberTag(head,"WIDTH"),height:numberTag(head,"HEIGHT"),show:tag("SHOW"),attach:tag("ATTACH"),parts}];
  }).filter(Boolean));
}

function parseMap(source,definitions) {
  const numberTag=(text,name,fallback=0)=>Number(text.match(new RegExp(`^\\[${name}\\]\\s+([+-]?[\\d.]+)$`,"m"))?.[1] ?? fallback);
  const first=source.split(/^---$/m)[0];
  const positions=Object.fromEntries([...first.matchAll(/^\[POSITION\]\s+(\S+)\s+([+-]?[\d.]+)\s+([+-]?[\d.]+)$/gm)].map(match=>[match[1],{x:Number(match[2]),y:Number(match[3])}]));
  const elements=source.split(/^---$/m).slice(1).map(block=>{
    const id=block.match(/^\[PLACE\]\s+(.+)$/m)?.[1]?.trim();
    if(!id)return null;
    return {...definitions[id],id,instance:block.match(/^\[INSTANCE\]\s+(.+)$/m)?.[1]?.trim()||id,x:numberTag(block,"X"),y:numberTag(block,"Y")};
  }).filter(Boolean);
  return {width:numberTag(first,"MAP WIDTH",280),height:numberTag(first,"MAP HEIGHT",360),positions,elements};
}

const [prologueSource, briefSource, actionsSource, eventsSource, gaugesSource, elementsSource, mapSource] = await Promise.all([
  loadText("prologue.md"), loadText("brief.md"), loadText("actions.md"), loadText("events.md"), loadText("prologue-gauges.md"), loadText("prologue-elements.md"), loadText("prologue-map.md")
]);

export const introBeats = parsePrologue(prologueSource);
export const briefCopy = parseBrief(briefSource);
export const personalActions = parseActions(actionsSource);
export const briefEvents = parseEvents(eventsSource);
export const { gauges: prologueGauges, idea: prologueIdea } = parseGauges(gaugesSource);
export const prologueElements = parseElements(elementsSource);
export const prologueMap = parseMap(mapSource,prologueElements);

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
