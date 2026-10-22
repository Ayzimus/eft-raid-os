/*************************************************************************
 * EFT: RAID OS // МОДУЛЬ 2: КЛИЕНТ-СЕРВЕРНОЕ ЯДРО GITHUB REPOSITORY API
 * Файл: github-cloud.js
 *************************************************************************/

let ghConfig = loadGitHubConfig();
let ghPendingQueue = loadGitHubQueue();
let ghSyncState = {
  isSyncing: false,
  lastSyncTime: null,
  lastSha: null,
  status: 'LOCAL', // 'LOCAL' | 'ONLINE' | 'SYNCING' | 'ERROR' | 'QUEUE'
  errorMessage: ''
};
let ghPushDebounceTimer = null;
let ghPollTimer = null;

function detectGitHubPagesRepo() {
  try {
    const host = window.location.hostname || '';
    const pathParts = (window.location.pathname || '').split('/').filter(Boolean);
    if (host.endsWith('.github.io')) {
      const owner = host.replace('.github.io', '');
      const repo = pathParts[0] || '';
      if (owner && repo) {
        return { owner, repo };
      }
    }
  } catch (e) {}
  return { owner: '', repo: '' };
}

function loadGitHubConfig() {
  const detected = detectGitHubPagesRepo();
  try {
    const raw = localStorage.getItem(GH_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        owner: parsed.owner || detected.owner || '',
        repo: parsed.repo || detected.repo || '',
        branch: parsed.branch || 'main',
        token: parsed.token || '',
        pollSeconds: Number(parsed.pollSeconds) || 12
      };
    }
  } catch (e) {}
  return {
    owner: detected.owner || '',
    repo: detected.repo || '',
    branch: 'main',
    token: '',
    pollSeconds: 12
  };
}

function saveGitHubConfig() {
  try {
    localStorage.setItem(GH_CONFIG_KEY, JSON.stringify(ghConfig));
  } catch (e) {}
  restartGitHubPolling();
  updateGitHubHeaderIndicator();
}

function loadGitHubQueue() {
  try {
    const raw = localStorage.getItem(GH_QUEUE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

function saveGitHubQueue() {
  try {
    localStorage.setItem(GH_QUEUE_KEY, JSON.stringify(ghPendingQueue));
  } catch (e) {}
  updateGitHubHeaderIndicator();
}

function isGitHubConfigured() {
  return Boolean(ghConfig.owner && ghConfig.repo);
}

function canWriteToGitHub() {
  return Boolean(ghConfig.owner && ghConfig.repo && ghConfig.token);
}

// Кодирование UTF-8 <-> Base64 для GitHub REST API
function utf8ToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binString = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binString += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binString);
}

function base64ToUtf8(b64) {
  const clean = b64.replace(/\s/g, '');
  const binString = atob(clean);
  const bytes = new Uint8Array(binString.length);
  for (let i = 0; i < binString.length; i++) {
    bytes[i] = binString.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function getGitHubHeaders() {
  const headers = {
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };
  if (ghConfig.token) {
    headers['Authorization'] = `Bearer ${ghConfig.token}`;
  }
  return headers;
}

function updateGitHubHeaderIndicator() {
  const dot = document.getElementById('ghSyncDot');
  const label = document.getElementById('ghSyncStatusLabel');
  const modalStatus = document.getElementById('ghModalStatusText');
  const modalQueue = document.getElementById('ghModalQueueCount');
  const modalLast = document.getElementById('ghModalLastSync');

  if (modalQueue) modalQueue.textContent = `${ghPendingQueue.length} пакетов`;
  if (modalLast && ghSyncState.lastSyncTime) {
    modalLast.textContent = ghSyncState.lastSyncTime;
  }

  if (!isGitHubConfigured()) {
    if (dot) dot.className = 'w-2 h-2 rounded-full bg-zinc-500 inline-block';
    if (label) label.textContent = 'GH: НЕ НАСТРОЕН';
    if (modalStatus) {
      modalStatus.textContent = 'Локальный режим (укажите Owner / Repo / Token)';
      modalStatus.className = 'font-bold text-amber-400';
    }
    return;
  }

  if (ghSyncState.isSyncing) {
    if (dot) dot.className = 'w-2 h-2 rounded-full bg-sky-400 animate-ping inline-block';
    if (label) label.textContent = 'GH: ОБМЕН...';
    return;
  }

  if (ghPendingQueue.length > 0) {
    if (dot) dot.className = 'w-2 h-2 rounded-full bg-amber-400 inline-block';
    if (label) label.textContent = `GH: ОЧЕРЕДЬ (${ghPendingQueue.length})`;
    if (modalStatus) {
      modalStatus.textContent = `Ожидание сети (${ghPendingQueue.length} в очереди)`;
      modalStatus.className = 'font-bold text-amber-400';
    }
    return;
  }

  if (ghSyncState.status === 'ONLINE') {
    if (dot) dot.className = 'w-2 h-2 rounded-full bg-emerald-400 inline-block';
    if (label) label.textContent = `GH: ${ghConfig.repo}`;
    if (modalStatus) {
      modalStatus.textContent = `Подключено к ${ghConfig.owner}/${ghConfig.repo} (${ghConfig.branch})`;
      modalStatus.className = 'font-bold text-emerald-400';
    }
  } else if (ghSyncState.status === 'ERROR') {
    if (dot) dot.className = 'w-2 h-2 rounded-full bg-red-500 inline-block';
    if (label) label.textContent = 'GH: ОШИБКА';
    if (modalStatus) {
      modalStatus.textContent = `Ошибка: ${ghSyncState.errorMessage || 'Проверьте права токена'}`;
      modalStatus.className = 'font-bold text-red-400';
    }
  } else {
    if (dot) dot.className = 'w-2 h-2 rounded-full bg-amber-400 inline-block';
    if (label) label.textContent = `GH: ${ghConfig.repo}`;
  }
}

function mergeClientIntoServerState(serverState, clientState) {
  const merged = validateAndRepairState(JSON.parse(JSON.stringify(serverState)));

  if (session.role === 'COMMANDER' && session.squadId) {
    const localSq = clientState.squads.find(s => s.id === session.squadId);
    const srvIdx = merged.squads.findIndex(s => s.id === session.squadId);
    if (localSq && srvIdx !== -1) {
      const srvSq = merged.squads[srvIdx];
      const photoMap = new Map();
      (srvSq.evidencePhotos || []).forEach(p => photoMap.set(p.id, p));
      (localSq.evidencePhotos || []).forEach(p => photoMap.set(p.id, p));

      const compMap = new Map();
      (srvSq.completedStages || []).forEach(c => compMap.set(c.stageId, c));
      (localSq.completedStages || []).forEach(c => compMap.set(c.stageId, c));

      merged.squads[srvIdx] = {
        ...srvSq,
        currentStageIdx: Math.max(srvSq.currentStageIdx || 0, localSq.currentStageIdx || 0),
        tokensCount: localSq.tokensCount,
        hintUnlockedForStage: srvSq.hintUnlockedForStage || localSq.hintUnlockedForStage,
        gps: localSq.gps,
        respawn: localSq.respawn,
        completedStages: Array.from(compMap.values()),
        evidencePhotos: Array.from(photoMap.values())
      };
    }
    return merged;
  }

  if (session.role === 'CURATOR' && session.faction) {
    clientState.squads.filter(s => s.faction === session.faction).forEach(localSq => {
      const srvIdx = merged.squads.findIndex(s => s.id === localSq.id);
      if (srvIdx !== -1) {
        const srvSq = merged.squads[srvIdx];
        const photoMap = new Map();
        (srvSq.evidencePhotos || []).forEach(p => photoMap.set(p.id, p));
        (localSq.evidencePhotos || []).forEach(p => photoMap.set(p.id, p));
        merged.squads[srvIdx] = {
          ...localSq,
          evidencePhotos: Array.from(photoMap.values())
        };
      }
    });
    return merged;
  }

  const result = validateAndRepairState(JSON.parse(JSON.stringify(clientState)));
  result.squads.forEach(sq => {
    const srvSq = merged.squads.find(s => s.id === sq.id);
    if (srvSq) {
      const photoMap = new Map();
      (srvSq.evidencePhotos || []).forEach(p => photoMap.set(p.id, p));
      (sq.evidencePhotos || []).forEach(p => photoMap.set(p.id, p));
      sq.evidencePhotos = Array.from(photoMap.values());
    }
  });
  return result;
}

async function uploadEvidenceBinaryToGitHub(squadId, photoObj) {
  if (!canWriteToGitHub() || !photoObj || !photoObj.dataUrl) return null;
  const base64Data = photoObj.dataUrl.split(',')[1];
  if (!base64Data) return null;

  const filePath = `evidence/${squadId}/${photoObj.id}.jpg`;
  const apiUrl = `https://api.github.com/repos/${encodeURIComponent(ghConfig.owner)}/${encodeURIComponent(ghConfig.repo)}/contents/${filePath}`;

  try {
    let existingSha = null;
    const checkResp = await fetch(`${apiUrl}?ref=${encodeURIComponent(ghConfig.branch)}`, {
      headers: getGitHubHeaders(),
      cache: 'no-store'
    });
    if (checkResp.ok) {
      const checkJson = await checkResp.json();
      existingSha = checkJson.sha;
      if (checkJson.download_url) return checkJson.download_url;
    }

    const bodyPayload = {
      message: `📸 Улика [${squadId}] Этап #${photoObj.stageOrder}: ${photoObj.stageTitle}`,
      content: base64Data,
      branch: ghConfig.branch
    };
    if (existingSha) bodyPayload.sha = existingSha;

    const putResp = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        ...getGitHubHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(bodyPayload)
    });

    if (putResp.ok) {
      const putJson = await putResp.json();
      return (putJson.content && putJson.content.download_url) || null;
    }
  } catch (e) {
    console.warn('Evidence file upload deferred to queue:', e);
  }
  return null;
}

async function fetchServerStateFromGitHub(silent) {
  if (!isGitHubConfigured()) return null;
  const filePath = 'data/raid_state.json';
  const apiUrl = `https://api.github.com/repos/${encodeURIComponent(ghConfig.owner)}/${encodeURIComponent(ghConfig.repo)}/contents/${filePath}?ref=${encodeURIComponent(ghConfig.branch)}&_t=${Date.now()}`;

  ghSyncState.isSyncing = true;
  updateGitHubHeaderIndicator();

  try {
    const resp = await fetch(apiUrl, {
      headers: getGitHubHeaders(),
      cache: 'no-store'
    });

    if (resp.status === 404) {
      ghSyncState.isSyncing = false;
      if (canWriteToGitHub()) {
        await pushStateToGitHubServer(true);
      }
      return null;
    }

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }

    const data = await resp.json();
    ghSyncState.lastSha = data.sha;

    let jsonStr = '';
    if (data.content) {
      jsonStr = base64ToUtf8(data.content);
    } else if (data.download_url) {
      const rawResp = await fetch(data.download_url + '?_t=' + Date.now());
      jsonStr = await rawResp.text();
    }

    const remoteState = validateAndRepairState(JSON.parse(jsonStr));
    ghSyncState.status = 'ONLINE';
    ghSyncState.lastSyncTime = new Date().toLocaleTimeString('ru-RU');
    ghSyncState.isSyncing = false;
    updateGitHubHeaderIndicator();
    return { state: remoteState, sha: data.sha };
  } catch (err) {
    ghSyncState.isSyncing = false;
    ghSyncState.status = 'ERROR';
    ghSyncState.errorMessage = err.message;
    updateGitHubHeaderIndicator();
    if (!silent) {
      showToast('Сервер GitHub недоступен. Работаем автономно с очередью.', 'warn');
    }
    return null;
  }
}

async function pushStateToGitHubServer(isInitialCreate) {
  if (!canWriteToGitHub()) return false;

  ghSyncState.isSyncing = true;
  updateGitHubHeaderIndicator();

  const filePath = 'data/raid_state.json';
  const apiUrl = `https://api.github.com/repos/${encodeURIComponent(ghConfig.owner)}/${encodeURIComponent(ghConfig.repo)}/contents/${filePath}`;

  try {
    if (ghPendingQueue.length > 0) {
      const remainingQueue = [];
      for (const item of ghPendingQueue) {
        if (item.type === 'EVIDENCE_PHOTO') {
          const sq = appState.squads.find(s => s.id === item.squadId);
          const photo = sq ? sq.evidencePhotos.find(p => p.id === item.photoId) : null;
          if (photo) {
            const cloudUrl = await uploadEvidenceBinaryToGitHub(item.squadId, photo);
            if (cloudUrl) {
              photo.githubUrl = cloudUrl;
              photo.syncedToGitHub = true;
            } else {
              remainingQueue.push(item);
            }
          }
        }
      }
      ghPendingQueue = remainingQueue;
      saveGitHubQueue();
    }

    let targetSha = ghSyncState.lastSha;
    let stateToCommit = appState;

    if (!isInitialCreate) {
      const checkResp = await fetch(`${apiUrl}?ref=${encodeURIComponent(ghConfig.branch)}&_t=${Date.now()}`, {
        headers: getGitHubHeaders(),
        cache: 'no-store'
      });
      if (checkResp.ok) {
        const checkData = await checkResp.json();
        targetSha = checkData.sha;
        if (checkData.content) {
          const serverState = validateAndRepairState(JSON.parse(base64ToUtf8(checkData.content)));
          stateToCommit = mergeClientIntoServerState(serverState, appState);
          appState = stateToCommit;
          saveState(true);
        }
      }
    }

    const actorLabel = session.role === 'COMMANDER'
      ? `Отряд ${session.squadId}`
      : (session.role === 'CURATOR' ? `Куратор ${session.faction}` : 'GameMaster');

    const payload = {
      message: `🔄 RAID OS Sync [${actorLabel}] ${new Date().toLocaleTimeString('ru-RU')}`,
      content: utf8ToBase64(JSON.stringify(stateToCommit, null, 2)),
      branch: ghConfig.branch
    };
    if (targetSha) payload.sha = targetSha;

    const putResp = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        ...getGitHubHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!putResp.ok) {
      throw new Error(`GitHub PUT ${putResp.status}`);
    }

    const putData = await putResp.json();
    if (putData.content && putData.content.sha) {
      ghSyncState.lastSha = putData.content.sha;
    }

    ghSyncState.status = 'ONLINE';
    ghSyncState.lastSyncTime = new Date().toLocaleTimeString('ru-RU');
    ghSyncState.isSyncing = false;
    updateGitHubHeaderIndicator();
    return true;
  } catch (err) {
    ghSyncState.isSyncing = false;
    ghSyncState.status = 'ERROR';
    ghSyncState.errorMessage = err.message;
    if (!ghPendingQueue.some(q => q.type === 'STATE_SYNC')) {
      ghPendingQueue.push({ type: 'STATE_SYNC', timestamp: Date.now() });
      saveGitHubQueue();
    }
    updateGitHubHeaderIndicator();
    return false;
  }
}

function scheduleCloudPush() {
  if (!canWriteToGitHub()) {
    if (isGitHubConfigured() && !ghPendingQueue.some(q => q.type === 'STATE_SYNC')) {
      ghPendingQueue.push({ type: 'STATE_SYNC', timestamp: Date.now() });
      saveGitHubQueue();
    }
    return;
  }
  if (ghPushDebounceTimer) clearTimeout(ghPushDebounceTimer);
  ghPushDebounceTimer = setTimeout(() => {
    pushStateToGitHubServer(false);
  }, 1200);
}

async function manualCloudSyncNow() {
  if (!isGitHubConfigured()) {
    openGitHubCloudModal();
    return;
  }
  showToast('Синхронизация с репозиторием GitHub...', 'info');
  if (canWriteToGitHub() && ghPendingQueue.length > 0) {
    await pushStateToGitHubServer(false);
  }
  const remote = await fetchServerStateFromGitHub(false);
  if (remote && remote.state) {
    appState = mergeClientIntoServerState(remote.state, appState);
    saveState(true);
    const activeTag = document.activeElement ? document.activeElement.tagName : '';
    if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA' && session.role) {
      renderApp();
    }
    showToast('Данные синхронизированы с GitHub!', 'ok');
  }
}

function restartGitHubPolling() {
  if (ghPollTimer) clearInterval(ghPollTimer);
  if (!isGitHubConfigured()) return;
  const intervalMs = Math.max(6, Number(ghConfig.pollSeconds) || 12) * 1000;
  ghPollTimer = setInterval(async () => {
    if (ghSyncState.isSyncing) return;
    if (canWriteToGitHub() && ghPendingQueue.length > 0) {
      await pushStateToGitHubServer(false);
      return;
    }
    const remote = await fetchServerStateFromGitHub(true);
    if (remote && remote.state) {
      const oldMod = appState.lastModified || 0;
      const newMod = remote.state.lastModified || 0;
      if (newMod !== oldMod) {
        appState = remote.state;
        saveState(true);
        const activeTag = document.activeElement ? document.activeElement.tagName : '';
        if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA' && session.role) {
          renderApp();
        }
      }
    }
  }, intervalMs);
}

function openGitHubCloudModal() {
  const modal = document.getElementById('ghCloudModal');
  if (!modal) return;
  document.getElementById('ghOwnerInput').value = ghConfig.owner || '';
  document.getElementById('ghRepoInput').value = ghConfig.repo || '';
  document.getElementById('ghBranchInput').value = ghConfig.branch || 'main';
  document.getElementById('ghPollIntervalInput').value = ghConfig.pollSeconds || 12;
  document.getElementById('ghTokenInput').value = ghConfig.token || '';
  updateGitHubHeaderIndicator();
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeGitHubCloudModal() {
  const modal = document.getElementById('ghCloudModal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

async function saveAndTestGitHubConfig() {
  ghConfig.owner = document.getElementById('ghOwnerInput').value.trim();
  ghConfig.repo = document.getElementById('ghRepoInput').value.trim();
  ghConfig.branch = document.getElementById('ghBranchInput').value.trim() || 'main';
  ghConfig.pollSeconds = Math.max(5, parseInt(document.getElementById('ghPollIntervalInput').value, 10) || 12);
  ghConfig.token = document.getElementById('ghTokenInput').value.trim();
  saveGitHubConfig();

  if (!ghConfig.owner || !ghConfig.repo) {
    showToast('Укажите владельца (Owner) и название репозитория (Repo)', 'warn');
    return;
  }

  showToast('Проверка связи с репозиторием GitHub...', 'info');
  const res = await fetchServerStateFromGitHub(false);
  if (res && res.state) {
    appState = res.state;
    saveState(true);
    if (session.role) renderApp();
    showToast('Репозиторий GitHub успешно подключен!', 'ok');
  } else if (canWriteToGitHub()) {
    const pushed = await pushStateToGitHubServer(true);
    if (pushed) {
      showToast('Создан файл data/raid_state.json в репозитории GitHub!', 'ok');
    }
  }
}

async function forcePushFullStateToGitHub() {
  ghConfig.owner = document.getElementById('ghOwnerInput').value.trim();
  ghConfig.repo = document.getElementById('ghRepoInput').value.trim();
  ghConfig.branch = document.getElementById('ghBranchInput').value.trim() || 'main';
  ghConfig.token = document.getElementById('ghTokenInput').value.trim();
  saveGitHubConfig();

  if (!canWriteToGitHub()) {
    showToast('Для записи в репозиторий укажите Owner, Repo и Token!', 'err');
    return;
  }
  const ok = await pushStateToGitHubServer(false);
  if (ok) {
    showToast('База квестов и улик выгружена на сервер GitHub!', 'ok');
    if (session.role) renderApp();
  } else {
    showToast('Ошибка выгрузки. Проверьте права токена (Contents: Read & Write).', 'err');
  }
}

async function forcePullStateFromGitHub() {
  ghConfig.owner = document.getElementById('ghOwnerInput').value.trim();
  ghConfig.repo = document.getElementById('ghRepoInput').value.trim();
  ghConfig.branch = document.getElementById('ghBranchInput').value.trim() || 'main';
  ghConfig.token = document.getElementById('ghTokenInput').value.trim();
  saveGitHubConfig();

  const res = await fetchServerStateFromGitHub(false);
  if (res && res.state) {
    appState = res.state;
    saveState(true);
    if (session.role) renderApp();
    showToast('База данных успешно загружена из репозитория GitHub!', 'ok');
  }
}

function buildSquadPassQrPayload(squad) {
  if (isGitHubConfigured() && ghConfig.token) {
    const cfgPack = `${ghConfig.owner}|${ghConfig.repo}|${ghConfig.branch}|${ghConfig.token}`;
    return `EFT_SQUAD_CLOUD:${squad.loginPin}:${utf8ToBase64(cfgPack)}`;
  }
  return `EFT_SQUAD_LOGIN:${squad.id}:${squad.loginPin}`;
}
