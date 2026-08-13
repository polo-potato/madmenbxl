import { peopleSeed, personalActions, prologueGauges } from "./content.js?v=6";

export const SAVE_KEY = "what-if-prototype-v1";

export function initialState() {
  return {
    mode: "intro", beat: 0, char: 0, actionStep: 0, waiting: false, erasing: false, autoTyping: false, autoHold: false, inbox: false,
    unlockedActions: [], introActionNote: "",
    activityLog: [],
    personal: Object.fromEntries(Object.entries(prologueGauges).map(([id,gauge])=>[id,gauge.start])),
    firstBrief: { idea: 0, attempts: 0, eventIndex: 0, pendingEvent: null, eventResult: "", completed: false, promptChar: 0, promptComplete: false, ideaUnlocked: false },
    actionUses: {},
    metricAnimating: false,
    unlockedMetrics: [],
    resources: { ideas: 84, insights: 61, craft: 72 },
    capacity: { creative: 68, strategy: 76, craft: 58 },
    cash: 28450, reputation: 38, morale: 72, cashflow: 2150,
    activeTab: "resources", unlockedTabs: ["resources", "campaigns", "people", "clients", "events", "tools"],
    people: structuredClone(peopleSeed),
    campaign: { name: "NIGHT TRAIN", phase: "REVIEW", progress: 62, paused: true, decision: true, staffing: { creative: 2, strategy: 1, account: 1, craft: 2 }, margin: 9000, completed: false },
    retainer: { name: "NOORD SUPERMARKT", progress: 44, staffing: { creative: 1, strategy: 1, account: 2, craft: 1 } },
    events: [
      { age: "NOW", text: "client feedback:\n\n\"love it. could we explore\nanother direction?\"" },
      { age: "EARLIER", text: "someone brought croissants.\n\nmorale ↑" }
    ],
    tools: { adobe: true, ai: true, macbook: true, coffee: true },
    awardEligible: false, lastSaved: Date.now(), lastEventAt: Date.now()
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    const loaded = raw ? { ...initialState(), ...JSON.parse(raw) } : initialState();
    loaded.unlockedActions = (loaded.unlockedActions || [])
      .map(id => id === "light a cigarette" ? "cigarette" : id)
      .filter(id => id in personalActions);
    loaded.autoTyping = false;
    loaded.autoHold = false;
    loaded.introActionNote = "";
    loaded.metricAnimating = false;
    loaded.activityLogPulse = false;
    loaded.firstBrief = { ...initialState().firstBrief, ...(loaded.firstBrief || {}) };
    loaded.personal = { ...initialState().personal, ...(loaded.personal || {}) };
    loaded.unlockedMetrics = loaded.unlockedMetrics || [];
    loaded.activityLog = (loaded.activityLog || []).slice(-10);
    if (!["intro","inbox"].includes(loaded.mode) && !loaded.activityLog.length) loaded.activityLog = [{ type:"goal", text:"Find a direction for the brief." }];
    return loaded;
  } catch { return initialState(); }
}

export function saveState(state) {
  state.lastSaved = Date.now();
  localStorage.setItem(SAVE_KEY, JSON.stringify(state));
}

export function resetState() { localStorage.removeItem(SAVE_KEY); }
