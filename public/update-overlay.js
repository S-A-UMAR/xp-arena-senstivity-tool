(function () {
  const OVERLAY_ID = 'xpDeployOverlay';

  function buildOverlay() {
    if (document.getElementById(OVERLAY_ID)) return document.getElementById(OVERLAY_ID);

    const overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:99999',
      'display:none',
      'align-items:center',
      'justify-content:center',
      'background:radial-gradient(circle at 30% 20%, rgba(0,240,255,0.12), rgba(0,0,0,0.92))',
      'backdrop-filter:blur(6px)',
      'padding:24px',
      'font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,sans-serif'
    ].join(';');

    overlay.innerHTML = `
      <div style="max-width:520px;width:100%;border:1px solid rgba(0,240,255,0.35);border-radius:18px;background:rgba(8,10,14,0.96);padding:24px;box-shadow:0 0 40px rgba(0,240,255,0.15)">
        <div style="display:inline-block;font-size:12px;letter-spacing:.12em;color:#00f0ff;border:1px solid rgba(0,240,255,.5);padding:4px 10px;border-radius:999px;margin-bottom:14px;">SYSTEM UPDATE</div>
        <h2 style="margin:0 0 10px 0;color:#fff;font-size:28px;line-height:1.2;">New XP ARENA build is ready</h2>
        <p style="margin:0 0 18px 0;color:#a8b3c7;font-size:14px;line-height:1.6;">We’ve deployed performance and stability upgrades. Refresh now to sync the latest control-plane assets.</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <button id="xpDeployReloadBtn" style="cursor:pointer;border:none;border-radius:12px;background:#00f0ff;color:#021014;padding:12px 18px;font-weight:800;">Reload & Sync</button>
          <button id="xpDeployLaterBtn" style="cursor:pointer;border:1px solid rgba(255,255,255,.2);border-radius:12px;background:transparent;color:#d9e3f7;padding:12px 18px;font-weight:700;">Later</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    document.getElementById('xpDeployReloadBtn')?.addEventListener('click', () => {
      if (window.registrationWaiting) {
        window.registrationWaiting.postMessage({ type: 'SKIP_WAITING' });
      }
      window.location.reload();
    });
    document.getElementById('xpDeployLaterBtn')?.addEventListener('click', () => {
      overlay.style.display = 'none';
    });

    return overlay;
  }

  function showOverlay() {
    const overlay = buildOverlay();
    overlay.style.display = 'flex';
  }

  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.getRegistration('/service-worker.js') || await navigator.serviceWorker.ready;
      if (!reg) return;

      if (reg.waiting) {
        window.registrationWaiting = reg.waiting;
        showOverlay();
      }

      reg.addEventListener('updatefound', () => {
        const installing = reg.installing;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            window.registrationWaiting = reg.waiting || installing;
            showOverlay();
          }
        });
      });
    } catch (_e) {
      // non-fatal: overlay unavailable
    }
  });
})();
