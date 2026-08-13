export function createPrologueController({getMode,renderers,input,click,tick}){
  return{
    id:"prologue",
    modes:["intro","inbox","brief","early"],
    render(){renderers[getMode()]();},
    input,
    click,
    tick
  };
}
