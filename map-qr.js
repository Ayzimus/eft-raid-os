/*************************************************************************
 * EFT: RAID OS // МОДУЛЬ 3: СПУТНИКОВАЯ КАРТА LEAFLET И QR-СИСТЕМА
 * Файл: map-qr.js
 *************************************************************************/

let activeLeafletMap = null;
let activeTileLayer = null;
let mapMarkersGroup = null;
let qrScannerInstance = null;
let qrScannerMode = 'STAGE'; // 'STAGE' | 'SQUAD_LOGIN'

function cleanupMapInstance() {
  if (activeLeafletMap) {
    try {
      activeLeafletMap.remove();
    } catch (e) {}
    activeLeafletMap = null;
    activeTileLayer = null;
    mapMarkersGroup = null;
  }
}

function initRealSatelliteMap(containerId, options = {}) {
  cleanupMapInstance();
  const container = document.getElementById(containerId);
  if (!container) return;

  if (typeof L === 'undefined') {
    container.innerHTML = `<div class="p-6 text-center font-mono text-xs text-amber-400">Загрузка спутникового модуля... Проверьте подключение к сети для подгрузки тайлов.</div>`;
    return;
  }

  if (session.nvgFilter) {
    container.classList.add('sat-nvg-filter');
    container.classList.remove('sat-tac-filter');
  } else {
    container.classList.add('sat-tac-filter');
    container.classList.remove('sat-nvg-filter');
  }

  const center = appState.polygonCenter || POLYGON_ORIGIN;
  activeLeafletMap = L.map(containerId, {
    center: [center.lat, center.lng],
    zoom: options.zoom || 17,
    maxZoom: 20,
    minZoom: 12,
    zoomControl: true
  });

  setSatelliteTileLayer(session.satStyle || 'hybrid');
  mapMarkersGroup = L.layerGroup().addTo(activeLeafletMap);

  renderMapOverlays(options);

  if (options.enableGmClick) {
    activeLeafletMap.on('click', function(e) {
      handleGmSatelliteMapClick(e.latlng.lat, e.latlng.lng);
    });
  }

  setTimeout(() => {
    if (activeLeafletMap) activeLeafletMap.invalidateSize();
  }, 150);
}

function setSatelliteTileLayer(style) {
  session.satStyle = style;
  if (!activeLeafletMap) return;
  if (activeTileLayer) {
    activeLeafletMap.removeLayer(activeTileLayer);
  }

  let tileUrl = 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}';
  let attr = 'Спутник: Google Hybrid';

  if (style === 'sat') {
    tileUrl = 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}';
    attr = 'Спутник: Google Satellite';
  } else if (style === 'esri') {
    tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    attr = 'Спутник: Esri World Imagery';
  }

  activeTileLayer = L.tileLayer(tileUrl, {
    maxZoom: 20,
    attribution: attr
  }).addTo(activeLeafletMap);
}

function toggleMapNvgMode(containerId) {
  session.nvgFilter = !session.nvgFilter;
  const c = document.getElementById(containerId);
  if (c) {
    c.classList.toggle('sat-nvg-filter', session.nvgFilter);
    c.classList.toggle('sat-tac-filter', !session.nvgFilter);
  }
}

function renderMapOverlays(options = {}) {
  if (!activeLeafletMap || !mapMarkersGroup) return;
  mapMarkersGroup.clearLayers();

  const filterFaction = options.filterFaction || null;
  const commanderSquad = options.commanderSquad || null;

  // 1. Зоны Мертвяка
  appState.respawnSettings.zones.forEach(z => {
    if (filterFaction && z.faction !== 'ALL' && z.faction !== filterFaction) return;
    const color = z.faction === 'BEAR' ? '#f97316' : (z.faction === 'USEC' ? '#38bdf8' : '#a855f7');

    L.circle([z.lat, z.lng], {
      radius: z.radiusMeters || 45,
      color: color,
      weight: 2,
      dashArray: '6, 4',
      fillColor: color,
      fillOpacity: 0.18
    }).bindPopup(`
      <div class="font-mono text-xs">
        <div class="font-bold text-red-400 uppercase">💀 ${z.name}</div>
        <div>Фракция: ${z.faction} | Радиус: ${z.radiusMeters} м</div>
        <div class="text-[10px] text-zinc-400">${z.lat.toFixed(5)}, ${z.lng.toFixed(5)}</div>
      </div>
    `).addTo(mapMarkersGroup);

    const skullIcon = L.divIcon({
      className: 'tac-marker-icon',
      html: `<div style="background:rgba(127,29,29,0.92);border:1px solid ${color};color:#fff;padding:1px 5px;border-radius:3px;font-size:10px;font-weight:700;white-space:nowrap;">💀 ${z.name}</div>`,
      iconSize: [100, 20],
      iconAnchor: [50, 10]
    });
    L.marker([z.lat, z.lng], { icon: skullIcon }).addTo(mapMarkersGroup);
  });

  // 2. Постоянные точки интереса (Лыжник, Цеха)
  appState.pois.forEach(p => {
    const poiIcon = L.divIcon({
      className: 'tac-marker-icon',
      html: `<div style="background:rgba(20,24,18,0.92);border:1px solid #eab308;color:#fde047;padding:2px 6px;border-radius:3px;font-size:10px;font-weight:700;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.8);">★ ${p.name}</div>`,
      iconSize: [120, 22],
      iconAnchor: [60, 11]
    });
    L.marker([p.lat, p.lng], { icon: poiIcon })
      .bindPopup(`<div class="font-mono text-xs"><div class="font-bold text-amber-400">${p.name}</div><div class="mt-1">${p.desc || ''}</div></div>`)
      .addTo(mapMarkersGroup);
  });

  // 3. Этапы квестлайна
  if (commanderSquad) {
    const ql = appState.questlines.find(q => q.id === commanderSquad.questlineId) || appState.questlines[0];
    const st = ql ? ql.stages[commanderSquad.currentStageIdx] : null;
    if (st && commanderSquad.status === 'ACTIVE') {
      const targetIcon = L.divIcon({
        className: 'tac-marker-icon',
        html: `<div class="pulse-dot" style="color:#eab308;background:#eab308;width:16px;height:16px;border-radius:50%;border:2px solid #000;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:9px;color:#000;">!</div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });
      L.marker([st.lat, st.lng], { icon: targetIcon })
        .bindPopup(`<div class="font-mono text-xs"><div class="font-bold text-amber-400">🎯 ТЕКУЩАЯ ЦЕЛЬ: ${st.title}</div><div>${st.locationName}</div><div class="text-[10px] text-zinc-400 mt-1">GPS: ${st.lat.toFixed(5)}, ${st.lng.toFixed(5)}</div></div>`)
        .addTo(mapMarkersGroup);

      L.polyline([[commanderSquad.gps.lat, commanderSquad.gps.lng], [st.lat, st.lng]], {
        color: '#eab308',
        weight: 2,
        dashArray: '5, 6'
      }).addTo(mapMarkersGroup);
    }
  } else {
    const ql = appState.questlines.find(q => q.id === session.selectedQuestlineId) || appState.questlines[0];
    if (ql) {
      const pts = [];
      ql.stages.forEach((st, idx) => {
        pts.push([st.lat, st.lng]);
        const stIcon = L.divIcon({
          className: 'tac-marker-icon',
          html: `<div style="background:#18181b;border:1.5px solid #eab308;color:#fef08a;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;box-shadow:0 2px 6px rgba(0,0,0,0.9);">${idx + 1}</div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11]
        });
        L.marker([st.lat, st.lng], { icon: stIcon })
          .bindPopup(`<div class="font-mono text-xs"><div class="font-bold text-amber-400">ЭТАП #${idx + 1}: ${st.title}</div><div>Локация: ${st.locationName}</div><div>Код: <span class="text-white font-bold">${st.pinCode}</span></div></div>`)
          .addTo(mapMarkersGroup);
      });
      if (pts.length > 1) {
        L.polyline(pts, { color: '#eab308', weight: 1.5, dashArray: '4, 6', opacity: 0.7 }).addTo(mapMarkersGroup);
      }
    }
  }

  // 4. Маркеры отрядов
  const squadsToShow = commanderSquad
    ? [commanderSquad]
    : appState.squads.filter(s => !filterFaction || s.faction === filterFaction);

  squadsToShow.forEach(sq => {
    const isBear = sq.faction === 'BEAR';
    const badgeBg = sq.respawn.isDead ? '#dc2626' : (isBear ? '#ea580c' : '#0284c7');
    const ql = appState.questlines.find(q => q.id === sq.questlineId) || appState.questlines[0];
    const stageNum = Math.min((sq.currentStageIdx || 0) + 1, ql ? ql.stages.length : 1);

    const sqIcon = L.divIcon({
      className: 'tac-marker-icon',
      html: `
        <div style="display:flex;flex-direction:column;align-items:center;">
          <div style="background:${badgeBg};color:#fff;border:1.5px solid #fff;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:800;white-space:nowrap;box-shadow:0 3px 10px rgba(0,0,0,0.9);">
            ${sq.respawn.isDead ? '💀 ' : ''}${sq.name} [ЭТ.${stageNum}]
          </div>
          <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid ${badgeBg};"></div>
        </div>
      `,
      iconSize: [140, 30],
      iconAnchor: [70, 28]
    });

    L.marker([sq.gps.lat, sq.gps.lng], { icon: sqIcon })
      .bindPopup(`
        <div class="font-mono text-xs space-y-1">
          <div class="font-bold text-white">${sq.name} (${sq.faction})</div>
          <div>Командир: ${sq.commanderCallsign}</div>
          <div>Статус: ${sq.respawn.isDead ? '<span class="text-red-400 font-bold">В МЕРТВЯКЕ</span>' : sq.status}</div>
          <div>Этап квеста: ${stageNum} / ${ql ? ql.stages.length : '?'}</div>
          <div>Фото улик в БД: ${(sq.evidencePhotos || []).length} шт.</div>
          <div class="text-[10px] text-zinc-400">GPS: ${sq.gps.lat.toFixed(5)}, ${sq.gps.lng.toFixed(5)}</div>
        </div>
      `)
      .addTo(mapMarkersGroup);
  });
}

function relocatePolygonToRealGps() {
  if (!navigator.geolocation) {
    showToast('Геолокация не поддерживается браузером', 'err');
    return;
  }
  showToast('Запрос текущих спутниковых координат...', 'info');
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      applyNewPolygonCenter(pos.coords.latitude, pos.coords.longitude);
      showToast('Все точки полигона привязаны к вашему GPS и сохранены!', 'ok');
    },
    () => {
      showToast('Не удалось получить GPS. Разрешите доступ к геопозиции.', 'err');
    },
    { enableHighAccuracy: true, timeout: 8000 }
  );
}

function applyNewPolygonCenter(newLat, newLng) {
  const oldCenter = appState.polygonCenter || POLYGON_ORIGIN;
  const dLat = newLat - oldCenter.lat;
  const dLng = newLng - oldCenter.lng;

  appState.polygonCenter = { lat: Number(newLat.toFixed(6)), lng: Number(newLng.toFixed(6)) };
  appState.respawnSettings.zones.forEach(z => {
    z.lat = Number((z.lat + dLat).toFixed(6));
    z.lng = Number((z.lng + dLng).toFixed(6));
  });
  appState.pois.forEach(p => {
    p.lat = Number((p.lat + dLat).toFixed(6));
    p.lng = Number((p.lng + dLng).toFixed(6));
  });
  appState.questlines.forEach(ql => {
    ql.stages.forEach(s => {
      s.lat = Number((s.lat + dLat).toFixed(6));
      s.lng = Number((s.lng + dLng).toFixed(6));
    });
  });
  appState.squads.forEach(sq => {
    sq.gps.lat = Number((sq.gps.lat + dLat).toFixed(6));
    sq.gps.lng = Number((sq.gps.lng + dLng).toFixed(6));
  });

  saveState();
  if (activeLeafletMap) {
    activeLeafletMap.setView([newLat, newLng], 17);
    renderMapOverlays({ enableGmClick: session.role === 'GM' });
  }
}

function handleGmSatelliteMapClick(lat, lng) {
  const mode = session.gmMapClickMode;
  const targetId = session.gmSelectedTargetId;
  if (!mode || mode === 'none') return;

  const cLat = Number(lat.toFixed(6));
  const cLng = Number(lng.toFixed(6));

  if (mode === 'move_squad') {
    const sq = appState.squads.find(s => s.id === targetId);
    if (sq) {
      sq.gps.lat = cLat;
      sq.gps.lng = cLng;
      sq.gps.updatedAt = Date.now();
      checkRespawnGeoCompliance(sq);
      saveState();
      renderMapOverlays({ enableGmClick: true });
      showToast(`Отряд «${sq.name}» перемещен на ${cLat}, ${cLng}`, 'ok');
    }
  } else if (mode === 'move_stage') {
    const ql = appState.questlines.find(q => q.id === session.selectedQuestlineId) || appState.questlines[0];
    const st = ql ? ql.stages.find(s => s.id === targetId) : null;
    if (st) {
      st.lat = cLat;
      st.lng = cLng;
      saveState();
      renderMapOverlays({ enableGmClick: true });
      showToast(`Точка «${st.title}» перенесена на ${cLat}, ${cLng}`, 'ok');
    }
  } else if (mode === 'move_respawn') {
    const z = appState.respawnSettings.zones.find(r => r.id === targetId);
    if (z) {
      z.lat = cLat;
      z.lng = cLng;
      appState.squads.forEach(checkRespawnGeoCompliance);
      saveState();
      renderMapOverlays({ enableGmClick: true });
      showToast(`Мертвяк «${z.name}» перенесен на ${cLat}, ${cLng}`, 'ok');
    }
  }
}

// Генерация и скачивание QR-кодов (SVG + PNG карточки)
function generateQrSvgString(payload, cellSize = 4) {
  if (typeof qrcode === 'undefined') {
    return `<div class="p-3 bg-white text-black font-mono text-[10px] text-center border border-black">${payload}</div>`;
  }
  try {
    const qr = qrcode(0, 'M');
    qr.addData(payload);
    qr.make();
    return qr.createSvgTag({ cellSize: cellSize, margin: 2 });
  } catch (e) {
    return `<div class="p-2 bg-white text-black font-mono text-xs">${payload}</div>`;
  }
}

function downloadQrCodePng(payload, titleText, subText, pinText, filename) {
  if (typeof qrcode === 'undefined') {
    showToast('Модуль генерации QR еще не загружен', 'err');
    return;
  }
  try {
    const qr = qrcode(0, 'M');
    qr.addData(payload);
    qr.make();
    const moduleCount = qr.getModuleCount();

    const canvas = document.createElement('canvas');
    const width = 600;
    const height = 740;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 6;
    ctx.strokeRect(16, 16, width - 32, height - 32);

    ctx.fillStyle = '#111111';
    ctx.fillRect(16, 16, width - 32, 68);

    ctx.fillStyle = '#eab308';
    ctx.font = 'bold 22px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('EFT: RAID OS // ТАКТИЧЕСКИЙ КПК', width / 2, 58);

    ctx.fillStyle = '#000000';
    ctx.font = 'bold 24px sans-serif';
    const cleanTitle = (titleText || 'КВЕСТОВЫЙ ЭТАП').slice(0, 36);
    ctx.fillText(cleanTitle, width / 2, 125);

    ctx.fillStyle = '#3f3f46';
    ctx.font = '18px monospace';
    const cleanSub = (subText || '').slice(0, 44);
    ctx.fillText(cleanSub, width / 2, 158);

    const qrSize = 420;
    const startX = Math.floor((width - qrSize) / 2);
    const startY = 180;
    const cellSize = qrSize / moduleCount;

    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        ctx.fillStyle = qr.isDark(r, c) ? '#000000' : '#ffffff';
        ctx.fillRect(
          Math.floor(startX + c * cellSize),
          Math.floor(startY + r * cellSize),
          Math.ceil(cellSize),
          Math.ceil(cellSize)
        );
      }
    }

    ctx.fillStyle = '#111111';
    ctx.fillRect(46, 625, width - 92, 74);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px monospace';
    ctx.fillText(pinText || '', width / 2, 672);

    const link = document.createElement('a');
    link.download = (filename || 'eft_qr_code') + '.png';
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast('QR-код сохранен в PNG!', 'ok');
  } catch (err) {
    showToast('Ошибка сохранения PNG', 'err');
  }
}

function downloadStageQrPng(qlId, stageId) {
  const ql = appState.questlines.find(q => q.id === qlId);
  if (!ql) return;
  const idx = ql.stages.findIndex(s => s.id === stageId);
  const st = ql.stages[idx];
  if (!st) return;
  const safeName = `QR_Stage_${idx + 1}_${st.pinCode}`;
  downloadQrCodePng(
    st.qrPayload,
    `ЭТАП #${idx + 1}: ${st.title}`,
    `Локация: ${st.locationName}`,
    `РЕЗЕРВНЫЙ КОД: ${st.pinCode}`,
    safeName
  );
}

function downloadAllQuestlineQrPngs(qlId) {
  const ql = appState.questlines.find(q => q.id === qlId);
  if (!ql || !ql.stages.length) return;
  showToast(`Скачивание ${ql.stages.length} QR-кодов цепочки...`, 'info');
  ql.stages.forEach((st, idx) => {
    setTimeout(() => {
      downloadStageQrPng(ql.id, st.id);
    }, idx * 350);
  });
}

function downloadSquadPassQrPng(squadId) {
  const sq = appState.squads.find(s => s.id === squadId);
  if (!sq) return;
  const payload = buildSquadPassQrPayload(sq);
  downloadQrCodePng(
    payload,
    `ПРОПУСК ЧВК: ${sq.name}`,
    `Фракция: ${sq.faction} | Командир: ${sq.commanderCallsign}`,
    `КЛЮЧ ВХОДА: ${sq.loginPin}`,
    `QR_PASS_${sq.loginPin}`
  );
}

// Оптический сканер QR-кодов через камеру смартфона
function openPassQrScanner() {
  qrScannerMode = 'SQUAD_LOGIN';
  document.getElementById('qrModalTitle').textContent = '📷 СКАНИРОВАНИЕ QR-ПРОПУСКА ЧВК';
  document.getElementById('qrModalHint').textContent = 'Наведите камеру на карточку QR-пропуска вашего отряда или введите ключ пропуска вручную:';
  document.getElementById('manualModalPinInput').placeholder = 'КЛЮЧ ПРОПУСКА (напр. BEAR-1042)';
  document.getElementById('manualModalPinInput').value = '';
  launchQrScannerModal();
}

function openStageQrScanner() {
  qrScannerMode = 'STAGE';
  document.getElementById('qrModalTitle').textContent = '📷 СКАНЕР QR-КОДА ЭТАПА';
  document.getElementById('qrModalHint').textContent = 'Наведите камеру смартфона на QR-код найденной улики или введите 4-значный код:';
  document.getElementById('manualModalPinInput').placeholder = '4-ЗНАЧНЫЙ КОД (напр. 4109)';
  document.getElementById('manualModalPinInput').value = '';
  launchQrScannerModal();
}

function launchQrScannerModal() {
  const modal = document.getElementById('qrModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');

  if (typeof Html5Qrcode !== 'undefined') {
    try {
      qrScannerInstance = new Html5Qrcode('qrReader');
      qrScannerInstance.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        async (decodedText) => {
          closeQrScanner();
          if (qrScannerMode === 'SQUAD_LOGIN') {
            await authenticateSquadByCodeOrQr(decodedText);
          } else {
            verifyAndAdvanceStage(decodedText, 'QR');
          }
        },
        () => {}
      ).catch(() => {
        document.getElementById('qrReader').innerHTML = `
          <div class="p-6 text-center text-xs font-mono text-zinc-400">
            Камера недоступна или заблокирована браузером.<br>Используйте поле ручного ввода ниже.
          </div>
        `;
      });
    } catch (err) {}
  }
}

function closeQrScanner() {
  const modal = document.getElementById('qrModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  if (qrScannerInstance) {
    qrScannerInstance.stop().then(() => {
      qrScannerInstance.clear();
      qrScannerInstance = null;
    }).catch(() => {
      qrScannerInstance = null;
    });
  }
}

async function submitModalManualCode() {
  const val = document.getElementById('manualModalPinInput').value.trim();
  if (!val) return;
  closeQrScanner();
  if (qrScannerMode === 'SQUAD_LOGIN') {
    await authenticateSquadByCodeOrQr(val);
  } else {
    verifyAndAdvanceStage(val, 'PIN');
  }
}
