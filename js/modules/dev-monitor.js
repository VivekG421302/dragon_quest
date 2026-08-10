/**
 * DevMonitor v2 — Frontend Request Inspector
 * Tabs: LOG | DETAIL | STATS | REPLAY | MOCK | TIMELINE
 */
const DevMonitor = (function () {
    'use strict';

    // ===== State =====
    let isOpen = false;
    let isDragging = false;
    let dragOffsetX = 0, dragOffsetY = 0;
    let activeTab = 'log';
    let selectedEntry = null;
    const MAX_LOG = 300;
    const log = [];

    // Mock rules: { id, method, endpoint (partial match), responseBody, statusCode, delay, enabled }
    const mocks = [];
    let mockIdCounter = 1;

    // ===== API Intercept =====
    let _originalRequest = null;

    function patchApi() {
        if (!window.API || _originalRequest) return;
        _originalRequest = API.request.bind(API);

        API.request = async function (endpoint, options = {}) {
            const id = Date.now() + Math.random();
            const ts = new Date();
            const method = (options.method || 'GET').toUpperCase();
            const url = `${API.getBaseUrl()}${endpoint}`;

            // Call origin
            let origin = '';
            try {
                const lines = new Error().stack.split('\n');
                const appLine = lines.find(l => l.includes('.js') && !l.includes('dev-monitor') && !l.includes('api.js') && !l.includes('<anonymous>'));
                if (appLine) origin = appLine.trim().replace(/^at /, '').split('/').pop().split('?')[0];
            } catch (_) {}

            const reqHeaders = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
            if (API.getToken()) reqHeaders['Authorization'] = 'Bearer ' + API.getToken().substring(0, 20) + '…';
            if (options.headers) Object.assign(reqHeaders, options.headers);

            let reqBody = null;
            try { reqBody = options.body ? JSON.parse(options.body) : null; } catch (_) { reqBody = options.body || null; }

            const entry = { id, ts, method, url, endpoint, status: null, ok: null, duration: null,
                reqHeaders, reqBody, resHeaders: {}, resBody: null, error: null, errorType: null, origin, phase: 'pending' };
            log.unshift(entry);
            if (log.length > MAX_LOG) log.pop();
            refreshIfOpen();

            // Check mock rules
            const mockRule = mocks.find(m => m.enabled && m.method === method &&
                endpoint.toLowerCase().includes(m.endpoint.toLowerCase()));

            const t0 = performance.now();
            try {
                let result;
                if (mockRule) {
                    await new Promise(r => setTimeout(r, mockRule.delay || 0));
                    const mockStatus = mockRule.statusCode || 200;
                    if (mockStatus >= 400) throw new Error(`MOCK: HTTP ${mockStatus}`);
                    result = { success: true, data: JSON.parse(mockRule.responseBody || '{}'), status: mockStatus };
                    entry.resHeaders = { 'x-mocked-by': 'DevMonitor', 'x-mock-id': mockRule.id };
                } else {
                    result = await _originalRequest(endpoint, options);
                }
                entry.duration = Math.round(performance.now() - t0);
                entry.status = result.status || 200;
                entry.ok = true;
                entry.phase = mockRule ? 'mocked' : 'success';
                entry.resBody = result.data ?? null;
            } catch (err) {
                entry.duration = Math.round(performance.now() - t0);
                entry.ok = false;
                entry.phase = 'error';
                entry.error = err.message || String(err);
                const classified = API.classifyError(err, null);
                entry.errorType = classified.type;
                entry.errorDetail = classified.message;
                entry.status = extractStatus(err.message);
            }
            refreshIfOpen();
            updateDevBar();
            return entry.ok
                ? { success: true, data: entry.resBody, status: entry.status }
                : (() => { throw new Error(entry.error); })();
        };
    }

    function extractStatus(msg) {
        const m = msg && msg.match(/HTTP (\d{3})/);
        return m ? parseInt(m[1]) : null;
    }

    // ===== Dev Bar (always visible slim strip) =====
    function injectDevBar() {
        if (document.getElementById('dm-devbar')) return;
        const bar = document.createElement('div');
        bar.id = 'dm-devbar';
        bar.style.cssText = `position:fixed;bottom:0;left:0;right:0;z-index:99990;height:28px;
            background:#0a1628;border-top:1px solid #1e3a5f;display:flex;align-items:center;
            gap:0;font-family:monospace;font-size:11px;overflow:hidden;`;
        bar.innerHTML = `
            <div style="padding:0 12px;color:#22d3ee;font-weight:700;border-right:1px solid #1e3a5f;height:100%;display:flex;align-items:center;cursor:pointer;"
                onclick="DevMonitor.toggle()" title="Open DevMonitor">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:5px">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                </svg>DEV
            </div>
            <div id="dm-bar-health" style="padding:0 10px;border-right:1px solid #1e3a5f;height:100%;display:flex;align-items:center;gap:5px;cursor:default;" title="Backend health">
                <span id="dm-bar-health-dot" style="width:7px;height:7px;border-radius:50%;background:#475569;display:inline-block;"></span>
                <span id="dm-bar-health-text" style="color:#475569;">OFFLINE</span>
            </div>
            <div id="dm-bar-stats" style="padding:0 10px;border-right:1px solid #1e3a5f;height:100%;display:flex;align-items:center;gap:8px;color:#475569;">
                <span id="dm-bar-req">0 req</span>
                <span id="dm-bar-err" style="color:#ef4444;display:none;">0 err</span>
            </div>
            <div id="dm-bar-token" style="padding:0 10px;border-right:1px solid #1e3a5f;height:100%;display:flex;align-items:center;gap:5px;cursor:pointer;"
                onclick="DevMonitor.showTokenInfo()" title="Click to inspect JWT token">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#475569" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <span id="dm-bar-token-text" style="color:#475569;">NO TOKEN</span>
            </div>
            <div id="dm-bar-page" style="padding:0 10px;border-right:1px solid #1e3a5f;height:100%;display:flex;align-items:center;color:#475569;">
                <span id="dm-bar-page-text">—</span>
            </div>
            <div id="dm-bar-perf" style="padding:0 10px;border-right:1px solid #1e3a5f;height:100%;display:flex;align-items:center;gap:5px;color:#475569;">
                <span id="dm-bar-fps">— fps</span>
            </div>
            <div style="padding:0 10px;height:100%;display:flex;align-items:center;gap:8px;margin-left:auto;border-left:1px solid #1e3a5f;">
                <button onclick="DevMonitor.openTab('mock')" title="Mock Rules"
                    style="background:#1e293b;border:1px solid #334155;color:#f59e0b;font-size:10px;padding:2px 7px;border-radius:4px;cursor:pointer;font-family:monospace;">MOCK</button>
                <button onclick="DevMonitor.openTab('replay')" title="Replay / API Lab"
                    style="background:#1e293b;border:1px solid #334155;color:#818cf8;font-size:10px;padding:2px 7px;border-radius:4px;cursor:pointer;font-family:monospace;">REPLAY</button>
                <button onclick="DevMonitor.openTab('storage')" title="LocalStorage"
                    style="background:#1e293b;border:1px solid #334155;color:#22c55e;font-size:10px;padding:2px 7px;border-radius:4px;cursor:pointer;font-family:monospace;">LS</button>
                <button onclick="App && App.navigateTo('dev-lab')" title="API Playground"
                    style="background:linear-gradient(135deg,#7c3aed,#db2777);border:none;color:#fff;font-size:10px;padding:2px 8px;border-radius:4px;cursor:pointer;font-family:monospace;font-weight:700;">LAB ⚡</button>
            </div>`;
        document.body.appendChild(bar);
        // Padding so content isn't hidden behind dev bar
        document.body.style.paddingBottom = '28px';
        startFpsCounter();
        watchHealth();
        watchToken();
        watchPage();
    }

    // FPS counter
    let frameCount = 0, lastFpsTime = performance.now();
    function startFpsCounter() {
        const tick = () => {
            frameCount++;
            const now = performance.now();
            if (now - lastFpsTime >= 1000) {
                const fps = Math.round(frameCount * 1000 / (now - lastFpsTime));
                const el = document.getElementById('dm-bar-fps');
                if (el) { el.textContent = fps + ' fps'; el.style.color = fps < 30 ? '#ef4444' : fps < 50 ? '#f59e0b' : '#22c55e'; }
                frameCount = 0; lastFpsTime = now;
            }
            requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
    }

    function watchHealth() {
        if (!window.API) return;
        API.on('connected', () => {
            const dot = document.getElementById('dm-bar-health-dot');
            const txt = document.getElementById('dm-bar-health-text');
            if (dot) { dot.style.background = '#22c55e'; dot.style.boxShadow = '0 0 6px #22c55e'; }
            if (txt) { txt.textContent = 'ONLINE'; txt.style.color = '#22c55e'; }
        });
        API.on('disconnected', () => {
            const dot = document.getElementById('dm-bar-health-dot');
            const txt = document.getElementById('dm-bar-health-text');
            if (dot) { dot.style.background = '#ef4444'; dot.style.boxShadow = 'none'; }
            if (txt) { txt.textContent = 'OFFLINE'; txt.style.color = '#ef4444'; }
        });
    }

    function watchToken() {
        setInterval(() => {
            const el = document.getElementById('dm-bar-token-text');
            if (!el || !window.API) return;
            const token = API.getToken();
            if (!token) { el.textContent = 'NO TOKEN'; el.style.color = '#475569'; return; }
            try {
                const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')));
                const exp = payload.exp;
                if (!exp) { el.textContent = 'JWT ✓'; el.style.color = '#22c55e'; return; }
                const secsLeft = exp - Math.floor(Date.now() / 1000);
                if (secsLeft < 0) { el.textContent = 'JWT EXPIRED'; el.style.color = '#ef4444'; }
                else if (secsLeft < 120) { el.textContent = `JWT ${secsLeft}s`; el.style.color = '#f59e0b'; }
                else { const m = Math.floor(secsLeft/60); el.textContent = `JWT ${m}m`; el.style.color = '#22c55e'; }
            } catch (_) { el.textContent = 'JWT ?'; el.style.color = '#94a3b8'; }
        }, 2000);
    }

    function watchPage() {
        setInterval(() => {
            const el = document.getElementById('dm-bar-page-text');
            if (!el || !window.App) return;
            el.textContent = App.getCurrentPage ? App.getCurrentPage() : '—';
        }, 500);
    }

    function updateDevBar() {
        const reqEl = document.getElementById('dm-bar-req');
        const errEl = document.getElementById('dm-bar-err');
        if (reqEl) reqEl.textContent = log.length + ' req';
        const errs = log.filter(e => e.phase === 'error').length;
        if (errEl) { errEl.textContent = errs + ' err'; errEl.style.display = errs > 0 ? 'inline' : 'none'; }
    }

    // Token inspector popup
    function showTokenInfo() {
        const token = window.API && API.getToken();
        if (!token) { alert('No JWT token in session.'); return; }
        try {
            const [h, p] = token.split('.');
            const header  = JSON.parse(atob(h.replace(/-/g,'+').replace(/_/g,'/')));
            const payload = JSON.parse(atob(p.replace(/-/g,'+').replace(/_/g,'/')));
            const expStr = payload.exp ? new Date(payload.exp * 1000).toLocaleString() : 'none';
            const iatStr = payload.iat ? new Date(payload.iat * 1000).toLocaleString() : 'none';
            const modal = document.createElement('div');
            modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:999999;display:flex;align-items:center;justify-content:center;';
            modal.innerHTML = `<div style="background:#0f172a;border:1px solid #1e3a5f;border-radius:16px;padding:24px;width:540px;max-width:95vw;max-height:80vh;overflow-y:auto;font-family:monospace;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                    <span style="color:#22d3ee;font-weight:700;font-size:14px;">🔑 JWT Inspector</span>
                    <button onclick="this.closest('div[style*=inset]').remove()" style="background:#1e293b;border:1px solid #334155;color:#94a3b8;width:26px;height:26px;border-radius:6px;cursor:pointer;">✕</button>
                </div>
                <div style="margin-bottom:12px;">
                    <div style="color:#f59e0b;font-size:10px;font-weight:700;margin-bottom:4px;">HEADER</div>
                    <pre style="background:#0a1628;border:1px solid #1e3a5f;border-radius:8px;padding:10px;font-size:11px;color:#94a3b8;overflow-x:auto;">${JSON.stringify(header, null, 2)}</pre>
                </div>
                <div style="margin-bottom:12px;">
                    <div style="color:#22d3ee;font-size:10px;font-weight:700;margin-bottom:4px;">PAYLOAD</div>
                    <pre style="background:#0a1628;border:1px solid #1e3a5f;border-radius:8px;padding:10px;font-size:11px;color:#94a3b8;overflow-x:auto;">${JSON.stringify(payload, null, 2)}</pre>
                </div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:11px;">
                    <div style="background:#0a1628;border:1px solid #1e3a5f;border-radius:8px;padding:10px;">
                        <div style="color:#475569;margin-bottom:2px;">Issued At</div>
                        <div style="color:#e2e8f0;">${iatStr}</div>
                    </div>
                    <div style="background:#0a1628;border:1px solid #1e3a5f;border-radius:8px;padding:10px;">
                        <div style="color:#475569;margin-bottom:2px;">Expires At</div>
                        <div style="color:${payload.exp && payload.exp < Date.now()/1000 ? '#ef4444' : '#22c55e'}">${expStr}</div>
                    </div>
                </div>
                <div style="margin-top:12px;">
                    <div style="color:#475569;font-size:10px;font-weight:700;margin-bottom:4px;">RAW TOKEN (first 80 chars)</div>
                    <div style="background:#0a1628;border:1px solid #1e3a5f;border-radius:8px;padding:10px;font-size:10px;color:#475569;word-break:break-all;">${token.substring(0,80)}…</div>
                </div>
            </div>`;
            modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
            document.body.appendChild(modal);
        } catch(e) { alert('Could not parse JWT: ' + e.message); }
    }

    // ===== DOM Injection =====
    function inject() {
        if (document.getElementById('dm-fab')) return;

        const html = `
<button id="dm-fab" title="DevMonitor — Frontend Inspector"
    style="position:fixed;bottom:40px;left:24px;z-index:99999;
           width:48px;height:48px;border-radius:50%;border:none;cursor:pointer;
           background:linear-gradient(135deg,#0f172a,#1e293b);
           box-shadow:0 4px 20px rgba(0,0,0,0.4);
           display:flex;align-items:center;justify-content:center;
           transition:transform .15s,box-shadow .15s;"
    onmouseenter="this.style.transform='scale(1.12)';this.style.boxShadow='0 6px 28px rgba(0,0,0,0.5)'"
    onmouseleave="this.style.transform='scale(1)';this.style.boxShadow='0 4px 20px rgba(0,0,0,0.4)'"
    onclick="DevMonitor.toggle()">
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
    <span id="dm-badge" style="display:none;position:absolute;top:-4px;right:-4px;
        background:#ef4444;color:#fff;font-size:10px;font-weight:700;
        border-radius:50%;width:18px;height:18px;line-height:18px;text-align:center;
        font-family:monospace;border:2px solid #0f172a;"></span>
</button>

<div id="dm-modal" style="display:none;position:fixed;top:70px;left:80px;z-index:99998;
    width:720px;max-width:calc(100vw - 32px);height:540px;max-height:calc(100vh - 120px);
    background:#0f172a;border:1px solid #1e3a5f;border-radius:16px;
    box-shadow:0 24px 64px rgba(0,0,0,0.7);font-family:monospace;
    flex-direction:column;overflow:hidden;">

    <div id="dm-titlebar" style="background:#0a1628;padding:10px 14px;display:flex;
        align-items:center;gap:10px;cursor:move;border-bottom:1px solid #1e3a5f;flex-shrink:0;user-select:none;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
        <span style="color:#e2e8f0;font-size:13px;font-weight:700;letter-spacing:.05em;">DEV MONITOR</span>
        <span style="color:#475569;font-size:11px;">v2</span>
        <div style="margin-left:auto;display:flex;gap:6px;align-items:center;">
            <button onclick="DevMonitor.exportLog()" title="Export log as JSON"
                style="background:#1e293b;border:1px solid #334155;color:#94a3b8;font-size:11px;padding:3px 8px;border-radius:6px;cursor:pointer;">EXP</button>
            <button onclick="DevMonitor.clear()"
                style="background:#1e293b;border:1px solid #334155;color:#94a3b8;font-size:11px;padding:3px 8px;border-radius:6px;cursor:pointer;">CLR</button>
            <button onclick="DevMonitor.toggle()"
                style="background:#1e293b;border:1px solid #334155;color:#94a3b8;width:26px;height:26px;border-radius:6px;cursor:pointer;font-size:14px;line-height:1;">✕</button>
        </div>
    </div>

    <div style="display:flex;border-bottom:1px solid #1e3a5f;background:#0a1628;flex-shrink:0;overflow-x:auto;">
        ${['log','detail','stats','replay','mock','timeline','storage'].map(t =>
            `<button class="dm-tab" data-tab="${t}" onclick="DevMonitor.setTab('${t}')"
                style="padding:8px 14px;font-size:11px;font-family:monospace;cursor:pointer;white-space:nowrap;
                background:transparent;border:none;border-bottom:2px solid ${t==='log'?'#22d3ee':'transparent'};
                color:${t==='log'?'#22d3ee':'#475569'};letter-spacing:.04em;">${t.toUpperCase()}</button>`
        ).join('')}
        <div style="margin-left:auto;padding:8px 14px;font-size:11px;color:#334155;font-family:monospace;" id="dm-count">0 req</div>
    </div>

    <div id="dm-body" style="flex:1;overflow:hidden;display:flex;"></div>
</div>`;

        const container = document.createElement('div');
        container.innerHTML = html;
        document.body.appendChild(container);
        document.getElementById('dm-modal').style.display = 'none';

        // Drag
        const titlebar = document.getElementById('dm-titlebar');
        const modal = document.getElementById('dm-modal');
        titlebar.addEventListener('mousedown', e => {
            if (e.target.tagName === 'BUTTON') return;
            isDragging = true;
            const rect = modal.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
            e.preventDefault();
        });
        document.addEventListener('mousemove', e => {
            if (!isDragging) return;
            const x = Math.max(0, Math.min(window.innerWidth - modal.offsetWidth, e.clientX - dragOffsetX));
            const y = Math.max(0, Math.min(window.innerHeight - modal.offsetHeight, e.clientY - dragOffsetY));
            modal.style.left = x + 'px'; modal.style.top = y + 'px';
        });
        document.addEventListener('mouseup', () => { isDragging = false; });

        renderBody();
    }

    // ===== Controls =====
    function toggle() {
        isOpen = !isOpen;
        const modal = document.getElementById('dm-modal');
        if (!modal) return;
        modal.style.display = isOpen ? 'flex' : 'none';
        if (isOpen) { clearBadge(); renderBody(); }
    }

    function openTab(tab) {
        if (!isOpen) toggle();
        setTab(tab);
    }

    function clear() { log.length = 0; selectedEntry = null; renderBody(); updateDevBar(); }

    function setTab(tab) {
        activeTab = tab;
        document.querySelectorAll('.dm-tab').forEach(btn => {
            const active = btn.dataset.tab === tab;
            btn.style.color = active ? '#22d3ee' : '#475569';
            btn.style.borderBottomColor = active ? '#22d3ee' : 'transparent';
        });
        renderBody();
    }

    function exportLog() {
        const data = JSON.stringify(log.map(e => ({
            time: e.ts.toISOString(), method: e.method, endpoint: e.endpoint,
            status: e.status, duration: e.duration, phase: e.phase,
            reqBody: e.reqBody, resBody: e.resBody, error: e.error, origin: e.origin
        })), null, 2);
        const a = document.createElement('a');
        a.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(data);
        a.download = `devmonitor-${Date.now()}.json`;
        a.click();
    }

    function refreshIfOpen() {
        if (!isOpen) { bumpBadge(); return; }
        renderBody();
    }

    function bumpBadge() {
        const badge = document.getElementById('dm-badge');
        if (!badge) return;
        const errors = log.filter(e => e.phase === 'error').length;
        badge.style.display = errors > 0 ? 'block' : 'none';
        badge.textContent = errors > 99 ? '99+' : errors;
    }

    function clearBadge() { const b = document.getElementById('dm-badge'); if (b) b.style.display = 'none'; }

    function renderBody() {
        const body = document.getElementById('dm-body');
        const count = document.getElementById('dm-count');
        if (!body) return;
        if (count) count.textContent = `${log.length} req`;
        const renders = { log: renderLog, detail: renderDetail, stats: renderStats,
            replay: renderReplay, mock: renderMock, timeline: renderTimeline, storage: renderStorage };
        body.innerHTML = (renders[activeTab] || renderLog)();
    }

    // ===== LOG TAB =====
    function renderLog() {
        if (log.length === 0) return `<div style="flex:1;display:flex;align-items:center;justify-content:center;color:#334155;font-size:13px;width:100%;">No requests yet.</div>`;

        const methodColor = { GET:'#22d3ee', POST:'#818cf8', PUT:'#f59e0b', PATCH:'#fb923c', DELETE:'#f87171' };
        const phaseColor  = { pending:'#f59e0b', success:'#22c55e', error:'#ef4444', mocked:'#a78bfa' };

        const rows = log.map(e => {
            const isSelected = selectedEntry && selectedEntry.id === e.id;
            const bg = isSelected ? '#0e2a40' : 'transparent';
            const statusText = e.phase === 'pending' ? 'WAIT' : e.status ? String(e.status) : (e.ok ? 'OK' : 'ERR');
            const ep = e.endpoint.length > 36 ? '…' + e.endpoint.slice(-34) : e.endpoint;
            const mockTag = e.phase === 'mocked' ? '<span style="font-size:9px;background:#4c1d95;color:#c4b5fd;padding:1px 5px;border-radius:3px;margin-left:4px;">MOCK</span>' : '';
            return `<div onclick="DevMonitor._select('${e.id}')"
                style="display:grid;grid-template-columns:52px 52px 1fr 50px 50px;align-items:center;
                gap:6px;padding:6px 12px;cursor:pointer;border-bottom:1px solid #1e293b;font-size:11px;background:${bg};"
                onmouseenter="if('${isSelected}'!='true')this.style.background='#0d1e2e'"
                onmouseleave="this.style.background='${bg}'">
                <span style="color:#475569;">${e.ts.toTimeString().slice(0,8)}</span>
                <span style="color:${methodColor[e.method]||'#94a3b8'};font-weight:700;">${e.method}</span>
                <span style="color:#94a3b8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${e.endpoint}">${ep}${mockTag}</span>
                <span style="color:${phaseColor[e.phase]||'#94a3b8'};font-weight:700;text-align:right;">${statusText}</span>
                <span style="color:#475569;text-align:right;">${e.duration !== null ? e.duration+'ms' : '…'}</span>
            </div>`;
        }).join('');

        return `<div style="flex:1;overflow-y:auto;width:100%;">
            <div style="display:grid;grid-template-columns:52px 52px 1fr 50px 50px;gap:6px;padding:4px 12px;
                font-size:10px;color:#334155;border-bottom:1px solid #1e3a5f;background:#0a1628;position:sticky;top:0;">
                <span>TIME</span><span>METHOD</span><span>ENDPOINT</span>
                <span style="text-align:right;">STATUS</span><span style="text-align:right;">DUR</span>
            </div>${rows}</div>`;
    }

    // ===== DETAIL TAB =====
    function renderDetail() {
        if (!selectedEntry) return `<div style="flex:1;display:flex;align-items:center;justify-content:center;color:#334155;font-size:13px;width:100%;">Click a row in LOG to inspect it.</div>`;
        const e = selectedEntry;
        const sc = e.ok ? '#22c55e' : '#ef4444';
        const sec = (title, content, color='#22d3ee') =>
            `<div style="margin-bottom:12px;"><div style="font-size:10px;font-weight:700;color:${color};letter-spacing:.08em;margin-bottom:5px;">${title}</div>
            <div style="background:#0a1628;border:1px solid #1e3a5f;border-radius:8px;padding:10px 12px;font-size:11px;color:#94a3b8;
                white-space:pre-wrap;word-break:break-all;max-height:140px;overflow-y:auto;">${content}</div></div>`;

        let html = `<div style="flex:1;overflow-y:auto;padding:14px 16px;width:100%;box-sizing:border-box;">
            <div style="display:flex;gap:12px;align-items:center;margin-bottom:14px;background:#0a1628;
                border:1px solid #1e3a5f;border-radius:8px;padding:10px 14px;flex-wrap:wrap;gap:8px;">
                <span style="color:${sc};font-weight:700;font-size:15px;">${e.status||'?'}</span>
                <span style="color:#e2e8f0;font-weight:700;">${e.method}</span>
                <span style="color:#475569;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;">${e.url}</span>
                <span style="color:#475569;font-size:11px;flex-shrink:0;">${e.duration !== null ? e.duration+'ms' : '…'}</span>
                <button onclick="DevMonitor._loadReplay('${e.id}')"
                    style="background:#4c1d95;border:none;color:#c4b5fd;font-size:10px;padding:3px 8px;border-radius:5px;cursor:pointer;font-family:monospace;flex-shrink:0;">
                    ▶ REPLAY
                </button>
            </div>`;
        if (e.origin) html += sec('📍 CALLED FROM', e.origin, '#fb923c');
        if (!e.ok && e.error) html += sec(`⚠ ERROR — ${e.errorType||'UNKNOWN'}`, (e.errorDetail||'') + '\n\n' + e.error, '#ef4444');
        html += sec('↑ REQUEST HEADERS', JSON.stringify(e.reqHeaders, null, 2));
        if (e.reqBody != null) html += sec('↑ REQUEST BODY', JSON.stringify(e.reqBody, null, 2), '#818cf8');
        html += sec('↓ RESPONSE HEADERS', JSON.stringify(e.resHeaders, null, 2));
        if (e.resBody != null) html += sec('↓ RESPONSE BODY', JSON.stringify(e.resBody, null, 2), '#22c55e');
        html += '</div>';
        return html;
    }

    // ===== STATS TAB =====
    function renderStats() {
        const total = log.length, success = log.filter(e=>e.ok).length,
            errors = log.filter(e=>!e.ok&&e.phase!=='pending').length,
            pending = log.filter(e=>e.phase==='pending').length,
            mocked = log.filter(e=>e.phase==='mocked').length;
        const durs = log.filter(e=>e.duration!==null).map(e=>e.duration);
        const avg = durs.length ? Math.round(durs.reduce((a,b)=>a+b,0)/durs.length) : 0;
        const p95 = durs.length ? durs.sort((a,b)=>a-b)[Math.floor(durs.length*.95)] : 0;

        const methods={}, endpointMap={}, errorTypes={};
        log.forEach(e => {
            methods[e.method] = (methods[e.method]||0)+1;
            endpointMap[e.endpoint] = (endpointMap[e.endpoint]||0)+1;
            if (e.errorType) errorTypes[e.errorType] = (errorTypes[e.errorType]||0)+1;
        });
        const topEps = Object.entries(endpointMap).sort((a,b)=>b[1]-a[1]).slice(0,8);

        const st = (label, val, color='#e2e8f0') =>
            `<div style="background:#0a1628;border:1px solid #1e3a5f;border-radius:8px;padding:10px;text-align:center;">
                <div style="font-size:20px;font-weight:700;color:${color};">${val}</div>
                <div style="font-size:10px;color:#475569;margin-top:3px;letter-spacing:.05em;">${label}</div></div>`;

        return `<div style="flex:1;overflow-y:auto;padding:14px 16px;width:100%;box-sizing:border-box;">
            <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px;">
                ${st('TOTAL',total)} ${st('SUCCESS',success,'#22c55e')} ${st('ERRORS',errors,errors>0?'#ef4444':'#475569')}
                ${st('MOCKED',mocked,'#a78bfa')}
                ${st('AVG DUR',avg+'ms','#22d3ee')} ${st('P95 DUR',p95+'ms',p95>3000?'#ef4444':'#94a3b8')}
                ${st('PENDING',pending,'#f59e0b')} ${st('LOG SIZE',log.length)}
            </div>
            <div style="font-size:10px;font-weight:700;color:#22d3ee;letter-spacing:.08em;margin-bottom:6px;">BY METHOD</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">
                ${Object.entries(methods).map(([m,c])=>`<span style="background:#0a1628;border:1px solid #1e3a5f;border-radius:6px;padding:4px 10px;font-size:11px;color:#94a3b8;"><span style="color:#22d3ee;">${m}</span> ${c}</span>`).join('')}
            </div>
            ${Object.keys(errorTypes).length ? `
            <div style="font-size:10px;font-weight:700;color:#ef4444;letter-spacing:.08em;margin-bottom:6px;">ERROR TYPES</div>
            <div style="background:#0a1628;border:1px solid #1e3a5f;border-radius:8px;padding:10px 12px;margin-bottom:14px;">
                ${Object.entries(errorTypes).map(([t,c])=>`<div style="display:flex;justify-content:space-between;font-size:11px;color:#94a3b8;padding:3px 0;border-bottom:1px solid #1e293b;"><span style="color:#ef4444;">${t}</span><span>${c}</span></div>`).join('')}
            </div>` : ''}
            <div style="font-size:10px;font-weight:700;color:#22d3ee;letter-spacing:.08em;margin-bottom:6px;">TOP ENDPOINTS</div>
            <div style="background:#0a1628;border:1px solid #1e3a5f;border-radius:8px;padding:10px 12px;">
                ${topEps.map(([ep,c])=>`<div style="display:flex;justify-content:space-between;font-size:11px;color:#94a3b8;padding:3px 0;border-bottom:1px solid #1e293b;overflow:hidden;"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${ep}">${ep}</span><span style="flex-shrink:0;margin-left:8px;color:#22d3ee;">${c}</span></div>`).join('')||'<span style="color:#334155;font-size:11px;">No data</span>'}
            </div>
        </div>`;
    }

    // ===== REPLAY TAB =====
    let _replayEntry = null;
    function _loadReplay(id) {
        _replayEntry = log.find(e => String(e.id) === String(id));
        openTab('replay');
    }

    function renderReplay() {
        const e = _replayEntry;
        const methods = ['GET','POST','PUT','PATCH','DELETE'];
        const method = e ? e.method : 'GET';
        const endpoint = e ? e.endpoint : '/api/v1/';
        const body = e && e.reqBody ? JSON.stringify(e.reqBody, null, 2) : '';

        return `<div style="flex:1;overflow-y:auto;padding:14px 16px;width:100%;box-sizing:border-box;">
            <div style="font-size:10px;font-weight:700;color:#818cf8;letter-spacing:.08em;margin-bottom:10px;">▶ REQUEST REPLAY / API LAB</div>
            <div style="display:flex;gap:8px;margin-bottom:10px;">
                <select id="dm-replay-method" style="background:#0a1628;border:1px solid #1e3a5f;border-radius:6px;color:#22d3ee;font-family:monospace;font-size:12px;padding:6px 8px;cursor:pointer;">
                    ${methods.map(m=>`<option value="${m}" ${m===method?'selected':''}>${m}</option>`).join('')}
                </select>
                <input id="dm-replay-endpoint" value="${endpoint}"
                    style="flex:1;background:#0a1628;border:1px solid #1e3a5f;border-radius:6px;color:#e2e8f0;font-family:monospace;font-size:12px;padding:6px 10px;outline:none;"
                    placeholder="/api/v1/products">
            </div>
            <div style="font-size:10px;color:#475569;margin-bottom:4px;">REQUEST BODY (JSON)</div>
            <textarea id="dm-replay-body" rows="7" style="width:100%;box-sizing:border-box;background:#0a1628;border:1px solid #1e3a5f;border-radius:8px;color:#94a3b8;font-family:monospace;font-size:11px;padding:10px;outline:none;resize:vertical;margin-bottom:10px;">${body}</textarea>
            <div style="display:flex;gap:8px;margin-bottom:14px;">
                <button onclick="DevMonitor._fireReplay()"
                    style="background:linear-gradient(135deg,#7c3aed,#4f46e5);border:none;color:#fff;font-family:monospace;font-size:12px;font-weight:700;padding:8px 18px;border-radius:8px;cursor:pointer;">
                    ▶ FIRE REQUEST
                </button>
                <button onclick="DevMonitor._clearReplay()"
                    style="background:#1e293b;border:1px solid #334155;color:#94a3b8;font-family:monospace;font-size:12px;padding:8px 12px;border-radius:8px;cursor:pointer;">
                    CLEAR
                </button>
            </div>
            <div id="dm-replay-result" style="display:none;">
                <div style="font-size:10px;font-weight:700;color:#22c55e;letter-spacing:.08em;margin-bottom:6px;">RESPONSE</div>
                <div id="dm-replay-result-body" style="background:#0a1628;border:1px solid #1e3a5f;border-radius:8px;padding:12px;font-size:11px;color:#94a3b8;white-space:pre-wrap;max-height:200px;overflow-y:auto;"></div>
            </div>
        </div>`;
    }

    async function _fireReplay() {
        const method   = document.getElementById('dm-replay-method').value;
        const endpoint = document.getElementById('dm-replay-endpoint').value.trim();
        const rawBody  = document.getElementById('dm-replay-body').value.trim();
        const resEl    = document.getElementById('dm-replay-result');
        const resBody  = document.getElementById('dm-replay-result-body');
        if (!endpoint) return;
        resEl.style.display = 'block';
        resBody.textContent = 'Firing…';
        resBody.style.color = '#f59e0b';

        const opts = { method };
        if (rawBody && method !== 'GET') {
            try { opts.body = JSON.stringify(JSON.parse(rawBody)); }
            catch { opts.body = rawBody; }
        }
        try {
            const result = await _originalRequest(endpoint, opts);
            resBody.style.color = '#22c55e';
            resBody.textContent = JSON.stringify(result.data, null, 2);
        } catch(err) {
            resBody.style.color = '#ef4444';
            resBody.textContent = 'Error: ' + err.message;
        }
    }

    function _clearReplay() {
        _replayEntry = null;
        document.getElementById('dm-replay-method').value = 'GET';
        document.getElementById('dm-replay-endpoint').value = '/api/v1/';
        document.getElementById('dm-replay-body').value = '';
        document.getElementById('dm-replay-result').style.display = 'none';
    }

    // ===== MOCK TAB =====
    function renderMock() {
        const methods = ['GET','POST','PUT','PATCH','DELETE'];
        const rows = mocks.map(m => `
            <div style="background:#0a1628;border:1px solid ${m.enabled?'#1e3a5f':'#1e293b'};border-radius:8px;padding:10px 12px;margin-bottom:8px;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                    <span style="color:#22d3ee;font-weight:700;font-size:11px;">${m.method}</span>
                    <span style="color:#e2e8f0;font-size:11px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${m.endpoint}</span>
                    <span style="color:#f59e0b;font-size:11px;">${m.statusCode}</span>
                    <span style="color:${m.delay?'#f59e0b':'#475569'};font-size:10px;">${m.delay||0}ms</span>
                    <button onclick="DevMonitor._toggleMock(${m.id})"
                        style="background:${m.enabled?'#052e16':'#1e293b'};border:1px solid ${m.enabled?'#166534':'#334155'};color:${m.enabled?'#22c55e':'#475569'};font-size:10px;padding:2px 7px;border-radius:4px;cursor:pointer;font-family:monospace;">
                        ${m.enabled?'ON':'OFF'}
                    </button>
                    <button onclick="DevMonitor._deleteMock(${m.id})"
                        style="background:#1e293b;border:1px solid #334155;color:#ef4444;font-size:12px;width:22px;height:22px;border-radius:4px;cursor:pointer;">✕</button>
                </div>
                <pre style="font-size:10px;color:#475569;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${(m.responseBody||'{}').substring(0,80)}…</pre>
            </div>`).join('') || `<div style="color:#334155;font-size:12px;text-align:center;padding:20px;">No mock rules yet. Add one below.</div>`;

        return `<div style="flex:1;overflow-y:auto;padding:14px 16px;width:100%;box-sizing:border-box;">
            <div style="font-size:10px;font-weight:700;color:#f59e0b;letter-spacing:.08em;margin-bottom:10px;">🎭 MOCK RULES — intercept API calls, return fake responses</div>
            ${rows}
            <div style="margin-top:14px;background:#0a1628;border:1px solid #1e3a5f;border-radius:10px;padding:12px;">
                <div style="font-size:10px;font-weight:700;color:#22d3ee;margin-bottom:8px;">ADD NEW RULE</div>
                <div style="display:flex;gap:6px;margin-bottom:6px;">
                    <select id="dm-mock-method" style="background:#0f172a;border:1px solid #1e3a5f;border-radius:6px;color:#22d3ee;font-family:monospace;font-size:11px;padding:5px 6px;">
                        ${methods.map(m=>`<option>${m}</option>`).join('')}
                    </select>
                    <input id="dm-mock-endpoint" placeholder="endpoint contains (e.g. /products)"
                        style="flex:1;background:#0f172a;border:1px solid #1e3a5f;border-radius:6px;color:#e2e8f0;font-family:monospace;font-size:11px;padding:5px 8px;outline:none;">
                    <input id="dm-mock-status" placeholder="200" value="200" type="number"
                        style="width:56px;background:#0f172a;border:1px solid #1e3a5f;border-radius:6px;color:#f59e0b;font-family:monospace;font-size:11px;padding:5px 6px;outline:none;">
                    <input id="dm-mock-delay" placeholder="0ms" value="0" type="number"
                        style="width:52px;background:#0f172a;border:1px solid #1e3a5f;border-radius:6px;color:#94a3b8;font-family:monospace;font-size:11px;padding:5px 6px;outline:none;">
                </div>
                <textarea id="dm-mock-body" rows="4" placeholder='{"message": "mocked!", "data": []}'
                    style="width:100%;box-sizing:border-box;background:#0f172a;border:1px solid #1e3a5f;border-radius:6px;color:#94a3b8;font-family:monospace;font-size:11px;padding:8px;outline:none;resize:vertical;margin-bottom:8px;"></textarea>
                <button onclick="DevMonitor._addMock()"
                    style="background:linear-gradient(135deg,#b45309,#92400e);border:none;color:#fef3c7;font-family:monospace;font-size:11px;font-weight:700;padding:6px 14px;border-radius:6px;cursor:pointer;">
                    + ADD MOCK RULE
                </button>
            </div>
        </div>`;
    }

    function _addMock() {
        const method   = document.getElementById('dm-mock-method').value;
        const endpoint = document.getElementById('dm-mock-endpoint').value.trim();
        const status   = parseInt(document.getElementById('dm-mock-status').value) || 200;
        const delay    = parseInt(document.getElementById('dm-mock-delay').value) || 0;
        const body     = document.getElementById('dm-mock-body').value.trim() || '{}';
        if (!endpoint) return;
        try { JSON.parse(body); } catch { alert('Invalid JSON in response body'); return; }
        mocks.push({ id: mockIdCounter++, method, endpoint, statusCode: status, delay, responseBody: body, enabled: true });
        renderBody();
    }

    function _toggleMock(id) { const m = mocks.find(x=>x.id===id); if (m) m.enabled = !m.enabled; renderBody(); }
    function _deleteMock(id) { const i = mocks.findIndex(x=>x.id===id); if (i>=0) mocks.splice(i,1); renderBody(); }

    // ===== TIMELINE TAB =====
    function renderTimeline() {
        if (log.length === 0) return `<div style="flex:1;display:flex;align-items:center;justify-content:center;color:#334155;font-size:13px;width:100%;">No requests to display.</div>`;

        const recent = [...log].reverse().slice(-30); // oldest → newest, max 30
        const t0 = recent[0].ts.getTime();
        const tMax = Math.max(...recent.map(e => e.ts.getTime() + (e.duration || 0)));
        const totalSpan = Math.max(tMax - t0, 1);
        const methodColor = { GET:'#22d3ee', POST:'#818cf8', PUT:'#f59e0b', PATCH:'#fb923c', DELETE:'#f87171' };
        const phaseColor  = { pending:'#f59e0b', success:'#22c55e', error:'#ef4444', mocked:'#a78bfa' };

        const bars = recent.map(e => {
            const left = ((e.ts.getTime() - t0) / totalSpan * 100).toFixed(1);
            const width = Math.max(((e.duration || 20) / totalSpan * 100), 0.8).toFixed(1);
            const color = phaseColor[e.phase] || '#94a3b8';
            const ep = e.endpoint.length > 28 ? '…' + e.endpoint.slice(-26) : e.endpoint;
            return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;font-size:10px;">
                <span style="color:${methodColor[e.method]||'#94a3b8'};font-weight:700;width:40px;flex-shrink:0;">${e.method}</span>
                <span style="color:#475569;width:130px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex-shrink:0;" title="${e.endpoint}">${ep}</span>
                <div style="flex:1;position:relative;height:16px;background:#0a1628;border-radius:4px;overflow:hidden;">
                    <div style="position:absolute;left:${left}%;width:${width}%;height:100%;background:${color};border-radius:3px;min-width:3px;opacity:0.85;" title="${e.duration||0}ms"></div>
                </div>
                <span style="color:${color};width:44px;text-align:right;flex-shrink:0;">${e.duration !== null ? e.duration+'ms' : '…'}</span>
            </div>`;
        }).join('');

        return `<div style="flex:1;overflow-y:auto;padding:14px 16px;width:100%;box-sizing:border-box;">
            <div style="font-size:10px;font-weight:700;color:#22d3ee;letter-spacing:.08em;margin-bottom:10px;">⏱ REQUEST TIMELINE — last ${recent.length} requests (oldest → newest)</div>
            <div style="font-size:10px;color:#334155;margin-bottom:10px;">Total span: ${totalSpan}ms</div>
            ${bars}
            <div style="display:flex;gap:12px;margin-top:12px;flex-wrap:wrap;">
                ${Object.entries(phaseColor).map(([p,c])=>`<span style="font-size:10px;color:${c};">■ ${p}</span>`).join('')}
            </div>
        </div>`;
    }

    // ===== STORAGE TAB =====
    function renderStorage() {
        const items = [];
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                let v = localStorage.getItem(k);
                let parsed = null, type = 'string';
                try { parsed = JSON.parse(v); type = Array.isArray(parsed) ? 'array' : typeof parsed; } catch {}
                items.push({ k, v, parsed, type });
            }
        } catch (e) { return `<div style="padding:20px;color:#ef4444;">Cannot access localStorage: ${e.message}</div>`; }

        const rows = items.map(({ k, v, parsed, type }) => {
            const typeColor = { string:'#22d3ee', object:'#818cf8', number:'#f59e0b', boolean:'#22c55e', array:'#fb923c' }[type] || '#94a3b8';
            const display = type === 'object' || type === 'array'
                ? JSON.stringify(parsed, null, 2).substring(0, 120) + (JSON.stringify(parsed).length > 120 ? '…' : '')
                : String(v).substring(0, 120);
            return `<div style="background:#0a1628;border:1px solid #1e3a5f;border-radius:8px;padding:10px 12px;margin-bottom:8px;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                    <span style="color:#e2e8f0;font-weight:700;font-size:11px;flex:1;">${k}</span>
                    <span style="color:${typeColor};font-size:10px;background:#0f172a;padding:2px 6px;border-radius:4px;">${type}</span>
                    <button onclick="DevMonitor._deleteStorage('${k}')"
                        style="background:#1e293b;border:1px solid #334155;color:#ef4444;font-size:12px;width:20px;height:20px;border-radius:4px;cursor:pointer;line-height:1;" title="Delete">✕</button>
                </div>
                <pre style="font-size:10px;color:#475569;margin:0;white-space:pre-wrap;word-break:break-all;">${display}</pre>
            </div>`;
        }).join('') || `<div style="color:#334155;font-size:12px;text-align:center;padding:20px;">localStorage is empty.</div>`;

        return `<div style="flex:1;overflow-y:auto;padding:14px 16px;width:100%;box-sizing:border-box;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                <div style="font-size:10px;font-weight:700;color:#22c55e;letter-spacing:.08em;">💾 LOCALSTORAGE — ${items.length} keys</div>
                <button onclick="DevMonitor._refreshStorage()"
                    style="background:#1e293b;border:1px solid #334155;color:#94a3b8;font-size:10px;padding:3px 8px;border-radius:5px;cursor:pointer;font-family:monospace;">REFRESH</button>
            </div>
            ${rows}
        </div>`;
    }

    function _deleteStorage(key) {
        if (!confirm(`Delete localStorage key "${key}"?`)) return;
        localStorage.removeItem(key);
        renderBody();
    }

    function _refreshStorage() { renderBody(); }

    // ===== Select =====
    function _select(id) {
        selectedEntry = log.find(e => String(e.id) === String(id)) || null;
        if (selectedEntry) setTab('detail');
        else renderBody();
    }

    // ===== Init =====
    function init() {
        const tryPatch = () => {
            if (window.API && window.API.request) {
                inject();
                injectDevBar();
                patchApi();
            } else { setTimeout(tryPatch, 100); }
        };
        tryPatch();
    }

    return { toggle, openTab, clear, setTab, exportLog, showTokenInfo,
             _select, _loadReplay, _clearReplay, _fireReplay,
             _addMock, _toggleMock, _deleteMock,
             _deleteStorage, _refreshStorage, init };
})();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => DevMonitor.init());
} else { DevMonitor.init(); }
