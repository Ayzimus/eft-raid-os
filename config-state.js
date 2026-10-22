/*************************************************************************
 * EFT: RAID OS // МОДУЛЬ 1: КОНФИГУРАЦИЯ, СОСТОЯНИЕ И ГЕО-МАТЕМАТИКА
 * Файл: config-state.js
 *************************************************************************/

const STORAGE_KEY = 'EFT_RAID_OS_V5_GH_CLOUD';
const GH_CONFIG_KEY = 'EFT_RAID_OS_GH_CONFIG_V1';
const GH_QUEUE_KEY = 'EFT_RAID_OS_GH_QUEUE_V1';
const POLYGON_ORIGIN = { lat: 55.698200, lng: 37.912500 };

function xyToLatLng(x, y, origin) {
  const base = origin || POLYGON_ORIGIN;
  const latOffset = ((50 - y) * 3.5) / 111111;
  const lngOffset = ((x - 50) * 5.0) / (111111 * Math.cos(base.lat * Math.PI / 180));
  return {
    lat: Number((base.lat + latOffset).toFixed(6)),
    lng: Number((base.lng + lngOffset).toFixed(6))
  };
}

function getDefaultState() {
  return {
    version: 5,
    lastModified: Date.now(),
    polygonCenter: { lat: 55.698200, lng: 37.912500 },
    gmCredentials: {
      login: 'GlobalGM',
      pass: 'Disolate26!'
    },
    curatorCredentials: {
      BEAR: { login: 'PraporBEAR', pass: 'Bear2026!', callsign: 'ПРАПОР (Штаб BEAR)' },
      USEC: { login: 'PeaceUSEC', pass: 'Usec2026!', callsign: 'МИРОТВОРЕЦ (Штаб USEC)' }
    },
    hintRules: {
      autoHintMinutes: 20,
      skierTokenCostStage1: 4,
      skierTokenCostStage2: 5,
      totalSkierQuota: 9,
      allowManualCuratorHints: true,
      broadcastMessage: 'ШТАБ ПОЛИХИМ: Документы в архивных коробах заламинированы и неотчуждаемы — ведите фотофиксацию улик в КПК. Все снимки и прогресс синхронизируются с сервером GitHub.'
    },
    respawnSettings: {
      defaultWaitMinutes: 20,
      requireGeoLock: true,
      zones: [
        { id: 'resp-bear', name: 'Мертвяк Север (BEAR)', faction: 'BEAR', x: 16, y: 18, lat: 55.699271, lng: 37.909792, radiusMeters: 45 },
        { id: 'resp-usec', name: 'Мертвяк Юг (USEC)', faction: 'USEC', x: 84, y: 82, lat: 55.697129, lng: 37.915208, radiusMeters: 45 },
        { id: 'resp-gen', name: 'Общий Госпиталь ООН', faction: 'ALL', x: 50, y: 90, lat: 55.696877, lng: 37.912500, radiusMeters: 40 }
      ]
    },
    pois: [
      { id: 'poi-skier', name: 'NPC Лыжник (Барыга)', type: 'trader', x: 50, y: 48, lat: 55.698263, lng: 37.912500, desc: 'Холодная зона 15м. Обмен жетонов противоположной ЧВК (4 + 5) на ключи от кэшбоксов.' },
      { id: 'poi-ceh1', name: 'Цех №1 (Синтез)', type: 'building', x: 32, y: 34, lat: 55.698704, lng: 37.911066, desc: 'Архивные короба на кабельных лотках.' },
      { id: 'poi-itr', name: 'Архив ИТР / Лаборатория', type: 'building', x: 66, y: 30, lat: 55.698830, lng: 37.913775, desc: 'Связки папок «Дело №...».' },
      { id: 'poi-bunker', name: 'Подземный шлюз «Labrys»', type: 'bunker', x: 48, y: 70, lat: 55.697570, lng: 37.912341, desc: 'Финальный объект вскрытия и эвакуации контейнера 7 кг.' }
    ],
    questlines: [
      {
        id: 'ql-chimera',
        title: 'Спектр «Химеры» (Вектор Х-7)',
        code: 'OP-CHIMERA-7',
        description: 'Расследование синтеза бинарного нейроагента «Вектор Х-7» на мощностях комбината «Полихим» и эвакуация криоконтейнера 7 кг.',
        active: true,
        stages: [
          {
            id: 'st-1',
            order: 1,
            title: 'Этап 1: Журнал смен Цеха №1',
            locationName: 'Цех №1 (Южная ферма, оконная ниша)',
            x: 32, y: 34,
            lat: 55.698704, lng: 37.911066,
            pinCode: '4109',
            qrPayload: 'EFT_STAGE:ql-chimera:st-1:4109',
            bearBriefing: 'ПРАПОР: Бойцы, найдите архивный короб под кабельным лотком в Цехе №1. Среди макулатуры списания удобрений сфотографируйте акт утечки реагента «Х-7» и введите 4-значный шифр.',
            usecBriefing: 'PEACEKEEPER: Отряд, выдвигайтесь в Цех №1 комбината «Полихим». В архивном коробе найдите ламинированный протокол инцидента TerraGroup, сделайте фотофиксацию и введите код.',
            hintText: 'Ищите картонную архивную коробку на высоте груди у второй несущей колонны. Нужный лист подшит в папку «Дело №04-ТБ».',
            sideTask: 'ДОП. ЗАДАЧА: Сфотографировать маркировку бочек с прекурсором (+1 жетон).',
            requiresPhoto: true,
            isSkierStage: false
          },
          {
            id: 'st-2',
            order: 2,
            title: 'Этап 2: Анатомический меморандум',
            locationName: 'Насосная станция (Трубная магистраль)',
            x: 42, y: 58,
            lat: 55.697948, lng: 37.911863,
            pinCode: '7392',
            qrPayload: 'EFT_STAGE:ql-chimera:st-2:7392',
            bearBriefing: 'ПРАПОР: В акте указана перекачка раствора в Насосную. Осмотрите тела с бирками #048-ТГ и архивный короб за вентилем.',
            usecBriefing: 'PEACEKEEPER: Проверьте дренажный коллектор Насосной станции. Сличите бирки персонала с журналом карантина.',
            hintText: 'Короб притянут тросиком к синей задвижке. Сверьте номер бирки #052-ТГ с таблицей.',
            sideTask: 'ДОП. ЗАДАЧА: Зафиксировать следы присутствия сектантов (глифы мелом).',
            requiresPhoto: true,
            isSkierStage: false
          },
          {
            id: 'st-3',
            order: 3,
            title: 'Этап 3: Сделка с Лыжником (Ключ от Архива)',
            locationName: 'Фактория NPC Лыжник',
            x: 50, y: 48,
            lat: 55.698263, lng: 37.912500,
            pinCode: '5514',
            qrPayload: 'EFT_STAGE:ql-chimera:st-3:5514',
            bearBriefing: 'ПРАПОР: Металлический кэшбокс главного технолога заперт. Идите к Лыжнику и выкупите механический ключ за 4 жетона USEC.',
            usecBriefing: 'PEACEKEEPER: Архив ИТР закрыт на почтовый замок. Передайте Лыжнику 4 жетона BEAR за механический ключ и наводку.',
            hintText: 'В радиусе 15 м от Лыжника действует Холодная зона. После сдачи 4 жетонов отсканируйте QR у торговца.',
            sideTask: 'ДОП. ЗАДАЧА: Выведать у Лыжника частоту резервного радиоканала.',
            requiresPhoto: false,
            isSkierStage: true,
            skierCost: 4
          },
          {
            id: 'st-4',
            order: 4,
            title: 'Этап 4: Кэшбокс Главного Инженера',
            locationName: 'Архив ИТР (Второй ярус)',
            x: 66, y: 30,
            lat: 55.698830, lng: 37.913775,
            pinCode: '8820',
            qrPayload: 'EFT_STAGE:ql-chimera:st-4:8820',
            bearBriefing: 'ПРАПОР: Отомкните металлический кэшбокс ключом Лыжника в Архиве ИТР. Сфотографируйте схему подачи питания шлюза «Labrys».',
            usecBriefing: 'PEACEKEEPER: Используйте полученный ключ для вскрытия кэшбокса в секторе ИТР. Зафиксируйте директиву эвакуации «Labrys».',
            hintText: 'Кэшбокс прикован цепью к двутавровой балке под лестничным маршем.',
            sideTask: 'ДОП. ЗАДАЧА: Найти резервный предохранитель 100А в щитовой.',
            requiresPhoto: true,
            isSkierStage: false
          },
          {
            id: 'st-5',
            order: 5,
            title: 'Этап 5: Вскрытие «Labrys» и Эвакуация 7 кг',
            locationName: 'Подземный шлюз «Labrys» -> База стороны',
            x: 48, y: 70,
            lat: 55.697570, lng: 37.912341,
            pinCode: '9901',
            qrPayload: 'EFT_STAGE:ql-chimera:st-5:9901',
            bearBriefing: 'ПРАПОР: ФИНАЛ! Запустите щит по инструкции, заберите криоконтейнер «Химера» (7 кг, переноска строго двумя руками!) и доставьте на базу BEAR.',
            usecBriefing: 'PEACEKEEPER: FINAL STAGE! Извлеките биоконтейнер «Вектор Х-7» (7 кг, переноска двумя руками, бег запрещен) и доставьте на точку эвакуации USEC.',
            hintText: 'При огневом контакте боец обязан поставить кейс на землю перед стрельбой. Сдайте кейс Куратору стороны.',
            sideTask: 'ДОП. ЗАДАЧА: Эвакуировать группу без потерь личного состава.',
            requiresPhoto: true,
            isSkierStage: false
          }
        ]
      }
    ],
    squads: [
      {
        id: 'sq-bear-1',
        name: 'ГРУППА «ВЫМПЕЛ-1»',
        faction: 'BEAR',
        commanderCallsign: 'ВОРОН [B-01]',
        loginPin: 'BEAR-1042',
        members: ['ВОРОН (Ком)', 'ГРОМ', 'ЛЕШИЙ', 'ТАЙГА', 'КЛИН'],
        questlineId: 'ql-chimera',
        currentStageIdx: 0,
        status: 'ACTIVE',
        tokensCount: 6,
        hintUnlockedForStage: false,
        stageStartedAt: Date.now() - 480000,
        gps: { x: 28, y: 30, lat: 55.698830, lng: 37.910748, accuracy: 6, updatedAt: Date.now() },
        respawn: {
          isDead: false,
          zoneId: 'resp-bear',
          endTime: 0,
          insideZone: true,
          violationAlert: false
        },
        completedStages: [],
        evidencePhotos: []
      },
      {
        id: 'sq-bear-2',
        name: 'ГРУППА «СЕВЕР-2»',
        faction: 'BEAR',
        commanderCallsign: 'БАТЯ [B-02]',
        loginPin: 'BEAR-1099',
        members: ['БАТЯ (Ком)', 'ЕГЕРЬ', 'САПСАН', 'БУРАН'],
        questlineId: 'ql-chimera',
        currentStageIdx: 1,
        status: 'ACTIVE',
        tokensCount: 3,
        hintUnlockedForStage: false,
        stageStartedAt: Date.now() - 950000,
        gps: { x: 40, y: 54, lat: 55.698074, lng: 37.911703, accuracy: 8, updatedAt: Date.now() },
        respawn: {
          isDead: false,
          zoneId: 'resp-bear',
          endTime: 0,
          insideZone: true,
          violationAlert: false
        },
        completedStages: [
          { stageId: 'st-1', completedAt: '12:40:15', method: 'QR' }
        ],
        evidencePhotos: []
      },
      {
        id: 'sq-usec-1',
        name: 'SQUAD «ALPHA-ACTUAL»',
        faction: 'USEC',
        commanderCallsign: 'HAWK [U-01]',
        loginPin: 'USEC-2042',
        members: ['HAWK (Lead)', 'VIPER', 'GHOST', 'REAPER', 'BISHOP'],
        questlineId: 'ql-chimera',
        currentStageIdx: 1,
        status: 'ACTIVE',
        tokensCount: 5,
        hintUnlockedForStage: false,
        stageStartedAt: Date.now() - 620000,
        gps: { x: 46, y: 60, lat: 55.697885, lng: 37.912181, accuracy: 5, updatedAt: Date.now() },
        respawn: {
          isDead: false,
          zoneId: 'resp-usec',
          endTime: 0,
          insideZone: true,
          violationAlert: false
        },
        completedStages: [
          { stageId: 'st-1', completedAt: '12:35:50', method: 'PIN' }
        ],
        evidencePhotos: []
      },
      {
        id: 'sq-usec-2',
        name: 'SQUAD «DAGGER-2»',
        faction: 'USEC',
        commanderCallsign: 'SHADOW [U-02]',
        loginPin: 'USEC-2088',
        members: ['SHADOW (Lead)', 'STRIKER', 'NOMAD', 'FROST'],
        questlineId: 'ql-chimera',
        currentStageIdx: 0,
        status: 'ACTIVE',
        tokensCount: 2,
        hintUnlockedForStage: false,
        stageStartedAt: Date.now() - 300000,
        gps: { x: 83, y: 81, lat: 55.697161, lng: 37.915129, accuracy: 9, updatedAt: Date.now() },
        respawn: {
          isDead: true,
          zoneId: 'resp-usec',
          endTime: Date.now() + 840000,
          insideZone: true,
          violationAlert: false
        },
        completedStages: [],
        evidencePhotos: []
      }
    ]
  };
}

function validateAndRepairState(parsed) {
  const def = getDefaultState();
  if (!parsed || typeof parsed !== 'object') return def;
  if (!parsed.polygonCenter || typeof parsed.polygonCenter.lat !== 'number') parsed.polygonCenter = def.polygonCenter;
  if (!parsed.gmCredentials) parsed.gmCredentials = def.gmCredentials;
  if (!parsed.curatorCredentials) parsed.curatorCredentials = def.curatorCredentials;
  if (!parsed.hintRules) parsed.hintRules = def.hintRules;
  if (!parsed.respawnSettings || !Array.isArray(parsed.respawnSettings.zones)) parsed.respawnSettings = def.respawnSettings;
  if (!Array.isArray(parsed.pois)) parsed.pois = def.pois;
  if (!Array.isArray(parsed.questlines) || parsed.questlines.length === 0) parsed.questlines = def.questlines;
  if (!Array.isArray(parsed.squads) || parsed.squads.length === 0) parsed.squads = def.squads;

  parsed.respawnSettings.zones.forEach(z => {
    if (typeof z.lat !== 'number' || typeof z.lng !== 'number') {
      const c = xyToLatLng(z.x || 50, z.y || 50, parsed.polygonCenter);
      z.lat = c.lat; z.lng = c.lng;
    }
  });
  parsed.pois.forEach(p => {
    if (typeof p.lat !== 'number' || typeof p.lng !== 'number') {
      const c = xyToLatLng(p.x || 50, p.y || 50, parsed.polygonCenter);
      p.lat = c.lat; p.lng = c.lng;
    }
  });
  parsed.questlines.forEach(ql => {
    if (!Array.isArray(ql.stages)) ql.stages = [];
    ql.stages.forEach(s => {
      if (typeof s.lat !== 'number' || typeof s.lng !== 'number') {
        const c = xyToLatLng(s.x || 50, s.y || 50, parsed.polygonCenter);
        s.lat = c.lat; s.lng = c.lng;
      }
    });
  });
  parsed.squads.forEach(sq => {
    if (!sq.gps) sq.gps = { x: 50, y: 50, lat: parsed.polygonCenter.lat, lng: parsed.polygonCenter.lng, accuracy: 10, updatedAt: Date.now() };
    if (typeof sq.gps.lat !== 'number' || typeof sq.gps.lng !== 'number') {
      const c = xyToLatLng(sq.gps.x || 50, sq.gps.y || 50, parsed.polygonCenter);
      sq.gps.lat = c.lat; sq.gps.lng = c.lng;
    }
    if (!sq.respawn) sq.respawn = { isDead: false, zoneId: 'resp-gen', endTime: 0, insideZone: true, violationAlert: false };
    if (!Array.isArray(sq.completedStages)) sq.completedStages = [];
    if (!Array.isArray(sq.evidencePhotos)) sq.evidencePhotos = [];
  });
  return parsed;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultState();
    return validateAndRepairState(JSON.parse(raw));
  } catch (e) {
    return getDefaultState();
  }
}

function saveState(skipCloudSync) {
  appState.lastModified = Date.now();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
  } catch (e) {
    showToast('Память браузера заполнена! Фотографии сохраняются в GitHub.', 'warn');
  }
  if (!skipCloudSync && typeof scheduleCloudPush === 'function') {
    scheduleCloudPush();
  }
}

// Глобальные объекты состояния и сессии
let appState = loadState();

let session = {
  role: null,        // 'GM' | 'CURATOR' | 'COMMANDER'
  faction: null,     // 'BEAR' | 'USEC'
  squadId: null,     // ID отряда для командира
  activeTab: 'map',
  selectedQuestlineId: 'ql-chimera',
  gmMapClickMode: 'none',
  gmSelectedTargetId: '',
  satStyle: 'hybrid',
  nvgFilter: false
};

// Уведомления, гео-дистанция и форматирование таймеров
function showToast(msg, type = 'info') {
  const box = document.getElementById('toastBox');
  if (!box) return;
  const el = document.createElement('div');
  const colors = {
    info: 'border-amber-500/80 bg-zinc-900/95 text-amber-200',
    ok: 'border-emerald-500/80 bg-emerald-950/95 text-emerald-200',
    err: 'border-red-500/80 bg-red-950/95 text-red-200',
    warn: 'border-orange-500/80 bg-orange-950/95 text-orange-200'
  };
  el.className = `p-2.5 rounded border text-xs font-mono shadow-lg transition-all ${colors[type] || colors.info}`;
  el.innerHTML = `<div class="font-bold uppercase tracking-wider">[СИСТЕМА КПК]</div><div>${msg}</div>`;
  box.appendChild(el);
  setTimeout(() => el.remove(), 3800);
}

function calcDistanceMeters(lat1, lng1, lat2, lng2) {
  if (typeof lat1 === 'number' && typeof lng1 === 'number' && typeof lat2 === 'number' && typeof lng2 === 'number') {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  }
  return 0;
}

function formatTimer(ms) {
  if (ms <= 0) return '00:00';
  const totalSec = Math.ceil(ms / 1000);
  const m = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const s = String(totalSec % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function checkRespawnGeoCompliance(squad) {
  if (!squad.respawn || !squad.respawn.isDead) {
    if (squad.respawn) squad.respawn.violationAlert = false;
    return;
  }
  const zone = appState.respawnSettings.zones.find(z => z.id === squad.respawn.zoneId);
  if (!zone) return;
  const dist = calcDistanceMeters(squad.gps.lat, squad.gps.lng, zone.lat, zone.lng);
  const inside = dist <= zone.radiusMeters;
  squad.respawn.insideZone = inside;
  if (appState.respawnSettings.requireGeoLock && !inside && squad.respawn.endTime > Date.now()) {
    squad.respawn.violationAlert = true;
  } else {
    squad.respawn.violationAlert = false;
  }
}
