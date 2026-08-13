const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export const money = n => `€ ${Math.round(n).toLocaleString("en-US")}`;

export function bar(value, color = "fill-green", width = 12) {
  const filled = Math.round(Math.max(0, Math.min(100, value)) / 100 * width);
  return `<div class="bar" aria-label="${Math.round(value)} percent"><span class="${color}">${"█".repeat(filled)}</span><span class="empty">${"░".repeat(width-filled)}</span></div>`;
}

export function activityLogView(s, modifier="", animateLatest=false) {
  const entries=(s.activityLog||[]).slice(-10);
  if(!entries.length)return "";
  return `<section class="activity-log ${modifier}" aria-label="Event log"><div class="activity-rule"><span>LOG</span></div><div class="activity-messages">${entries.map((entry,index)=>`<p class="activity-entry ${animateLatest&&index===entries.length-1?'activity-writing':''}"><span>${esc(entry.type||"event")}</span>${esc(entry.text)}</p>`).join("")}</div></section>`;
}

export function officeMap() {
  return `<section class="map-region"><div class="office-title">RUE DU CANAL / FLOOR 2</div><div class="office">
    <div class="zone z-bedroom"><span class="label">ORIGINAL DESK</span>\n\n     ○\n  ┌───────┐\n  │   ▪   │\n  └───────┘\n  the stain stayed.</div>
    <div class="zone z-creative"><span class="label creative">CREATIVE</span>\n\n <span class="person fire">●</span>       <span class="person block">●</span>       ●\n┌─────┐ ┌─────┐ ┌─────┐\n│ ▪ ▪ │ │ ▪ ▪ │ │ ▪ ▪ │\n└─────┘ └─────┘ └─────┘</div>
    <div class="zone z-strategy"><span class="label insight">STRATEGY</span>\n\n   <span class="person sick">○</span>          ○\n ───────    ───────\n     · · · · ·</div>
    <div class="zone z-meeting"><b>CLIENT MEETING</b>\n\n╭────────────────╮\n│  ○    ○    ○   │\n╰────────────────╯\n       ▒▒</div>
    <div class="zone z-account"><b>ACCOUNT</b>\n\n ○        ○\n──────  ──────\n        ☎</div>
    <div class="zone z-production"><span class="label craft">CRAFT / PRODUCTION</span>\n\n □        ●\n──────  ──────\n ░░░░    ▣</div>
    <div class="zone z-kitchen"><b>COFFEE</b>\n\n   ▣     ✣\n ─────────</div>
    <div class="map-note">the agency grew around the desk.<br><br>nobody remembers agreeing to the purple chairs.</div>
  </div></section>`;
}

function resourcePanel(s) {
  return `<div class="section"><div class="section-title">STOCK / PREPARED WHILE NOBODY WAS LOOKING</div>
    ${resource("IDEAS", s.resources.ideas, "fill-yellow")}${resource("INSIGHTS", s.resources.insights, "fill-blue")}${resource("CRAFT", s.resources.craft, "fill-purple")}</div>
    <div class="section"><div class="section-title">CAPACITY / CAN ACTUALLY BE SPENT</div>
    ${capacity("CREATIVE", s.capacity.creative,"fill-yellow")}${capacity("STRATEGY",s.capacity.strategy,"fill-blue")}${capacity("CRAFT",s.capacity.craft,"fill-purple")}</div>`;
}
function resource(name, value, color) { return `<div class="row"><div class="row-head"><span>${name}</span><span>${Math.floor(value)}</span></div>${bar(value % 101,color)}</div>`; }
function capacity(name, value, color) { return `<div class="row"><div class="row-head"><span>${name}</span><span class="small">${value < 35 ? "recovering" : "available"}</span></div>${bar(value,color)}</div>`; }

function campaignPanel(s) {
  const c=s.campaign;
  let decision = c.decision ? `<div class="choice"><span class="label insight">CLIENT REVIEW</span><p>“We love option 2.<br><br>Can we make it<br>more like option 1?”</p><button data-choice="defend">[ defend the idea ]</button><button data-choice="adapt">[ adapt ]</button></div>` : "";
  let award = s.awardEligible ? `<div class="choice"><span class="label creative">AWARDS</span><p>the case film could be convincing.<br>the invoice certainly is.</p><button data-choice="award">[ submit to CBA — € 2,400 ]</button></div>` : "";
  return `<div class="section"><div class="section-title">ACTIVE CAMPAIGN</div><div class="row-head"><span>${c.name}</span><span class="label ${c.completed?'':'warning'}">${c.phase}</span></div><div class="phase">${bar(c.progress,"fill-yellow",18)}</div>
    <div class="small">CLIENT BUDGET&nbsp;&nbsp; €32,000<br>EST. PROFIT&nbsp;&nbsp;&nbsp;&nbsp; ${money(c.margin)}</div></div>
    ${c.completed ? `<p>the invoice went out.<br><br>staff returned to research.</p>` : Object.entries(c.staffing).map(([role,n])=>staff(role,n)).join("")}${decision}${award}`;
}
function staff(role,n){ return `<div class="staff-row"><span>${role.toUpperCase()}</span><button data-staff="${role}" data-delta="-1">−</button><span>${"+".repeat(n)||"·"}</span><button data-staff="${role}" data-delta="1">+</button></div>`; }

function peoplePanel(s) { return s.people.map(p=>`<div class="person-row"><div class="row-head"><span>${esc(p.name)}</span><span class="small">${esc(p.role)}</span></div><span class="person-state label ${p.className==='fire'?'warning':p.className==='block'?'craft':p.className==='sick'?'insight':''}">${esc(p.state)}</span><p class="small">${esc(p.status)}<br>salary ${money(p.salary)} / cycle</p></div>`).join(""); }
function clientsPanel(s) { return `<div class="client-row"><span class="label">RETAINER</span><h3>${s.retainer.name}</h3><p class="small">always on.<br>safe enough to become dangerous.</p>${bar(s.retainer.progress,"fill-green",18)}${Object.entries(s.retainer.staffing).map(([r,n])=>`<div class="staff-row"><span>${r.toUpperCase()}</span><button disabled>−</button><span>${"+".repeat(n)}</span><button disabled>+</button></div>`).join("")}</div><p>CASH&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; +++<br>REPUTATION&nbsp; +</p>`; }
function eventsPanel(s) { return s.events.map(e=>`<div class="event"><div class="event-time">${e.age}</div><p>${esc(e.text).replaceAll("\n","<br>")}</p></div>`).join(""); }
function toolsPanel(s) { const tools=[['ADOBE CREATIVE CLOUD','€620 / cycle','necessary evil.','adobe'],['AI GENERATIVE','€480 / cycle','everyone has an opinion.','ai'],['MACBOOK PRO','one-shot','runs Adobe, usually.','macbook'],['COFFEE MACHINE','one-shot','morale recovery +','coffee']]; return tools.map(([n,c,d,k])=>`<div class="tool-row"><span>${n}</span><span class="tool-status label">${s.tools[k]?'ACTIVE':'OFF'}</span><p class="small">${c}<br>${d}</p></div>`).join(""); }

export function agencyView(s, afkNote="") {
  const panels={resources:resourcePanel,campaigns:campaignPanel,people:peoplePanel,clients:clientsPanel,events:eventsPanel,tools:toolsPanel};
  return `<div class="agency">${officeMap()}${activityLogView(s,"activity-log-agency",s.activityLogPulse)}<aside class="side"><nav class="tabs">${s.unlockedTabs.map(t=>`<button class="${t===s.activeTab?'active':''}" data-tab="${t}">${t.toUpperCase()}</button>`).join("")}</nav><div class="panel">${panels[s.activeTab](s)}</div></aside>
  <footer class="status"><div><div class="stat-label">MORALE</div><div class="stat-value">${bar(s.morale,"fill-yellow",8)}</div></div><div><div class="stat-label">CASHFLOW</div><div class="stat-value">${s.cashflow>=0?'+++':'—'}</div></div><div><div class="stat-label">REPUTATION</div>${bar(s.reputation,"fill-blue",9)}</div><div><div class="stat-label">CASH</div><div class="cash">${money(s.cash)}</div></div></footer>${afkNote?`<div class="afk-note">WHILE YOU WERE AWAY<br>${afkNote}</div>`:""}</div>`;
}
