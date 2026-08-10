const state = {
  cash: 480, insights: 18, trends: 12, clients: 3, reputation: 24,
  ideas: 8, output: 4, morale: 62, hype: 5,
  stock: { coffee: 7, matcha: 3, water: 9, beer: 2, bedo: 1 },
  boosts: {}, owned: [], soloClicks: 0, tick: 0,
};

const consumables = {
  coffee: { label: 'COFFEE', icon: '☕', effect: 'Lotte +100% / 20s' },
  matcha: { label: 'MATCHA', icon: 'M', effect: 'Lotte +150% / 30s' },
  water: { label: 'WATER', icon: 'H₂O', effect: '+8 morale' },
  beer: { label: 'BEER', icon: '🍺', effect: '+4 hype, -3 morale' },
  bedo: { label: 'BEDO', icon: '~', effect: '+10 ideas, -4 output' },
};

const employees = [
  { id: 'lotte', name: 'Lotte', role: 'STRATÈGE', salary: 72, popularity: 67, output: '+2 insights · +1 trend', produces: { insights: 2, trends: 1 } },
  { id: 'jules', name: 'Jules', role: 'CREATIVE', salary: 64, popularity: 54, output: '+2 ideas', produces: { ideas: 2 } },
  { id: 'noor', name: 'Noor', role: 'PRODUCTION', salary: 58, popularity: 81, output: '+1 output', produces: { output: 1 } },
  { id: 'sofie', name: 'Sofie', role: 'ACCOUNT', salary: 76, popularity: 43, output: '+€8 · clients happy', produces: { cash: 8, reputation: 1 } },
  { id: 'yassine', name: 'Yassine', role: 'SOCIAL', salary: 49, popularity: 91, output: '+2 hype · +1 trend', produces: { hype: 2, trends: 1 } },
];

const items = [
  { id: 'desk', name: 'Bureau IKEA (presque)', price: 120, glyph: '[==]' },
  { id: 'monitor', name: 'Écran calibré', price: 180, glyph: '[▣]' },
  { id: 'coffee', name: 'Machine à café', price: 260, glyph: '{☕}' },
  { id: 'table', name: 'Table de réunion', price: 420, glyph: '/___\\' },
  { id: 'plant', name: 'Monstera fatigué', price: 90, glyph: '\\|/' },
];

const $ = (q) => document.querySelector(q);
const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, n));
const formatCash = () => `€ ${Math.floor(state.cash).toLocaleString('fr-BE')}`;
const payroll = () => employees.reduce((sum, e) => sum + e.salary, 0);
const incomePerTick = () => employees.reduce((sum, e) => sum + (e.produces.cash || 0), 0);
const ideasPerTick = () => employees.reduce((sum, e) => sum + (e.produces.ideas || 0), 0);

function objectiveMarkup() {
  const pitchReady = Math.min(state.insights / 8, state.ideas / 5, state.output / 2) * 100;
  const objectives = [
    { label: 'NEXT PITCH', value: pitchReady, text: `${Math.min(100, Math.floor(pitchReady))}%` },
    { label: '€1K RUNWAY', value: state.cash / 10, text: `€${Math.floor(state.cash)}/1000` },
    { label: 'CULT STATUS', value: state.reputation * 2, text: `${Math.floor(state.reputation)}/50 rep` },
  ];
  return objectives.map(o => `<div class="objective"><div class="objective-head"><span>${o.label}</span><span>${o.text}</span></div><div class="objective-track"><i style="width:${clamp(o.value)}%"></i></div></div>`).join('');
}

function render() {
  $('#cash').textContent = formatCash();
  ['insights', 'trends', 'clients', 'reputation', 'ideas', 'output', 'hype'].forEach(key => $(`#${key}`).textContent = Math.floor(state[key]));
  $('#morale').textContent = `${Math.floor(state.morale)}%`;
  $('#payroll').textContent = `-€${payroll()}/MIN`;
  const netTick = incomePerTick() - payroll() / 12;
  const health = clamp(state.morale * .45 + state.reputation * .35 + Math.min(100, state.cash / 8) * .2);
  $('#agencyHealth').textContent = `${Math.floor(health)}%`;
  $('#healthBar').style.width = `${health}%`;
  $('#healthStatus').textContent = health > 72 ? ':: THRIVING' : health > 45 ? ':: STABLE' : ':: FRAGILE';
  $('#cashFlow').textContent = `+€${incomePerTick()}/tick income  −  €${(payroll()/12).toFixed(1)}/tick salary  =  ${netTick >= 0 ? '+€' : '−€'}${Math.abs(netTick).toFixed(1)}`;
  $('#ideaFlow').textContent = `+${ideasPerTick()}/tick auto  ·  pitch costs 5  ·  current ${Math.floor(state.ideas)}`;
  $('#farmSummary').textContent = `+${employees[0].produces.insights} insight · +${employees[0].produces.trends + employees[4].produces.trends} trends · +${ideasPerTick()} ideas · +1 output / tick`;
  $('#objectiveList').innerHTML = objectiveMarkup();
  $('#stockGrid').innerHTML = Object.entries(state.stock).map(([name, count]) => {
    const c = consumables[name];
    return `<button class="stock" data-consume="${name}" title="${c.effect}" ${count < 1 ? 'disabled' : ''}><b>${count}</b>${c.label}</button>`;
  }).join('');
  $('#teamList').innerHTML = employees.map(employee => {
    const active = state.boosts[employee.id] > Date.now();
    const boost = employee.id === 'lotte' && active ? ' · BOOST' : '';
    return `<article class="employee"><div class="employee-top"><div><div class="employee-name">@ ${employee.name}<small>${employee.role}</small></div><div class="employee-role">POP ${employee.popularity}/100 · €${employee.salary}/MIN</div></div><div class="employee-output ${active ? 'boosted' : ''}">${employee.output}${boost}</div></div><div class="employee-meta"><span>${employee.popularity > 75 ? 'aimé·e du studio' : employee.popularity > 50 ? 'bonne vibe' : 'slack en sourdine'}</span><span>${active ? 'ON FIRE' : 'working...'}</span></div><div class="pop-track"><i style="width:${employee.popularity}%"></i></div></article>`;
  }).join('');
  $('#shopList').innerHTML = items.map(item => {
    const owned = state.owned.includes(item.id);
    return `<div class="shop-item ${owned ? 'owned' : ''}"><span>${item.glyph} ${item.name}</span><span class="shop-price">€${item.price}</span><button class="buy" data-buy="${item.id}" ${owned ? 'disabled' : ''}>${owned ? 'OK' : 'BUY'}</button></div>`;
  }).join('');
  document.querySelector('.strategy')?.classList.toggle('boosted-station', state.boosts.lotte > Date.now());
}

function log(message) {
  $('#eventLog').textContent = message;
  $('#agencyMap').classList.remove('map-flash');
  requestAnimationFrame(() => $('#agencyMap').classList.add('map-flash'));
}

function openAgency() {
  $('#soloView').hidden = true;
  $('#agencyView').hidden = false;
  $('#skipButton').innerHTML = 'RESET / SOLO <span>↩</span>';
  $('#skipButton').onclick = () => location.reload();
  render();
}

$('#skipButton').addEventListener('click', openAgency, { once: true });

const soloLines = ['Une idée arrive. Elle demande un budget production.', 'Tu renommes final_v7 en final_v8_REAL.', 'Un client répond « intéressant » sans autre précision.', 'Quelqu’un, quelque part, approuve le headline.'];
$('#thinkButton').addEventListener('click', () => {
  state.soloClicks++;
  $('#narrative').textContent = soloLines[(state.soloClicks - 1) % soloLines.length];
  if (state.soloClicks === 4) { $('#thinkButton').textContent = '[ OUVRIR L’AGENCE ]'; $('#thinkButton').onclick = openAgency; }
});

$('.actions').addEventListener('click', (event) => {
  const action = event.target.dataset.action;
  if (!action) return;
  if (action === 'pitch') {
    if (state.insights < 8 || state.ideas < 5 || state.output < 2) { log('Pitch impossible : il faut 8 insights, 5 ideas et 2 output.'); return; }
    state.insights -= 8; state.ideas -= 5; state.output -= 2;
    const score = state.reputation + state.hype + state.morale / 2;
    if (Math.random() * 120 < score) { state.cash += 180 + state.clients * 18; state.clients++; state.reputation += 4; log('PITCH GAGNÉ — budget validé, scope déjà flou.'); }
    else { state.morale = clamp(state.morale - 7); log('Pitch perdu. Lotte dit que « les learnings sont riches ».'); }
  }
  if (action === 'concept') { state.ideas += 4; state.output += 1; state.morale = clamp(state.morale - 1); log('+4 ideas · Jules appelle ça une plateforme de marque.'); }
  if (action === 'trend') { state.trends += 6; state.insights += 1; state.hype += 1; log('Trend repérée 14 minutes avant Anvers.'); }
  if (action === 'invoice') { const gain = 25 + state.clients * 7; state.cash += gain; state.morale = clamp(state.morale - 2); log(`Facture relancée avec un « petit follow-up ». +€${gain}`); }
  render();
});

$('#stockGrid').addEventListener('click', (event) => {
  const id = event.target.closest('[data-consume]')?.dataset.consume;
  if (!id || state.stock[id] < 1) return;
  state.stock[id]--;
  if (id === 'coffee') { state.boosts.lotte = Date.now() + 20000; employees[0].popularity = clamp(employees[0].popularity + 2); log('Lotte avale un café : stratégie x2 pendant 20 sec.'); }
  if (id === 'matcha') { state.boosts.lotte = Date.now() + 30000; employees[0].popularity = clamp(employees[0].popularity + 4); log('MATCHA MODE — Lotte voit des insights partout. x2.5 pendant 30 sec.'); }
  if (id === 'water') { state.morale = clamp(state.morale + 8); log('Hydratation collective. Personne ne sait à qui appartient la gourde.'); }
  if (id === 'beer') { state.hype += 4; state.morale = clamp(state.morale - 3); log('Une pils tiède : +4 hype, demain sera compliqué.'); }
  if (id === 'bedo') { state.ideas += 10; state.output = Math.max(0, state.output - 4); log('+10 ideas. La deadline, elle, n’a pas bougé.'); }
  render();
});

$('#shopList').addEventListener('click', (event) => {
  const id = event.target.dataset.buy;
  if (!id) return;
  const item = items.find(i => i.id === id);
  if (state.cash < item.price) { log(`Il manque €${item.price - state.cash}. Relance une facture.`); return; }
  state.cash -= item.price; state.owned.push(id); state.reputation += 2;
  if (id === 'coffee') state.stock.coffee += 5;
  if (id === 'plant') state.morale = clamp(state.morale + 8);
  log(`${item.name} installé. L'agence paraît immédiatement 4% plus sérieuse.`);
  render();
});

function autoWork() {
  if ($('#agencyView').hidden) return;
  state.tick++;
  employees.forEach(employee => {
    let multiplier = 1;
    if (employee.id === 'lotte' && state.boosts.lotte > Date.now()) multiplier = state.boosts.lotte - Date.now() > 22000 ? 2.5 : 2;
    Object.entries(employee.produces).forEach(([resource, amount]) => state[resource] += amount * multiplier);
  });
  state.cash -= payroll() / 12;
  state.morale = clamp(state.morale - .35);
  if (state.tick % 6 === 0) {
    const events = ['Noor exporte final_FINAL_v3.mov.', 'Sofie dit « petit point rapide ? ».', 'Yassine défend un meme en réunion.', 'Jules fixe le mur. Ça travaille.', 'La pluie recommence sur Saint-Gilles.'];
    log(events[(state.tick / 6) % events.length | 0]);
  }
  render();
}

let secondsToTick = 5;
setInterval(() => { autoWork(); secondsToTick = 5; }, 5000);
setInterval(() => {
  if (!$('#agencyView').hidden) {
    const d = new Date();
    $('#agencyClock').textContent = d.toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' });
    secondsToTick = secondsToTick <= 1 ? 5 : secondsToTick - 1;
    $('#nextTick').textContent = `0${secondsToTick}s`;
  }
}, 1000);
render();
