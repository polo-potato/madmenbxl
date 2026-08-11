const state = {
  cash: 480, insights: 18, trends: 12, clients: 3, reputation: 24,
  ideas: 8, output: 4, morale: 62, hype: 5,
  soloClicks: 0, tick: 0,
  history: ['Le studio bourdonne. Un deadline approche.'],
};

const employees = [
  { name: 'Lotte', produces: { insights: 2, trends: 1 } },
  { name: 'Jules', produces: { ideas: 2 } },
  { name: 'Noor', produces: { output: 1 } },
  { name: 'Sofie', produces: { cash: 8, reputation: 1 } },
  { name: 'Yassine', produces: { hype: 2, trends: 1 } },
];

const mapFrames = ['·', 'o', '*', '°'];
const $ = query => document.querySelector(query);
const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const payroll = 319;
const historyText = () => state.history.slice(-6).map((entry, index, list) => `${index === list.length - 1 ? '>' : '·'} ${entry}`).join('\n');

const mapBase = () => String.raw`
      STRATEGY                 CREATIVE                  PRODUCTION
   .--------------.       .----------------.        .--------------.
   | @ Lotte      |       |  @ Jules       |        | @ Noor       |
   | [briefs]  ▓▓ |       |  [ C R T ]  ░░ |        | [render] ▓▓▓ |
   '--------------'       '----------------'        '--------------'

            ${mapFrames[state.tick % 4]}    o               ${mapFrames[(state.tick + 1) % 4]}                         o
        . . . . .|. . . . . . . | . . . . . . . . . . . |. . .
                 |               |                         |

   ACCOUNT                    THE BIG TABLE                 SOCIAL
 .--------------.        .--------------------.       .--------------.
 | @ Sofie      |        |   ______________   |       | @ Yassine ${mapFrames[(state.tick + 2) % 4]} |
 | tel: RING!   |        |  |   meeting?   |  |       | #latergram   |
 '--------------'        |  |______________|  |       '--------------'
                         '--------------------'

    KITCHEN                 WINDOW / RAIN                 STATUS
 .-------------.         |||||||||||||||||||||       .--------------.
 | ☕  M  H₂O  |         |  bxl.exe is grey  |       | clients: ${String(state.clients).padStart(2, '0')}  |
 | [FRIDGE] ${mapFrames[state.tick % 4]} |         |||||||||||||||||||||       | ideas:   ${String(Math.floor(state.ideas)).padStart(2, '0')}  |
 '-------------'                                      '--------------'
`;

const feedText = () => String.raw`
AGENCY / LIVE

  @ LOTTE       ${Math.floor(state.insights)} insights
      · ${Math.floor(state.trends)} trends

  @ JULES       ${Math.floor(state.ideas)} ideas
  @ NOOR        ${Math.floor(state.output)} output
  @ SOFIE       ${state.clients} clients
  @ YASSINE     ${Math.floor(state.hype)} hype

  cash          €${Math.floor(state.cash)}
  reputation    ${Math.floor(state.reputation)}

ACTIVITY

${historyText()}
`;

function render() {
  $('#cash').textContent = `€ ${Math.floor(state.cash).toLocaleString('fr-BE')}`;
  $('#agencyMap').textContent = mapBase();
  $('#agencyFeed').textContent = feedText();
}

function log(message) {
  state.history.push(message);
  if (state.history.length > 12) state.history.shift();
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

$('.actions').addEventListener('click', event => {
  const action = event.target.dataset.action;
  if (!action) return;
  if (action === 'pitch') {
    if (state.insights < 8 || state.ideas < 5 || state.output < 2) {
      log('Pitch impossible · 8 insights / 5 ideas / 2 output.');
      render(); return;
    }
    state.insights -= 8; state.ideas -= 5; state.output -= 2;
    const won = Math.random() * 120 < state.reputation + state.hype + state.morale / 2;
    if (won) { state.cash += 180 + state.clients * 18; state.clients++; state.reputation += 4; log('PITCH GAGNÉ · scope déjà flou.'); }
    else { state.morale = clamp(state.morale - 7); log('Pitch perdu · learnings riches.'); }
  }
  if (action === 'concept') { state.ideas += 4; state.output++; state.morale = clamp(state.morale - 1); log('+4 ideas · plateforme de marque.'); }
  if (action === 'trend') { state.trends += 6; state.insights++; state.hype++; log('+6 trends · repérée avant Anvers.'); }
  if (action === 'invoice') { const gain = 25 + state.clients * 7; state.cash += gain; state.morale = clamp(state.morale - 2); log(`+€${gain} · petit follow-up.`); }
  render();
});

function autoWork() {
  if ($('#agencyView').hidden) return;
  state.tick++;
  employees.forEach(employee => Object.entries(employee.produces).forEach(([resource, amount]) => state[resource] += amount));
  state.cash -= payroll / 12;
  state.morale = clamp(state.morale - .35);
  if (state.tick % 6 === 0) {
    const events = ['Noor exporte final_FINAL_v3.mov.', 'Sofie propose un petit point.', 'Yassine défend un meme.', 'Jules fixe le mur. Ça travaille.', 'La pluie reprend sur Saint-Gilles.'];
    log(events[(state.tick / 6) % events.length | 0]);
  }
  render();
}

setInterval(autoWork, 5000);
setInterval(() => {
  if (!$('#agencyView').hidden) $('#agencyClock').textContent = new Date().toLocaleTimeString('fr-BE', { hour: '2-digit', minute: '2-digit' });
}, 1000);

render();
