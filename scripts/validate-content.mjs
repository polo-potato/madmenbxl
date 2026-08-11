import { readFile } from "node:fs/promises";

const files = ["content/prologue.md", "content/brief.md", "content/habits.md", "content/events.md"];
const sources = Object.fromEntries(await Promise.all(files.map(async file => [file, await readFile(file,"utf8")])));
const errors=[];
const requireTextBlocks=(file,marker)=>{
  const blocks=sources[file].split(/^---$/m).slice(1);
  if(!blocks.length) errors.push(`${file}: no content blocks`);
  blocks.forEach((block,index)=>{if(!block.includes(marker))errors.push(`${file}: block ${index+1} is missing ${marker}`);});
};
requireTextBlocks("content/prologue.md","## TEXT");
requireTextBlocks("content/habits.md","## NOTE");
requireTextBlocks("content/events.md","## TEXT");
for(const tag of ["LABEL","PREFIX","PROMPT","ACTION","METER","COMPLETE","SEND"]){if(!new RegExp(`^\\[${tag}\\]` ,"m").test(sources["content/brief.md"]))errors.push(`content/brief.md: missing [${tag}]`);}
if(!/^\[HABIT\]/m.test(sources["content/habits.md"]))errors.push("content/habits.md: no [HABIT] tags");
if(!/^\[EFFECT\]/m.test(sources["content/habits.md"]))errors.push("content/habits.md: no [EFFECT] tags");
if(!/^\[CHOICE\]/m.test(sources["content/events.md"]))errors.push("content/events.md: no [CHOICE] tags");
if(errors.length){console.error(errors.join("\n"));process.exit(1);}
console.log("Content looks good.");
