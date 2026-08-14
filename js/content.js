// Human-editable narrative lives in /content/*.md. This file only parses it.
import { tagValue, tagValues, numberTag, parseElementDocument, parseElementIndex, parseMapDocument } from "./markdown.js?v=2";
const contentVersion = Date.now();
const draftMode = new URLSearchParams(location.search).get("draft") === "1";
async function githubDraft(name) {
  if (!draftMode) return null;
  try {
    const response = await fetch(`/api/content?path=${encodeURIComponent(`content/${name}`)}`, { cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()).content || null;
  } catch {
    return null;
  }
}

const loadText = async name => {
  const draft = await githubDraft(name);
  if (draft !== null) return draft;
  return fetch(new URL(`../content/${name}?v=${contentVersion}`, import.meta.url), { cache: "no-store" }).then(r => {
  if (!r.ok) throw new Error(`Could not load content/${name}`);
  return r.text();
  });
};
const loadJson = name => fetch(new URL(`../content/${name}?v=${contentVersion}`, import.meta.url), { cache: "no-store" }).then(r => {
  if (!r.ok) throw new Error(`Could not load content/${name}`);
  return r.json();
});

const meta = source => Object.fromEntries(source.split("\n").map(line => {
  const colon = line.indexOf(":");
  return colon < 0 ? null : [line.slice(0, colon).trim(), line.slice(colon + 1).trim()];
}).filter(Boolean));

const splitBlocks = source => source.split(/^---$/m).map(block => block.trim()).filter(Boolean);
const blocks = source => splitBlocks(source).filter(block => /^## (TEXT|NOTE)$/m.test(block));
const taggedEffects = (source, prefix = "") => Object.fromEntries([...source.matchAll(new RegExp(`^\\[${prefix}EFFECT\\]\\s+(creativity|energy|stress)\\s+([+-]?\\d+)$`, "gm"))].map(match => [match[1], Number(match[2])]));
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
    const tagged = taggedEffects(head);
    const lucky = taggedEffects(head, "LUCKY ");
    const chance = Number(head.match(/^\[CHANCE\]\s+([\d.]+)$/m)?.[1] || 0);
    const cooldown = Math.max(0, Number(head.match(/^\[COOLDOWN\]\s+([\d.]+)$/m)?.[1] || 0));
    const move = tagValue(head, "MOVE", "desk");
    const props = tagValues(head, "PROP");
    const animation = tagValue(head, "ANIMATION");
    const legacyEffects = { creativity:Number(data.creativity || 0), energy:Number(data.energy || 0), stress:Number(data.stress || 0) };
    const normalEffects = Object.keys(tagged).length ? tagged : legacyEffects;
    const requirements = tagValues(head,"REQUIRES").map(rule=>rule.match(/^(\S+)\s*(<=|>=|=|<|>)\s*([+-]?[\d.]+)$/)).filter(Boolean).map(([,gauge,operator,value])=>({gauge,operator,value:Number(value)}));
    return [id, { effects:normalEffects, cooldown, room:{move,props,animation}, notes:notePool(note), chance, luckyEffects:lucky, luckyNotes:notePool(luckyNote), reveals:tagValues(head,"REVEAL"), requirements }];
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
      const choiceEffects = taggedEffects(choiceHead);
      const unlock = choiceHead.match(/^\[UNLOCK\]\s+(.+)$/m)?.[1]?.trim();
      return { label: label?.[1]?.trim() || label?.[2]?.trim() || choice.label, effects: Object.keys(choiceEffects).length ? choiceEffects : effects(choice.effects), result: result.trim(), ...(unlock ? { unlock } : {}) };
    });
    return { text: eventText.trim(), choices };
  });
}

function parseBrief(source) {
  const legacy = meta(source);
  const visibleSource=source.match(/^## VISIBLE ACTIONS\s*\n([\s\S]*?)(?=^\[BRIEF\])/m)?.[1]||"";
  const visibleActions=[...visibleSource.matchAll(/^\s*-\s+(.+)$/gm)].map(match=>match[1].trim()).filter(Boolean);
  const missing = Object.fromEntries([...source.matchAll(/^\[MISSING\s+([^\]]+)\]\s+(.+)$/gm)].map(match=>[match[1].trim(),match[2].trim().replaceAll(" / ","\n\n")]));
  return { label:tagValue(source,"LABEL",legacy.label), anchor:tagValue(source,"PREFIX",legacy.anchor), prompt:tagValue(source,"PROMPT",legacy.prompt), attempt:tagValue(source,"ACTION",legacy.attempt), idea:tagValue(source,"METER",legacy.idea), completion:tagValue(source,"COMPLETE",legacy.completion), send:tagValue(source,"SEND",legacy.send), target:numberTag(source,"TARGET",100), visibleActions, missing, logs:{start:tagValue(source,"LOG START"),prompt:tagValue(source,"LOG PROMPT"),attempt:tagValue(source,"LOG TRY"),ready:tagValue(source,"LOG READY")}, mail:{body:tagValue(source,"MAIL").split(/\s*\/\s*/).join("\n"),reply:tagValue(source,"REPLY")}, after:{label:tagValue(source,"AFTER LABEL"),prefix:tagValue(source,"AFTER PREFIX"),text:tagValue(source,"AFTER TEXT"),next:tagValue(source,"NEXT")} };
}

function parseGauges(source) {
  const gauges=Object.fromEntries(source.split(/^---$/m).slice(1).map(block=>{
    const id=block.match(/^\[GAUGE\]\s+(.+)$/m)?.[1]?.trim();
    return [id,{label:tagValue(block,"LABEL",id.toUpperCase()),color:tagValue(block,"COLOR","ink"),start:numberTag(block,"START"),drift:numberTag(block,"DRIFT"),tryMinimum:numberTag(block,"TRY MINIMUM"),tryCost:numberTag(block,"TRY COST"),ideaSource:numberTag(block,"IDEA SOURCE"),ideaBoost:numberTag(block,"IDEA BOOST"),purpose:block.split("## PURPOSE")[1]?.trim()||""}];
  }).filter(([id])=>id));
  return {gauges,idea:{base:numberTag(source,"IDEA BASE",8),minimumGain:numberTag(source,"IDEA MINIMUM GAIN",9)}};
}

function parseElements(source) {
  const normalizeVisual=(shape,style)=>{
    const legacy={hline:["line","pure"],"hline-muted":["line","muted"],"vline-muted":["line","vertical-muted"],"rect-muted":["rect","muted"]}[shape];
    if(legacy)return{shape:legacy[0],style:style||legacy[1]};
    return{shape:shape||"rect",style:style||(shape==="smoke"?"animated":"pure")};
  };
  return Object.fromEntries(parseElementDocument(source,{normalizeVisual}).elements.map(element=>[element.id,element]));
}

function parseMap(source,definitions) {
  const parsed=parseMapDocument(source),first=parsed.header;
  const positions=Object.fromEntries([...first.matchAll(/^\[POSITION\]\s+(\S+)\s+([+-]?[\d.]+)\s+([+-]?[\d.]+)$/gm)].map(match=>[match[1],{x:Number(match[2]),y:Number(match[3])}]));
  const elements=parsed.placements.map(placement=>({...definitions[placement.id],...placement}));
  const instancePositions={};
  elements.forEach(element=>{
    const radians=element.rotation*Math.PI/180;
    const centerX=(element.width||0)/2,centerY=(element.height||0)/2;
    const localX=(element.anchorX||0)-centerX,localY=(element.anchorY||0)-centerY;
    const anchor={x:element.x+centerX+localX*Math.cos(radians)-localY*Math.sin(radians),y:element.y+centerY+localX*Math.sin(radians)+localY*Math.cos(radians)};
    instancePositions[element.instance]=anchor;
    if(!instancePositions[element.id])instancePositions[element.id]=anchor;
  });
  return {width:numberTag(first,"MAP WIDTH",280),height:numberTag(first,"MAP HEIGHT",360),positions:{...instancePositions,...positions},elements};
}

export const contentManifest = await loadJson("manifest.json");
export const activeEra = contentManifest.eras.find(era=>era.status==="active") || contentManifest.eras[0];
const eraModules = Object.fromEntries(activeEra.modules.map(module=>[module.id,module]));
const moduleFile = id => {
  const file = eraModules[id]?.file;
  if (!file) throw new Error(`Era ${activeEra.id} is missing required module ${id}`);
  return file;
};
const [prologueSource, briefSource, actionsSource, eventsSource, gaugesSource, elementIndexSource, mapSource] = await Promise.all([
  "story", "brief", "actions", "events", "gauges", "elements", "map"
].map(id=>loadText(moduleFile(id))));
const elementSources = await Promise.all(parseElementIndex(elementIndexSource).map(loadText));
const elementsSource = elementSources.join("\n\n---\n\n");

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
