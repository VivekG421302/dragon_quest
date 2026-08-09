/**
 * DevMonitor — Frontend Request Inspector
 * Floating draggable panel that shows everything happening on the frontend:
 * request/response payloads, headers, status, errors, timing, and call stack origin.
 */
const DevMonitor = (function () {
    'use strict';

    // ===== State =====
    let isOpen = false;
    let isDragging = false;
    let dragOffsetX = 0, dragOffsetY = 0;
    let activeTab = 'log';
    let selectedEntry = null;
    const MAX_LOG = 200;

    const log = []; // { id, ts, method, url, endpoint, status, ok, duration, reqHeaders, reqBody, resHeaders, resBody, error, errorType, origin, phase }

    // ===== Intercept API.request =====
    // We wrap API.request to capture everything before/after each call.
    let _originalRequest = null;

    function patchApi() {
        if (!window.API || _originalRequest) return;
        _originalRequest = API.request.bind(API);

        API.request = async function (endpoint, options = {}) {
            const id = Date.now() + Math.random();
            const ts = new Date();
            const method = (options.method || 'GET').toUpperCase();
            const url = `${API.getBaseUrl()}${endpoint}`;

            // Capture call origin from stack
            let origin = '';
            try {
                const err = new Error();
                const lines = err.stack.split('\n');
                // Skip DevMonitor frames, find first app frame
                const appLine = lines.find(l =>
                    l.includes('.js') && !l.includes('dev-monitor') && !l.includes('api.js') && !l.includes('<anonymous>')
                );
                if (appLine) {
                    origin = appLine.trim().replace(/^at /, '').split('/').pop().split('?')[0];
                }
            } catch (_) { }

            // Request headers (mirror what api.js builds)
            const reqHeaders = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
            if (API.getToken()) reqHeaders['Authorization'] = 'Bearer ' + API.getToken().substring(0, 20) + '…';
            if (options.headers) Object.assign(reqHeaders, options.headers);

            let reqBody = null;
            try { reqBody = options.body ? JSON.parse(options.body) : null; } catch (_) { reqBody = options.body || null; }

            const entry = {
                id, ts, method, url, endpoint,
                status: null, ok: null, duration: null,
                reqHeaders, reqBody,
                resHeaders: {}, resBody: null,
                error: null, errorType: null,
                origin,
                phase: 'pending'
            };
            log.unshift(entry);
            if (log.length > MAX_LOG) log.pop();

            refreshIfOpen();

            const t0 = performance.now();
            try {
                const result = await _originalRequest(endpoint, options);
                entry.duration = Math.round(performance.now() - t0);
                entry.status = result.status || 200;
                entry.ok = true;
                entry.phase = 'success';
                entry.resBody = result.data ?? null;
                // response headers not exposed by current API — note that
                entry.resHeaders = { note: 'headers not forwarded by api.js — extend if needed' };
            } catch (err) {
                entry.duration = Math.round(performance.now() - t0);
                entry.ok = false;
                entry.phase = 'error';
                entry.error = err.message || String(err);
                // Classify using existing API helper
                const classified = API.classifyError(err, null);
                entry.errorType = classified.type;
                entry.errorDetail = classified.message;
                entry.status = extractStatus(err.message);
            }

            refreshIfOpen();
            return entry.ok
                ? { success: true, data: entry.resBody, status: entry.status }
                : (() => { throw new Error(entry.error); })();
        };
    }

    function extractStatus(msg) {
        const m = msg && msg.match(/HTTP (\d{3})/);
        return m ? parseInt(m[1]) : null;
    }

    // ===== DOM Injection =====
    function inject() {
        if (document.getElementById('dm-fab')) return;

        const html = `
<!-- DevMonitor FAB -->
<button id="dm-fab" title="DevMonitor — Frontend Inspector"
    style="position:fixed;bottom:24px;left:24px;z-index:99999;
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

<!-- DevMonitor Modal -->
<div id="dm-modal" style="display:none;position:fixed;top:80px;left:80px;z-index:99998;
    width:680px;max-width:calc(100vw - 32px);height:520px;max-height:calc(100vh - 100px);
    background:#0f172a;border:1px solid #1e3a5f;border-radius:16px;
    box-shadow:0 24px 64px rgba(0,0,0,0.7);font-family:monospace;
    display:none;flex-direction:column;overflow:hidden;">

    <!-- Title bar (drag handle) -->
    <div id="dm-titlebar" style="background:#0a1628;padding:10px 14px;display:flex;
        align-items:center;gap:10px;cursor:move;border-bottom:1px solid #1e3a5f;flex-shrink:0;user-select:none;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
        <span style="color:#e2e8f0;font-size:13px;font-weight:700;font-family:monospace;letter-spacing:.05em;">DEV MONITOR</span>
        <span style="color:#475569;font-size:11px;">frontend inspector</span>
        <div style="margin-left:auto;display:flex;gap:6px;align-items:center;">
            <button onclick="DevMonitor.clear()" title="Clear log"
                style="background:#1e293b;border:1px solid #334155;color:#94a3b8;
                       font-size:11px;padding:3px 8px;border-radius:6px;cursor:pointer;font-family:monospace;">
                CLR
            </button>
            <button onclick="DevMonitor.toggle()"
                style="background:#1e293b;border:1px solid #334155;color:#94a3b8;
                       width:26px;height:26px;border-radius:6px;cursor:pointer;font-size:14px;line-height:1;">
                ✕
            </button>
        </div>
    </div>

    <!-- Tabs -->
    <div style="display:flex;border-bottom:1px solid #1e3a5f;background:#0a1628;flex-shrink:0;">
        <button class="dm-tab" data-tab="log" onclick="DevMonitor.setTab('log')"
            style="padding:8px 16px;font-size:12px;font-family:monospace;cursor:pointer;
                   background:transparent;border:none;border-bottom:2px solid #22d3ee;
                   color:#22d3ee;letter-spacing:.04em;">LOG</button>
        <button class="dm-tab" data-tab="detail" onclick="DevMonitor.setTab('detail')"
            style="padding:8px 16px;font-size:12px;font-family:monospace;cursor:pointer;
                   background:transparent;border:none;border-bottom:2px solid transparent;
                   color:#475569;letter-spacing:.04em;">DETAIL</button>
        <button class="dm-tab" data-tab="stats" onclick="DevMonitor.setTab('stats')"
            style="padding:8px 16px;font-size:12px;font-family:monospace;cursor:pointer;
                   background:transparent;border:none;border-bottom:2px solid transparent;
                   color:#475569;letter-spacing:.04em;">STATS</button>
        <div style="margin-left:auto;padding:8px 14px;font-size:11px;color:#334155;font-family:monospace;" id="dm-count">0 requests</div>
    </div>

    <!-- Body -->
    <div id="dm-body" style="flex:1;overflow:hidden;display:flex;"></div>
</div>
`;
        const container = document.createElement('div');
        container.innerHTML = html;
        document.body.appendChild(container);

        // Fix: modal starts hidden
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
            modal.style.left = x + 'px';
            modal.style.top = y + 'px';
        });
        document.addEventListener('mouseup', () => { isDragging = false; });

        renderBody();
    }

    // ===== Toggle =====
    function toggle() {
        isOpen = !isOpen;
        const modal = document.getElementById('dm-modal');
        if (!modal) return;
        modal.style.display = isOpen ? 'flex' : 'none';
        if (isOpen) { clearBadge(); renderBody(); }
    }

    function clear() {
        log.length = 0;
        selectedEntry = null;
        renderBody();
    }

    function setTab(tab) {
        activeTab = tab;
        document.querySelectorAll('.dm-tab').forEach(btn => {
            const active = btn.dataset.tab === tab;
            btn.style.color = active ? '#22d3ee' : '#475569';
            btn.style.borderBottomColor = active ? '#22d3ee' : 'transparent';
        });
        renderBody();
    }

    // ===== Render =====
    function refreshIfOpen() {
        if (!isOpen) { bumpBadge(); return; }
        renderBody();
    }

    function bumpBadge() {
        const badge = document.getElementById('dm-badge');
        if (!badge) return;
        const errors = log.filter(e => e.phase === 'error').length;
        if (errors > 0) {
            badge.style.display = 'block';
            badge.textContent = errors > 99 ? '99+' : errors;
        } else {
            badge.style.display = 'none';
        }
    }

    function clearBadge() {
        const badge = document.getElementById('dm-badge');
        if (badge) badge.style.display = 'none';
    }

    function renderBody() {
        const body = document.getElementById('dm-body');
        const count = document.getElementById('dm-count');
        if (!body) return;
        if (count) count.textContent = `${log.length} request${log.length !== 1 ? 's' : ''}`;

        if (activeTab === 'log') body.innerHTML = renderLog();
        else if (activeTab === 'detail') body.innerHTML = renderDetail();
        else if (activeTab === 'stats') body.innerHTML = renderStats();
    }

    // ---- LOG TAB ----
    function renderLog() {
        if (log.length === 0) {
            return `<div style="flex:1;display:flex;align-items:center;justify-content:center;color:#334155;font-size:13px;">
                No requests yet. Make an API call to see it here.
            </div>`;
        }

        const rows = log.map(e => {
            const statusColor = e.phase === 'pending' ? '#f59e0b'
                : e.ok ? '#22c55e' : '#ef4444';
            const methodColors = { GET:'#22d3ee', POST:'#818cf8', PUT:'#f59e0b', PATCH:'#fb923c', DELETE:'#f87171' };
            const mColor = methodColors[e.method] || '#94a3b8';
            const isSelected = selectedEntry && selectedEntry.id === e.id;
            const statusText = e.phase === 'pending' ? 'PENDING'
                : e.status ? String(e.status) : (e.ok ? 'OK' : 'ERR');
            const durationText = e.duration !== null ? `${e.duration}ms` : '…';
            const endpoint = e.endpoint.length > 38 ? '…' + e.endpoint.slice(-36) : e.endpoint;
            const time = e.ts.toTimeString().slice(0, 8);

            return `<div onclick="DevMonitor._select('${e.id}')"
                style="display:grid;grid-template-columns:54px 56px 1fr 54px 52px;
                       align-items:center;gap:6px;padding:7px 12px;cursor:pointer;
                       border-bottom:1px solid #1e293b;font-size:11px;
                       background:${isSelected ? '#0e2a40' : 'transparent'};"
                onmouseenter="if(!${isSelected})this.style.background='#0d1e2e'"
                onmouseleave="this.style.background='${isSelected ? '#0e2a40' : 'transparent'}'">
                <span style="color:#475569;">${time}</span>
                <span style="color:${mColor};font-weight:700;">${e.method}</span>
                <span style="color:#94a3b8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${e.endpoint}">${endpoint}</span>
                <span style="color:${statusColor};font-weight:700;text-align:right;">${statusText}</span>
                <span style="color:#475569;text-align:right;">${durationText}</span>
            </div>`;
        }).join('');

        return `<div style="flex:1;overflow-y:auto;width:100%;">
            <div style="display:grid;grid-template-columns:54px 56px 1fr 54px 52px;
                gap:6px;padding:5px 12px;font-size:10px;color:#334155;
                border-bottom:1px solid #1e3a5f;background:#0a1628;
                position:sticky;top:0;z-index:1;">
                <span>TIME</span><span>METHOD</span><span>ENDPOINT</span>
                <span style="text-align:right;">STATUS</span><span style="text-align:right;">DUR</span>
            </div>
            ${rows}
        </div>`;
    }

    // ---- DETAIL TAB ----
    function renderDetail() {
        if (!selectedEntry) {
            return `<div style="flex:1;display:flex;align-items:center;justify-content:center;
                color:#334155;font-size:13px;text-align:center;padding:20px;">
                Click a row in the LOG tab to inspect it.
            </div>`;
        }
        const e = selectedEntry;
        const statusColor = e.ok ? '#22c55e' : '#ef4444';

        function section(title, content, color = '#22d3ee') {
            return `<div style="margin-bottom:14px;">
                <div style="font-size:10px;font-weight:700;color:${color};letter-spacing:.08em;margin-bottom:6px;">${title}</div>
                <div style="background:#0a1628;border:1px solid #1e3a5f;border-radius:8px;
                    padding:10px 12px;font-size:11px;color:#94a3b8;overflow-x:auto;
                    white-space:pre-wrap;word-break:break-all;max-height:160px;overflow-y:auto;">
${content}
                </div>
            </div>`;
        }

        let html = `<div style="flex:1;overflow-y:auto;padding:14px 16px;width:100%;box-sizing:border-box;">`;

        // Status bar
        html += `<div style="display:flex;gap:16px;align-items:center;margin-bottom:16px;
            background:#0a1628;border:1px solid #1e3a5f;border-radius:8px;padding:10px 14px;">
            <span style="color:${statusColor};font-weight:700;font-size:16px;">
                ${e.status || (e.phase === 'pending' ? '…' : '?')}
            </span>
            <span style="color:#e2e8f0;font-weight:700;">${e.method}</span>
            <span style="color:#475569;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${e.url}</span>
            <span style="color:#475569;font-size:11px;">${e.duration !== null ? e.duration + 'ms' : '…'}</span>
        </div>`;

        // Origin
        if (e.origin) {
            html += section('📍 CALLED FROM', e.origin, '#fb923c');
        }

        // Error
        if (!e.ok && e.error) {
            html += section(`⚠ ERROR — ${e.errorType || 'UNKNOWN'}`,
                (e.errorDetail || '') + '\n\n' + e.error, '#ef4444');
        }

        // Request headers
        html += section('↑ REQUEST HEADERS', JSON.stringify(e.reqHeaders, null, 2));

        // Request body
        if (e.reqBody !== null && e.reqBody !== undefined) {
            html += section('↑ REQUEST BODY', JSON.stringify(e.reqBody, null, 2), '#818cf8');
        }

        // Response headers
        html += section('↓ RESPONSE HEADERS', JSON.stringify(e.resHeaders, null, 2));

        // Response body
        if (e.resBody !== null && e.resBody !== undefined) {
            html += section('↓ RESPONSE BODY', JSON.stringify(e.resBody, null, 2), '#22c55e');
        }

        html += `</div>`;
        return html;
    }

    // ---- STATS TAB ----
    function renderStats() {
        const total = log.length;
        const success = log.filter(e => e.ok).length;
        const errors = log.filter(e => !e.ok && e.phase !== 'pending').length;
        const pending = log.filter(e => e.phase === 'pending').length;
        const durations = log.filter(e => e.duration !== null).map(e => e.duration);
        const avgDur = durations.length ? Math.round(durations.reduce((a,b)=>a+b,0)/durations.length) : 0;
        const maxDur = durations.length ? Math.max(...durations) : 0;

        const methods = {};
        log.forEach(e => { methods[e.method] = (methods[e.method] || 0) + 1; });

        const endpoints = {};
        log.forEach(e => { endpoints[e.endpoint] = (endpoints[e.endpoint] || 0) + 1; });
        const topEndpoints = Object.entries(endpoints).sort((a,b)=>b[1]-a[1]).slice(0, 8);

        const errorTypes = {};
        log.filter(e => e.errorType).forEach(e => {
            errorTypes[e.errorType] = (errorTypes[e.errorType] || 0) + 1;
        });

        function stat(label, value, color = '#e2e8f0') {
            return `<div style="background:#0a1628;border:1px solid #1e3a5f;border-radius:8px;padding:12px;text-align:center;">
                <div style="font-size:22px;font-weight:700;color:${color};">${value}</div>
                <div style="font-size:10px;color:#475569;margin-top:4px;letter-spacing:.06em;">${label}</div>
            </div>`;
        }

        return `<div style="flex:1;overflow-y:auto;padding:14px 16px;width:100%;box-sizing:border-box;">
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;">
                ${stat('TOTAL', total)}
                ${stat('SUCCESS', success, '#22c55e')}
                ${stat('ERRORS', errors, errors > 0 ? '#ef4444' : '#475569')}
                ${stat('PENDING', pending, '#f59e0b')}
                ${stat('AVG DUR', avgDur + 'ms', '#22d3ee')}
                ${stat('MAX DUR', maxDur + 'ms', maxDur > 3000 ? '#ef4444' : '#94a3b8')}
            </div>

            <div style="font-size:10px;font-weight:700;color:#22d3ee;letter-spacing:.08em;margin-bottom:6px;">BY METHOD</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;">
                ${Object.entries(methods).map(([m,c]) => `
                    <span style="background:#0a1628;border:1px solid #1e3a5f;border-radius:6px;
                        padding:4px 10px;font-size:11px;color:#94a3b8;">
                        <span style="color:#22d3ee;">${m}</span> ${c}
                    </span>
                `).join('')}
            </div>

            ${errorTypes && Object.keys(errorTypes).length > 0 ? `
            <div style="font-size:10px;font-weight:700;color:#ef4444;letter-spacing:.08em;margin-bottom:6px;">ERROR TYPES</div>
            <div style="background:#0a1628;border:1px solid #1e3a5f;border-radius:8px;padding:10px 12px;margin-bottom:14px;">
                ${Object.entries(errorTypes).map(([t,c]) => `
                    <div style="display:flex;justify-content:space-between;font-size:11px;
                        color:#94a3b8;padding:3px 0;border-bottom:1px solid #1e293b;">
                        <span style="color:#ef4444;">${t}</span><span>${c}</span>
                    </div>
                `).join('')}
            </div>` : ''}

            <div style="font-size:10px;font-weight:700;color:#22d3ee;letter-spacing:.08em;margin-bottom:6px;">TOP ENDPOINTS</div>
            <div style="background:#0a1628;border:1px solid #1e3a5f;border-radius:8px;padding:10px 12px;">
                ${topEndpoints.map(([ep, c]) => `
                    <div style="display:flex;justify-content:space-between;font-size:11px;
                        color:#94a3b8;padding:3px 0;border-bottom:1px solid #1e293b;
                        overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                        <span style="overflow:hidden;text-overflow:ellipsis;" title="${ep}">${ep}</span>
                        <span style="flex-shrink:0;margin-left:8px;color:#22d3ee;">${c}</span>
                    </div>
                `).join('') || '<span style="color:#334155;font-size:11px;">No data yet</span>'}
            </div>
        </div>`;
    }

    // ===== Select entry =====
    function _select(id) {
        selectedEntry = log.find(e => String(e.id) === String(id)) || null;
        if (selectedEntry) { setTab('detail'); }
        renderBody();
    }

    // ===== Init =====
    function init() {
        // Wait until API is ready
        const tryPatch = () => {
            if (window.API && window.API.request) {
                inject();
                patchApi();
            } else {
                setTimeout(tryPatch, 100);
            }
        };
        tryPatch();
    }

    return { toggle, clear, setTab, _select, init };
})();

// Auto-init when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => DevMonitor.init());
} else {
    DevMonitor.init();
}
