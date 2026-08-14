export const tagValue = (source, name, fallback = "") => source.match(new RegExp(`^\\[${name}\\]\\s+(.+)$`, "m"))?.[1]?.trim() || fallback;
export const tagValues = (source, name) => [...source.matchAll(new RegExp(`^\\[${name}\\]\\s+(.+)$`, "gm"))].map(match=>match[1].trim()).filter(Boolean);
export const numberTag = (source, name, fallback = 0) => {
  const value = Number(source.match(new RegExp(`^\\[${name}\\]\\s+([+-]?[\\d.]+)$`, "m"))?.[1] ?? fallback);
  return Number.isFinite(value) ? value : fallback;
};
export const normalizeRotation = value => ((Number(value || 0) % 360) + 360) % 360;
export function splitSource(source){const blocks=source.split(/^---$/m);return{header:blocks.shift()?.trim()||"",blocks};}

export function parseElementDocument(source,{normalizeVisual=(shape,style)=>({shape:shape||"rect",style:style||"pure"}),defaultWidth=0,defaultHeight=0}={}){
  const parsed=splitSource(source);
  const elementBlocks=/^\[ELEMENT\]\s+/m.test(parsed.header)?[parsed.header,...parsed.blocks]:parsed.blocks;
  const elements=elementBlocks.map(block=>{
    const id=tagValue(block,"ELEMENT");if(!id)return null;
    const firstPart=block.search(/^\[PART\]/m),head=firstPart<0?block:block.slice(0,firstPart);
    const parts=[...block.matchAll(/^\[PART\]\s+(.+?)\n([\s\S]*?)(?=^\[PART\]|(?![\s\S]))/gm)].map(match=>{
      const body=match[2],visual=normalizeVisual(tagValue(body,"SHAPE","rect"),tagValue(body,"STYLE"));
      const width=numberTag(body,"WIDTH"),height=visual.shape==="circle"?width||numberTag(body,"HEIGHT"):numberTag(body,"HEIGHT");
      return{id:match[1].trim(),...visual,x:numberTag(body,"X"),y:numberTag(body,"Y"),width,height,text:tagValue(body,"TEXT")};
    });
    return{id,width:numberTag(head,"WIDTH",defaultWidth),height:numberTag(head,"HEIGHT",defaultHeight),anchorX:numberTag(head,"ANCHOR X"),anchorY:numberTag(head,"ANCHOR Y"),show:tagValue(head,"SHOW"),attach:tagValue(head,"ATTACH"),parts};
  }).filter(Boolean);
  return{header:parsed.header,elements};
}

export function parseElementIndex(source){
  return [...source.matchAll(/^\[FILE\]\s+(elements\/[a-z0-9._/-]+\.md)$/gmi)].map(match=>match[1]);
}

export function parseMapDocument(source){
  const parsed=splitSource(source);
  const placements=parsed.blocks.map((block,index)=>{const id=tagValue(block,"PLACE");return id?{id,instance:tagValue(block,"INSTANCE",`${id}-${index+1}`),x:numberTag(block,"X"),y:numberTag(block,"Y"),rotation:normalizeRotation(numberTag(block,"ROTATION"))}:null;}).filter(Boolean);
  return{header:parsed.header,placements};
}
