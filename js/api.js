/**
 * RequestProgress — minimalist timeline bar
 * Shows:  ● started  ──────  ● backend received  ──────  ● response done
 * Driven entirely from API.request(); no other code needs touching.
 */
const RequestProgress = (function () {
    'use strict';

    let hideTimer = null;
    let activeCount = 0;   // concurrent requests in-flight

    // Phase timestamps for the current (or most recent) request
    let phases = { sent: null, received: null, done: null };
    let method = 'GET';
    let endpointLabel = '';

    // ── DOM refs (lazily cached) ──────────────────────────────────────────────
    function el(id) { return document.getElementById(id); }

    // ── Public API ────────────────────────────────────────────────────────────

    /** Call the instant fetch() is called */
    function start(m, ep) {
        clearTimeout(hideTimer);
        activeCount++;
        method   = m;
        endpointLabel = ep.length > 42 ? '…' + ep.slice(-40) : ep;
        phases   = { sent: performance.now(), received: null, done: null };

        show();
        setBar(10);
        render('sent');
    }

    /**
     * Call when the fetch() Promise resolves (server replied — headers received).
     * In a standard fetch this is when we get the HTTP status, before body decode.
     */
    function received() {
        if (!phases.sent) return;
        phases.received = performance.now();
        setBar(70);
        render('received');
    }

    /** Call when the full response body is parsed and we're done */
    function done(ok) {
        if (!phases.sent) return;
        phases.done = performance.now();
        setBar(100, ok);
        render('done', ok);

        activeCount = Math.max(0, activeCount - 1);
        if (activeCount === 0) {
            // Linger for 1.8 s then fade out
            hideTimer = setTimeout(hide, 1800);
        }
    }

    // ── Internals ─────────────────────────────────────────────────────────────

    function show() {
        const wrap = el('reqProgress');
        if (wrap) { wrap.style.opacity = '1'; wrap.style.pointerEvents = 'none'; }
    }

    function hide() {
        const wrap = el('reqProgress');
        if (wrap) {
            wrap.style.opacity = '0';
            // Reset bar after fade
            setTimeout(() => setBar(0, true, true), 200);
        }
    }

    function setBar(pct, ok, instant) {
        const bar = el('reqBar');
        if (!bar) return;
        if (instant) { bar.style.transition = 'none'; bar.style.width = '0%'; return; }
        const grad = ok === false
            ? 'linear-gradient(90deg,#ef4444,#f87171)'     // red on error
            : 'linear-gradient(90deg,#7c3aed,#ec4899,#22d3ee)'; // purple→pink→cyan
        bar.style.background = grad;
        bar.style.transition = instant ? 'none' : 'width 0.35s cubic-bezier(0.4,0,0.2,1)';
        bar.style.width = pct + '%';
    }

    function ms(from, to) {
        if (from == null || to == null) return null;
        return Math.round(to - from);
    }

    function render(phase, ok) {
        const tl = el('reqTimeline');
        if (!tl) return;

        const now = performance.now();
        const t0  = phases.sent;

        // Durations (null until that phase completes)
        const toReceived = ms(t0, phases.received);  // network round-trip to first byte
        const toEnd      = ms(t0, phases.done);       // total

        // Colours
        const C = {
            done_ok:  '#22c55e',
            done_err: '#ef4444',
            active:   '#22d3ee',
            waiting:  '#334155',
            line_done:'#7c3aed',
            line_wait:'#1e3a5f',
            text:     '#94a3b8',
            text_hi:  '#e2e8f0',
            method:   { GET:'#22d3ee',POST:'#818cf8',PUT:'#f59e0b',PATCH:'#fb923c',DELETE:'#f87171' }
        };

        const mColor = C.method[method] || '#94a3b8';

        // Node states
        const s1Active = phase === 'sent';
        const s2Active = phase === 'received';
        const s3Active = phase === 'done';
        const s2Done   = phase === 'received' || phase === 'done';
        const s3Done   = phase === 'done';
        const s3Color  = s3Done ? (ok === false ? C.done_err : C.done_ok) : (s3Active ? C.active : C.waiting);

        const node = (color, pulse) =>
            `<span style="
                display:inline-block;width:10px;height:10px;border-radius:50%;
                background:${color};flex-shrink:0;
                ${pulse ? `box-shadow:0 0 0 0 ${color};animation:rp-pulse 1.2s infinite;` : ''}
            "></span>`;

        const line = (filled, label) =>
            `<span style="display:flex;align-items:center;gap:4px;flex:1;min-width:40px;max-width:160px;">
                <span style="flex:1;height:1px;background:${filled ? C.line_done : C.line_wait};
                    ${filled ? 'box-shadow:0 0 4px rgba(124,58,237,0.5)' : ''};
                    transition:background 0.3s;"></span>
                ${label ? `<span style="font-size:10px;color:${C.text};white-space:nowrap;flex-shrink:0;">${label}</span>` : ''}
                <span style="flex:1;height:1px;background:${filled ? C.line_done : C.line_wait};
                    ${filled ? 'box-shadow:0 0 4px rgba(124,58,237,0.5)' : ''};
                    transition:background 0.3s;"></span>
            </span>`;

        tl.innerHTML = `
            <style>
                @keyframes rp-pulse {
                    0%   { box-shadow:0 0 0 0 rgba(34,211,238,.7); }
                    70%  { box-shadow:0 0 0 6px rgba(34,211,238,0); }
                    100% { box-shadow:0 0 0 0 rgba(34,211,238,0); }
                }
            </style>

            <!-- Method + endpoint -->
            <span style="font-size:10px;font-weight:700;color:${mColor};
                margin-right:10px;flex-shrink:0;letter-spacing:.04em;">${method}</span>
            <span style="font-size:10px;color:${C.text};margin-right:12px;
                flex-shrink:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;
                max-width:180px;">${endpointLabel}</span>

            <!-- Timeline: node ── label ── node ── label ── node -->
            <div style="display:flex;align-items:center;gap:6px;flex:1;min-width:0;">

                <!-- ● Sent -->
                <div style="display:flex;flex-direction:column;align-items:center;gap:2px;flex-shrink:0;">
                    ${node(s1Active || s2Done || s3Done ? C.active : C.waiting, s1Active)}
                    <span style="font-size:9px;color:${C.text_hi};white-space:nowrap;">sent</span>
                    <span style="font-size:9px;color:${C.text};white-space:nowrap;">
                        ${new Date().toTimeString().slice(0,8)}
                    </span>
                </div>

                ${line(s2Done || s3Done, toReceived != null ? toReceived+'ms' : '…')}

                <!-- ● Backend received -->
                <div style="display:flex;flex-direction:column;align-items:center;gap:2px;flex-shrink:0;">
                    ${node(s2Done ? C.active : (s2Active ? C.active : C.waiting), s2Active)}
                    <span style="font-size:9px;color:${s2Done ? C.text_hi : C.text};white-space:nowrap;">backend</span>
                    <span style="font-size:9px;color:${C.text};white-space:nowrap;">
                        ${toReceived != null ? '+'+toReceived+'ms' : '—'}
                    </span>
                </div>

                ${line(s3Done, toEnd != null && toReceived != null ? (toEnd - toReceived)+'ms' : '…')}

                <!-- ● Response done -->
                <div style="display:flex;flex-direction:column;align-items:center;gap:2px;flex-shrink:0;">
                    ${node(s3Done ? s3Color : C.waiting, false)}
                    <span style="font-size:9px;color:${s3Done ? C.text_hi : C.text};white-space:nowrap;">
                        ${s3Done ? (ok === false ? 'error' : 'done') : 'response'}
                    </span>
                    <span style="font-size:9px;color:${s3Done ? (ok===false ? C.done_err : C.done_ok) : C.text};white-space:nowrap;">
                        ${toEnd != null ? '+'+toEnd+'ms total' : '—'}
                    </span>
                </div>
            </div>

            <!-- Active count badge (when multiple requests in-flight) -->
            ${activeCount > 1
                ? `<span style="margin-left:10px;font-size:9px;background:#1e3a5f;
                    color:#22d3ee;padding:2px 6px;border-radius:4px;flex-shrink:0;
                    font-family:monospace;">${activeCount} in-flight</span>`
                : ''}
        `;
    }

    return { start, received, done };
})();

/**
 * API Client Module
 * Business requests go to /api/...
 * Health checks go to /health/... (separate base)
 */
const API = (function() {
    'use strict';

    let apiBaseUrl  = localStorage.getItem('backendUrl')  || 'http://localhost:8080';
    let healthBaseUrl = localStorage.getItem('healthUrl') || apiBaseUrl; // separate health base

    let healthCheckInterval = null;
    let isConnected = false;
    let authToken = localStorage.getItem('authToken') || null;
    let lastError = null;

    const CONFIG = {
        // Health endpoints probed on /health base
        healthEndpoints: ['/health', '/actuator/health', '/api/health', '/api/v1/ping'],
        // All business API calls go through /api base
        apiPrefix: '/api',
        defaultHeaders: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        healthCheckIntervalMs: 8000,
        requestTimeoutMs: 10000
    };

    // ===== Event System =====
    const listeners = {};
    function on(event, cb)  { if (!listeners[event]) listeners[event] = []; listeners[event].push(cb); }
    function off(event, cb) { if (!listeners[event]) return; listeners[event] = listeners[event].filter(x => x !== cb); }
    function emit(event, data) { (listeners[event] || []).forEach(cb => { try { cb(data); } catch(e) { console.error(e); } }); }

    // ===== Error Classification =====
    function classifyError(error, response) {
        const msg = error?.message || '';
        if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Network request failed'))
            return { type: 'CORS_OR_DOWN', message: 'Cannot reach server. Either CORS is not configured, or the server is not running at this URL.' };
        if (msg.includes('CORS') || msg.includes('cross-origin'))
            return { type: 'CORS', message: 'CORS blocked. Add @CrossOrigin or CorsConfig to your Spring Boot app.' };
        if (response?.status === 0)
            return { type: 'CORS', message: 'Status 0 — CORS not configured on backend.' };
        if (msg.includes('timeout') || msg.includes('abort'))
            return { type: 'TIMEOUT', message: 'Connection timed out.' };
        if (response?.status === 401 || msg.includes('401'))
            return { type: 'UNAUTHORIZED', message: 'Not authenticated. Login first.' };
        if (response?.status === 403 || msg.includes('403'))
            return { type: 'FORBIDDEN', message: 'Access denied. Check your RBAC roles/permissions.' };
        if (response?.status === 404 || msg.includes('404'))
            return { type: 'NOT_FOUND', message: 'Endpoint not found. Check API prefix and path.' };
        if (response?.status === 429 || msg.includes('429'))
            return { type: 'RATE_LIMITED', message: 'Too many requests. Rate limiter triggered.' };
        return { type: 'UNKNOWN', message: msg || 'Unknown error' };
    }

    // ===== Core Request — Business API calls (/api/...) =====
    async function request(endpoint, options = {}) {
        if (offlineMode) {
            const mock = getMockResponse(endpoint, options.method || 'GET');
            if (mock) { console.log(`[MOCK] ${options.method || 'GET'} ${endpoint}`); return mock; }
        }

        const url = `${apiBaseUrl}${endpoint}`;
        const headers = { ...CONFIG.defaultHeaders };
        if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
        if (options.headers) Object.assign(headers, options.headers);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.requestTimeoutMs);

        try {
            console.log(`[API] ${options.method || 'GET'} ${url}`);
            RequestProgress.start(options.method || 'GET', endpoint);
            const response = await fetch(url, { ...options, headers, signal: controller.signal, mode: 'cors' });
            clearTimeout(timeoutId);
            RequestProgress.received();

            if (response.status === 401) {
                authToken = null; localStorage.removeItem('authToken'); emit('unauthorized');
                throw new Error('Session expired. Please login again.');
            }

            const contentType = response.headers.get('content-type');
            let data = null;
            if (contentType?.includes('application/json')) { data = await response.json(); }
            else if (response.status !== 204) { const text = await response.text(); if (text) data = text; }

            if (!response.ok) throw new Error(data?.message || data?.error || `HTTP ${response.status}: ${response.statusText}`);
            RequestProgress.done(true);
            return { success: true, data, status: response.status };
        } catch (error) {
            clearTimeout(timeoutId);
            const finalError = error.name === 'AbortError' ? new Error('Request timed out.') : error;
            const classified = classifyError(finalError, null);
            // Broadcast for global error banner — any listener can react
            RequestProgress.done(false);
            emit('apierror', {
                endpoint,
                method: options.method || 'GET',
                url,
                error: finalError,
                message: finalError.message,
                type: classified.type,
                hint: classified.message
            });
            throw finalError;
        }
    }

    // ===== Health Check — uses health base URL (/health/...) =====
    async function healthRequest(endpoint) {
        const url = `${healthBaseUrl}${endpoint}`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CONFIG.requestTimeoutMs);
        try {
            console.log(`[HEALTH] GET ${url}`);
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Accept': 'application/json' },
                signal: controller.signal,
                mode: 'cors'
            });
            clearTimeout(timeoutId);
            const contentType = response.headers.get('content-type');
            let data = null;
            if (contentType?.includes('application/json')) data = await response.json();
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return { success: true, data, status: response.status };
        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') throw new Error('Health check timed out.');
            throw error;
        }
    }

    async function checkHealth() {
        const errors = [];
        for (const endpoint of CONFIG.healthEndpoints) {
            try {
                const result = await healthRequest(endpoint);
                console.log(`[Health] SUCCESS on ${endpoint}`);
                if (!isConnected) { isConnected = true; emit('connected', { endpoint, result }); }
                return { success: true, endpoint, data: result.data };
            } catch (error) {
                console.log(`[Health] FAILED on ${endpoint}: ${error.message}`);
                errors.push({ endpoint, error: error.message });
            }
        }
        const classified = classifyError(new Error(errors[0]?.error || 'All health endpoints failed'), null);
        lastError = { errors, classified };
        if (isConnected) { isConnected = false; emit('disconnected', lastError); }
        return { success: false, ...lastError };
    }

    function startHealthCheck() {
        if (healthCheckInterval) clearInterval(healthCheckInterval);
        checkHealth();
        healthCheckInterval = setInterval(checkHealth, CONFIG.healthCheckIntervalMs);
    }
    function stopHealthCheck() {
        if (healthCheckInterval) { clearInterval(healthCheckInterval); healthCheckInterval = null; }
    }

    const get   = (ep)       => request(ep, { method: 'GET' });
    const post  = (ep, body) => request(ep, { method: 'POST',  body: JSON.stringify(body) });
    const put   = (ep, body) => request(ep, { method: 'PUT',   body: JSON.stringify(body) });
    const patch = (ep, body) => request(ep, { method: 'PATCH', body: JSON.stringify(body) });
    const del   = (ep)       => request(ep, { method: 'DELETE' });

    // ===== URL Management =====
    function setBaseUrl(url) {
        apiBaseUrl   = url.replace(/\/$/, '');
        healthBaseUrl = apiBaseUrl; // same host by default
        localStorage.setItem('backendUrl', apiBaseUrl);
    }
    function setHealthUrl(url) {
        healthBaseUrl = url.replace(/\/$/, '');
        localStorage.setItem('healthUrl', healthBaseUrl);
    }
    function getBaseUrl()   { return apiBaseUrl; }
    function getHealthUrl() { return healthBaseUrl; }
    function getLastError() { return lastError; }

    // ===== Auth =====
    function setToken(token) { authToken = token; token ? localStorage.setItem('authToken', token) : localStorage.removeItem('authToken'); }
    function getToken()      { return authToken; }
    function isAuthenticated() { return !!authToken; }

    // ===== Offline Mock Data =====
    const MOCK_DATA = {
        '/api/v1/products/stats':   { total: 42, lowStock: 3, outOfStock: 1 },
        '/api/v1/bills/stats':      { todaySales: 1250.50, totalBills: 18 },
        '/api/v1/inventory/stats':  { totalValue: 15420.00 },
        '/api/v1/products': { content: [
            { id:1, name:'Wireless Mouse', sku:'WM-001', eanCode:'1234567890123', itemCode:'ITM-001', brandId:1, color:'Black', size:'Standard', purchasePrice:15.00, sellingPrice:29.99, currentStock:45, reorderQty:10, expiryDate:null },
            { id:2, name:'Mechanical Keyboard', sku:'KB-002', eanCode:'1234567890124', itemCode:'ITM-002', brandId:2, color:'White', size:'Full', purchasePrice:45.00, sellingPrice:89.99, currentStock:8, reorderQty:5, expiryDate:null },
            { id:3, name:'USB-C Cable', sku:'CB-003', eanCode:'1234567890125', itemCode:'ITM-003', brandId:null, color:'Black', size:'2m', purchasePrice:3.50, sellingPrice:9.99, currentStock:2, reorderQty:20, expiryDate:null },
            { id:4, name:'Webcam 1080p', sku:'WC-004', eanCode:'1234567890126', itemCode:'ITM-004', brandId:1, color:'Black', size:'Standard', purchasePrice:25.00, sellingPrice:49.99, currentStock:0, reorderQty:5, expiryDate:null }
        ], number:0, totalPages:1 },
        '/api/v1/brands': { content: [
            { id:1, name:'Logitech', logoUrl:'', description:'Swiss peripherals' },
            { id:2, name:'Keychron', logoUrl:'', description:'Mechanical keyboards' }
        ], number:0, totalPages:1 },
        '/api/v1/suppliers': { content: [
            { id:1, name:'Tech Distributors', companyName:'TechDist Ltd', email:'orders@techdist.com', phone:'+91-99999-00001', address:'Andheri East, Mumbai', contactPersons:[{name:'Rajesh Kumar', phone:'+91-99999-00002', email:'rk@techdist.com', designation:'Sales Head'}] }
        ], number:0, totalPages:1 },
        '/api/v1/bills': { content: [
            { id:1, invoiceNumber:'INV-00001', customerName:'Priya Sharma', customerPhone:'+91-98765-43210', createdAt:new Date().toISOString(), grandTotal:119.98, status:'PAID', items:[{productName:'Wireless Mouse', quantity:2, unitPrice:29.99}] },
            { id:2, invoiceNumber:'INV-00002', customerName:'Arjun Mehta', customerPhone:'', createdAt:new Date(Date.now()-86400000).toISOString(), grandTotal:89.99, status:'PAID', items:[{productName:'Mechanical Keyboard', quantity:1, unitPrice:89.99}] }
        ], number:0, totalPages:1 },
        '/api/v1/stock-movements': { content: [
            { id:1, productId:1, productName:'Wireless Mouse', type:'INWARD', quantity:50, reason:'Initial stock', referenceId:'PO-001', createdAt:new Date(Date.now()-86400000*7).toISOString() },
            { id:2, productId:2, productName:'Mechanical Keyboard', type:'OUTWARD', quantity:2, reason:'Sale', referenceId:'INV-00002', createdAt:new Date(Date.now()-86400000).toISOString() }
        ], number:0, totalPages:1 },
        '/api/v1/returns': { content: [
            { id:1, billId:1, productId:1, productName:'Wireless Mouse', quantity:1, reason:'Defective unit', refundAmount:29.99, createdAt:new Date(Date.now()-3600000).toISOString() }
        ], number:0, totalPages:1 },
        '/api/v1/inventory': { content: [
            { id:1, name:'Wireless Mouse', sku:'WM-001', currentStock:45, reorderQty:10 },
            { id:2, name:'Mechanical Keyboard', sku:'KB-002', currentStock:8, reorderQty:5 },
            { id:3, name:'USB-C Cable', sku:'CB-003', currentStock:2, reorderQty:20 },
            { id:4, name:'Webcam 1080p', sku:'WC-004', currentStock:0, reorderQty:5 }
        ], number:0, totalPages:1 },
        '/api/v1/company': { id:1, name:'Demo Company Ltd', logoUrl:'', taxRegistration:'GSTIN123456789', phone:'+91-22-1234-5678', email:'demo@company.com', address:'BKC, Mumbai, Maharashtra' },
        '/api/v1/auth/login': { token:'demo-jwt-token-12345', user:{ id:1, username:'demo', email:'demo@company.com' } },
        '/api/v1/auth/signup': { id:2, username:'newuser', email:'new@user.com', organizationName:'New Org' }
    };

    function getMockResponse(endpoint, method) {
        if (!offlineMode) return null;
        const basePath = endpoint.split('?')[0];
        for (const [mockPath, data] of Object.entries(MOCK_DATA)) {
            if (basePath === mockPath || basePath.startsWith(mockPath + '/'))
                return { success:true, data, status:200 };
        }
        if (method !== 'GET') return { success:true, data:{ id:Date.now(), message:'Saved in demo mode (not persisted)' }, status:200 };
        return { success:true, data:{ content:[], number:0, totalPages:0 }, status:200 };
    }

    let offlineMode = localStorage.getItem('offlineMode') === 'true';
    function setOfflineMode(enabled) { offlineMode = enabled; localStorage.setItem('offlineMode', enabled ? 'true' : 'false'); }

    // ===== Export =====
    function exportToExcel(data, filename, sheetName = 'Data') {
        const ws = XLSX.utils.json_to_sheet(data); const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheetName); XLSX.writeFile(wb, `${filename}.xlsx`);
    }
    function exportToCSV(data, filename) {
        const ws = XLSX.utils.json_to_sheet(data); const csv = XLSX.utils.sheet_to_csv(ws);
        const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
        const link = document.createElement('a'); link.href = URL.createObjectURL(blob);
        link.download = `${filename}.csv`; link.click(); URL.revokeObjectURL(link.href);
    }

    return {
        get, post, put, patch, del, request, healthRequest,
        checkHealth, startHealthCheck, stopHealthCheck,
        setBaseUrl, setHealthUrl, getBaseUrl, getHealthUrl, getLastError,
        setToken, getToken, isAuthenticated, isConnected: () => isConnected,
        on, off, emit,
        exportToExcel, exportToCSV,
        CONFIG, classifyError, setOfflineMode, getMockResponse
    };
})();
