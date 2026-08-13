import { readFile } from "node:fs/promises";

const files = ["content/prologue.md", "content/prologue-gauges.md", "content/brief.md", "content/actions.md", "content/events.md", "content/prologue-elements.md", "content/prologue-map.md"];
const sources = Object.fromEntries(await Promise.all(files.map(async file => [file, await readFile(file,"utf8")])));
const errors=[];
const requireTextBlocks=(file,marker)=>{
  const blocks=sources[file].split(/^---$/m).slice(1);
  if(!blocks.length) errors.push(`${file}: no content blocks`);
  blocks.forEach((block,index)=>{if(!block.includes(marker))errors.push(`${file}: block ${index+1} is missing ${marker}`);});
};
requireTextBlocks("content/prologue.md","## TEXT");
requireTextBlocks("content/actions.md","## NOTE");
requireTextBlocks("content/events.md","## TEXT");
for(const tag of ["LABEL","PREFIX","PROMPT","ACTION","METER","COMPLETE","SEND"]){if(!new RegExp(`^\\[${tag}\\]` ,"m").test(sources["content/brief.md"]))errors.push(`content/brief.md: missing [${tag}]`);}
if(!/^\[ACTION\]/m.test(sources["content/actions.md"]))errors.push("content/actions.md: no [ACTION] tags");
if(!/^\[EFFECT\]/m.test(sources["content/actions.md"]))errors.push("content/actions.md: no [EFFECT] tags");
if(!/^\[CHOICE\]/m.test(sources["content/events.md"]))errors.push("content/events.md: no [CHOICE] tags");
if(!/^\[EVENT\]/m.test(sources["content/events.md"]))errors.push("content/events.md: no [EVENT] titles");
for(const tag of ["GAUGE","START","DRIFT","TRY MINIMUM","TRY COST","IDEA SOURCE","IDEA BOOST"]){if(!new RegExp(`^\\[${tag}\\]`,"m").test(sources["content/prologue-gauges.md"]))errors.push(`content/prologue-gauges.md: missing [${tag}]`);}
const actionIds=[...sources["content/actions.md"].matchAll(/^\[ACTION\]\s+(.+)$/gm)].map(match=>match[1].trim());
const duplicateActions=actionIds.filter((id,index)=>actionIds.indexOf(id)!==index);
duplicateActions.forEach(id=>errors.push(`content/actions.md: duplicate action ${id}`));
const unlockIds=Object.entries(sources).flatMap(([file,source])=>[...source.matchAll(/^\[UNLOCK\]\s+(.+)$/gm)].map(match=>[file,match[1].trim()]));
unlockIds.forEach(([file,id])=>{if(!actionIds.includes(id))errors.push(`${file}: [UNLOCK] ${id} has no matching global action`);});
const visibleActions=[...(sources["content/brief.md"].match(/^## VISIBLE ACTIONS\s*\n([\s\S]*?)(?=^\[BRIEF\])/m)?.[1]||"").matchAll(/^\s*-\s+(.+)$/gm)].map(match=>match[1].trim());
visibleActions.forEach(id=>{if(!actionIds.includes(id))errors.push(`content/brief.md: visible action ${id} has no matching global action`);});
const elementIds=[...sources["content/prologue-elements.md"].matchAll(/^\[ELEMENT\]\s+(.+)$/gm)].map(match=>match[1].trim());
if(!elementIds.length)errors.push("content/prologue-elements.md: no [ELEMENT] tags");
const duplicateElements=elementIds.filter((id,index)=>elementIds.indexOf(id)!==index);
duplicateElements.forEach(id=>errors.push(`content/prologue-elements.md: duplicate element ${id}`));
const placedIds=[...sources["content/prologue-map.md"].matchAll(/^\[PLACE\]\s+(.+)$/gm)].map(match=>match[1].trim());
if(!placedIds.length)errors.push("content/prologue-map.md: no [PLACE] tags");
placedIds.forEach(id=>{if(!elementIds.includes(id))errors.push(`content/prologue-map.md: [PLACE] ${id} has no matching element`);});
const propIds=[...sources["content/actions.md"].matchAll(/^\[PROP\]\s+(.+)$/gm)].map(match=>match[1].trim());
propIds.forEach(id=>{if(!elementIds.includes(id))errors.push(`content/actions.md: [PROP] ${id} has no matching element`);});
if(errors.length){console.error(errors.join("\n"));process.exit(1);}
console.log("Content looks good.");
