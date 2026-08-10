const state = {
  cash: 480, insights: 18, trends: 12, clients: 3, reputation: 24,
  stock: { coffee: 7, cigarette: 4, water: 9, beer: 2, bedo: 1 },
  owned: [], soloClicks: 0,
};

const items = [
  { id: 'desk', name: 'Bureau IKEA (presque)', price: 120, glyph: '[==]' },
  { id: 'monitor', name: 'Écran calibré', price: 180, glyph: '[▣]' },
  { id: 'coffee', name: 'Machine à café', price: 260, glyph: '{☕}' },
  { id: 'table', name: 'Table de réunion', price: 420, glyph: '/___\\' },
  { id: 'plant', name: 'Monstera fatigué', price: 90, glyph: '\\|/' },
];

const mapBase = String.raw`
      STRATEGY                 CREATIVE                  PRODUCTION
   .--------------.       .----------------.        .--------------.
   | @ Lotte      |       |  @ Jules       |        | @ Noor       |
   | [briefs]  ▓▓ |       |  [ C R T ]  ░░ |        | [render] ▓▓▓ |
   '--------------'       '----------------'        '--------------'

                 o               o                         o
        . . . . .|. . . . . . . | . . . . . . . . . . . |. . .
                 |               |                         |

   ACCOUNT                    THE BIG TABLE                 SOCIAL
 .--------------.        .--------------------.       .--------------.
 | @ Sofie      |        |   ______________   |       | @ Yassine    |
 | tel: RING!   |        |  |   meeting?   |  |       | #latergram   |
 '--------------'        |  |______________|  |       '--------------'
                         '--------------------'

    KITCHEN                 WINDOW / RAIN               EMPTY CORNER
 .-------------.         |||||||||||||||||||||       .--------------.
 | ☕  H₂O  🍺 |         |  bxl.exe is grey  |       |              |
 | [FRIDGE]    |         |||||||||||||||||||||       |     ${' '.repeat(8)} |
 '-------------'                                      '--------------'
`;

const $ = (q) => document.querySelector(q);
const formatCash = () => `€ ${state.cash.toLocaleString('fr-BE')}`;

function render() {
  $('#cash').textContent = formatCash();
  ['insights', 'trends', 'clients', 'reputation'].forEach(key => $(`#${key}`).textContent = state[key]);
  $('#insightsBar').style.width = `${Math.min(state.insights, 100)}%`;
  $('#trendsBar').style.width = `${Math.min(state.trends, 100)}%`;
  $('#stockGrid').innerHTML = Object.entries(state.stock).map(([name, count]) =>
    `<div class="stock"><b>${count}</b>${name.toUpperCase()}</div>`).join('');
  $('#shopList').innerHTML = items.map(item => {
    const owned = state.owned.includes(item.id);
    return `<div class="shop-item ${owned ? 'owned' : ''}"><span>${item.glyph} ${item.name}</span><span class="shop-price">€${item.price}</span><button class="buy" data-buy="${item.id}" ${owned ? 'disabled' : ''}>${owned ? 'OK' : 'BUY'}</button></div>`;
  }).join('');
  const corner = state.owned.length ? state.owned.map(id => items.find(i => i.id === id).glyph).join(' ') : '              ';
  $('#agencyMap').textContent = mapBase.replace('        ', corner.slice(0, 14));
}

function log(message) { $('#eventLog').textContent = message; }

function openAgency() {
  $('#soloView').hidden = true;
  $('#agencyView').hidden = false;
  $('#skipButton').innerHTML = 'RESET / SOLO <span>↩</span>';
  $('#skipButton').onclick = () => location.reload();
  render();
}

$('#skipButton').addEventListener('click', openAgency, { once: true });

const soloLines = [
  'Une idée arrive. Elle demande un budget production.',
  'Tu renommes final_v7 en final_v8_REAL.',
  'Un client répond « intéressant » sans autre précision.',
  'Quelqu’un, quelque part, approuve le headline.',
];

$('#thinkButton').addEventListener('click', () => {
  state.soloClicks++;
  $('#narrative').textContent = soloLines[(state.soloClicks - 1) % soloLines.length];
  if (state.soloClicks === 4) {
    $('#thinkButton').textContent = '[ OUVRIR L’AGENCE ]';
    $('#thinkButton').onclick = openAgency;
  }
});

$('.actions').addEventListener('click', (event) => {
  const action = event.target.dataset.action;
  if (!action) return;
  if (action === 'pitch') {
    const win = Math.random() > .28;
    if (win) { state.cash += 110 + state.clients * 12; state.clients++; state.reputation += 3; log('Pitch gagné. Le client demande quand même « plus de wow ».'); }
    else { state.insights = Math.max(0, state.insights - 3); log('Pitch perdu. Le deck était magnifique. Personne ne sait pourquoi.'); }
  }
  if (action === 'trend') { state.trends += 7; state.insights += 2; log('Tu as détecté une micro-tendance avant Anvers. +7 trends.'); }
  if (action === 'brew') { state.stock.coffee++; state.reputation++; log('Le café est douteux, le moral remonte quand même.'); }
  render();
});

$('#shopList').addEventListener('click', (event) => {
  const id = event.target.dataset.buy;
  if (!id) return;
  const item = items.find(i => i.id === id);
  if (state.cash < item.price) { log(`Il manque €${item.price - state.cash}. Refais un pitch.`); return; }
  state.cash -= item.price; state.owned.push(id); state.reputation += 2;
  log(`${item.name} installé. L'agence paraît immédiatement 4% plus sérieuse.`);
  render();
});

setInterval(() => {
  if ($('#agencyView').hidden) return;
  state.cash += state.clients * 2;
  render();
}, 5000);

render();
