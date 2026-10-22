/*************************************************************************
 * EFT: RAID OS // МОДУЛЬ 4: АВТОРИЗАЦИЯ, КАБИНЕТЫ ГМ / КУРАТОРОВ / КОМАНДИРОВ
 * Файл: app-views.js
 *************************************************************************/

function renderApp() {
  cleanupMapInstance();
  const viewport = document.getElementById('appViewport');
  const bottomNav = document.getElementById('bottomNav');
  const btnLogout = document.getElementById('btnLogout');
  const roleBadge = document.getElementById('roleBadge');
  const factionIndicator = document.getElementById('factionIndicator');

  if (!session.role) {
    document.body.setAttribute('data-theme', 'gm');
    bottomNav.classList.add('hidden');
    btnLogout.classList.add('hidden');
    roleBadge.textContent = 'АВТОРИЗАЦИЯ';
    factionIndicator.className = 'w-2.5 h-6 rounded-sm bg-amber-500';
    viewport.innerHTML = renderAuthScreen();
    return;
  }

  btnLogout.classList.remove('hidden');
  bottomNav.classList.remove('hidden');

  if (session.role === 'GM') {
    document.body.setAttribute('data-theme', 'gm');
    roleBadge.textContent = 'GAMEMASTER [GLOBAL]';
    factionIndicator.className = 'w-2.5 h-6 rounded-sm bg-amber-400';
    renderGmBottomNav();
    viewport.innerHTML = renderGmScreen();
    if (session.activeTab === 'map') {
      setTimeout(() => initRealSatelliteMap('gmLeafletMap', { enableGmClick: true }), 50);
    }
  } else if (session.role === 'CURATOR') {
    const isBear = session.faction === 'BEAR';
    document.body.setAttribute('data-theme', isBear ? 'bear' : 'usec');
    roleBadge.textContent = isBear ? 'КУРАТОР BEAR (ПРАПОР)' : 'КУРАТОР USEC (МИРОТВОРЕЦ)';
    factionIndicator.className = `w-2.5 h-6 rounded-sm ${isBear ? 'bg-orange-500' : 'bg-sky-500'}`;
    renderCuratorBottomNav();
    viewport.innerHTML = renderCuratorScreen();
    if (session.activeTab === 'map') {
      setTimeout(() => initRealSatelliteMap('curatorLeafletMap', { filterFaction: session.faction }), 50);
    }
  } else if (session.role === 'COMMANDER') {
    const squad = appState.squads.find(s => s.id === session.squadId);
    if (!squad) {
      logoutRole();
      return;
    }
    const isBear = squad.faction === 'BEAR';
    document.body.setAttribute('data-theme', isBear ? 'bear' : 'usec');
    roleBadge.textContent = `${squad.faction} // ${squad.name}`;
    factionIndicator.className = `w-2.5 h-6 rounded-sm ${isBear ? 'bg-orange-500' : 'bg-sky-500'}`;
    renderCommanderBottomNav(squad);
    viewport.innerHTML = renderCommanderScreen(squad);
    if (session.activeTab === 'map') {
      setTimeout(() => initRealSatelliteMap('commanderLeafletMap', { commanderSquad: squad }), 50);
    }
  }
}

function logoutRole() {
  session.role = null;
  session.faction = null;
  session.squadId = null;
  session.activeTab = 'map';
  renderApp();
}

function switchTab(tabName) {
  session.activeTab = tabName;
  renderApp();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderAuthScreen() {
  const ghConnected = isGitHubConfigured();
  return `
    <div class="max-w-md mx-auto space-y-4 mt-2">
      <div class="tactical-card p-5">
        <div class="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
          <div>
            <div class="text-[10px] font-mono text-amber-400 uppercase tracking-widest">// ЗАЩИЩЕННЫЙ ТЕРМИНАЛ ПОЛИГОНА</div>
            <h1 class="font-display text-2xl font-bold text-white uppercase tracking-wide mt-0.5">АВТОРИЗАЦИЯ В СИСТЕМЕ</h1>
          </div>
          <button type="button" onclick="openGitHubCloudModal()" class="text-right font-mono text-[10px] px-2 py-1 rounded border ${ghConnected ? 'border-emerald-700/80 bg-emerald-950/30 text-emerald-300' : 'border-zinc-700 bg-zinc-900 text-zinc-400'}">
            ☁️ GITHUB СЕРВЕР<br><span class="font-bold">${ghConnected ? ghConfig.repo : 'НАСТРОИТЬ'}</span>
          </button>
        </div>

        <form onsubmit="handleUnifiedLogin(event)" class="space-y-3">
          <div>
            <label class="text-[10px] font-mono text-zinc-400 uppercase block mb-1">Позывной / Логин</label>
            <input id="unifiedLoginInput" type="text" required class="input-tactical" placeholder="Введите логин" autocomplete="username" />
          </div>
          <div>
            <label class="text-[10px] font-mono text-zinc-400 uppercase block mb-1">Пароль доступа</label>
            <input id="unifiedPassInput" type="password" required class="input-tactical" placeholder="••••••••••" autocomplete="current-password" />
          </div>
          <button type="submit" class="btn-tactical btn-accent w-full py-3 text-sm font-bold tracking-wider">
            🔐 ВОЙТИ В СИСТЕМУ
          </button>
        </form>

        <div class="my-4 flex items-center gap-3">
          <div class="h-px bg-zinc-800 flex-1"></div>
          <span class="text-[10px] font-mono text-zinc-500 uppercase">КОМАНДИРАМ ГРУПП ЧВК</span>
          <div class="h-px bg-zinc-800 flex-1"></div>
        </div>

        <button type="button" onclick="openPassQrScanner()" class="btn-tactical w-full py-3.5 text-sm font-bold border-emerald-600/80 text-emerald-300 bg-emerald-950/30">
          📷 СКАНИРОВАТЬ QR-ПРОПУСК ОТРЯДА
        </button>
      </div>
    </div>
  `;
}

function handleUnifiedLogin(e) {
  e.preventDefault();
  const login = (document.getElementById('unifiedLoginInput').value || '').trim();
  const pass = (document.getElementById('unifiedPassInput').value || '').trim();

  if (login.toLowerCase() === appState.gmCredentials.login.toLowerCase() && pass === appState.gmCredentials.pass) {
    session.role = 'GM';
    session.activeTab = 'quests';
    showToast('Доступ ГеймМастера подтвержден', 'ok');
    renderApp();
    return;
  }

  const bearCur = appState.curatorCredentials.BEAR;
  if (login.toLowerCase() === bearCur.login.toLowerCase() && pass === bearCur.pass) {
    session.role = 'CURATOR';
    session.faction = 'BEAR';
    session.activeTab = 'map';
    showToast(`Вход выполнен: ${bearCur.callsign}`, 'ok');
    renderApp();
    return;
  }

  const usecCur = appState.curatorCredentials.USEC;
  if (login.toLowerCase() === usecCur.login.toLowerCase() && pass === usecCur.pass) {
    session.role = 'CURATOR';
    session.faction = 'USEC';
    session.activeTab = 'map';
    showToast(`Вход выполнен: ${usecCur.callsign}`, 'ok');
    renderApp();
    return;
  }

  showToast('Неверный логин или пароль!', 'err');
}

async function authenticateSquadByCodeOrQr(rawString) {
  const code = (rawString || '').trim();
  if (!code) return false;

  if (code.startsWith('EFT_SQUAD_CLOUD:')) {
    try {
      const parts = code.split(':');
      const pinPart = parts[1] || '';
      const b64Part = parts.slice(2).join(':');
      const decoded = base64ToUtf8(b64Part).split('|');
      if (decoded.length >= 4) {
        ghConfig.owner = decoded[0];
        ghConfig.repo = decoded[1];
        ghConfig.branch = decoded[2] || 'main';
        ghConfig.token = decoded[3];
        saveGitHubConfig();
        showToast(`Подключен сервер GitHub: ${ghConfig.owner}/${ghConfig.repo}`, 'ok');
        const remote = await fetchServerStateFromGitHub(true);
        if (remote && remote.state) {
          appState = remote.state;
          saveState(true);
        }
      }
      return loginSquadByPinOrId(pinPart);
    } catch (err) {
      console.warn('Cloud QR parse error:', err);
    }
  }

  return loginSquadByPinOrId(code);
}

function loginSquadByPinOrId(codeStr) {
  const codeUpper = (codeStr || '').trim().toUpperCase();
  const matchedSquad = appState.squads.find(sq => {
    const pinUpper = (sq.loginPin || '').toUpperCase();
    const fullQr = `EFT_SQUAD_LOGIN:${sq.id.toUpperCase()}:${pinUpper}`;
    return codeUpper === pinUpper || codeUpper === fullQr || codeUpper.endsWith(':' + pinUpper);
  });

  if (!matchedSquad) {
    showToast('QR-пропуск не распознан или недействителен!', 'err');
    return false;
  }

  session.role = 'COMMANDER';
  session.faction = matchedSquad.faction;
  session.squadId = matchedSquad.id;
  session.activeTab = matchedSquad.respawn.isDead ? 'respawn' : 'tasks';
  showToast(`КПК активирован: ${matchedSquad.name} (${matchedSquad.commanderCallsign})`, 'ok');
  renderApp();
  return true;
}

/*************************************************************************
 * КАБИНЕТ ГЕЙММАСТЕРА (GlobalGM / Disolate26!)
 *************************************************************************/
function renderGmBottomNav() {
  const nav = document.getElementById('bottomNavContainer');
  nav.className = 'max-w-4xl mx-auto grid grid-cols-5 gap-1 p-1.5';
  const tabs = [
    { id: 'quests', icon: '📜', label: 'Квесты' },
    { id: 'squads', icon: '🛡️', label: 'Стороны' },
    { id: 'respawn', icon: '💀', label: 'Мертвяк' },
    { id: 'hints', icon: '💡', label: 'Подсказки' },
    { id: 'map', icon: '🛰️', label: 'Спутник' }
  ];
  nav.innerHTML = tabs.map(t => `
    <button onclick="switchTab('${t.id}')" class="flex flex-col items-center justify-center py-1.5 rounded border text-xs font-mono transition ${session.activeTab === t.id ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold' : 'bg-zinc-900/70 border-zinc-800 text-zinc-400'}">
      <span class="text-base">${t.icon}</span>
      <span class="text-[10px] mt-0.5 uppercase">${t.label}</span>
    </button>
  `).join('');
}

function renderGmScreen() {
  if (session.activeTab === 'quests') return renderGmQuestsTab();
  if (session.activeTab === 'squads') return renderGmSquadsTab();
  if (session.activeTab === 'respawn') return renderGmRespawnTab();
  if (session.activeTab === 'hints') return renderGmHintsTab();
  return renderGmMapTab();
}

function renderGmQuestsTab() {
  const ql = appState.questlines.find(q => q.id === session.selectedQuestlineId) || appState.questlines[0];
  if (ql) session.selectedQuestlineId = ql.id;
  const totalEvidencePhotos = appState.squads.reduce((acc, s) => acc + (s.evidencePhotos ? s.evidencePhotos.length : 0), 0);

  return `
    <div class="space-y-4">
      <div class="tactical-card p-3 flex flex-wrap items-center justify-between gap-2 bg-zinc-900/80">
        <div class="flex items-center gap-2.5">
          <div class="text-xl">☁️</div>
          <div>
            <div class="text-xs font-display font-bold uppercase text-white">
              СЕРВЕР GITHUB: ${isGitHubConfigured() ? `<span class="text-emerald-400">${ghConfig.owner}/${ghConfig.repo}</span>` : '<span class="text-amber-400">НЕ ПОДКЛЮЧЕН</span>'}
            </div>
            <div class="text-[10px] font-mono text-zinc-400">
              Квестлайнов: ${appState.questlines.length} | Отрядов: ${appState.squads.length} | Фото улик в базе: <span class="text-emerald-300 font-bold">${totalEvidencePhotos} шт.</span>
            </div>
          </div>
        </div>
        <div class="flex flex-wrap gap-1.5">
          <button onclick="openGitHubCloudModal()" class="btn-tactical px-2.5 py-1.5 text-xs text-amber-300 border-amber-700/70">⚙️ Настроить GitHub</button>
          <button onclick="manualCloudSyncNow()" class="btn-tactical px-2.5 py-1.5 text-xs text-emerald-300 border-emerald-700/70">🔄 Синхронизировать</button>
        </div>
      </div>

      <div class="tactical-card p-4">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3 mb-3">
          <div>
            <div class="text-[10px] font-mono text-amber-400 uppercase">// КОНСТРУКТОР ОПЕРАЦИЙ</div>
            <h2 class="font-display text-lg font-bold uppercase text-white">Цепочки квестов (Questlines)</h2>
          </div>
          <div class="flex flex-wrap gap-2">
            <button onclick="createNewQuestline()" class="btn-tactical btn-accent px-3 py-1.5 text-xs">+ Новая цепочка</button>
            <button onclick="downloadAllQuestlineQrPngs('${ql.id}')" class="btn-tactical px-3 py-1.5 text-xs text-emerald-300 border-emerald-700">📥 Скачать все QR (PNG)</button>
            <button onclick="printQuestlineQrSheet('${ql.id}')" class="btn-tactical px-3 py-1.5 text-xs text-amber-300 border-amber-700">🖨️ Печать QR А4</button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
          <div>
            <label class="text-[10px] font-mono text-zinc-400 uppercase">Выберите квестлайн</label>
            <select onchange="selectGmQuestline(this.value)" class="input-tactical mt-1">
              ${appState.questlines.map(q => `<option value="${q.id}" ${q.id === ql.id ? 'selected' : ''}>${q.title} (${q.stages.length} эт.)</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="text-[10px] font-mono text-zinc-400 uppercase">Название операции</label>
            <input type="text" value="${ql.title}" onchange="updateQuestlineMeta('${ql.id}', 'title', this.value)" class="input-tactical mt-1" />
          </div>
          <div>
            <label class="text-[10px] font-mono text-zinc-400 uppercase">Шифр операции</label>
            <input type="text" value="${ql.code}" onchange="updateQuestlineMeta('${ql.id}', 'code', this.value)" class="input-tactical mt-1" />
          </div>
        </div>

        <div>
          <label class="text-[10px] font-mono text-zinc-400 uppercase">Общая сюжетная вводная квестлайна</label>
          <textarea rows="2" onchange="updateQuestlineMeta('${ql.id}', 'description', this.value)" class="input-tactical mt-1">${ql.description}</textarea>
        </div>
      </div>

      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-mono uppercase text-zinc-400">Поочередные этапы цепочки (${ql.stages.length}):</span>
          <button onclick="addStageToQuestline('${ql.id}')" class="btn-tactical btn-accent px-3 py-1.5 text-xs">+ Добавить этап</button>
        </div>

        ${ql.stages.map((st, idx) => `
          <div class="tactical-card p-4 space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2">
              <div class="flex items-center gap-2">
                <span class="px-2 py-0.5 rounded bg-amber-500 text-black font-mono font-extrabold text-xs">ЭТАП #${idx + 1}</span>
                <input type="text" value="${st.title}" onchange="updateStageField('${ql.id}','${st.id}','title',this.value)" class="input-tactical font-bold max-w-xs" />
              </div>
              <div class="flex items-center gap-1.5">
                <button onclick="downloadStageQrPng('${ql.id}','${st.id}')" class="btn-tactical px-2.5 py-1 text-xs text-emerald-300 border-emerald-700">💾 Скачать QR</button>
                <button onclick="moveStageOrder('${ql.id}','${st.id}',-1)" class="btn-tactical px-2 py-1 text-xs" title="Выше">↑</button>
                <button onclick="moveStageOrder('${ql.id}','${st.id}',1)" class="btn-tactical px-2 py-1 text-xs" title="Ниже">↓</button>
                <button onclick="deleteStage('${ql.id}','${st.id}')" class="btn-tactical px-2 py-1 text-xs text-red-400 border-red-900/60">✕</button>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div class="md:col-span-3 space-y-2.5">
                <div class="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div class="sm:col-span-2">
                    <label class="text-[10px] font-mono text-zinc-400 uppercase">Точка / Ориентир</label>
                    <input type="text" value="${st.locationName}" onchange="updateStageField('${ql.id}','${st.id}','locationName',this.value)" class="input-tactical mt-0.5" />
                  </div>
                  <div>
                    <label class="text-[10px] font-mono text-amber-400 uppercase">4-значный ПИН</label>
                    <input type="text" maxlength="8" value="${st.pinCode}" onchange="updateStageField('${ql.id}','${st.id}','pinCode',this.value)" class="input-tactical mt-0.5 font-bold text-amber-300 text-center tracking-widest" />
                  </div>
                  <div>
                    <label class="text-[10px] font-mono text-zinc-400 uppercase">GPS (Широта, Долгота)</label>
                    <div class="flex gap-1 mt-0.5">
                      <input type="number" step="0.0001" value="${st.lat}" onchange="updateStageField('${ql.id}','${st.id}','lat',parseFloat(this.value))" class="input-tactical text-center px-1" />
                      <input type="number" step="0.0001" value="${st.lng}" onchange="updateStageField('${ql.id}','${st.id}','lng',parseFloat(this.value))" class="input-tactical text-center px-1" />
                    </div>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label class="text-[10px] font-mono text-orange-400 uppercase">Брифинг для BEAR (Прапор)</label>
                    <textarea rows="2" onchange="updateStageField('${ql.id}','${st.id}','bearBriefing',this.value)" class="input-tactical mt-0.5 text-xs">${st.bearBriefing}</textarea>
                  </div>
                  <div>
                    <label class="text-[10px] font-mono text-sky-400 uppercase">Брифинг для USEC (Миротворец)</label>
                    <textarea rows="2" onchange="updateStageField('${ql.id}','${st.id}','usecBriefing',this.value)" class="input-tactical mt-0.5 text-xs">${st.usecBriefing}</textarea>
                  </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label class="text-[10px] font-mono text-amber-300 uppercase">Текст подсказки (по правилам ГМ)</label>
                    <input type="text" value="${st.hintText}" onchange="updateStageField('${ql.id}','${st.id}','hintText',this.value)" class="input-tactical mt-0.5 text-xs" />
                  </div>
                  <div>
                    <label class="text-[10px] font-mono text-emerald-400 uppercase">Дополнительная задача на этапе</label>
                    <input type="text" value="${st.sideTask || ''}" onchange="updateStageField('${ql.id}','${st.id}','sideTask',this.value)" class="input-tactical mt-0.5 text-xs" />
                  </div>
                </div>

                <div class="flex flex-wrap items-center gap-4 pt-1 text-xs font-mono">
                  <label class="flex items-center gap-1.5 cursor-pointer">
                    <input type="checkbox" ${st.requiresPhoto ? 'checked' : ''} onchange="updateStageField('${ql.id}','${st.id}','requiresPhoto',this.checked)" />
                    <span>📸 Обязательно фото улики (в GitHub)</span>
                  </label>
                  <label class="flex items-center gap-1.5 cursor-pointer text-amber-300">
                    <input type="checkbox" ${st.isSkierStage ? 'checked' : ''} onchange="updateStageField('${ql.id}','${st.id}','isSkierStage',this.checked)" />
                    <span>🦊 Контакт с Лыжником (Ключ за жетоны)</span>
                  </label>
                </div>
              </div>

              <div class="flex flex-col items-center justify-center bg-zinc-950 p-3 rounded border border-zinc-800">
                <div class="bg-white p-1.5 rounded">
                  ${generateQrSvgString(st.qrPayload, 3)}
                </div>
                <div class="text-[10px] font-mono text-zinc-400 mt-1.5 text-center break-all">${st.qrPayload}</div>
                <div class="text-xs font-mono font-bold text-amber-400 mt-0.5">ПИН: ${st.pinCode}</div>
                <button onclick="downloadStageQrPng('${ql.id}','${st.id}')" class="btn-tactical btn-accent w-full py-1.5 mt-2 text-[11px] font-bold">
                  💾 Скачать QR (PNG)
                </button>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function selectGmQuestline(qlId) {
  session.selectedQuestlineId = qlId;
  renderApp();
}

function createNewQuestline() {
  const id = 'ql-' + Date.now().toString().slice(-4);
  const center = appState.polygonCenter || POLYGON_ORIGIN;
  appState.questlines.push({
    id,
    title: 'Операция «Синий Огонь»',
    code: 'OP-EMP-' + id.slice(-2).toUpperCase(),
    description: 'Полевое расследование испытаний направленного ЭМИ-излучателя TerraGroup в секторе «Полихим».',
    active: true,
    stages: [
      {
        id: 'st-' + Date.now(),
        order: 1,
        title: 'Этап 1: Точка входа в сектор',
        locationName: 'КПП Северный (Архивный короб)',
        x: 50, y: 50,
        lat: center.lat, lng: center.lng,
        pinCode: '1045',
        qrPayload: `EFT_STAGE:${id}:st-1:1045`,
        bearBriefing: 'ПРАПОР: Найдите журнал дежурного электрика в архивном коробе.',
        usecBriefing: 'PEACEKEEPER: Locate the power grid logbook inside the archive box.',
        hintText: 'Осмотрите вентиляционный короб слева от входа.',
        sideTask: 'ДОП. ЗАДАЧА: Сфотографировать схему щитовой.',
        requiresPhoto: true,
        isSkierStage: false
      }
    ]
  });
  session.selectedQuestlineId = id;
  saveState();
  renderApp();
  showToast('Создана новая квестовая цепочка', 'ok');
}

function updateQuestlineMeta(qlId, field, value) {
  const ql = appState.questlines.find(q => q.id === qlId);
  if (!ql) return;
  ql[field] = value;
  saveState();
}

function addStageToQuestline(qlId) {
  const ql = appState.questlines.find(q => q.id === qlId);
  if (!ql) return;
  const nextOrder = ql.stages.length + 1;
  const pin = String(Math.floor(1000 + Math.random() * 9000));
  const stId = 'st-' + Date.now().toString().slice(-5);
  const center = appState.polygonCenter || POLYGON_ORIGIN;
  ql.stages.push({
    id: stId,
    order: nextOrder,
    title: `Этап ${nextOrder}: Новая точка расследования`,
    locationName: 'Укажите ориентир и нишу',
    x: 50, y: 50,
    lat: Number((center.lat + (Math.random() - 0.5) * 0.0015).toFixed(6)),
    lng: Number((center.lng + (Math.random() - 0.5) * 0.002).toFixed(6)),
    pinCode: pin,
    qrPayload: `EFT_STAGE:${ql.id}:${stId}:${pin}`,
    bearBriefing: 'ПРАПОР: Вводная для отряда BEAR...',
    usecBriefing: 'PEACEKEEPER: Briefing for USEC squad...',
    hintText: 'Подсказка по местонахождению архивного короба...',
    sideTask: 'ДОП. ЗАДАЧА: Дополнительное условие этапа',
    requiresPhoto: true,
    isSkierStage: false
  });
  saveState();
  renderApp();
  showToast(`Добавлен Этап #${nextOrder}`, 'ok');
}

function updateStageField(qlId, stageId, field, value) {
  const ql = appState.questlines.find(q => q.id === qlId);
  if (!ql) return;
  const st = ql.stages.find(s => s.id === stageId);
  if (!st) return;
  st[field] = value;
  if (field === 'pinCode') {
    st.qrPayload = `EFT_STAGE:${ql.id}:${st.id}:${value}`;
  }
  saveState();
  renderApp();
}

function moveStageOrder(qlId, stageId, dir) {
  const ql = appState.questlines.find(q => q.id === qlId);
  if (!ql) return;
  const idx = ql.stages.findIndex(s => s.id === stageId);
  const targetIdx = idx + dir;
  if (idx < 0 || targetIdx < 0 || targetIdx >= ql.stages.length) return;
  const temp = ql.stages[idx];
  ql.stages[idx] = ql.stages[targetIdx];
  ql.stages[targetIdx] = temp;
  ql.stages.forEach((s, i) => s.order = i + 1);
  saveState();
  renderApp();
}

function deleteStage(qlId, stageId) {
  const ql = appState.questlines.find(q => q.id === qlId);
  if (!ql || ql.stages.length <= 1) {
    showToast('В цепочке должен оставаться минимум 1 этап', 'warn');
    return;
  }
  ql.stages = ql.stages.filter(s => s.id !== stageId);
  ql.stages.forEach((s, i) => s.order = i + 1);
  saveState();
  renderApp();
}

function printQuestlineQrSheet(qlId) {
  const ql = appState.questlines.find(q => q.id === qlId);
  if (!ql) return;
  const sheet = document.getElementById('qrPrintSheet');
  sheet.innerHTML = `
    <div style="font-family:monospace; color:#000;">
      <h1 style="font-size:18px; font-weight:bold; border-bottom:2px solid #000; padding-bottom:6px; margin-bottom:12px;">
        ЛИСТ QR-КОДОВ ЭТАПОВ // ${ql.title} (${ql.code})
      </h1>
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        ${ql.stages.map((st, idx) => `
          <div style="border:2px solid #000; padding:10px; display:flex; align-items:center; gap:12px; page-break-inside:avoid;">
            <div>${generateQrSvgString(st.qrPayload, 4)}</div>
            <div>
              <div style="font-size:14px; font-weight:bold;">ЭТАП #${idx + 1}: ${st.title}</div>
              <div style="font-size:11px; margin-top:4px;">Локация: ${st.locationName}</div>
              <div style="font-size:16px; font-weight:bold; margin-top:6px; border:1px solid #000; display:inline-block; padding:2px 8px;">
                КОД: ${st.pinCode}
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  window.print();
}

function renderGmSquadsTab() {
  const bearCur = appState.curatorCredentials.BEAR;
  const usecCur = appState.curatorCredentials.USEC;

  return `
    <div class="space-y-4">
      <div class="tactical-card p-4">
        <div class="text-[10px] font-mono text-amber-400 uppercase">// ИЗОЛЯЦИЯ ДОСТУПА РЕГИОНАЛОВ</div>
        <h3 class="font-display text-base font-bold uppercase text-white mb-3">Учетные записи Кураторов сторон</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div class="p-3 rounded bg-orange-950/20 border border-orange-800/50 space-y-2">
            <div class="text-xs font-display font-bold text-orange-400 uppercase">🇷🇺 КУРАТОР BEAR (ПРАПОР)</div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="text-[10px] font-mono text-zinc-400">Логин</label>
                <input type="text" value="${bearCur.login}" onchange="updateCuratorCred('BEAR','login',this.value)" class="input-tactical mt-0.5" />
              </div>
              <div>
                <label class="text-[10px] font-mono text-zinc-400">Пароль</label>
                <input type="text" value="${bearCur.pass}" onchange="updateCuratorCred('BEAR','pass',this.value)" class="input-tactical mt-0.5" />
              </div>
            </div>
          </div>

          <div class="p-3 rounded bg-sky-950/20 border border-sky-800/50 space-y-2">
            <div class="text-xs font-display font-bold text-sky-400 uppercase">🦅 КУРАТОР USEC (МИРОТВОРЕЦ)</div>
            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="text-[10px] font-mono text-zinc-400">Логин</label>
                <input type="text" value="${usecCur.login}" onchange="updateCuratorCred('USEC','login',this.value)" class="input-tactical mt-0.5" />
              </div>
              <div>
                <label class="text-[10px] font-mono text-zinc-400">Пароль</label>
                <input type="text" value="${usecCur.pass}" onchange="updateCuratorCred('USEC','pass',this.value)" class="input-tactical mt-0.5" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="tactical-card p-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div class="text-[10px] font-mono text-amber-400 uppercase">// УПРАВЛЕНИЕ СТОРОНАМИ (BEAR / USEC)</div>
          <h2 class="font-display text-lg font-bold uppercase text-white">Отряды, QR-пропуска (с GitHub авто-подключением) и Улики</h2>
        </div>
        <div class="flex flex-wrap gap-2">
          <button onclick="printAllSquadPassQrSheet()" class="btn-tactical px-3 py-1.5 text-xs text-emerald-300 border-emerald-700">🖨️ Печать QR-пропусков ЧВК (А4)</button>
          <button onclick="addNewSquad('BEAR')" class="btn-tactical px-3 py-1.5 text-xs border-orange-500 text-orange-300">+ Отряд BEAR</button>
          <button onclick="addNewSquad('USEC')" class="btn-tactical px-3 py-1.5 text-xs border-sky-500 text-sky-300">+ Отряд USEC</button>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${appState.squads.map(sq => {
          const isBear = sq.faction === 'BEAR';
          const passQrPayload = buildSquadPassQrPayload(sq);
          return `
            <div class="tactical-card p-4 space-y-3">
              <div class="flex items-center justify-between border-b border-zinc-800 pb-2">
                <div class="flex items-center gap-2">
                  <span class="px-2 py-0.5 rounded text-xs font-mono font-bold ${isBear ? 'bg-orange-600 text-white' : 'bg-sky-600 text-white'}">${sq.faction}</span>
                  <input type="text" value="${sq.name}" onchange="updateSquadField('${sq.id}','name',this.value)" class="input-tactical font-bold max-w-[180px]" />
                </div>
                <button onclick="deleteSquad('${sq.id}')" class="text-xs font-mono text-red-400 px-2 py-0.5 border border-red-900/50 rounded">Удалить</button>
              </div>

              <div class="grid grid-cols-3 gap-2">
                <div class="col-span-2 space-y-2">
                  <div class="grid grid-cols-2 gap-2">
                    <div>
                      <label class="text-[10px] font-mono text-zinc-400 uppercase">Позывной командира</label>
                      <input type="text" value="${sq.commanderCallsign}" onchange="updateSquadField('${sq.id}','commanderCallsign',this.value)" class="input-tactical mt-0.5" />
                    </div>
                    <div>
                      <label class="text-[10px] font-mono text-emerald-400 uppercase">Ключ QR-пропуска</label>
                      <input type="text" value="${sq.loginPin}" onchange="updateSquadField('${sq.id}','loginPin',this.value)" class="input-tactical mt-0.5 font-bold text-emerald-300 text-center" />
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-2">
                    <div>
                      <label class="text-[10px] font-mono text-zinc-400 uppercase">Активный квестлайн</label>
                      <select onchange="updateSquadField('${sq.id}','questlineId',this.value)" class="input-tactical mt-0.5">
                        ${appState.questlines.map(q => `<option value="${q.id}" ${q.id === sq.questlineId ? 'selected' : ''}>${q.title}</option>`).join('')}
                      </select>
                    </div>
                    <div>
                      <label class="text-[10px] font-mono text-zinc-400 uppercase">Жетоны в наличии</label>
                      <input type="number" value="${sq.tokensCount}" onchange="updateSquadField('${sq.id}','tokensCount',parseInt(this.value)||0)" class="input-tactical mt-0.5" />
                    </div>
                  </div>
                </div>

                <div class="flex flex-col items-center justify-center bg-zinc-950 p-2 rounded border border-zinc-800">
                  <div class="bg-white p-1 rounded">
                    ${generateQrSvgString(passQrPayload, 2)}
                  </div>
                  <span class="text-[9px] font-mono text-emerald-400 mt-1 font-bold">${sq.loginPin}</span>
                  <button onclick="downloadSquadPassQrPng('${sq.id}')" class="btn-tactical w-full py-1 mt-1 text-[10px] text-emerald-300 border-emerald-700">
                    💾 Скачать QR
                  </button>
                </div>
              </div>

              <div>
                <label class="text-[10px] font-mono text-zinc-400 uppercase">Позывные бойцов отряда (через запятую)</label>
                <input type="text" value="${sq.members.join(', ')}" onchange="updateSquadMembers('${sq.id}', this.value)" class="input-tactical mt-0.5 text-xs" />
              </div>

              ${sq.evidencePhotos && sq.evidencePhotos.length > 0 ? `
                <div class="pt-2 border-t border-zinc-800/80">
                  <div class="text-[10px] font-mono text-emerald-400 uppercase mb-1.5">📸 Загруженные фотографии улик (${sq.evidencePhotos.length}):</div>
                  <div class="flex gap-2 overflow-x-auto pb-1">
                    ${sq.evidencePhotos.map(p => `
                      <button onclick="openPhotoViewer('${sq.id}','${p.id}')" class="shrink-0 group relative w-16 h-16 rounded overflow-hidden border border-zinc-700 bg-black">
                        <img src="${p.dataUrl || p.githubUrl}" class="w-full h-full object-cover" />
                        <span class="absolute bottom-0 inset-x-0 bg-black/80 text-[8px] font-mono text-amber-300 text-center">ЭТ.#${p.stageOrder}</span>
                      </button>
                    `).join('')}
                  </div>
                </div>
              ` : ''}

              <div class="flex items-center justify-between pt-2 border-t border-zinc-800 text-xs font-mono">
                <span class="text-zinc-400">Этап: <strong class="text-white">#${sq.currentStageIdx + 1}</strong> | Статус: <strong class="${sq.status === 'COMPLETED' ? 'text-emerald-400' : (sq.status === 'FAILED' ? 'text-red-400' : 'text-amber-400')}">${sq.status}</strong></span>
                <div class="flex gap-1">
                  <button onclick="resetSquadProgress('${sq.id}')" class="btn-tactical px-2 py-1 text-[10px]">Сброс этапа</button>
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function updateCuratorCred(faction, field, val) {
  if (appState.curatorCredentials[faction]) {
    appState.curatorCredentials[faction][field] = val.trim();
    saveState();
    showToast(`Данные Куратора ${faction} обновлены`, 'ok');
  }
}

function printAllSquadPassQrSheet() {
  const sheet = document.getElementById('qrPrintSheet');
  sheet.innerHTML = `
    <div style="font-family:monospace; color:#000;">
      <h1 style="font-size:18px; font-weight:bold; border-bottom:2px solid #000; padding-bottom:6px; margin-bottom:12px;">
        ИНДИВИДУАЛЬНЫЕ QR-ПРОПУСКА КОМАНДИРОВ ЧВК (С АВТО-ПОДКЛЮЧЕНИЕМ К СЕРВЕРУ GITHUB)
      </h1>
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 14px;">
        ${appState.squads.map(sq => {
          const payload = buildSquadPassQrPayload(sq);
          return `
            <div style="border:2px solid #000; padding:12px; display:flex; align-items:center; gap:12px; page-break-inside:avoid;">
              <div>${generateQrSvgString(payload, 3)}</div>
              <div>
                <div style="font-size:12px; font-weight:bold; background:#000; color:#fff; display:inline-block; padding:1px 6px;">ФРАКЦИЯ: ${sq.faction}</div>
                <div style="font-size:15px; font-weight:bold; margin-top:4px;">${sq.name}</div>
                <div style="font-size:11px; margin-top:2px;">Командир: ${sq.commanderCallsign}</div>
                <div style="font-size:10px; margin-top:2px;">Состав: ${sq.members.join(', ')}</div>
                <div style="font-size:14px; font-weight:bold; margin-top:8px; border:1px dashed #000; padding:2px 6px; display:inline-block;">
                  КЛЮЧ: ${sq.loginPin}
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
  window.print();
}

function addNewSquad(faction) {
  const num = appState.squads.filter(s => s.faction === faction).length + 1;
  const pin = `${faction}-${Math.floor(1000 + Math.random() * 9000)}`;
  const center = appState.polygonCenter || POLYGON_ORIGIN;
  appState.squads.push({
    id: `sq-${faction.toLowerCase()}-${Date.now().toString().slice(-4)}`,
    name: faction === 'BEAR' ? `ГРУППА «КЕДР-${num}»` : `SQUAD «BRAVO-${num}»`,
    faction,
    commanderCallsign: faction === 'BEAR' ? `КОМАНДИР [B-${num}]` : `ACTUAL [U-${num}]`,
    loginPin: pin,
    members: ['КОМАНДИР', 'БОЕЦ-2', 'БОЕЦ-3', 'БОЕЦ-4'],
    questlineId: appState.questlines[0].id,
    currentStageIdx: 0,
    status: 'ACTIVE',
    tokensCount: 0,
    hintUnlockedForStage: false,
    stageStartedAt: Date.now(),
    gps: {
      x: 50, y: 50,
      lat: Number((center.lat + (Math.random() - 0.5) * 0.001).toFixed(6)),
      lng: Number((center.lng + (Math.random() - 0.5) * 0.001).toFixed(6)),
      accuracy: 6,
      updatedAt: Date.now()
    },
    respawn: {
      isDead: false,
      zoneId: faction === 'BEAR' ? 'resp-bear' : 'resp-usec',
      endTime: 0,
      insideZone: true,
      violationAlert: false
    },
    completedStages: [],
    evidencePhotos: []
  });
  saveState();
  renderApp();
  showToast(`Добавлен новый отряд ${faction}`, 'ok');
}

function updateSquadField(sqId, field, value) {
  const sq = appState.squads.find(s => s.id === sqId);
  if (!sq) return;
  sq[field] = value;
  saveState();
  renderApp();
}

function updateSquadMembers(sqId, str) {
  const sq = appState.squads.find(s => s.id === sqId);
  if (!sq) return;
  sq.members = str.split(',').map(s => s.trim()).filter(Boolean);
  saveState();
}

function resetSquadProgress(sqId) {
  const sq = appState.squads.find(s => s.id === sqId);
  if (!sq) return;
  sq.currentStageIdx = 0;
  sq.status = 'ACTIVE';
  sq.completedStages = [];
  sq.hintUnlockedForStage = false;
  sq.stageStartedAt = Date.now();
  saveState();
  renderApp();
  showToast(`Прогресс отряда ${sq.name} сброшен на Этап #1`, 'info');
}

function deleteSquad(sqId) {
  if (appState.squads.length <= 1) return;
  appState.squads = appState.squads.filter(s => s.id !== sqId);
  saveState();
  renderApp();
}

function renderGmRespawnTab() {
  return `
    <div class="space-y-4">
      <div class="tactical-card p-4 space-y-3">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2">
          <div>
            <div class="text-[10px] font-mono text-red-400 uppercase">// ПРОТОКОЛ «УБИТ» И RESPAWN</div>
            <h2 class="font-display text-lg font-bold uppercase text-white">Управление мертвяками и GEO-контролем</h2>
          </div>
          <button onclick="addNewRespawnZone()" class="btn-tactical btn-accent px-3 py-1.5 text-xs">+ Добавить территорию мертвяка</button>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label class="text-[10px] font-mono text-zinc-400 uppercase">Базовый таймер отсидки (минут)</label>
            <input type="number" value="${appState.respawnSettings.defaultWaitMinutes}" onchange="updateRespawnSetting('defaultWaitMinutes', parseInt(this.value)||20)" class="input-tactical mt-1" />
          </div>
          <div class="flex items-end pb-1">
            <label class="flex items-center gap-2 cursor-pointer text-xs font-mono text-amber-300">
              <input type="checkbox" ${appState.respawnSettings.requireGeoLock ? 'checked' : ''} onchange="updateRespawnSetting('requireGeoLock', this.checked)" />
              <span>📍 Обязательное GEO-нахождение в радиусе мертвяка</span>
            </label>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          ${appState.respawnSettings.zones.map(z => `
            <div class="p-3 rounded bg-zinc-900/90 border border-zinc-800 space-y-2">
              <div class="flex items-center justify-between">
                <input type="text" value="${z.name}" onchange="updateRespawnZone('${z.id}','name',this.value)" class="input-tactical font-bold text-xs" />
                <button onclick="deleteRespawnZone('${z.id}')" class="text-red-400 text-xs px-1.5">✕</button>
              </div>
              <div class="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                <div>
                  <span class="text-zinc-500">Фракция</span>
                  <select onchange="updateRespawnZone('${z.id}','faction',this.value)" class="input-tactical mt-0.5 text-xs">
                    <option value="ALL" ${z.faction === 'ALL' ? 'selected' : ''}>ALL</option>
                    <option value="BEAR" ${z.faction === 'BEAR' ? 'selected' : ''}>BEAR</option>
                    <option value="USEC" ${z.faction === 'USEC' ? 'selected' : ''}>USEC</option>
                  </select>
                </div>
                <div>
                  <span class="text-zinc-500">Радиус (м)</span>
                  <input type="number" value="${z.radiusMeters}" onchange="updateRespawnZone('${z.id}','radiusMeters',parseInt(this.value)||40)" class="input-tactical mt-0.5 text-xs" />
                </div>
              </div>
              <div class="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
                <div>
                  <span class="text-zinc-500">Широта (Lat)</span>
                  <input type="number" step="0.0001" value="${z.lat}" onchange="updateRespawnZone('${z.id}','lat',parseFloat(this.value))" class="input-tactical mt-0.5 text-xs" />
                </div>
                <div>
                  <span class="text-zinc-500">Долгота (Lng)</span>
                  <input type="number" step="0.0001" value="${z.lng}" onchange="updateRespawnZone('${z.id}','lng',parseFloat(this.value))" class="input-tactical mt-0.5 text-xs" />
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="tactical-card p-4 space-y-3">
        <h3 class="font-display text-base font-bold uppercase text-white">Контроль времени до выхода из мертвяка</h3>
        <div class="space-y-2">
          ${appState.squads.map(sq => {
            checkRespawnGeoCompliance(sq);
            const remMs = sq.respawn.isDead ? Math.max(0, sq.respawn.endTime - Date.now()) : 0;
            const zone = appState.respawnSettings.zones.find(z => z.id === sq.respawn.zoneId) || appState.respawnSettings.zones[0];
            const dist = zone ? calcDistanceMeters(sq.gps.lat, sq.gps.lng, zone.lat, zone.lng) : 0;
            return `
              <div class="p-3 rounded border flex flex-wrap items-center justify-between gap-2 ${sq.respawn.violationAlert ? 'bg-red-950/50 border-red-500' : (sq.respawn.isDead ? 'bg-zinc-900 border-amber-500/60' : 'bg-zinc-950 border-zinc-800')}">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-mono font-bold px-1.5 py-0.5 rounded ${sq.faction === 'BEAR' ? 'bg-orange-600' : 'bg-sky-600'} text-white">${sq.faction}</span>
                    <span class="font-display font-bold text-sm text-white">${sq.name}</span>
                    ${sq.respawn.isDead ? `<span class="text-xs font-mono px-2 py-0.5 rounded bg-red-600 text-white font-bold">💀 МЕРТВЯК: <span data-respawn-timer="${sq.id}">${formatTimer(remMs)}</span></span>` : `<span class="text-xs font-mono text-emerald-400">● В БОЮ</span>`}
                  </div>
                  <div class="text-[11px] font-mono text-zinc-400 mt-1">
                    Зона: ${zone ? zone.name : '—'} | Дистанция до центра: <strong>${dist} м</strong> (лимит ${zone ? zone.radiusMeters : 45} м)
                    ${sq.respawn.violationAlert ? `<span class="text-red-400 font-bold ml-2">⚠️ ПОКИНУЛ ТЕРРИТОРИЮ МЕРТВЯКА ДО ВЫХОДА ТАЙМЕРА!</span>` : ''}
                  </div>
                </div>

                <div class="flex flex-wrap items-center gap-1.5">
                  ${!sq.respawn.isDead ? `
                    <button onclick="sendSquadToRespawn('${sq.id}')" class="btn-tactical px-2.5 py-1 text-xs border-red-700 text-red-300">💀 В мертвяк (${appState.respawnSettings.defaultWaitMinutes}м)</button>
                  ` : `
                    <button onclick="adjustSquadRespawnTimer('${sq.id}', 300000)" class="btn-tactical px-2 py-1 text-xs text-amber-300">+5 мин</button>
                    <button onclick="releaseSquadFromRespawn('${sq.id}')" class="btn-tactical px-2.5 py-1 text-xs border-emerald-600 text-emerald-300">⚡ Выпустить в рейд</button>
                  `}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

function updateRespawnSetting(field, value) {
  appState.respawnSettings[field] = value;
  saveState();
  renderApp();
}

function addNewRespawnZone() {
  const id = 'resp-' + Date.now().toString().slice(-4);
  const center = appState.polygonCenter || POLYGON_ORIGIN;
  appState.respawnSettings.zones.push({
    id,
    name: 'Новый Мертвяк',
    faction: 'ALL',
    x: 50, y: 50,
    lat: center.lat,
    lng: center.lng,
    radiusMeters: 45
  });
  saveState();
  renderApp();
  showToast('Добавлена новая точка мертвяка', 'ok');
}

function updateRespawnZone(zoneId, field, value) {
  const z = appState.respawnSettings.zones.find(r => r.id === zoneId);
  if (!z) return;
  z[field] = value;
  saveState();
  renderApp();
}

function deleteRespawnZone(zoneId) {
  if (appState.respawnSettings.zones.length <= 1) return;
  appState.respawnSettings.zones = appState.respawnSettings.zones.filter(r => r.id !== zoneId);
  saveState();
  renderApp();
}

function sendSquadToRespawn(sqId) {
  const sq = appState.squads.find(s => s.id === sqId);
  if (!sq) return;
  const defaultZone = appState.respawnSettings.zones.find(z => z.faction === sq.faction) || appState.respawnSettings.zones[0];
  sq.respawn.isDead = true;
  sq.respawn.zoneId = defaultZone.id;
  sq.respawn.endTime = Date.now() + appState.respawnSettings.defaultWaitMinutes * 60 * 1000;
  checkRespawnGeoCompliance(sq);
  saveState();
  renderApp();
  showToast(`Отряд ${sq.name} отправлен в мертвяк`, 'warn');
}

function adjustSquadRespawnTimer(sqId, deltaMs) {
  const sq = appState.squads.find(s => s.id === sqId);
  if (!sq || !sq.respawn.isDead) return;
  sq.respawn.endTime = Math.max(Date.now() + 10000, sq.respawn.endTime + deltaMs);
  saveState();
  renderApp();
}

function releaseSquadFromRespawn(sqId) {
  const sq = appState.squads.find(s => s.id === sqId);
  if (!sq) return;
  sq.respawn.isDead = false;
  sq.respawn.endTime = 0;
  sq.respawn.violationAlert = false;
  saveState();
  renderApp();
  showToast(`Отряд ${sq.name} выпущен в рейд!`, 'ok');
}

function renderGmHintsTab() {
  const hr = appState.hintRules;
  return `
    <div class="space-y-4">
      <div class="tactical-card p-4 space-y-3">
        <div class="border-b border-zinc-800 pb-2">
          <div class="text-[10px] font-mono text-amber-400 uppercase">// РЕГЛАМЕНТ ДЕТЕКТИВНЫХ НАВОДОК И ЛЫЖНИКА</div>
          <h2 class="font-display text-lg font-bold uppercase text-white">Настройка правил вывода подсказок игрокам</h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label class="text-[10px] font-mono text-zinc-400 uppercase">Авто-открытие подсказки по таймеру (мин)</label>
            <input type="number" value="${hr.autoHintMinutes}" onchange="updateHintRule('autoHintMinutes', parseInt(this.value)||20)" class="input-tactical mt-1" />
          </div>
          <div>
            <label class="text-[10px] font-mono text-zinc-400 uppercase">1-я сделка у Лыжника (жетонов врага)</label>
            <input type="number" value="${hr.skierTokenCostStage1}" onchange="updateHintRule('skierTokenCostStage1', parseInt(this.value)||4)" class="input-tactical mt-1" />
          </div>
          <div>
            <label class="text-[10px] font-mono text-zinc-400 uppercase">2-я сделка у Лыжника (жетонов врага)</label>
            <input type="number" value="${hr.skierTokenCostStage2}" onchange="updateHintRule('skierTokenCostStage2', parseInt(this.value)||5)" class="input-tactical mt-1" />
          </div>
        </div>

        <div>
          <label class="text-[10px] font-mono text-amber-400 uppercase">Экстренная радиограмма Штаба (транслируется во все КПК через GitHub)</label>
          <div class="flex gap-2 mt-1">
            <input id="gmBroadcastInput" type="text" value="${hr.broadcastMessage}" class="input-tactical" />
            <button onclick="sendGmBroadcast()" class="btn-tactical btn-accent px-4 text-xs font-bold shrink-0">📡 В ЭФИР</button>
          </div>
        </div>
      </div>

      <div class="tactical-card p-4 space-y-3">
        <h3 class="font-display text-base font-bold uppercase text-white">Принудительная выдача подсказок отрядам</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          ${appState.squads.map(sq => {
            const ql = appState.questlines.find(q => q.id === sq.questlineId) || appState.questlines[0];
            const st = ql.stages[sq.currentStageIdx] || ql.stages[ql.stages.length - 1];
            const elapsedMin = Math.floor((Date.now() - (sq.stageStartedAt || Date.now())) / 60000);
            return `
              <div class="p-3 rounded bg-zinc-900 border border-zinc-800 space-y-2">
                <div class="flex items-center justify-between">
                  <span class="font-display font-bold text-sm text-white">${sq.name} (${sq.faction})</span>
                  <span class="text-[10px] font-mono text-zinc-400">На этапе: ${elapsedMin} мин.</span>
                </div>
                <div class="text-xs font-mono text-amber-300">${st ? st.title : 'Финал'}</div>
                <div class="text-[11px] font-mono text-zinc-400 bg-zinc-950 p-2 rounded border border-zinc-800">
                  💡 Подсказка: ${st ? st.hintText : '—'}
                </div>
                <div class="flex items-center justify-between pt-1">
                  <span class="text-[11px] font-mono ${sq.hintUnlockedForStage ? 'text-emerald-400' : 'text-zinc-500'}">
                    ${sq.hintUnlockedForStage ? '✔ Открыта в КПК командира' : '🔒 Скрыта от командира'}
                  </span>
                  <button onclick="toggleSquadHint('${sq.id}')" class="btn-tactical px-2.5 py-1 text-xs ${sq.hintUnlockedForStage ? 'border-zinc-700' : 'btn-accent'}">
                    ${sq.hintUnlockedForStage ? 'Скрыть' : '💡 Открыть подсказку'}
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

function updateHintRule(field, val) {
  appState.hintRules[field] = val;
  saveState();
  showToast('Правила подсказок сохранены', 'ok');
}

function sendGmBroadcast() {
  const inp = document.getElementById('gmBroadcastInput');
  if (!inp) return;
  appState.hintRules.broadcastMessage = inp.value;
  saveState();
  showToast('Радиограмма передана на все КПК через сервер GitHub!', 'ok');
}

function toggleSquadHint(sqId) {
  const sq = appState.squads.find(s => s.id === sqId);
  if (!sq) return;
  sq.hintUnlockedForStage = !sq.hintUnlockedForStage;
  saveState();
  renderApp();
}

function renderGmMapTab() {
  const ql = appState.questlines.find(q => q.id === session.selectedQuestlineId) || appState.questlines[0];
  let targetOptions = '';
  if (session.gmMapClickMode === 'move_squad') {
    targetOptions = appState.squads.map(s => `<option value="${s.id}" ${session.gmSelectedTargetId === s.id ? 'selected' : ''}>${s.name} (${s.faction})</option>`).join('');
  } else if (session.gmMapClickMode === 'move_stage' && ql) {
    targetOptions = ql.stages.map((s, i) => `<option value="${s.id}" ${session.gmSelectedTargetId === s.id ? 'selected' : ''}>Этап #${i + 1}: ${s.title}</option>`).join('');
  } else if (session.gmMapClickMode === 'move_respawn') {
    targetOptions = appState.respawnSettings.zones.map(z => `<option value="${z.id}" ${session.gmSelectedTargetId === z.id ? 'selected' : ''}>${z.name}</option>`).join('');
  }

  return `
    <div class="space-y-3">
      <div class="tactical-card p-3 space-y-2.5">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div class="text-[10px] font-mono text-amber-400 uppercase">// РЕАЛЬНЫЙ СПУТНИКОВЫЙ МОНИТОРИНГ ПОЛИГОНА</div>
            <h2 class="font-display text-base font-bold uppercase text-white">Карта всех отрядов, этапов и мертвяков</h2>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <button onclick="relocatePolygonToRealGps()" class="btn-tactical px-2.5 py-1 text-[11px] text-emerald-300 border-emerald-700">📍 Привязать полигон к моему GPS</button>
            <select onchange="setSatelliteTileLayer(this.value)" class="input-tactical !w-auto text-xs py-1">
              <option value="hybrid" ${session.satStyle === 'hybrid' ? 'selected' : ''}>Спутник + Схема (Google Hybrid)</option>
              <option value="sat" ${session.satStyle === 'sat' ? 'selected' : ''}>Чистый Спутник (Google Sat)</option>
              <option value="esri" ${session.satStyle === 'esri' ? 'selected' : ''}>Спутник Esri World Imagery</option>
            </select>
            <button onclick="toggleMapNvgMode('gmLeafletMap')" class="btn-tactical px-2.5 py-1 text-[11px] text-amber-300">🟢 ПНВ</button>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-zinc-800/80">
          <div>
            <label class="text-[10px] font-mono text-zinc-400 uppercase">Режим клика по спутниковой карте</label>
            <select onchange="changeGmMapClickMode(this.value)" class="input-tactical mt-0.5 text-xs">
              <option value="none" ${session.gmMapClickMode === 'none' ? 'selected' : ''}>🔍 Только просмотр маркеров</option>
              <option value="move_squad" ${session.gmMapClickMode === 'move_squad' ? 'selected' : ''}>📍 Переместить отряд кликом по снимку</option>
              <option value="move_stage" ${session.gmMapClickMode === 'move_stage' ? 'selected' : ''}>🎯 Переместить этап квеста кликом</option>
              <option value="move_respawn" ${session.gmMapClickMode === 'move_respawn' ? 'selected' : ''}>💀 Переместить центр мертвяка кликом</option>
            </select>
          </div>
          ${session.gmMapClickMode !== 'none' ? `
            <div>
              <label class="text-[10px] font-mono text-amber-400 uppercase">Выберите объект и кликните по карте</label>
              <select onchange="session.gmSelectedTargetId = this.value" class="input-tactical mt-0.5 text-xs">
                ${targetOptions}
              </select>
            </div>
          ` : `
            <div class="flex items-end text-[11px] font-mono text-zinc-400 pb-1">
              Центр полигона: ${appState.polygonCenter.lat.toFixed(5)}, ${appState.polygonCenter.lng.toFixed(5)}
            </div>
          `}
        </div>
      </div>

      <div id="gmLeafletMap" class="w-full h-[460px] rounded border border-zinc-700 overflow-hidden shadow-2xl"></div>
    </div>
  `;
}

function changeGmMapClickMode(mode) {
  session.gmMapClickMode = mode;
  if (mode === 'move_squad' && appState.squads[0]) session.gmSelectedTargetId = appState.squads[0].id;
  if (mode === 'move_stage') {
    const ql = appState.questlines.find(q => q.id === session.selectedQuestlineId) || appState.questlines[0];
    if (ql && ql.stages[0]) session.gmSelectedTargetId = ql.stages[0].id;
  }
  if (mode === 'move_respawn' && appState.respawnSettings.zones[0]) {
    session.gmSelectedTargetId = appState.respawnSettings.zones[0].id;
  }
  renderApp();
}

/*************************************************************************
 * КАБИНЕТЫ КУРАТОРОВ СТОРОН (РЕГИОНАЛОВ BEAR / USEC)
 *************************************************************************/
function renderCuratorBottomNav() {
  const nav = document.getElementById('bottomNavContainer');
  nav.className = 'max-w-4xl mx-auto grid grid-cols-3 gap-1.5 p-1.5';
  const tabs = [
    { id: 'map', icon: '🛰️', label: 'Карта стороны' },
    { id: 'progress', icon: '📊', label: 'Стадии и Улики' },
    { id: 'resolution', icon: '⚖️', label: 'Финал / Зачет' }
  ];
  nav.innerHTML = tabs.map(t => `
    <button onclick="switchTab('${t.id}')" class="flex flex-col items-center justify-center py-1.5 rounded border text-xs font-mono transition ${session.activeTab === t.id ? 'btn-accent font-bold' : 'bg-zinc-900/70 border-zinc-800 text-zinc-400'}">
      <span class="text-base">${t.icon}</span>
      <span class="text-[10px] mt-0.5 uppercase">${t.label}</span>
    </button>
  `).join('');
}

function renderCuratorScreen() {
  const mySquads = appState.squads.filter(s => s.faction === session.faction);
  const traderName = session.faction === 'BEAR' ? 'ПРАПОР (Куратор BEAR)' : 'МИРОТВОРЕЦ (Куратор USEC)';

  if (session.activeTab === 'map') {
    return `
      <div class="space-y-3">
        <div class="tactical-card p-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div class="text-[10px] font-mono uppercase text-amber-400">// РЕГИОНАЛЬНЫЙ ШТАБ ${session.faction}</div>
            <h2 class="font-display text-base font-bold uppercase text-white">${traderName} — Спутниковая карта своих групп</h2>
          </div>
          <div class="flex gap-1.5">
            <select onchange="setSatelliteTileLayer(this.value)" class="input-tactical !w-auto text-xs py-1">
              <option value="hybrid" ${session.satStyle === 'hybrid' ? 'selected' : ''}>Гибрид</option>
              <option value="sat" ${session.satStyle === 'sat' ? 'selected' : ''}>Спутник</option>
              <option value="esri" ${session.satStyle === 'esri' ? 'selected' : ''}>Esri</option>
            </select>
            <button onclick="toggleMapNvgMode('curatorLeafletMap')" class="btn-tactical px-2.5 py-1 text-xs text-emerald-300">🟢 ПНВ</button>
          </div>
        </div>

        <div id="curatorLeafletMap" class="w-full h-[430px] rounded border border-zinc-700 overflow-hidden shadow-2xl"></div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          ${mySquads.map(sq => {
            const ql = appState.questlines.find(q => q.id === sq.questlineId) || appState.questlines[0];
            const st = ql.stages[sq.currentStageIdx];
            return `
              <div class="tactical-card p-3 flex items-center justify-between">
                <div>
                  <div class="font-display font-bold text-sm text-white">${sq.name} (${sq.commanderCallsign})</div>
                  <div class="text-xs font-mono text-amber-300">${st ? `Этап #${sq.currentStageIdx + 1}: ${st.title}` : 'Маршрут завершен'}</div>
                  <div class="text-[10px] font-mono text-zinc-400">GPS: ${sq.gps.lat.toFixed(5)}, ${sq.gps.lng.toFixed(5)} | Улик: ${sq.evidencePhotos.length}</div>
                </div>
                <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold ${sq.respawn.isDead ? 'bg-red-600 text-white' : 'bg-emerald-950 text-emerald-300 border border-emerald-700'}">
                  ${sq.respawn.isDead ? 'МЕРТВЯК' : sq.status}
                </span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  if (session.activeTab === 'progress') {
    return `
      <div class="space-y-4">
        <div class="tactical-card p-4">
          <div class="text-[10px] font-mono text-amber-400 uppercase">// МОНИТОРИНГ ПРОХОЖДЕНИЯ И УЛИК (GITHUB SYNC)</div>
          <h2 class="font-display text-lg font-bold uppercase text-white">Текущие стадии квеста отрядов ${session.faction}</h2>
        </div>

        ${mySquads.map(sq => {
          const ql = appState.questlines.find(q => q.id === sq.questlineId) || appState.questlines[0];
          const total = ql.stages.length;
          const curIdx = sq.currentStageIdx;
          const pct = Math.min(100, Math.round((sq.completedStages.length / total) * 100));
          const curStage = ql.stages[curIdx];

          return `
            <div class="tactical-card p-4 space-y-3">
              <div class="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2">
                <div>
                  <span class="font-display font-bold text-base text-white">${sq.name}</span>
                  <span class="text-xs font-mono text-zinc-400 ml-2">Командир: ${sq.commanderCallsign}</span>
                </div>
                <span class="text-xs font-mono text-amber-400 font-bold">Прогресс: ${sq.completedStages.length} / ${total} (${pct}%)</span>
              </div>

              <div class="w-full h-2 bg-zinc-900 rounded overflow-hidden border border-zinc-800">
                <div class="h-full ${session.faction === 'BEAR' ? 'bg-orange-500' : 'bg-sky-500'}" style="width:${pct}%"></div>
              </div>

              ${curStage && sq.status === 'ACTIVE' ? `
                <div class="p-3 rounded bg-zinc-900/90 border border-zinc-800 space-y-1">
                  <div class="text-[10px] font-mono text-amber-400 uppercase">Выполняется сейчас:</div>
                  <div class="font-bold text-sm text-white">${curStage.title}</div>
                  <div class="text-xs text-zinc-300">Локация: ${curStage.locationName}</div>
                  <div class="flex items-center justify-between pt-2">
                    <span class="text-[11px] font-mono text-zinc-400">Жетонов у группы: <strong class="text-white">${sq.tokensCount}</strong></span>
                    <button onclick="toggleSquadHint('${sq.id}')" class="btn-tactical px-2.5 py-1 text-xs">
                      ${sq.hintUnlockedForStage ? '✔ Подсказка выдана' : '💡 Выдать наводку группе'}
                    </button>
                  </div>
                </div>
              ` : ''}

              ${sq.evidencePhotos.length > 0 ? `
                <div>
                  <div class="text-[10px] font-mono text-zinc-400 uppercase mb-1.5">Снятые командиром фотографии улик (${sq.evidencePhotos.length}):</div>
                  <div class="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    ${sq.evidencePhotos.map(p => `
                      <button onclick="openPhotoViewer('${sq.id}','${p.id}')" class="group relative rounded overflow-hidden border border-zinc-700 bg-black aspect-video">
                        <img src="${p.dataUrl || p.githubUrl}" class="w-full h-full object-cover" />
                        <div class="absolute bottom-0 inset-x-0 bg-black/80 text-[9px] font-mono text-amber-300 px-1 py-0.5 truncate">
                          Эт.#${p.stageOrder} • ${p.timestamp}
                        </div>
                      </button>
                    `).join('')}
                  </div>
                </div>
              ` : `<div class="text-xs font-mono text-zinc-500">Фотографии улик от группы пока не поступали.</div>`}
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  return `
    <div class="space-y-4">
      <div class="tactical-card p-4">
        <div class="text-[10px] font-mono text-amber-400 uppercase">// РЕШЕНИЕ РЕГИОНАЛА СТОРОНЫ ${session.faction}</div>
        <h2 class="font-display text-lg font-bold uppercase text-white">Фиксация завершения или провала квестовых цепочек</h2>
        <p class="text-xs text-zinc-400 mt-1">Подтвердите доставку финального контейнера 7 кг и комплектность фото-улик.</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${mySquads.map(sq => {
          const ql = appState.questlines.find(q => q.id === sq.questlineId) || appState.questlines[0];
          return `
            <div class="tactical-card p-4 space-y-3">
              <div class="flex items-center justify-between border-b border-zinc-800 pb-2">
                <div>
                  <div class="font-display font-bold text-base text-white">${sq.name}</div>
                  <div class="text-xs font-mono text-zinc-400">${ql.title}</div>
                </div>
                <span class="px-2 py-0.5 rounded font-mono text-xs font-bold ${sq.status === 'COMPLETED' ? 'bg-emerald-600 text-white' : (sq.status === 'FAILED' ? 'bg-red-600 text-white' : 'bg-amber-500/20 text-amber-300 border border-amber-500/50')}">
                  ${sq.status === 'COMPLETED' ? '✔ ВЫПОЛНЕНО' : (sq.status === 'FAILED' ? '✖ ПРОВАЛЕНО' : 'В ПРОЦЕССЕ')}
                </span>
              </div>

              <div class="text-xs font-mono space-y-1 text-zinc-300">
                <div>• Пройдено этапов: <strong>${sq.completedStages.length} из ${ql.stages.length}</strong></div>
                <div>• Загружено фото улик: <strong>${sq.evidencePhotos.length} шт.</strong></div>
                <div>• Сдано/в наличии жетонов: <strong>${sq.tokensCount} шт.</strong></div>
              </div>

              <div class="grid grid-cols-2 gap-2 pt-2">
                <button onclick="setSquadFinalStatus('${sq.id}','COMPLETED')" class="btn-tactical py-2 text-xs font-bold border-emerald-500 text-emerald-300 bg-emerald-950/40">
                  ✔ ЗАВЕРШИТЬ (УСПЕХ)
                </button>
                <button onclick="setSquadFinalStatus('${sq.id}','FAILED')" class="btn-tactical py-2 text-xs font-bold border-red-500 text-red-300 bg-red-950/40">
                  ✖ ЗАФИКСИРОВАТЬ ПРОВАЛ
                </button>
              </div>
              ${sq.status !== 'ACTIVE' ? `
                <button onclick="setSquadFinalStatus('${sq.id}','ACTIVE')" class="btn-tactical w-full py-1 text-[11px] text-zinc-400">
                  ↺ Вернуть цепочку в статус «В ПРОЦЕССЕ»
                </button>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function setSquadFinalStatus(sqId, newStatus) {
  const sq = appState.squads.find(s => s.id === sqId);
  if (!sq) return;
  sq.status = newStatus;
  saveState();
  renderApp();
  if (newStatus === 'COMPLETED') showToast(`Цепочка отряда ${sq.name} ЗАВЕРШЕНА УСПЕШНО!`, 'ok');
  if (newStatus === 'FAILED') showToast(`Зафиксирован ПРОВАЛ цепочки отряда ${sq.name}`, 'err');
}

/*************************************************************************
 * КАБИНЕТ КОМАНДИРА ГРУППЫ ЧВК
 *************************************************************************/
function renderCommanderBottomNav(squad) {
  const nav = document.getElementById('bottomNavContainer');
  nav.className = 'max-w-4xl mx-auto grid grid-cols-4 gap-1 p-1.5';
  const tabs = [
    { id: 'tasks', icon: '🎯', label: 'Задача' },
    { id: 'map', icon: '🛰️', label: 'Спутник' },
    { id: 'evidence', icon: '📸', label: `Улики (${squad.evidencePhotos.length})` },
    { id: 'respawn', icon: '💀', label: squad.respawn.isDead ? 'МЕРТВЯК!' : 'Мертвяк' }
  ];
  nav.innerHTML = tabs.map(t => `
    <button onclick="switchTab('${t.id}')" class="flex flex-col items-center justify-center py-1.5 rounded border text-xs font-mono transition ${session.activeTab === t.id ? 'btn-accent font-bold' : 'bg-zinc-900/70 border-zinc-800 text-zinc-400'} ${t.id === 'respawn' && squad.respawn.isDead ? 'border-red-500 text-red-300 animate-pulse' : ''}">
      <span class="text-base">${t.icon}</span>
      <span class="text-[10px] mt-0.5 uppercase">${t.label}</span>
    </button>
  `).join('');
}

function renderCommanderScreen(squad) {
  checkRespawnGeoCompliance(squad);
  if (session.activeTab === 'map') return renderCommanderMapTab(squad);
  if (session.activeTab === 'evidence') return renderCommanderEvidenceTab(squad);
  if (session.activeTab === 'respawn') return renderCommanderRespawnTab(squad);
  return renderCommanderTasksTab(squad);
}

function renderCommanderTasksTab(squad) {
  const ql = appState.questlines.find(q => q.id === squad.questlineId) || appState.questlines[0];
  const totalStages = ql.stages.length;
  const curStage = ql.stages[squad.currentStageIdx];

  const elapsedMinutes = Math.floor((Date.now() - (squad.stageStartedAt || Date.now())) / 60000);
  if (elapsedMinutes >= appState.hintRules.autoHintMinutes) {
    squad.hintUnlockedForStage = true;
  }

  const photoTakenForCurrentStage = curStage
    ? squad.evidencePhotos.some(p => p.stageId === curStage.id)
    : true;

  return `
    <div class="space-y-4">
      ${appState.hintRules.broadcastMessage ? `
        <div class="p-2.5 rounded bg-amber-950/40 border border-amber-500/50 flex items-center gap-2 text-xs font-mono text-amber-200">
          <span class="text-base">📡</span>
          <div class="flex-1">${appState.hintRules.broadcastMessage}</div>
        </div>
      ` : ''}

      <div class="tactical-card p-3.5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div class="text-[10px] font-mono text-zinc-400 uppercase">${ql.code} // ${squad.name}</div>
          <div class="font-display font-bold text-base text-white uppercase">${ql.title}</div>
        </div>
        <div class="flex items-center gap-2 font-mono text-xs">
          <span class="px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-amber-300">
            🪖 Жетонов: <strong>${squad.tokensCount}</strong>
          </span>
          <span class="px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-white">
            Этап: <strong>${Math.min(squad.currentStageIdx + 1, totalStages)}/${totalStages}</strong>
          </span>
        </div>
      </div>

      ${squad.status === 'COMPLETED' ? `
        <div class="tactical-card p-6 text-center space-y-2 border-emerald-500">
          <div class="text-4xl">🏆</div>
          <h2 class="font-display text-2xl font-bold text-emerald-400 uppercase">КВЕСТОВАЯ ЦЕПОЧКА ВЫПОЛНЕНА!</h2>
          <p class="text-xs font-mono text-zinc-300">Штаб ${squad.faction} подтвердил успешное завершение операции и приемку контейнера.</p>
        </div>
      ` : squad.status === 'FAILED' ? `
        <div class="tactical-card p-6 text-center space-y-2 border-red-500">
          <div class="text-4xl">✖</div>
          <h2 class="font-display text-2xl font-bold text-red-400 uppercase">ОПЕРАЦИЯ ПРОВАЛЕНА</h2>
          <p class="text-xs font-mono text-zinc-300">Куратор стороны зафиксировал срыв контракта. Ожидайте новых указаний Штаба.</p>
        </div>
      ` : curStage ? `
        <div class="tactical-card p-4 space-y-3 border-l-4 ${squad.faction === 'BEAR' ? 'border-l-orange-500' : 'border-l-sky-500'}">
          <div class="flex items-center justify-between border-b border-zinc-800 pb-2">
            <div>
              <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500 text-black font-extrabold uppercase">ТЕКУЩАЯ ЗАДАЧА (ЭТАП #${squad.currentStageIdx + 1})</span>
              <h3 class="font-display text-xl font-bold text-white uppercase mt-1">${curStage.title}</h3>
            </div>
            <div class="text-right font-mono text-xs text-amber-300">
              📍 ${calcDistanceMeters(squad.gps.lat, squad.gps.lng, curStage.lat, curStage.lng)} м
            </div>
          </div>

          <div class="text-xs font-mono text-zinc-300 bg-zinc-950/90 p-3 rounded border border-zinc-800 leading-relaxed">
            <div class="text-[10px] text-amber-400 uppercase font-bold mb-1">ОРИЕНТИР: ${curStage.locationName} (${curStage.lat.toFixed(5)}, ${curStage.lng.toFixed(5)})</div>
            ${squad.faction === 'BEAR' ? curStage.bearBriefing : curStage.usecBriefing}
          </div>

          ${curStage.sideTask ? `
            <div class="p-2.5 rounded bg-emerald-950/30 border border-emerald-700/50 text-xs font-mono text-emerald-200">
              <span class="font-bold uppercase text-emerald-400">★ ДОПОЛНИТЕЛЬНАЯ ЗАДАЧА:</span> ${curStage.sideTask}
            </div>
          ` : ''}

          ${curStage.requiresPhoto ? `
            <div class="p-3 rounded border ${photoTakenForCurrentStage ? 'bg-emerald-950/30 border-emerald-600/60' : 'bg-amber-950/30 border-amber-600/60'} flex flex-wrap items-center justify-between gap-2">
              <div class="text-xs font-mono">
                <div class="font-bold ${photoTakenForCurrentStage ? 'text-emerald-300' : 'text-amber-300'}">
                  ${photoTakenForCurrentStage ? '✔ Улика сфотографирована и передана на сервер GitHub' : '📸 ТРЕБУЕТСЯ ФОТОФИКСАЦИЯ УЛИКИ'}
                </div>
                <div class="text-[10px] text-zinc-400">Документы в архивных коробах забирать запрещено! Сделайте снимок.</div>
              </div>
              <label class="btn-tactical px-3 py-1.5 text-xs border-amber-500 text-amber-300 cursor-pointer">
                📷 СНЯТЬ УЛИКУ
                <input type="file" accept="image/*" capture="environment" class="hidden" onchange="captureEvidencePhoto(event, '${curStage.id}')" />
              </label>
            </div>
          ` : ''}

          <div class="p-3 rounded bg-zinc-900 border border-zinc-800 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-[10px] font-mono uppercase text-amber-400">💡 ОПЕРАТИВНАЯ ПОДСКАЗКА / НАВОДКА</span>
              ${!squad.hintUnlockedForStage ? `
                <button onclick="requestHintByTokens('${squad.id}')" class="btn-tactical px-2 py-0.5 text-[10px] text-amber-300 border-amber-700">
                  🦊 Купить наводку (1 жетон)
                </button>
              ` : ''}
            </div>
            ${squad.hintUnlockedForStage ? `
              <div class="text-xs font-mono text-amber-200">${curStage.hintText}</div>
            ` : `
              <div class="text-[11px] font-mono text-zinc-500">
                Автоматическое открытие через ${Math.max(0, appState.hintRules.autoHintMinutes - elapsedMinutes)} мин. либо запросите у Куратора / Лыжника.
              </div>
            `}
          </div>

          <div class="pt-2 border-t border-zinc-800 space-y-2.5">
            <div class="text-[10px] font-mono text-zinc-400 uppercase text-center">
              Для открытия следующего этапа отсканируйте QR-код на точке или введите 4-значный шифр:
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button onclick="openStageQrScanner()" class="btn-tactical btn-accent py-3 text-sm font-bold">
                📷 СКАНИРОВАТЬ QR ЭТАПА
              </button>

              <div class="flex gap-1.5">
                <input id="commanderPinInput" type="text" maxlength="8" placeholder="4-ЗНАЧНЫЙ КОД" class="input-tactical text-center text-base font-bold tracking-widest uppercase" />
                <button onclick="submitCommanderPin()" class="btn-tactical px-4 text-xs font-bold border-amber-500 text-amber-300 shrink-0">
                  ВВОД
                </button>
              </div>
            </div>
          </div>
        </div>
      ` : ''}

      <div class="tactical-card p-4 space-y-2">
        <div class="text-xs font-mono uppercase text-zinc-400 mb-2">Маршрутный лист цепочки (поочередный доступ):</div>
        ${ql.stages.map((st, idx) => {
          const isDone = idx < squad.currentStageIdx || squad.status === 'COMPLETED';
          const isCurrent = idx === squad.currentStageIdx && squad.status === 'ACTIVE';
          if (isDone) {
            return `
              <div class="p-2.5 rounded bg-emerald-950/20 border border-emerald-800/50 flex items-center justify-between text-xs font-mono">
                <div>
                  <span class="text-emerald-400 font-bold">✔ ЭТАП #${idx + 1}:</span>
                  <span class="text-zinc-200 ml-1">${st.title}</span>
                </div>
                <span class="text-[10px] text-emerald-400">ВЫПОЛНЕН</span>
              </div>
            `;
          }
          if (isCurrent) {
            return `
              <div class="p-2.5 rounded bg-amber-500/15 border border-amber-500 flex items-center justify-between text-xs font-mono">
                <div>
                  <span class="text-amber-400 font-bold">▶ ЭТАП #${idx + 1}:</span>
                  <span class="text-white font-bold ml-1">${st.title}</span>
                </div>
                <span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-500 text-black font-bold">АКТИВЕН</span>
              </div>
            `;
          }
          return `
            <div class="p-2.5 rounded bg-zinc-950 border border-zinc-800/80 flex items-center justify-between text-xs font-mono opacity-60">
              <div class="flex items-center gap-2">
                <span>🔒</span>
                <span class="text-zinc-500">ЭТАП #${idx + 1}: [ДАННЫЕ ЗАШИФРОВАНЫ ШТАБОМ]</span>
              </div>
              <span class="text-[10px] text-zinc-600">ЗАКРЫТО</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function requestHintByTokens(sqId) {
  const sq = appState.squads.find(s => s.id === sqId);
  if (!sq) return;
  if (sq.tokensCount < 1) {
    showToast('Недостаточно армейских жетонов для покупки наводки!', 'err');
    return;
  }
  sq.tokensCount -= 1;
  sq.hintUnlockedForStage = true;
  saveState();
  renderApp();
  showToast('Наводка Лыжника оплачена (списан 1 жетон)', 'ok');
}

function submitCommanderPin() {
  const inp = document.getElementById('commanderPinInput');
  if (!inp) return;
  verifyAndAdvanceStage(inp.value.trim(), 'PIN');
}

function verifyAndAdvanceStage(inputCode, method = 'PIN') {
  const squad = appState.squads.find(s => s.id === session.squadId);
  if (!squad || squad.status !== 'ACTIVE') return false;

  if (squad.respawn.isDead) {
    showToast('Отряд находится в Мертвяке! Выполнение квестов заблокировано до выхода таймера.', 'err');
    return false;
  }

  const ql = appState.questlines.find(q => q.id === squad.questlineId) || appState.questlines[0];
  const curStage = ql.stages[squad.currentStageIdx];
  if (!curStage) return false;

  const cleanInput = inputCode.trim().toUpperCase();
  const expectedPin = curStage.pinCode.trim().toUpperCase();
  const expectedQr = curStage.qrPayload.trim().toUpperCase();

  const isMatch = (cleanInput === expectedPin) || (cleanInput === expectedQr) || cleanInput.endsWith(':' + expectedPin);

  if (!isMatch) {
    showToast('Неверный код или QR от другого этапа! Этапы открываются строго поочередно.', 'err');
    return false;
  }

  if (curStage.requiresPhoto && !squad.evidencePhotos.some(p => p.stageId === curStage.id)) {
    showToast('Сначала сделайте обязательное фото улики на этом этапе!', 'warn');
    return false;
  }

  squad.completedStages.push({
    stageId: curStage.id,
    completedAt: new Date().toLocaleTimeString('ru-RU'),
    method
  });

  if (squad.currentStageIdx + 1 < ql.stages.length) {
    squad.currentStageIdx += 1;
    squad.hintUnlockedForStage = false;
    squad.stageStartedAt = Date.now();
    const nextStage = ql.stages[squad.currentStageIdx];
    squad.gps.lat = Number((curStage.lat + 0.0001).toFixed(6));
    squad.gps.lng = Number((curStage.lng + 0.0001).toFixed(6));
    saveState();
    renderApp();
    showToast(`Этап пройден! Открыта новая задача: ${nextStage.title}`, 'ok');
  } else {
    squad.status = 'COMPLETED';
    saveState();
    renderApp();
    showToast('Все этапы квестлайна пройдены! Доставьте груз в Штаб.', 'ok');
  }
  return true;
}

function renderCommanderMapTab(squad) {
  const ql = appState.questlines.find(q => q.id === squad.questlineId) || appState.questlines[0];
  const curStage = ql.stages[squad.currentStageIdx];
  const dist = curStage ? calcDistanceMeters(squad.gps.lat, squad.gps.lng, curStage.lat, curStage.lng) : 0;

  return `
    <div class="space-y-3">
      <div class="tactical-card p-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div class="text-[10px] font-mono text-amber-400 uppercase">// СПУТНИКОВАЯ НАВИГАЦИЯ ГРУППЫ</div>
          <div class="font-display font-bold text-sm text-white uppercase">
            ${curStage ? `Цель: ${curStage.locationName} (${dist} м)` : 'Все точки пройдены'}
          </div>
        </div>
        <div class="flex gap-1.5">
          <select onchange="setSatelliteTileLayer(this.value)" class="input-tactical !w-auto text-xs py-1">
            <option value="hybrid" ${session.satStyle === 'hybrid' ? 'selected' : ''}>Гибрид</option>
            <option value="sat" ${session.satStyle === 'sat' ? 'selected' : ''}>Спутник</option>
          </select>
          <button onclick="toggleMapNvgMode('commanderLeafletMap')" class="btn-tactical px-2.5 py-1 text-xs text-emerald-300">🟢 ПНВ</button>
        </div>
      </div>

      <div id="commanderLeafletMap" class="w-full h-[440px] rounded border border-zinc-700 overflow-hidden shadow-2xl"></div>
    </div>
  `;
}

function renderCommanderEvidenceTab(squad) {
  const ql = appState.questlines.find(q => q.id === squad.questlineId) || appState.questlines[0];
  const curStage = ql.stages[squad.currentStageIdx] || ql.stages[0];

  return `
    <div class="space-y-4">
      <div class="tactical-card p-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <div class="text-[10px] font-mono text-amber-400 uppercase">// ПОЛЕВОЙ ФОТОАРХИВ УЛИК TERRA GROUP (GITHUB SYNC)</div>
          <h2 class="font-display text-lg font-bold uppercase text-white">Сохраненные фотографии документов (${squad.evidencePhotos.length})</h2>
          <p class="text-xs text-zinc-400">Все снимки сжимаются, получают штамп времени/GPS и сохраняются в репозиторий GitHub.</p>
        </div>
        <label class="btn-tactical btn-accent px-3.5 py-2 text-xs font-bold cursor-pointer">
          📷 СДЕЛАТЬ ФОТО УЛИКИ
          <input type="file" accept="image/*" capture="environment" class="hidden" onchange="captureEvidencePhoto(event, '${curStage ? curStage.id : 'general'}')" />
        </label>
      </div>

      ${squad.evidencePhotos.length === 0 ? `
        <div class="tactical-card p-8 text-center space-y-2 text-zinc-500 font-mono text-xs">
          <div class="text-3xl">📂</div>
          <div>В памяти КПК пока нет сохраненных фотографий улик.</div>
          <div>Нажмите «СДЕЛАТЬ ФОТО УЛИКИ», чтобы зафиксировать найденный в архивном коробе документ.</div>
        </div>
      ` : `
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          ${squad.evidencePhotos.map(p => `
            <div class="tactical-card p-3 space-y-2">
              <div class="relative rounded overflow-hidden border border-zinc-700 bg-black aspect-video cursor-pointer" onclick="openPhotoViewer('${squad.id}','${p.id}')">
                <img src="${p.dataUrl || p.githubUrl}" class="w-full h-full object-cover" />
                <div class="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-black/80 text-[10px] font-mono text-amber-300 border border-amber-500/40">
                  ЭТАП #${p.stageOrder}: ${p.stageTitle}
                </div>
                <div class="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-mono ${p.syncedToGitHub ? 'text-emerald-400 border border-emerald-700' : 'text-amber-300 border border-amber-700'}">
                  ${p.syncedToGitHub ? '☁️ В GITHUB' : '⏳ В ОЧЕРЕДИ'}
                </div>
              </div>
              <div class="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                <span>🕒 ${p.timestamp} | 📍 ${p.gpsText}</span>
                <button onclick="deleteEvidencePhoto('${squad.id}','${p.id}')" class="text-red-400 hover:underline">Удалить</button>
              </div>
            </div>
          `).join('')}
        </div>
      `}
    </div>
  `;
}

function captureEvidencePhoto(event, stageId) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const squad = appState.squads.find(s => s.id === session.squadId);
  if (!squad) return;

  const ql = appState.questlines.find(q => q.id === squad.questlineId) || appState.questlines[0];
  const stIdx = ql.stages.findIndex(s => s.id === stageId);
  const st = stIdx >= 0 ? ql.stages[stIdx] : ql.stages[squad.currentStageIdx];

  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = async function() {
      const canvas = document.createElement('canvas');
      const maxW = 800;
      const scale = Math.min(1, maxW / img.width);
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const barH = 38;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.78)';
      ctx.fillRect(0, canvas.height - barH, canvas.width, barH);
      ctx.fillStyle = '#eab308';
      ctx.font = 'bold 12px monospace';
      const timeStr = new Date().toLocaleTimeString('ru-RU');
      const gpsStr = `${squad.gps.lat.toFixed(5)}, ${squad.gps.lng.toFixed(5)}`;
      ctx.fillText(
        `EFT RAID OS // ${squad.name} // ЭТАП #${(stIdx >= 0 ? stIdx : squad.currentStageIdx) + 1} // ${timeStr} // GPS ${gpsStr}`,
        10,
        canvas.height - 14
      );

      const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.68);
      const photoId = 'ev-' + Date.now();
      const newPhotoObj = {
        id: photoId,
        stageId: st ? st.id : stageId,
        stageOrder: (stIdx >= 0 ? stIdx : squad.currentStageIdx) + 1,
        stageTitle: st ? st.title : 'Полевая улика',
        timestamp: timeStr,
        gpsText: gpsStr,
        dataUrl: compressedDataUrl,
        githubUrl: null,
        syncedToGitHub: false
      };

      squad.evidencePhotos.unshift(newPhotoObj);

      ghPendingQueue.push({
        type: 'EVIDENCE_PHOTO',
        squadId: squad.id,
        photoId: photoId,
        timestamp: Date.now()
      });
      saveGitHubQueue();
      saveState();
      renderApp();
      showToast('Фото улики сохранено и отправляется на сервер GitHub!', 'ok');
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function openPhotoViewer(squadId, photoId) {
  const sq = appState.squads.find(s => s.id === squadId);
  if (!sq) return;
  const p = sq.evidencePhotos.find(item => item.id === photoId);
  if (!p) return;

  const src = p.dataUrl || p.githubUrl;
  document.getElementById('photoViewerImg').src = src;
  document.getElementById('photoViewerCaption').textContent = `${sq.name} // ЭТАП #${p.stageOrder}: ${p.stageTitle}`;
  document.getElementById('photoViewerMeta').textContent = `Время съемки: ${p.timestamp} | Координаты: ${p.gpsText} | Статус: ${p.syncedToGitHub ? 'Сохранено в GitHub' : 'Локальный кэш'}`;
  const dlLink = document.getElementById('photoViewerDownloadLink');
  if (dlLink) {
    dlLink.href = src;
    dlLink.download = `${sq.loginPin}_stage${p.stageOrder}_${p.id}.jpg`;
  }
  const modal = document.getElementById('photoViewerModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closePhotoViewer() {
  const modal = document.getElementById('photoViewerModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

function deleteEvidencePhoto(squadId, photoId) {
  const sq = appState.squads.find(s => s.id === squadId);
  if (!sq) return;
  sq.evidencePhotos = sq.evidencePhotos.filter(p => p.id !== photoId);
  saveState();
  renderApp();
}

function renderCommanderRespawnTab(squad) {
  checkRespawnGeoCompliance(squad);
  const zone = appState.respawnSettings.zones.find(z => z.id === squad.respawn.zoneId) || appState.respawnSettings.zones[0];
  const dist = zone ? calcDistanceMeters(squad.gps.lat, squad.gps.lng, zone.lat, zone.lng) : 0;
  const remMs = squad.respawn.isDead ? Math.max(0, squad.respawn.endTime - Date.now()) : 0;

  return `
    <div class="space-y-4">
      <div class="tactical-card p-5 text-center space-y-3 ${squad.respawn.violationAlert ? 'border-red-500 bg-red-950/30' : ''}">
        <div class="text-xs font-mono uppercase ${squad.respawn.isDead ? 'text-red-400' : 'text-emerald-400'}">
          ${squad.respawn.isDead ? '// ПРОТОКОЛ «УБИТ»: ОТРЯД В МЕРТВЯКЕ' : '// СТАТУС ГРУППЫ: В БОЕВОМ РЕЙДЕ'}
        </div>

        <div class="font-mono text-5xl font-extrabold tracking-wider ${squad.respawn.isDead ? 'text-red-400' : 'text-zinc-600'}" data-respawn-timer="${squad.id}">
          ${squad.respawn.isDead ? formatTimer(remMs) : '00:00'}
        </div>

        <div class="text-xs font-mono text-zinc-300">
          Закрепленный мертвяк: <strong>${zone ? zone.name : '—'}</strong><br>
          Дистанция по GPS до центра мертвяка: <strong class="${dist <= (zone ? zone.radiusMeters : 45) ? 'text-emerald-400' : 'text-red-400'}">${dist} м</strong> (допуск: ${zone ? zone.radiusMeters : 45} м)
        </div>

        ${squad.respawn.violationAlert ? `
          <div class="p-3 rounded bg-red-600 text-white font-mono text-xs font-bold animate-bounce">
            🚨 ВНИМАНИЕ! ВЫ ПОКИНУЛИ РАДИУС ТЕРРИТОРИИ МЕРТВЯКА ДО ОКОНЧАНИЯ ТАЙМЕРА! НЕМЕДЛЕННО ВЕРНИТЕСЬ В ЗОНУ!
          </div>
        ` : ''}

        <div class="pt-2 flex flex-wrap justify-center gap-2">
          ${!squad.respawn.isDead ? `
            <button onclick="commanderSelfEnterRespawn('${squad.id}')" class="btn-tactical px-4 py-2.5 text-xs font-bold border-red-600 text-red-300 bg-red-950/40">
              💀 ЗАФИКСИРОВАТЬ ПОРАЖЕНИЕ ГРУППЫ (СТАРТ ТАЙМЕРА ${appState.respawnSettings.defaultWaitMinutes} МИН)
            </button>
          ` : remMs <= 0 ? `
            <button onclick="releaseSquadFromRespawn('${squad.id}')" class="btn-tactical btn-accent px-5 py-2.5 text-sm font-bold">
              ⚡ ТАЙМЕР ИСТЕК — ВЫЙТИ В РЕЙД
            </button>
          ` : `
            <div class="text-[11px] font-mono text-zinc-400">Ожидайте окончания отсчета внутри радиуса мертвяка.</div>
          `}
        </div>
      </div>
    </div>
  `;
}

function commanderSelfEnterRespawn(sqId) {
  const sq = appState.squads.find(s => s.id === sqId);
  if (!sq) return;
  const zone = appState.respawnSettings.zones.find(z => z.faction === sq.faction) || appState.respawnSettings.zones[0];
  sq.respawn.isDead = true;
  sq.respawn.zoneId = zone.id;
  sq.respawn.endTime = Date.now() + appState.respawnSettings.defaultWaitMinutes * 60 * 1000;
  checkRespawnGeoCompliance(sq);
  saveState();
  renderApp();
  showToast(`Таймер мертвяка запущен на ${appState.respawnSettings.defaultWaitMinutes} мин.`, 'warn');
}

// Фоновые процессы: часы, таймеры мертвяка и автоматический GPS смартфона
setInterval(() => {
  const now = new Date();
  const clockEl = document.getElementById('clockText');
  if (clockEl) clockEl.textContent = now.toLocaleTimeString('ru-RU');

  appState.squads.forEach(sq => {
    if (sq.respawn && sq.respawn.isDead) {
      const rem = Math.max(0, sq.respawn.endTime - Date.now());
      const timerEls = document.querySelectorAll(`[data-respawn-timer="${sq.id}"]`);
      timerEls.forEach(el => { el.textContent = formatTimer(rem); });
    }
  });
}, 1000);

if (navigator.geolocation) {
  navigator.geolocation.watchPosition(
    (pos) => {
      const gpsStatus = document.getElementById('gpsStatusText');
      if (gpsStatus) {
        gpsStatus.textContent = `GPS: ±${Math.round(pos.coords.accuracy)}м`;
      }
      if (session.role === 'COMMANDER' && session.squadId) {
        const sq = appState.squads.find(s => s.id === session.squadId);
        if (sq) {
          sq.gps.lat = Number(pos.coords.latitude.toFixed(6));
          sq.gps.lng = Number(pos.coords.longitude.toFixed(6));
          sq.gps.accuracy = Math.round(pos.coords.accuracy || 5);
          sq.gps.updatedAt = Date.now();
          checkRespawnGeoCompliance(sq);
          saveState();
        }
      }
    },
    () => {},
    { enableHighAccuracy: true, maximumAge: 10000 }
  );
}

window.addEventListener('DOMContentLoaded', async () => {
  updateGitHubHeaderIndicator();
  renderApp();
  if (isGitHubConfigured()) {
    restartGitHubPolling();
    const remote = await fetchServerStateFromGitHub(true);
    if (remote && remote.state) {
      appState = remote.state;
      saveState(true);
      if (session.role) renderApp();
    }
  }
});
