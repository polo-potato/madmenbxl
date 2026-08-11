import { eventPool } from "./content.js";

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

export function simulate(state, seconds, offline = false) {
  if (state.mode !== "agency" || seconds <= 0) return null;
  const capped = Math.min(seconds, 60 * 60 * 12);
  const productive = state.people.filter(p => p.status !== "UNAVAILABLE");
  const creatives = productive.filter(p => p.role === "Creative").length;
  const strategy = productive.filter(p => p.role === "Strategist").length;
  const craft = productive.filter(p => ["Designer", "Producer"].includes(p.role)).length;
  state.resources.ideas += capped * (.025 + creatives * .012);
  state.resources.insights += capped * (.018 + strategy * .015);
  state.resources.craft += capped * (.021 + craft * .011);
  Object.keys(state.capacity).forEach(k => state.capacity[k] = clamp(state.capacity[k] + capped * .08, 0, 100));
  state.cash += capped * state.cashflow / 3600;
  state.retainer.progress = (state.retainer.progress + capped * .55) % 100;
  if (!state.campaign.paused && !state.campaign.completed) {
    state.campaign.progress += capped * .75;
    if (state.campaign.progress >= 100) completeCampaign(state);
  }
  if (!offline && Date.now() - state.lastEventAt > 45000 && Math.random() < .08) {
    state.events.unshift({ age: "NOW", text: eventPool[Math.floor(Math.random() * eventPool.length)] });
    state.events = state.events.slice(0, 8);
    state.lastEventAt = Date.now();
  }
  return offline ? { seconds: capped, cash: capped * state.cashflow / 3600 } : null;
}

export function completeCampaign(state) {
  state.campaign.progress = 100;
  state.campaign.phase = "DELIVERED";
  state.campaign.completed = true;
  state.campaign.paused = false;
  state.campaign.decision = false;
  state.cash += state.campaign.margin;
  state.reputation = Math.min(100, state.reputation + 7);
  state.awardEligible = true;
  state.people.forEach(p => { if (p.status === "ON PROJECT") p.status = p.role === "Creative" ? "RESEARCH" : "STANDBY"; });
  state.events.unshift({ age: "NOW", text: "NIGHT TRAIN delivered.\n\nprofit € " + state.campaign.margin.toLocaleString("en-US") + "\nreputation ↑" });
}
