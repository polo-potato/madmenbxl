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
for(const key of ["label","anchor","prompt","attempt","idea","completion","send"]){if(!new RegExp(`^${key}:`,"m").test(sources["content/brief.md"]))errors.push(`content/brief.md: missing ${key}`);}
if(errors.length){console.error(errors.join("\n"));process.exit(1);}
console.log("Content looks good.");
