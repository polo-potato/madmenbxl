import { introBeats, briefEvents, briefCopy, personalActions, prologueGauges, prologueIdea } from "./content.js";
import { initialState, loadState, saveState, resetState } from "./state.js?v=2";
import { simulate } from "./simulation.js";
import { activityLogView, agencyView, bar, money } from "./ui.js?v=2";

let state = loadState();
let lastTick = Date.now();
let afkNote = "";
let erasePauseTimer = null;
let eraseInterval = null;
let autoTypeInterval = null;
let metricTween = null;
let activeMetricDeltas = {};
let activeIdeaDelta = 0;
let metricDeltaProgress = 0;
let activityPulseTimer = null;
const game = document.querySelector("#game");

function logActivity(type,text){
  if(!text)return;
  state.activityLog=[...(state.activityLog||[]),{type,text}].slice(-10);
  state.activityLogPulse=true;
  clearTimeout(activityPulseTimer);
  activityPulseTimer=setTimeout(()=>{state.activityLogPulse=false;render();},900);
  saveState(state);
}

const elapsed = Math.max(0, (Date.now() - (state.lastSaved || Date.now())) / 1000);
if (elapsed > 12 && state.mode === "agency") {
  const result = simulate(state, elapsed, true);
  afkNote = `${money(result.cash)} net\nresources accumulated`;
}

function render() {
  if (state.mode === "intro") renderIntro();
  else if (state.mode === "inbox") renderInbox();
  else if (state.mode === "brief") renderBrief();
  else if (state.mode === "early") renderEarly();
  else game.innerHTML = agencyView(state, afkNote);
}

function renderIntro() {
  const b = introBeats[state.beat];
  if (!b) { state.mode="inbox"; render(); return; }
  const anchored = b.text.startsWith("WHAT IF...\n\n");
  const dialogue = anchored ? b.text.slice(12) : b.text;
  const action = b.actions?.[state.actionStep];
  const limit = action ? Math.max(0, action.offset - (anchored ? 12 : 0)) : dialogue.length;
  const visible = dialogue.slice(0, Math.min(state.char, limit));
  const atAction = Boolean(action) && state.char >= limit;
  const complete = !action && state.char >= dialogue.length;
  const currentAction = atAction ? { id: action.unlock || action.label, label: action.label, attr: "data-resume-action", persistent: Boolean(action.unlock) } : null;
  const persistentAction = currentAction?.persistent;
  if (persistentAction && !state.unlockedActions.includes(currentAction.id)) {
    state.unlockedActions.push(currentAction.id);
    saveState(state);
  }
  const anchor = anchored ? `<span class="auto-anchor">WHAT IF...</span>\n\n` : "";
  const acceptingInput = !atAction && !complete && !state.erasing && !state.autoTyping;
  const cursorMoving = acceptingInput || state.autoTyping;
  const cursor = b.kind !== "narration" && !atAction ? `<span class="cursor ${cursorMoving?'':'cursor-still'}">|</span>` : '';
  const hint = acceptingInput ? (state.beat === 0 ? 'TYPE TO THINK' : 'KEEP TYPING') : '';
  const menu = renderActionMenu(currentAction);
  const voiceClass = b.kind === "narration" ? "narration" : "typed";
  game.innerHTML = `<section class="prologue"><div class="prologue-output">${anchor}<span class="${voiceClass}">${visible}</span>${cursor}${menu}</div><div class="hint">${hint}</div></section>`;
  if (complete && !state.erasing) scheduleErase();
}

function renderActionMenu(current) {
  const isPersistent = current?.persistent;
  const contextual = current && !isPersistent ? `<button class="context-prompt" ${current.attr}>[ ${current.label} ]</button>` : "";
  if (!state.unlockedActions.length && !contextual) return "";
  return `<nav class="action-menu" aria-label="actions">${state.unlockedActions.length?'<span class="action-menu-title">HABITS</span>':''}${state.unlockedActions.map(id => {
    const active = current && current.id === id;
    const attr = active ? current.attr : "disabled";
    const label = active ? current.label : id;
    return `<button class="context-action" ${attr}>[ ${label} ]</button>`;
  }).join("")}${contextual}</nav>`;
}

function advanceTyping() {
  if (state.mode !== "intro") return;
  const b=introBeats[state.beat];
  if (state.erasing || state.autoTyping || b.kind === "narration") return;
  const dialogue = b.text.startsWith("WHAT IF...\n\n") ? b.text.slice(12) : b.text;
  const action=b.actions?.[state.actionStep], limit=action?Math.max(0,action.offset-12):dialogue.length;
  if (state.char < limit) state.char = Math.min(limit, state.char + (state.beat === 0 ? 1 : 3));
  render();
}

function scheduleErase() {
  clearTimeout(erasePauseTimer);
  const hold = state.autoHold ? 3200 : 1150;
  erasePauseTimer = setTimeout(() => {
    state.autoHold = false;
    state.erasing = true;
    eraseInterval = setInterval(() => {
      state.char = Math.max(0, state.char - 3);
      render();
      if (state.char === 0) {
        clearInterval(eraseInterval);
        eraseInterval = null;
        state.beat++;
        state.actionStep=0;
        state.erasing = false;
        state.waiting = false;
        saveState(state);
        enterCurrentBeat();
      }
    }, 38);
  }, hold);
}

function nextThought(auto = false) {
  clearTimeout(erasePauseTimer);
  if (eraseInterval) clearInterval(eraseInterval);
  if (autoTypeInterval) clearTimeout(autoTypeInterval);
  state.beat++;
  state.char=0;
  state.actionStep=0;
  state.waiting=false;
  state.autoTyping=false;
  saveState(state);
  if (auto || introBeats[state.beat]?.kind === "narration") startAutoDialogue(); else render();
}

function enterCurrentBeat() {
  const b=introBeats[state.beat];
  if(b?.kind==="narration") startAutoDialogue();
  else render();
}

function startAutoDialogue() {
  const b=introBeats[state.beat];
  if(!b) return render();
  const dialogue=b.text.startsWith("WHAT IF...\n\n")?b.text.slice(12):b.text;
  const action=b.actions?.[state.actionStep];
  const limit=action?Math.max(0,action.offset-(b.text.startsWith("WHAT IF...\n\n")?12:0)):dialogue.length;
  state.autoTyping=true;
  state.autoHold=false;
  render();
  const step=()=>{
    state.char=Math.min(limit,state.char+1);
    const typed=dialogue.slice(0,state.char);
    const character=typed.at(-1);
    const next=dialogue[state.char];
    let delay=52;
    if(character==="\n") delay=typed.endsWith("\n\n")?620:170;
    else if(character==="."&&next===".") delay=85;
    else if(typed.endsWith("...")) delay=820;
    else if(/[.!?]/.test(character)) delay=380;
    else if(/[,;:]/.test(character)) delay=180;
    render();
    if(state.char>=limit){
      autoTypeInterval=null;
      state.autoTyping=false;
      state.autoHold=!action;
      render();
      return;
    }
    autoTypeInterval=setTimeout(step,delay);
  };
  autoTypeInterval=setTimeout(step,480);
}

function resumeIntroAction() {
  const b=introBeats[state.beat];
  if (!b?.actions?.[state.actionStep]) return;
  state.actionStep++;
  state.autoTyping=false;
  state.autoHold=false;
  saveState(state);
  if (b.kind === "narration") startAutoDialogue(); else render();
}

function renderInbox() {
  game.innerHTML=`<section class="prologue"><div class="inbox"><div class="inbox-head"><span>INBOX</span><span>1</span></div><p>Hey,<br><br>is it still ok for later?</p><div class="mail-reply"><span>&gt;</span><button data-reply>[ yes ]</button></div></div></section>`;
}

function renderBrief() {
  const p=state.personal, brief=state.firstBrief;
  const prompt=briefCopy.prompt;
  const promptVisible=prompt.slice(0,brief.promptChar);
  const event = brief.pendingEvent;
  const actions = state.unlockedActions.map(id => {
    const a=personalActions[id]; if(!a) return "";
    const disabled=(id==="cigarette"&&p.stress<10)||(id==="coffee"&&p.energy>88)||(id==="take a walk"&&p.energy<8);
    return `<button data-personal-action="${id}" ${disabled||state.metricAnimating?'disabled':''}>[ ${id} ]</button>`;
  }).join("");
  const eventBlock = event ? `<div class="brief-event"><span class="label warning">DISTRACTION</span><p>${event.text.replaceAll("\n","<br>")}</p>${event.choices.map((c,i)=>`<button data-event-choice="${i}" ${state.metricAnimating?'disabled':''}>[ ${c.label} ]</button>`).join("")}</div>` : "";
  const metrics=state.unlockedMetrics.map(metric=>metric==='creativity'?personalMetric('CREATIVITY',p.creativity,'fill-yellow',metric):metric==='energy'?personalMetric('ENERGY',p.energy,'fill-green',metric):personalMetric('STRESS',p.stress,'fill-purple',metric)).join('');
  const ideaMeter=brief.promptComplete?`<div class="idea-meter"><div class="row-head"><span>${briefCopy.idea}</span><span>${Math.floor(brief.idea)} / 100</span>${deltaBadge(activeIdeaDelta)}</div>${bar(brief.idea,'fill-yellow',20)}</div>`:'';
  const completion=briefCopy.completion.replace(' / ','<br><br>');
  const attempt=brief.promptComplete?(brief.completed?`<p class="idea-found">${completion}</p><button data-finish-brief>[ ${briefCopy.send} ]</button>`:`<button class="try-idea" data-try-idea ${state.metricAnimating?'disabled':''}>[ ${briefCopy.attempt} ]</button>`):'';
  game.innerHTML=`<section class="brief-screen"><div class="brief-dialogue"><span class="label insight brief-label">${briefCopy.label}</span><div class="brief-thought"><span class="auto-anchor">${briefCopy.anchor}</span><br><br><span>${promptVisible}</span>${!brief.promptComplete?'<span class="cursor">|</span>':''}</div>${ideaMeter}${attempt}${eventBlock}${activityLogView(state,"activity-log-brief",state.activityLogPulse)}</div>
  <aside class="personal-side">${metrics?`<div class="personal-metrics"><div class="section-title">YOU, APPARENTLY ${state.metricAnimating?'· · ·':''}</div>${metrics}</div>`:''}<nav class="habit-menu"><span class="action-menu-title">HABITS</span>${actions}</nav></aside><div class="hint">${brief.promptComplete?'':'TYPE TO THINK'}</div></section>`;
}

function personalMetric(name,value,color,id){return `<div class="personal-metric"><div class="row-head"><span>${name}</span><span>${Math.round(value)}</span>${deltaBadge(activeMetricDeltas[id])}</div>${bar(value,color,12)}</div>`;}

function unlockPersonal(id){ if(!state.unlockedActions.includes(id)) state.unlockedActions.push(id); }
function unlockMetric(id){ if(!state.unlockedMetrics.includes(id)) state.unlockedMetrics.push(id); }
function adjustPersonal(effects){ Object.entries(effects).forEach(([k,v])=>state.personal[k]=Math.max(0,Math.min(100,state.personal[k]+v))); }
function signed(value){ return `${value>0?"+":"−"}${Math.abs(value)}`; }
function deltaBadge(value){
  if(!value)return "";
  const opacity=metricDeltaProgress<.2?metricDeltaProgress/.2:metricDeltaProgress<.65?1:Math.max(0,(1-metricDeltaProgress)/.35);
  return `<span class="metric-delta" style="opacity:${opacity};transform:translateY(${-8*metricDeltaProgress}px)">${signed(value)}</span>`;
}

const ideaRequirements = [
  { id:"creativity", message:"Creativity is missing.\n\nMaybe look somewhere else." },
  { id:"energy", message:"Your energy is low.\n\nCoffee is still there." },
  { id:"stress", message:"You have no motivation.\n\nA little pressure might help." }
];

function advanceBriefTyping(){
  const b=state.firstBrief,prompt=briefCopy.prompt;
  if(b.promptComplete)return;
  b.promptChar=Math.min(prompt.length,b.promptChar+2);
  if(b.promptChar>=prompt.length){b.promptComplete=true;logActivity("goal","Fill the IDEA gauge.");}
  render();
}

function animateMetrics(effects, ideaGain=0, done=()=>{}) {
  if(state.metricAnimating) return;
  state.metricAnimating=true;
  activeMetricDeltas=Object.fromEntries(Object.entries(effects).filter(([k,v])=>k in state.personal&&v));
  activeIdeaDelta=ideaGain;
  metricDeltaProgress=0;
  const steps=18;
  let step=0;
  if(metricTween) clearInterval(metricTween);
  metricTween=setInterval(()=>{
    step++;
    metricDeltaProgress=step/steps;
    const partial={};
    Object.entries(effects).filter(([k])=>k in state.personal).forEach(([k,v])=>partial[k]=v/steps);
    adjustPersonal(partial);
    if(ideaGain) state.firstBrief.idea=Math.min(100,state.firstBrief.idea+ideaGain/steps);
    if(step>=steps){
      clearInterval(metricTween);
      metricTween=null;
      state.metricAnimating=false;
      done();
      activeMetricDeltas={};
      activeIdeaDelta=0;
      metricDeltaProgress=0;
      saveState(state);
    }
    render();
  },55);
}

function renderEarly() {
  game.innerHTML=`<section class="early"><div class="early-copy">WHAT IF...<br><br><span class="cursor">|</span><br><br><br><span class="label creative">IDEAS</span><br>${bar(state.resources.ideas,'fill-yellow',12)}<br><br>one thought survived the shower.<br><br><button data-first-brief>[ open the brief ]</button>${activityLogView(state,"activity-log-early",state.activityLogPulse)}</div><div class="early-map"><div class="zone" style="left:8%;top:23%"><b>bedroom</b>\n\n      ○\n  ┌─────────┐\n  │ ▪     ☕ │\n  └─────────┘\n\n       ░░\n      bed</div></div></section>`;
}

function skipToAgency(){ state=initialState(); state.mode="agency"; state.activityLog=[{type:"goal",text:"Keep the agency alive."}]; afkNote=""; saveState(state); render(); }
function skipToBrief(){ state=initialState(); state.mode="brief"; state.activityLog=[{type:"goal",text:"Find a direction for the brief."}]; ["cigarette","scroll","coffee","look out the window"].forEach(unlockPersonal); afkNote=""; saveState(state); render(); }

document.addEventListener("keydown", e=>{ if(!e.metaKey&&!e.ctrlKey&&!e.altKey){ if(state.mode==="intro"){e.preventDefault();advanceTyping();}else if(state.mode==="brief"){e.preventDefault();advanceBriefTyping();} }});
document.addEventListener("click", e=>{
  const el=e.target.closest("button"); if(!el)return;
  if(el.dataset.action==="brief") return skipToBrief();
  if(el.dataset.action==="skip") return skipToAgency();
  if(el.dataset.action==="reset"){ resetState(); state=initialState(); afkNote=""; return render(); }
  if(el.hasAttribute("data-intro-action")) return nextThought(el.textContent.includes("cigarette"));
  if(el.hasAttribute("data-resume-action")) return resumeIntroAction();
  if(el.hasAttribute("data-next-thought")) return nextThought();
  if(el.hasAttribute("data-gate-action")){
    const phone=el.textContent.includes("phone");
    if(phone) unlockPersonal("scroll");
    state.waiting=true; state.char=0; saveState(state);
    if(phone) return startAutoDialogue();
    return render();
  }
  if(el.hasAttribute("data-reply")){ state.mode="brief"; unlockPersonal("look out the window"); logActivity("goal","Find a direction for the brief."); return render(); }
  if(el.dataset.personalAction){ const id=el.dataset.personalAction,a=personalActions[id]; if(id==='cigarette'||id==='scroll')unlockMetric('stress');if(id==='coffee')unlockMetric('energy');if(id==='look out the window'||id==='take a walk')unlockMetric('creativity'); state.firstBrief.eventResult=a.note; state.actionUses[id]=(state.actionUses[id]||0)+1; logActivity("action",`${id}. ${a.note.replaceAll("\n"," ")}`); animateMetrics(a); return render(); }
  if(el.hasAttribute("data-try-idea")){
    const p=state.personal,b=state.firstBrief;
    const problem=ideaRequirements.find(({id})=>!state.unlockedMetrics.includes(id)||p[id]<(prologueGauges[id]?.tryMinimum||0));
    if(problem){ b.eventResult=problem.message; logActivity("goal",problem.message.replaceAll("\n"," ")); return render(); }
    const source=Object.entries(prologueGauges).reduce((sum,[id,gauge])=>sum+p[id]*gauge.ideaSource,0);
    const boost=1+Object.entries(prologueGauges).reduce((sum,[id,gauge])=>sum+p[id]*gauge.ideaBoost,0);
    const gain=Math.max(prologueIdea.minimumGain,Math.round(prologueIdea.base+source*boost));
    const costs=Object.fromEntries(Object.entries(prologueGauges).map(([id,gauge])=>[id,gauge.tryCost]));
    b.ideaUnlocked=true;
    b.eventResult="";
    logActivity("action",`Tried a direction. IDEA +${gain}.`);
    animateMetrics(costs,gain,()=>{b.attempts++;if(b.idea>=99.5){b.idea=100;b.completed=true;logActivity("goal","The direction is ready to send.");}else if(b.attempts%2===0&&briefEvents.length){b.pendingEvent=briefEvents[b.eventIndex%briefEvents.length];b.eventIndex++;logActivity("event",b.pendingEvent.text.replaceAll("\n"," "));}});
    return render();
  }
  if(el.dataset.eventChoice!==undefined){ const b=state.firstBrief,event=b.pendingEvent,index=Number(el.dataset.eventChoice),c=event.choices[index]; b.pendingEvent=null; b.eventResult=c.result; if(c.unlock) unlockPersonal(c.unlock); logActivity("action",`${c.label}. ${c.result.replaceAll("\n"," ")}`); animateMetrics(c.effects); return render(); }
  if(el.hasAttribute("data-finish-brief")){ state.mode="early"; state.resources.ideas=18; logActivity("goal","Brief sent."); return render(); }
  if(el.hasAttribute("data-first-brief")){ state.mode="agency"; state.events.unshift({age:"THEN",text:"16:00.\n\nIt was an interview."}); logActivity("goal","Keep the agency alive."); return render(); }
  if(el.dataset.tab){ state.activeTab=el.dataset.tab; return render(); }
  if(el.dataset.staff){ const c=state.campaign; const role=el.dataset.staff; const next=Math.max(0,Math.min(3,c.staffing[role]+Number(el.dataset.delta))); const diff=next-c.staffing[role]; c.staffing[role]=next; c.margin-=diff*900; logActivity("action",`${diff>0?"Added":"Removed"} ${role} capacity.`); return render(); }
  if(el.dataset.choice==="defend"){ state.campaign.decision=false; state.campaign.paused=false; state.campaign.phase="CRAFT"; state.campaign.progress=76; state.reputation=Math.min(100,state.reputation+2); state.events.unshift({age:"NOW",text:"you defended it.\n\nthe silence lasted too long.\n\nthen: \"okay.\""}); logActivity("action","Defended the idea. The client said okay."); return render(); }
  if(el.dataset.choice==="adapt"){ state.campaign.decision=false; state.campaign.paused=false; state.campaign.phase="CRAFT"; state.campaign.progress=83; state.campaign.margin-=1800; state.events.unshift({age:"NOW",text:"option 2 became option 1.\n\napproval ↑\nmargin ↓"}); logActivity("action","Adapted the idea. Approval up, margin down."); return render(); }
  if(el.dataset.choice==="award" && state.cash>=2400){ state.cash-=2400; state.awardEligible=false; state.events.unshift({age:"NOW",text:"submitted to CBA.\n\nCASE FILM\n██████░░░░░░\n\nnow we wait."}); logActivity("action","Submitted the work to CBA."); return render(); }
});

setInterval(()=>{
  const now=Date.now(),delta=(now-lastTick)/1000;
  const previousEvent=state.events[0]?.text;
  simulate(state,delta); lastTick=now;
  if(state.mode==="brief"&&!state.metricAnimating){
    const drift={};
    state.unlockedMetrics.forEach(id=>drift[id]=prologueGauges[id]?.drift||0);
    adjustPersonal(drift);
    render();
  } else if(state.mode==="agency") {
    if(state.events[0]?.text&&state.events[0].text!==previousEvent) logActivity("event",state.events[0].text.replaceAll("\n"," "));
    render();
  }
},1000);
setInterval(()=>saveState(state),5000);
window.addEventListener("beforeunload",()=>saveState(state));
render();
