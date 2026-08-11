import { introBeats, briefEvents, briefCopy, personalActions } from "./content.js";
import { initialState, loadState, saveState, resetState } from "./state.js";
import { simulate } from "./simulation.js";
import { agencyView, bar, money } from "./ui.js";

let state = loadState();
let lastTick = Date.now();
let afkNote = "";
let erasePauseTimer = null;
let eraseInterval = null;
let autoTypeInterval = null;
let metricTween = null;
const game = document.querySelector("#game");

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
  const gated = b.gateAction && !state.waiting;
  const anchored = b.text.startsWith("WHAT IF...\n\n");
  const dialogue = anchored ? b.text.slice(12) : b.text;
  const visible = dialogue.slice(0,state.char);
  const complete = state.char >= dialogue.length;
  let currentAction = null;
  if (complete && b.action) {
    const id = b.unlock || b.action;
    currentAction = { id, label: b.action, attr: "data-intro-action", persistent: Boolean(b.unlock) };
  } else if (gated) {
    const id = b.unlock || b.gateAction;
    currentAction = { id, label: b.gateAction, attr: "data-gate-action", persistent: Boolean(b.unlock) };
  }
  const persistentAction = currentAction?.persistent;
  if (persistentAction && !state.unlockedActions.includes(currentAction.id)) {
    state.unlockedActions.push(currentAction.id);
    saveState(state);
  }
  const anchor = anchored ? `<span class="auto-anchor">WHAT IF...</span>\n\n` : "";
  const gate = gated ? (b.kind === "narration" ? `<div class="thought-anchor narration">your phone lights up.</div>` : `<div class="thought-anchor">WHAT IF...<br><br><span class="cursor">|</span></div>`) : "";
  const acceptingInput = !gated && !complete && !state.erasing && !state.autoTyping;
  const cursorMoving = acceptingInput || state.autoTyping;
  const cursor = !gated && b.kind !== "narration" ? `<span class="cursor ${cursorMoving?'':'cursor-still'}">|</span>` : '';
  const hint = acceptingInput ? (state.beat === 0 ? 'TYPE TO THINK' : 'KEEP TYPING') : '';
  const menu = renderActionMenu(currentAction);
  const voiceClass = b.kind === "narration" ? "narration" : "typed";
  game.innerHTML = `<section class="prologue"><div class="prologue-output">${gate || `${anchor}<span class="${voiceClass}">${visible}</span>${cursor}`}${menu}</div><div class="hint">${hint}</div></section>`;
  if (complete && !b.action && !state.erasing) scheduleErase();
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
  if (state.erasing || state.autoTyping || b.kind === "narration" || (b.gateAction && !state.waiting)) return;
  const dialogue = b.text.startsWith("WHAT IF...\n\n") ? b.text.slice(12) : b.text;
  if (state.char < dialogue.length) state.char = Math.min(dialogue.length, state.char + (state.beat === 0 ? 1 : 3));
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
  state.waiting=false;
  state.autoTyping=false;
  saveState(state);
  if (auto || introBeats[state.beat]?.kind === "narration" && !introBeats[state.beat]?.gateAction) startAutoDialogue(); else render();
}

function enterCurrentBeat() {
  const b=introBeats[state.beat];
  if(b?.kind==="narration"&&!b.gateAction) startAutoDialogue();
  else render();
}

function startAutoDialogue() {
  const b=introBeats[state.beat];
  if(!b) return render();
  const dialogue=b.text.startsWith("WHAT IF...\n\n")?b.text.slice(12):b.text;
  state.autoTyping=true;
  state.autoHold=false;
  render();
  const step=()=>{
    state.char=Math.min(dialogue.length,state.char+1);
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
    if(state.char>=dialogue.length){
      autoTypeInterval=null;
      state.autoTyping=false;
      state.autoHold=true;
      render();
      return;
    }
    autoTypeInterval=setTimeout(step,delay);
  };
  autoTypeInterval=setTimeout(step,480);
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
  const eventBlock = event ? `<div class="brief-event"><span class="label warning">DISTRACTION</span><p>${event.text.replaceAll("\n","<br>")}</p>${event.choices.map((c,i)=>`<button data-event-choice="${i}" ${state.metricAnimating?'disabled':''}>[ ${c.label} ]</button>`).join("")}</div>` : brief.eventResult ? `<div class="brief-event event-result">${brief.eventResult.replaceAll("\n","<br>")}</div>` : "";
  const metrics=state.unlockedMetrics.map(metric=>metric==='creativity'?personalMetric('CREATIVITY',p.creativity,'fill-yellow'):metric==='energy'?personalMetric('ENERGY',p.energy,'fill-green'):personalMetric('STRESS',p.stress,'fill-purple')).join('');
  const ideaMeter=brief.ideaUnlocked?`<div class="idea-meter"><div class="row-head"><span>${briefCopy.idea}</span><span>${Math.floor(brief.idea)} / 100</span></div>${bar(brief.idea,'fill-yellow',20)}</div>`:'';
  const completion=briefCopy.completion.replace(' / ','<br><br>');
  const attempt=brief.promptComplete?(brief.completed?`<p class="idea-found">${completion}</p><button data-finish-brief>[ ${briefCopy.send} ]</button>`:`<button class="try-idea" data-try-idea ${p.creativity<12||p.energy<6||state.metricAnimating?'disabled':''}>[ ${briefCopy.attempt} ]</button>`):'';
  game.innerHTML=`<section class="brief-screen"><div class="brief-dialogue"><span class="label insight brief-label">${briefCopy.label}</span><div class="brief-thought"><span class="auto-anchor">${briefCopy.anchor}</span><br><br><span>${promptVisible}</span>${!brief.promptComplete?'<span class="cursor">|</span>':''}</div>${ideaMeter}${attempt}${eventBlock}</div>
  <aside class="personal-side">${metrics?`<div class="personal-metrics"><div class="section-title">YOU, APPARENTLY ${state.metricAnimating?'· · ·':''}</div>${metrics}</div>`:''}<nav class="habit-menu"><span class="action-menu-title">HABITS</span>${actions}</nav></aside><div class="hint">${brief.promptComplete?'':'TYPE TO THINK'}</div></section>`;
}

function personalMetric(name,value,color){return `<div class="personal-metric"><div class="row-head"><span>${name}</span><span>${Math.round(value)}</span></div>${bar(value,color,12)}</div>`;}

function unlockPersonal(id){ if(!state.unlockedActions.includes(id)) state.unlockedActions.push(id); }
function unlockMetric(id){ if(!state.unlockedMetrics.includes(id)) state.unlockedMetrics.push(id); }
function adjustPersonal(effects){ Object.entries(effects).forEach(([k,v])=>state.personal[k]=Math.max(0,Math.min(100,state.personal[k]+v))); }

function advanceBriefTyping(){
  const b=state.firstBrief,prompt=briefCopy.prompt;
  if(b.promptComplete)return;
  b.promptChar=Math.min(prompt.length,b.promptChar+2);
  if(b.promptChar>=prompt.length){b.promptComplete=true;saveState(state);}
  render();
}

function animateMetrics(effects, ideaGain=0, done=()=>{}) {
  if(state.metricAnimating) return;
  state.metricAnimating=true;
  const steps=18;
  let step=0;
  if(metricTween) clearInterval(metricTween);
  metricTween=setInterval(()=>{
    step++;
    const partial={};
    Object.entries(effects).filter(([k])=>k in state.personal).forEach(([k,v])=>partial[k]=v/steps);
    adjustPersonal(partial);
    if(ideaGain) state.firstBrief.idea=Math.min(100,state.firstBrief.idea+ideaGain/steps);
    if(step>=steps){
      clearInterval(metricTween);
      metricTween=null;
      state.metricAnimating=false;
      done();
      saveState(state);
    }
    render();
  },55);
}

function renderEarly() {
  game.innerHTML=`<section class="early"><div class="early-copy">WHAT IF...<br><br><span class="cursor">|</span><br><br><br><span class="label creative">IDEAS</span><br>${bar(state.resources.ideas,'fill-yellow',12)}<br><br>one thought survived the shower.<br><br><button data-first-brief>[ open the brief ]</button></div><div class="early-map"><div class="zone" style="left:8%;top:23%"><b>bedroom</b>\n\n      ○\n  ┌─────────┐\n  │ ▪     ☕ │\n  └─────────┘\n\n       ░░\n      bed</div></div></section>`;
}

function skipToAgency(){ state=initialState(); state.mode="agency"; afkNote=""; saveState(state); render(); }
function skipToBrief(){ state=initialState(); state.mode="brief"; ["cigarette","scroll","coffee","look out the window"].forEach(unlockPersonal); afkNote=""; saveState(state); render(); }

document.addEventListener("keydown", e=>{ if(!e.metaKey&&!e.ctrlKey&&!e.altKey){ if(state.mode==="intro"){e.preventDefault();advanceTyping();}else if(state.mode==="brief"){e.preventDefault();advanceBriefTyping();} }});
document.addEventListener("click", e=>{
  const el=e.target.closest("button"); if(!el)return;
  if(el.dataset.action==="brief") return skipToBrief();
  if(el.dataset.action==="skip") return skipToAgency();
  if(el.dataset.action==="reset"){ resetState(); state=initialState(); afkNote=""; return render(); }
  if(el.hasAttribute("data-intro-action")) return nextThought(el.textContent.includes("cigarette"));
  if(el.hasAttribute("data-next-thought")) return nextThought();
  if(el.hasAttribute("data-gate-action")){
    const phone=el.textContent.includes("phone");
    if(phone) unlockPersonal("scroll");
    state.waiting=true; state.char=0; saveState(state);
    if(phone) return startAutoDialogue();
    return render();
  }
  if(el.hasAttribute("data-reply")){ state.mode="brief"; unlockPersonal("look out the window"); saveState(state); return render(); }
  if(el.dataset.personalAction){ const id=el.dataset.personalAction,a=personalActions[id]; if(id==='cigarette'||id==='scroll')unlockMetric('stress');if(id==='coffee')unlockMetric('energy');if(id==='look out the window'||id==='take a walk')unlockMetric('creativity'); state.firstBrief.eventResult=a.note; state.actionUses[id]=(state.actionUses[id]||0)+1; animateMetrics(a); return render(); }
  if(el.hasAttribute("data-try-idea")){ const p=state.personal,b=state.firstBrief; b.ideaUnlocked=true; const gain=Math.max(9,Math.round(8+p.creativity*.14-p.stress*.035)); b.eventResult=""; animateMetrics({creativity:-12,energy:-7,stress:5},gain,()=>{b.attempts++;if(b.idea>=99.5){b.idea=100;b.completed=true;}else if(b.attempts%2===0){b.pendingEvent=briefEvents[b.eventIndex%briefEvents.length];b.eventIndex++;}}); return render(); }
  if(el.dataset.eventChoice!==undefined){ const b=state.firstBrief,event=b.pendingEvent,index=Number(el.dataset.eventChoice),c=event.choices[index]; b.pendingEvent=null; b.eventResult=c.result; if(event.id==="icecream"&&index===0) unlockPersonal("take a walk"); animateMetrics(c.effects); return render(); }
  if(el.hasAttribute("data-finish-brief")){ state.mode="early"; state.resources.ideas=18; saveState(state); return render(); }
  if(el.hasAttribute("data-first-brief")){ state.mode="agency"; state.events.unshift({age:"THEN",text:"16:00.\n\nIt was an interview."}); saveState(state); return render(); }
  if(el.dataset.tab){ state.activeTab=el.dataset.tab; return render(); }
  if(el.dataset.staff){ const c=state.campaign; const role=el.dataset.staff; const next=Math.max(0,Math.min(3,c.staffing[role]+Number(el.dataset.delta))); const diff=next-c.staffing[role]; c.staffing[role]=next; c.margin-=diff*900; return render(); }
  if(el.dataset.choice==="defend"){ state.campaign.decision=false; state.campaign.paused=false; state.campaign.phase="CRAFT"; state.campaign.progress=76; state.reputation=Math.min(100,state.reputation+2); state.events.unshift({age:"NOW",text:"you defended it.\n\nthe silence lasted too long.\n\nthen: \"okay.\""}); return render(); }
  if(el.dataset.choice==="adapt"){ state.campaign.decision=false; state.campaign.paused=false; state.campaign.phase="CRAFT"; state.campaign.progress=83; state.campaign.margin-=1800; state.events.unshift({age:"NOW",text:"option 2 became option 1.\n\napproval ↑\nmargin ↓"}); return render(); }
  if(el.dataset.choice==="award" && state.cash>=2400){ state.cash-=2400; state.awardEligible=false; state.events.unshift({age:"NOW",text:"submitted to CBA.\n\nCASE FILM\n██████░░░░░░\n\nnow we wait."}); return render(); }
});

setInterval(()=>{
  const now=Date.now(); simulate(state,(now-lastTick)/1000); lastTick=now;
  if(state.mode==="brief"&&!state.metricAnimating){
    const drift={};
    if(state.unlockedMetrics.includes('creativity'))drift.creativity=-.025;
    if(state.unlockedMetrics.includes('energy'))drift.energy=-.085;
    if(state.unlockedMetrics.includes('stress'))drift.stress=.045;
    adjustPersonal(drift);
    render();
  } else if(state.mode==="agency") render();
},1000);
setInterval(()=>saveState(state),5000);
window.addEventListener("beforeunload",()=>saveState(state));
render();
