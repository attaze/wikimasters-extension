(function () {
  const existing = document.getElementById('wm-sorter-container');
  if (existing) existing.remove();

  const CACHE_KEY = 'wm_market_prices_v6';
  const AUTO_SORT_KEY = 'wm_auto_sort_enabled';
  const SORT_ORDER_KEY = 'wm_sort_order_pref';
  const POS_KEY = 'wm_widget_pos';
  const OPEN_STATE_KEY = 'wm_widget_open';
  const CACHE_TTL = 30 * 24 * 60 * 60 * 1000;
  const CONCURRENCY_LIMIT = 3;

  let memoryCache = (() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      const now = Date.now();
      for (const k of Object.keys(parsed)) {
        if (!parsed[k] || now - parsed[k].ts > CACHE_TTL) delete parsed[k];
      }
      return parsed;
    } catch { return {}; }
  })();

  function saveCache() {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(memoryCache)); } catch (e) {}
  }

  // --- 1. INTERFACE WIDGET ---
  const container = document.createElement('div');
  container.id = 'wm-sorter-container';
  
  const iconCollection = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>`;
  const iconPulls = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>`;
  const iconClose = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
  const iconRefresh = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>`;

  container.innerHTML = `
    <div id="wm-sorter-fab" title="Ouvrir WikiMasters Tools"></div>
    <div id="wm-sorter-widget">
      <div id="wm-sorter-header">
        <div id="wm-header-title" class="wm-header-title">WikiMasters Tools</div>
        <div class="wm-header-actions">
          <button id="wm-clear-cache-btn" class="wm-icon-btn" title="Vider le cache">${iconRefresh}</button>
          <button id="wm-close-btn" class="wm-icon-btn" title="Réduire">${iconClose}</button>
        </div>
      </div>
      
      <div id="wm-sorter-body">
        <!-- MODE COLLECTION -->
        <div id="wm-panel-collection" style="display: none; flex-direction: column; gap: 10px;">
          <div class="wm-tracker-mini">
            <span class="wm-tracker-label">Valeur :</span>
            <span id="wm-tracker-total" class="wm-tracker-value">0 Ⓦ</span>
          </div>
          <select id="wm-sort-order" class="wm-select-mini">
            <option value="desc">Prix : Plus cher d'abord</option>
            <option value="asc">Prix : Moins cher d'abord</option>
          </select>
          <label class="wm-toggle-mini" for="wm-auto-sort">
            <input type="checkbox" id="wm-auto-sort" class="wm-checkbox-mini" />
            <span>Tri automatique</span>
          </label>
          <button id="wm-sort-btn" class="wm-button-mini">Trier la page</button>
        </div>

        <!-- MODE PULLS (Auto + Raccourci Clavier) -->
        <div id="wm-panel-pulls" style="display: none; flex-direction: column; gap: 10px;">
          <div style="display: flex; gap: 6px;">
            <button id="wm-auto-open-btn" class="wm-button-mini" style="background: #f59e0b; color: #451a03;">Tout ouvrir</button>
            <button id="wm-stop-open-btn" class="wm-button-mini" style="background: #ef4444; color: #fff; display: none;">Stop</button>
          </div>
          <div class="wm-shortcut-info">
            Ou martèle <b>➡️</b> au clavier pour défiler manuellement à toute vitesse.
          </div>
        </div>

        <div id="wm-sorter-status" class="wm-status-mini">Prêt</div>
      </div>
    </div>
  `;
  document.body.appendChild(container);

  const fab = document.getElementById('wm-sorter-fab');
  const widget = document.getElementById('wm-sorter-widget');
  const headerEl = document.getElementById('wm-sorter-header');
  const headerTitle = document.getElementById('wm-header-title');
  const statusEl = document.getElementById('wm-sorter-status');
  const panelCollection = document.getElementById('wm-panel-collection');
  const sortBtn = document.getElementById('wm-sort-btn');
  const trackerTotalEl = document.getElementById('wm-tracker-total');
  const orderSelect = document.getElementById('wm-sort-order');
  const autoSortCheckbox = document.getElementById('wm-auto-sort');
  const panelPulls = document.getElementById('wm-panel-pulls');
  const autoOpenBtn = document.getElementById('wm-auto-open-btn');
  const stopOpenBtn = document.getElementById('wm-stop-open-btn');

  orderSelect.value = localStorage.getItem(SORT_ORDER_KEY) || 'desc';
  autoSortCheckbox.checked = localStorage.getItem(AUTO_SORT_KEY) === 'true';

  // --- RESTAURATION DE L'ÉTAT ET POSITION ---
  const wasOpen = localStorage.getItem(OPEN_STATE_KEY) === 'true';
  fab.style.display = wasOpen ? 'none' : 'flex';
  widget.style.display = wasOpen ? 'flex' : 'none';

  function savePosition() {
    try {
      const rect = container.getBoundingClientRect();
      localStorage.setItem(POS_KEY, JSON.stringify({ left: rect.left, top: rect.top }));
    } catch (e) {}
  }

  function clampToScreen() {
    const rect = container.getBoundingClientRect();
    const maxLeft = Math.max(10, window.innerWidth - container.offsetWidth - 10);
    const maxTop = Math.max(10, window.innerHeight - container.offsetHeight - 10);
    container.style.left = Math.min(Math.max(10, rect.left), maxLeft) + 'px';
    container.style.top = Math.min(Math.max(10, rect.top), maxTop) + 'px';
  }

  try {
    const savedPos = JSON.parse(localStorage.getItem(POS_KEY));
    if (savedPos && typeof savedPos.left === 'number' && typeof savedPos.top === 'number') {
      container.style.left = savedPos.left + 'px';
      container.style.top = savedPos.top + 'px';
      clampToScreen();
    } else {
      container.style.left = (window.innerWidth - 70) + 'px';
      container.style.top = '90px';
    }
  } catch {
    container.style.left = (window.innerWidth - 70) + 'px';
    container.style.top = '90px';
  }

  let isDragging = false, hasMoved = false, startX = 0, startY = 0, startLeft = 0, startTop = 0;
  function onMouseDown(e) {
    if (e.target.closest('.wm-header-actions') || e.button !== 0) return;
    isDragging = true; hasMoved = false; startX = e.clientX; startY = e.clientY;
    const rect = container.getBoundingClientRect();
    startLeft = rect.left; startTop = rect.top;
    fab.style.cursor = 'grabbing'; headerEl.style.cursor = 'grabbing';
    e.preventDefault();
  }
  fab.addEventListener('mousedown', onMouseDown);
  headerEl.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    if (Math.abs(e.clientX - startX) > 4 || Math.abs(e.clientY - startY) > 4) hasMoved = true;
    container.style.left = Math.min(Math.max(10, startLeft + (e.clientX - startX)), window.innerWidth - container.offsetWidth - 10) + 'px';
    container.style.top = Math.min(Math.max(10, startTop + (e.clientY - startY)), window.innerHeight - container.offsetHeight - 10) + 'px';
  });
  window.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false; fab.style.cursor = 'grab'; headerEl.style.cursor = 'grab';
    if (hasMoved) savePosition();
  });
  fab.addEventListener('click', () => {
    if (hasMoved) return;
    fab.style.display = 'none'; widget.style.display = 'flex';
    localStorage.setItem(OPEN_STATE_KEY, 'true'); clampToScreen(); savePosition();
  });
  document.getElementById('wm-close-btn').addEventListener('click', () => {
    widget.style.display = 'none'; fab.style.display = 'flex';
    localStorage.setItem(OPEN_STATE_KEY, 'false'); clampToScreen(); savePosition();
  });
  document.getElementById('wm-clear-cache-btn').addEventListener('click', () => {
    memoryCache = {}; localStorage.removeItem(CACHE_KEY); trackerTotalEl.innerText = '0 Ⓦ';
    statusEl.innerText = 'Cache vidé !';
    setTimeout(() => { if (statusEl.innerText === 'Cache vidé !') statusEl.innerText = 'Prêt'; }, 2000);
  });
  window.addEventListener('resize', () => { clampToScreen(); savePosition(); });

  let currentMode = '';
  function updateWidgetMode() {
    const path = window.location.pathname;
    if (path.includes('/collection')) {
      if (currentMode !== 'collection') { panelCollection.style.display = 'flex'; panelPulls.style.display = 'none'; headerTitle.innerHTML = `${iconCollection} Tri de Collection`; fab.innerHTML = iconCollection; currentMode = 'collection'; statusEl.innerText = 'Prêt'; }
    } else if (path.includes('/pulls')) {
      if (currentMode !== 'pulls') { panelCollection.style.display = 'none'; panelPulls.style.display = 'flex'; headerTitle.innerHTML = `${iconPulls} Ouverture Rapide`; fab.innerHTML = iconPulls; currentMode = 'pulls'; statusEl.innerText = 'Prêt'; }
    } else {
      if (currentMode !== 'hidden') { panelCollection.style.display = 'none'; panelPulls.style.display = 'none'; headerTitle.innerHTML = `WikiMasters Tools`; fab.innerHTML = `⚙️`; currentMode = 'hidden'; }
    }
  }
  setInterval(updateWidgetMode, 500);
  updateWidgetMode();

  // --- 2. MOTEUR D'OUVERTURE (AUTO-LOOP + CLAVIER) ---
  function triggerClick(btn) {
    if (!btn) return;
    btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
    btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
    btn.click();
  }

  // Avance d'une étape sur /pulls. Retourne true si une action a été effectuée, false si plus aucun paquet dispo
  function stepPackOpening() {
    const rightPoly = document.querySelector('button svg polyline[points="9 18 15 12 9 6"]');
    let rightArrowBtn = rightPoly ? rightPoly.closest('button') : null;
    if (!rightArrowBtn) {
      const roundBtns = Array.from(document.querySelectorAll('button.w-12.h-12.rounded-full'));
      if (roundBtns.length > 0) rightArrowBtn = roundBtns[roundBtns.length - 1];
    }

    // 1. Carte suivante (cartes 1 à 4)
    if (rightArrowBtn && !rightArrowBtn.disabled) {
      triggerClick(rightArrowBtn);
      return 'next_card';
    }

    const allSiteBtns = Array.from(document.querySelectorAll('button')).filter(b => !container.contains(b));

    // 2. Bouton "Continuer" (5e carte)
    const continuerBtn = allSiteBtns.find(b => b.textContent.trim().toLowerCase() === 'continuer');
    if (continuerBtn && !continuerBtn.disabled) {
      triggerClick(continuerBtn);
      return 'continue';
    }

    // 3. Bouton "Ouvrir"
    const ouvrirBtn = allSiteBtns.find(b => b.textContent.trim().toLowerCase() === 'ouvrir');
    if (ouvrirBtn && !ouvrirBtn.disabled) {
      triggerClick(ouvrirBtn);
      return 'open';
    }

    return null;
  }

  // Boucle automatique ("Tout ouvrir")
  let autoOpenRunning = false;

  async function runAutoOpenLoop() {
    if (autoOpenRunning) return;
    autoOpenRunning = true;
    autoOpenBtn.style.display = 'none';
    stopOpenBtn.style.display = 'flex';

    let packsOpened = 0;
    let idleTicks = 0;

    while (autoOpenRunning && window.location.pathname.includes('/pulls')) {
      const action = stepPackOpening();

      if (action === 'open') {
        packsOpened++;
        idleTicks = 0;
        statusEl.innerText = `Ouverture paquet #${packsOpened}...`;
        await new Promise(r => setTimeout(r, 450)); // Temps de réponse API du site
      } else if (action === 'next_card') {
        idleTicks = 0;
        await new Promise(r => setTimeout(r, 140)); // Défilement ultra rapide
      } else if (action === 'continue') {
        idleTicks = 0;
        await new Promise(r => setTimeout(r, 250));
      } else {
        // Aucun bouton actif (soit chargement réseau en cours, soit 0 paquet restant)
        idleTicks++;
        if (idleTicks >= 6) {
          statusEl.innerText = packsOpened > 0 ? `Terminé (${packsOpened} paquets) !` : 'Aucun paquet disponible.';
          break;
        }
        await new Promise(r => setTimeout(r, 300));
      }
    }

    autoOpenRunning = false;
    autoOpenBtn.style.display = 'flex';
    stopOpenBtn.style.display = 'none';
    setTimeout(() => { if (statusEl.innerText.includes('Terminé') || statusEl.innerText.includes('Aucun')) statusEl.innerText = 'Prêt'; }, 3000);
  }

  autoOpenBtn.addEventListener('click', runAutoOpenLoop);
  stopOpenBtn.addEventListener('click', () => {
    autoOpenRunning = false;
    statusEl.innerText = 'Arrêté.';
  });

  // Raccourcis clavier manuels
  window.addEventListener('keydown', (e) => {
    if (!window.location.pathname.includes('/pulls')) return;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;

    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const action = stepPackOpening();
      if (action === 'continue') {
        setTimeout(() => {
          const nextOuvrirBtn = Array.from(document.querySelectorAll('button'))
            .filter(b => !container.contains(b))
            .find(b => b.textContent.trim().toLowerCase() === 'ouvrir');
          if (nextOuvrirBtn && !nextOuvrirBtn.disabled) triggerClick(nextOuvrirBtn);
        }, 180);
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const leftPoly = document.querySelector('button svg polyline[points="15 18 9 12 15 6"]');
      let leftArrowBtn = leftPoly ? leftPoly.closest('button') : null;
      if (!leftArrowBtn) {
        const roundBtns = Array.from(document.querySelectorAll('button.w-12.h-12.rounded-full'));
        if (roundBtns.length >= 2) leftArrowBtn = roundBtns[0];
      }
      if (leftArrowBtn && !leftArrowBtn.disabled) triggerClick(leftArrowBtn);
    }
  }, true);

  // --- 3. LOGIQUE TRI DE COLLECTION ---
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  function findCardInfoInObject(obj, visited = new Set(), depth = 0) { if (!obj || typeof obj !== 'object' || depth > 8 || visited.has(obj) || Array.isArray(obj)) return null; visited.add(obj); if (typeof obj.card_id === 'string' && UUID_REGEX.test(obj.card_id)) return { cardId: obj.card_id, rarity: (obj.card && obj.card.rarity) || obj.rarity || null }; if (obj.card && typeof obj.card === 'object' && typeof obj.card.id === 'string' && UUID_REGEX.test(obj.card.id)) return { cardId: obj.card.id, rarity: obj.card.rarity || obj.rarity || null }; if (typeof obj.id === 'string' && UUID_REGEX.test(obj.id) && obj.card_id === undefined && (obj.atk !== undefined || obj.def !== undefined || obj.rarity !== undefined)) return { cardId: obj.id, rarity: obj.rarity || null }; for (const key of Object.keys(obj)) { if (key.startsWith('_') || key === 'children' || key === 'ref') continue; const found = findCardInfoInObject(obj[key], visited, depth + 1); if (found) return found; } return null; }
  function detectRarityFromDOM(cardEl) { const validRarities = ['UR', 'SR', 'PC', 'L', 'R', 'C']; const badges = cardEl.querySelectorAll('span, div'); for (const b of badges) { if (b.classList && b.classList.contains('wm-price-tag')) continue; const txt = (b.textContent || '').trim().toUpperCase(); if (validRarities.includes(txt)) return txt; } return null; }
  function extractCardMetaLive(cardEl, gridContainer) { const nodesToCheck = [cardEl, ...Array.from(cardEl.querySelectorAll('*'))]; for (const node of nodesToCheck) { const reactKey = Object.keys(node).find((k) => k.startsWith('__reactFiber$') || k.startsWith('__reactProps$')); if (!reactKey) continue; let current = node[reactKey]; if (reactKey.startsWith('__reactProps$')) { const info = findCardInfoInObject(current); if (info) return { cardId: info.cardId, rarity: info.rarity || detectRarityFromDOM(cardEl) }; } else { let steps = 0; while (current && steps < 8 && current.stateNode !== gridContainer) { const info = findCardInfoInObject(current.memoizedProps); if (info) return { cardId: info.cardId, rarity: info.rarity || detectRarityFromDOM(cardEl) }; current = current.return; steps++; } } } return { cardId: null, rarity: detectRarityFromDOM(cardEl) }; }
  function getPriceFromSummary(summary, rarity) { if (!summary || typeof summary !== 'object') return 0; if (rarity && summary[rarity] && summary[rarity].average != null) return Math.round(Number(summary[rarity].average)) || 0; for (const k of Object.keys(summary)) { if (summary[k] && summary[k].average != null) return Math.round(Number(summary[k].average)) || 0; } return 0; }
  function getCurrentPageSignature() { const rawCards = Array.from(document.querySelectorAll('.relative.isolate.group')); if (rawCards.length === 0) return ''; const gridContainer = rawCards[0].parentElement; return rawCards.map((c, i) => extractCardMetaLive(c, gridContainer).cardId || `i_${i}`).join('|'); }

  let activeRateLimitPause = null; let currentSortSession = 0; let lastSortedPageSignature = '';
  async function waitForRateLimitUnlock(probeCardId, sessionId, onRateLimitPause) { if (activeRateLimitPause) { await activeRateLimitPause; return; } activeRateLimitPause = (async () => { if (onRateLimitPause) onRateLimitPause(); let waitTime = 6; while (sessionId === currentSortSession) { for (let s = waitTime; s > 0; s--) { if (sessionId !== currentSortSession) return; statusEl.innerText = `⏳ Anti-spam (${s}s)...`; await new Promise((r) => setTimeout(r, 1000)); } try { const probeRes = await fetch(`/api/marketplace/cards/${probeCardId}/sales?scope=summary`, { credentials: 'include' }); if (probeRes.ok) { const data = await probeRes.json(); const summary = (data && data.summary) || {}; memoryCache[probeCardId] = { summary, ts: Date.now() }; saveCache(); return; } if (probeRes.status === 404 || probeRes.status === 400) return; } catch {} waitTime = 8; } })(); try { await activeRateLimitPause; } finally { activeRateLimitPause = null; } }
  async function fetchMarketPrice(cardId, rarity, sessionId, onRateLimitPause) { if (!cardId) return 0; let attempts = 0; while (sessionId === currentSortSession && attempts < 5) { attempts++; const cached = memoryCache[cardId]; if (cached && Date.now() - cached.ts < CACHE_TTL) return getPriceFromSummary(cached.summary, rarity); if (activeRateLimitPause) { await activeRateLimitPause; continue; } try { const res = await fetch(`/api/marketplace/cards/${cardId}/sales?scope=summary`, { credentials: 'include' }); if (res.ok) { const data = await res.json(); const summary = (data && data.summary) || {}; memoryCache[cardId] = { summary, ts: Date.now() }; return getPriceFromSummary(summary, rarity); } if (res.status === 404 || res.status === 400) return 0; await waitForRateLimitUnlock(cardId, sessionId, onRateLimitPause); } catch { await waitForRateLimitUnlock(cardId, sessionId, onRateLimitPause); } } return 0; }

  function renderSortedGrid(cardsData, order) { let totalPageValue = 0; const sorted = [...cardsData].sort((a, b) => { if (!a.done && b.done) return 1; if (a.done && !b.done) return -1; if (!a.done && !b.done) return a.originalIndex - b.originalIndex; if (a.price === 0 && b.price !== 0) return 1; if (b.price === 0 && a.price !== 0) return -1; if (a.price === 0 && b.price === 0) return a.originalIndex - b.originalIndex; return order === 'desc' ? b.price - a.price : a.price - b.price; }); sorted.forEach((item, rank) => { item.element.style.order = String(rank + 1); if (getComputedStyle(item.element).position === 'static') item.element.style.position = 'relative'; let badge = item.element.querySelector('.wm-price-tag'); if (!badge) { badge = document.createElement('div'); badge.className = 'wm-price-tag'; item.element.appendChild(badge); } if (!item.done) { badge.innerText = '⏳'; badge.style.backgroundColor = '#f59e0b'; badge.style.color = '#1c1917'; } else if (item.price > 0) { totalPageValue += item.price; badge.innerText = `${item.price} Ⓦ`; badge.style.backgroundColor = 'rgba(16, 185, 129, 0.95)'; badge.style.color = '#022c22'; } else { badge.innerText = '0 Ⓦ'; badge.style.backgroundColor = 'rgba(39, 39, 42, 0.95)'; badge.style.color = '#a1a1aa'; } }); trackerTotalEl.innerText = totalPageValue.toLocaleString('fr-FR') + ' Ⓦ'; }
  function resetGridOrderAndBadges() { currentSortSession++; sortBtn.disabled = false; statusEl.innerText = 'Prêt'; trackerTotalEl.innerText = '0 Ⓦ'; document.querySelectorAll('.relative.isolate.group').forEach((cardEl) => { cardEl.style.order = ''; const badge = cardEl.querySelector('.wm-price-tag'); if (badge) badge.remove(); }); }

  async function startSorting() { const rawCards = Array.from(document.querySelectorAll('.relative.isolate.group')); if (rawCards.length === 0) { statusEl.innerText = 'Aucune carte trouvée.'; trackerTotalEl.innerText = '0 Ⓦ'; return; } const sessionId = ++currentSortSession; const order = orderSelect.value; const gridContainer = rawCards[0].parentElement; lastSortedPageSignature = getCurrentPageSignature(); sortBtn.disabled = true; const cardsData = rawCards.map((cardEl, i) => ({ element: cardEl, meta: extractCardMetaLive(cardEl, gridContainer), price: 0, done: false, originalIndex: i })); let nextIndex = 0, completed = 0; async function worker() { while (nextIndex < cardsData.length && sessionId === currentSortSession) { const i = nextIndex++; const item = cardsData[i]; const { cardId, rarity } = item.meta; const isCached = cardId && memoryCache[cardId] && Date.now() - memoryCache[cardId].ts < CACHE_TTL; if (!isCached) await new Promise((r) => setTimeout(r, 60)); const price = await fetchMarketPrice(cardId, rarity, sessionId, () => { renderSortedGrid(cardsData, orderSelect.value); }); if (sessionId !== currentSortSession) return; item.price = price; item.done = true; completed++; if (!activeRateLimitPause) statusEl.innerText = `Analyse : ${completed}/${cardsData.length}...`; } } await Promise.all(Array.from({ length: Math.min(CONCURRENCY_LIMIT, cardsData.length) }, () => worker())); if (sessionId !== currentSortSession) return; saveCache(); renderSortedGrid(cardsData, orderSelect.value); statusEl.innerText = 'Tri terminé !'; sortBtn.disabled = false; setTimeout(() => { if (statusEl.innerText === 'Tri terminé !') statusEl.innerText = 'Prêt'; }, 3000); }
  sortBtn.addEventListener('click', startSorting);
  orderSelect.addEventListener('change', () => { localStorage.setItem(SORT_ORDER_KEY, orderSelect.value); if (document.querySelectorAll('.relative.isolate.group .wm-price-tag').length > 0) startSorting(); });
  autoSortCheckbox.addEventListener('change', () => { localStorage.setItem(AUTO_SORT_KEY, String(autoSortCheckbox.checked)); if (autoSortCheckbox.checked && getCurrentPageSignature() !== lastSortedPageSignature) startSorting(); });
  let pageChangeTimer = null;
  function checkAndTriggerAutoSort() { clearTimeout(pageChangeTimer); pageChangeTimer = setTimeout(() => { const currentSig = getCurrentPageSignature(); if (currentSig && currentSig !== lastSortedPageSignature) { resetGridOrderAndBadges(); if (autoSortCheckbox.checked) startSorting(); } }, 250); }
  new MutationObserver((mutations) => { for (const m of mutations) { if (container.contains(m.target) || (m.target.classList && m.target.classList.contains('wm-price-tag'))) continue; checkAndTriggerAutoSort(); break; } }).observe(document.body, { childList: true, subtree: true });
  if (autoSortCheckbox.checked) checkAndTriggerAutoSort();
})();