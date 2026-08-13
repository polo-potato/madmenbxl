export function createAgencyController({render,click,tick}){
  return{id:"agency",modes:["agency"],fallback:true,render,click,tick};
}
