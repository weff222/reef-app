// Tauri updater UI for TYPHON (runs only inside Tauri; no-op in browser)
(function () {
  const T = window.__TAURI__;
  if (!T || !T.core || !T.core.invoke || !T.core.Channel) return;
  const invoke = T.core.invoke;
  const Channel = T.core.Channel;

  let updateInfo = null;
  let downloading = false;
  window.reefUpdateState = window.reefUpdateState || { status: 'idle', version: null, progress: 0, detail: '' };
  function setState(patch) { Object.assign(window.reefUpdateState, patch); if (typeof window.reefScheduleRender === 'function') window.reefScheduleRender(); }

  function ensureStyle() {
    if (document.getElementById('tu-styles')) return;
    const s = document.createElement('style');
    s.id = 'tu-styles';
    s.textContent = `
      @keyframes tu-shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
      @keyframes tu-pop {
        from { opacity: 0; transform: translateY(10px) scale(.98); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      #tauri-update-toast {
        position: fixed; bottom: 20px; right: 20px; z-index: 99999;
        background: #241f47; color: #f8fafc; padding: 14px 16px;
        border-radius: 12px; border: 1px solid rgba(201,196,247,.28);
        box-shadow: 0 10px 30px rgba(0,0,0,.45);
        font: 14px/1.4 system-ui, sans-serif; max-width: 360px;
        display: flex; align-items: center; gap: 12px;
        animation: tu-pop .22s ease-out;
      }
      #tauri-update-toast .tu-btn {
        background: #6a5ae8; color: #fff; border: 0; border-radius: 8px;
        padding: 7px 12px; font: 600 13px system-ui, sans-serif; cursor: pointer;
        white-space: nowrap;
      }
      #tauri-update-toast .tu-btn:hover { background: #5b4cda; }
      #tauri-update-toast .tu-close {
        background: transparent; color: #94a3b8; border: 0; cursor: pointer;
        font-size: 16px; line-height: 1; padding: 2px 4px;
      }
      #tu-bar {
        height: 100%; width: 0%; border-radius: 6px;
        background: linear-gradient(90deg, #5b4cda, #8b7ef2, #5b4cda);
        background-size: 200% 100%;
        animation: tu-shimmer 1.6s linear infinite;
        transition: width .22s ease-out;
      }
    `;
    document.head.appendChild(s);
  }

  function el(html) {
    const d = document.createElement('div');
    d.innerHTML = html.trim();
    return d.firstElementChild;
  }

  function showToast(version) {
    ensureStyle();
    hideToast();
    const t = el(`
      <div id="tauri-update-toast" role="status" aria-live="polite">
        <div style="flex:1;min-width:0;">
          <div style="font-weight:600;">Dostępna aktualizacja</div>
          <div style="font-size:12px;color:#d8d4fb;">Nowa wersja TYPHON ${version ? 'v' + version : ''}</div>
        </div>
        <button type="button" class="tu-btn" id="tu-now">Aktualizuj</button>
        <button type="button" class="tu-close" id="tu-later" aria-label="Zamknij">×</button>
      </div>
    `);
    document.body.appendChild(t);
    t.querySelector('#tu-now').onclick = startUpdate;
    t.querySelector('#tu-later').onclick = hideToast;
  }

  function hideToast() {
    const t = document.getElementById('tauri-update-toast');
    if (t) t.remove();
  }

  function showProgress() {
    ensureStyle();
    let m = document.getElementById('tauri-update-modal');
    if (!m) {
      m = el(`
        <div id="tauri-update-modal" style="position:fixed;inset:0;z-index:100000;background:rgba(12,9,24,.72);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;font:14px system-ui,sans-serif;">
          <div style="background:#1b1830;color:#f8fafc;padding:24px;border-radius:14px;width:380px;max-width:92vw;border:1px solid rgba(201,196,247,.18);box-shadow:0 16px 40px rgba(0,0,0,.6);animation:tu-pop .2s ease-out;">
            <h3 style="margin:0 0 10px;font-size:16px;font-weight:600;">Aktualizacja TYPHON</h3>
            <div id="tu-status" style="margin-bottom:10px;color:#d5d2e8;">Przygotowanie pobierania…</div>
            <div style="background:#2a293b;border-radius:6px;height:10px;overflow:hidden;margin-bottom:10px;">
              <div id="tu-bar"></div>
            </div>
            <div id="tu-detail" style="font-size:12px;color:#a7a3bf;min-height:16px;"></div>
          </div>
        </div>
      `);
      document.body.appendChild(m);
    }
    return m;
  }

  function setProgress(pct, detail, statusText) {
    const bar = document.getElementById('tu-bar');
    const det = document.getElementById('tu-detail');
    const st = document.getElementById('tu-status');
    const clamped = Math.max(0, Math.min(100, pct));
    if (bar) bar.style.width = clamped.toFixed(1) + '%';
    if (det) det.textContent = detail || '';
    if (st) st.textContent = statusText || ('Pobieranie… ' + Math.round(clamped) + '%');
  }

  async function checkUpdate() {
    setState({ status: 'checking', progress: 0, detail: '' });
    try {
      const u = await invoke('plugin:updater|check');
      if (u && u.version) {
        updateInfo = u;
        setState({ status: 'available', version: u.version });
        showToast(u.version);
      } else {
        setState({ status: 'none' });
      }
    } catch (e) {
      console.warn('update check failed', e);
      setState({ status: 'none' });
    }
  }

  async function startUpdate() {
    if (downloading || !updateInfo) return;
    downloading = true;
    setState({ status: 'downloading', progress: 0, detail: '' });
    hideToast();
    showProgress();
    let downloaded = 0;
    let total = 0;
    let lastTime = Date.now();
    let lastBytes = 0;
    let speed = 0;
    try {
      const onEvent = new Channel();
      onEvent.onmessage = (e) => {
        if (!e || !e.event) return;
        if (e.event === 'Started') {
          total = (e.data && e.data.contentLength) ? e.data.contentLength : 0;
          setState({ status: 'downloading', progress: 0, detail: total > 0 ? `0.0 / ${(total / 1024 / 1024).toFixed(1)} MB` : 'Łączenie…' });
          setProgress(0, total > 0 ? `0.0 / ${(total / 1024 / 1024).toFixed(1)} MB` : 'Łączenie…', 'Pobieranie… 0%');
        } else if (e.event === 'Progress') {
          downloaded += (e.data && e.data.chunkLength) ? e.data.chunkLength : 0;
          const now = Date.now();
          const dt = (now - lastTime) / 1000;
          if (dt >= 0.4) {
            speed = (downloaded - lastBytes) / dt / 1024 / 1024;
            lastBytes = downloaded;
            lastTime = now;
          }
          const pct = total > 0 ? (downloaded / total) * 100 : 0;
          const mb = (downloaded / 1024 / 1024).toFixed(1);
          const totalMb = (total / 1024 / 1024).toFixed(1);
          const remainMb = Math.max(0, (total - downloaded) / 1024 / 1024).toFixed(1);
          const detail = total > 0
            ? `${mb} / ${totalMb} MB · ${speed.toFixed(2)} MB/s · zostało ${remainMb} MB`
            : `${mb} MB · ${speed.toFixed(2)} MB/s`;
          setState({ status: 'downloading', progress: pct, detail });
          setProgress(pct, detail);
        } else if (e.event === 'Finished') {
          setState({ status: 'downloading', progress: 100, detail: 'Zainstalowano. Restartowanie aplikacji…' });
          setProgress(100, 'Zainstalowano. Restartowanie aplikacji…', 'Instalowanie…');
        }
      };
      await invoke('plugin:updater|download_and_install', {
        rid: updateInfo.rid,
        onEvent,
        restartAfterInstall: true
      });
    } catch (e) {
      const st = document.getElementById('tu-status');
      if (st) st.textContent = 'Błąd aktualizacji: ' + (e && e.message ? e.message : e);
      downloading = false;
      setState({ status: 'available', progress: 0 });
    }
  }

  setTimeout(checkUpdate, 2500);
  window.reefCheckUpdate = checkUpdate;
  window.reefStartUpdate = startUpdate;
})();
