/**
 * DevLab — Interactive API Playground
 * Like a mini Postman built into the app.
 * Lets you browse all documented endpoints, fill request bodies, fire, see response.
 */
const DevLab = (function() {
    'use strict';

    let selectedEndpoint = null;
    let historyLog = []; // { ts, method, endpoint, reqBody, status, duration, resBody }
    const MAX_HIST = 50;

    // All endpoints pulled from DevGuide if available, else built-in
    function getAllEndpoints() {
        const list = [];
        if (window.DevGuide && DevGuide._businessDocs) {
            Object.entries(DevGuide._businessDocs).forEach(([cat, sec]) => {
                sec.endpoints.forEach(ep => list.push({ ...ep, category: sec.title }));
            });
        } else {
            // Fallback essential endpoints
            [
                { method:'GET',  path:'/api/v1/auth/me',             description:'Current user profile', category:'Auth' },
                { method:'GET',  path:'/api/v1/products',             description:'List products',         category:'WMS' },
                { method:'POST', path:'/api/v1/products',             description:'Create product',         category:'WMS' },
                { method:'GET',  path:'/api/v1/customers',            description:'List customers',         category:'CRM' },
                { method:'GET',  path:'/api/v1/bills',                description:'List bills',             category:'Sales' },
                { method:'POST', path:'/api/v1/bills',                description:'Create bill',            category:'Sales' },
                { method:'GET',  path:'/api/v1/suppliers',            description:'List suppliers',         category:'WMS' },
                { method:'GET',  path:'/api/v1/inventory',            description:'Stock levels',           category:'WMS' },
                { method:'GET',  path:'/api/v1/employees',            description:'List employees',         category:'HRMS' },
                { method:'GET',  path:'/api/v1/roles',                description:'List roles',             category:'RBAC' },
                { method:'GET',  path:'/health',                      description:'Health check',           category:'System' },
                { method:'GET',  path:'/actuator/health',             description:'Actuator health',        category:'System' }
            ].forEach(ep => list.push(ep));
        }
        return list;
    }

    function render() {
        const endpoints = getAllEndpoints();
        const categories = [...new Set(endpoints.map(e => e.category))];
        const methodColors = { GET:'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
            POST:'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
            PUT:'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
            PATCH:'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
            DELETE:'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' };

        return `<div class="space-y-4">
            <!-- Header -->
            <div class="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-purple-500/20 relative overflow-hidden">
                <div class="absolute inset-0 opacity-10" style="background-image:radial-gradient(circle at 2px 2px,white 1px,transparent 0);background-size:24px 24px;"></div>
                <div class="relative z-10 flex items-center gap-4">
                    <div class="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center flex-shrink-0">
                        <i data-lucide="zap" class="w-7 h-7 text-white"></i>
                    </div>
                    <div>
                        <h1 class="font-display text-2xl font-bold">API Lab ⚡</h1>
                        <p class="text-white/75 text-sm mt-0.5">Interactive playground — browse endpoints, craft requests, fire & inspect responses in real time.</p>
                    </div>
                    <div class="ml-auto flex gap-2 flex-shrink-0">
                        <div class="text-center bg-white/15 rounded-xl px-4 py-2">
                            <div class="text-xl font-bold">${endpoints.length}</div>
                            <div class="text-white/70 text-xs">Endpoints</div>
                        </div>
                        <div class="text-center bg-white/15 rounded-xl px-4 py-2">
                            <div class="text-xl font-bold">${categories.length}</div>
                            <div class="text-white/70 text-xs">Domains</div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <!-- Left: endpoint browser -->
                <div class="lg:col-span-1 bg-white dark:bg-slate-800 rounded-3xl border border-amber-100 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div class="p-4 border-b border-amber-100 dark:border-slate-700">
                        <input id="lab-search" oninput="DevLab.filterEndpoints(this.value)"
                            placeholder="Search endpoints…"
                            class="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
                    </div>
                    <div id="lab-endpoint-list" class="overflow-y-auto" style="max-height:520px;">
                        ${renderEndpointList(endpoints, categories, methodColors)}
                    </div>
                </div>

                <!-- Right: request builder + response -->
                <div class="lg:col-span-2 space-y-4">
                    <!-- Request builder -->
                    <div class="bg-white dark:bg-slate-800 rounded-3xl border border-amber-100 dark:border-slate-700 shadow-sm p-5">
                        <h3 class="font-display font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                            <i data-lucide="send" class="w-5 h-5 text-purple-500"></i>Request Builder
                        </h3>
                        <div class="flex gap-3 mb-4">
                            <select id="lab-method" class="px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-bold font-mono focus:outline-none focus:ring-2 focus:ring-purple-400 text-purple-600 dark:text-purple-400">
                                <option>GET</option><option>POST</option><option>PUT</option><option>PATCH</option><option>DELETE</option>
                            </select>
                            <input id="lab-endpoint" value="/api/v1/"
                                class="flex-1 px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-400"
                                placeholder="e.g. /api/v1/products">
                            <button onclick="DevLab.fire()"
                                class="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl shadow-lg shadow-purple-500/20 hover:scale-105 transition-transform flex items-center gap-2 text-sm">
                                <i data-lucide="zap" class="w-4 h-4"></i>Fire
                            </button>
                        </div>

                        <!-- Headers -->
                        <div class="mb-3">
                            <div class="flex items-center justify-between mb-1.5">
                                <span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Custom Headers (optional)</span>
                                <button onclick="DevLab.addHeader()"
                                    class="text-xs text-purple-500 hover:text-purple-600 font-semibold">+ Add header</button>
                            </div>
                            <div id="lab-headers" class="space-y-2">
                                <div class="flex gap-2 lab-header-row">
                                    <input placeholder="Authorization" class="lab-hkey flex-1 px-2 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-mono focus:outline-none">
                                    <input placeholder="Bearer …" class="lab-hval flex-1 px-2 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-mono focus:outline-none">
                                    <button onclick="this.closest('.lab-header-row').remove()" class="text-slate-400 hover:text-red-500 px-1">✕</button>
                                </div>
                            </div>
                        </div>

                        <!-- Body -->
                        <div>
                            <div class="flex items-center justify-between mb-1.5">
                                <span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Request Body (JSON)</span>
                                <button onclick="DevLab.formatBody()"
                                    class="text-xs text-purple-500 hover:text-purple-600 font-semibold">Format JSON</button>
                            </div>
                            <textarea id="lab-body" rows="6"
                                class="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-purple-400 resize-y"
                                placeholder="Leave empty for GET requests. JSON will be auto-formatted."></textarea>
                        </div>
                    </div>

                    <!-- Response panel -->
                    <div class="bg-white dark:bg-slate-800 rounded-3xl border border-amber-100 dark:border-slate-700 shadow-sm p-5">
                        <div class="flex items-center justify-between mb-4">
                            <h3 class="font-display font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <i data-lucide="server" class="w-5 h-5 text-emerald-500"></i>Response
                            </h3>
                            <div id="lab-response-meta" class="flex items-center gap-3 text-sm font-mono"></div>
                        </div>
                        <div id="lab-response" class="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 min-h-[120px] font-mono text-xs text-slate-500 dark:text-slate-400 overflow-auto" style="max-height:300px;">
                            Hit <strong>Fire</strong> to send a request.
                        </div>
                    </div>

                    <!-- History -->
                    <div class="bg-white dark:bg-slate-800 rounded-3xl border border-amber-100 dark:border-slate-700 shadow-sm p-5">
                        <div class="flex items-center justify-between mb-3">
                            <h3 class="font-bold text-slate-700 dark:text-slate-300 text-sm flex items-center gap-2">
                                <i data-lucide="history" class="w-4 h-4 text-slate-400"></i>Lab History
                            </h3>
                            <button onclick="DevLab.clearHistory()" class="text-xs text-slate-400 hover:text-red-500">Clear</button>
                        </div>
                        <div id="lab-history" class="space-y-1.5 max-h-48 overflow-y-auto">
                            <div class="text-xs text-slate-400 dark:text-slate-500 text-center py-3">No history yet.</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    }

    function renderEndpointList(endpoints, categories, methodColors, filter='') {
        return categories.map(cat => {
            const catEps = endpoints.filter(e => e.category === cat &&
                (!filter || e.path.toLowerCase().includes(filter) || e.description.toLowerCase().includes(filter) || e.method.toLowerCase().includes(filter)));
            if (catEps.length === 0) return '';
            return `<div class="border-b border-slate-100 dark:border-slate-700 last:border-0">
                <div class="px-4 py-2 bg-slate-50 dark:bg-slate-700/50 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">${cat}</div>
                ${catEps.map(ep => `
                <div onclick="DevLab.selectEndpoint('${ep.method}','${ep.path}','${encodeURIComponent(JSON.stringify(ep.body||null))}','${encodeURIComponent(JSON.stringify(ep.query||null))}')"
                    class="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-purple-50 dark:hover:bg-slate-700 transition-colors border-b border-slate-50 dark:border-slate-700/50 last:border-0">
                    <span class="px-1.5 py-0.5 rounded text-[10px] font-bold flex-shrink-0 ${methodColors[ep.method]||'bg-slate-100 text-slate-600'}">${ep.method}</span>
                    <div class="min-w-0">
                        <p class="text-xs font-mono text-slate-700 dark:text-slate-300 truncate" title="${ep.path}">${ep.path}</p>
                        <p class="text-[10px] text-slate-400 dark:text-slate-500 truncate">${ep.description}</p>
                    </div>
                </div>`).join('')}
            </div>`;
        }).join('');
    }

    function init() {
        renderHistory();
    }

    function filterEndpoints(val) {
        const filter = val.toLowerCase();
        const endpoints = getAllEndpoints();
        const categories = [...new Set(endpoints.map(e => e.category))];
        const methodColors = { GET:'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
            POST:'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
            PUT:'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
            PATCH:'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
            DELETE:'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' };
        const list = document.getElementById('lab-endpoint-list');
        if (list) list.innerHTML = renderEndpointList(endpoints, categories, methodColors, filter);
    }

    function selectEndpoint(method, path, bodyEnc, queryEnc) {
        const body = JSON.parse(decodeURIComponent(bodyEnc));
        const query = JSON.parse(decodeURIComponent(queryEnc));
        document.getElementById('lab-method').value = method;
        let fullPath = path;
        if (query) {
            const qStr = Object.entries(query).map(([k,v])=>`${k}=${v}`).join('&');
            fullPath += '?' + qStr;
        }
        document.getElementById('lab-endpoint').value = fullPath;
        document.getElementById('lab-body').value = body ? JSON.stringify(body, null, 2) : '';
        document.getElementById('lab-response').innerHTML = 'Endpoint loaded — hit <strong>Fire</strong> to send.';
        document.getElementById('lab-response-meta').innerHTML = '';
    }

    function addHeader() {
        const container = document.getElementById('lab-headers');
        const row = document.createElement('div');
        row.className = 'flex gap-2 lab-header-row';
        row.innerHTML = `
            <input placeholder="Header name" class="lab-hkey flex-1 px-2 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-mono focus:outline-none">
            <input placeholder="Value" class="lab-hval flex-1 px-2 py-1.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-mono focus:outline-none">
            <button onclick="this.closest('.lab-header-row').remove()" class="text-slate-400 hover:text-red-500 px-1">✕</button>`;
        container.appendChild(row);
    }

    function formatBody() {
        const ta = document.getElementById('lab-body');
        try { ta.value = JSON.stringify(JSON.parse(ta.value), null, 2); }
        catch { /* not valid json, leave it */ }
    }

    async function fire() {
        const method   = document.getElementById('lab-method').value;
        const endpoint = document.getElementById('lab-endpoint').value.trim();
        const rawBody  = document.getElementById('lab-body').value.trim();
        const resEl    = document.getElementById('lab-response');
        const metaEl   = document.getElementById('lab-response-meta');
        if (!endpoint) return;

        // Custom headers
        const extraHeaders = {};
        document.querySelectorAll('.lab-header-row').forEach(row => {
            const k = row.querySelector('.lab-hkey').value.trim();
            const v = row.querySelector('.lab-hval').value.trim();
            if (k && v) extraHeaders[k] = v;
        });

        resEl.innerHTML = `<div class="flex items-center gap-2 text-amber-500"><span class="inline-block w-4 h-4 border-2 border-amber-500/30 border-t-amber-500 rounded-full animate-spin"></span>Firing…</div>`;
        metaEl.innerHTML = '';

        const opts = { method, headers: extraHeaders };
        if (rawBody && method !== 'GET') {
            try { opts.body = JSON.stringify(JSON.parse(rawBody)); }
            catch { opts.body = rawBody; }
        }

        const t0 = performance.now();
        let status = null, ok = false, resData = null, errMsg = null;
        try {
            const result = await API.request(endpoint, opts);
            const dur = Math.round(performance.now() - t0);
            status = result.status || 200;
            ok = true;
            resData = result.data;
            const pretty = JSON.stringify(resData, null, 2);
            resEl.style.color = '';
            resEl.innerHTML = `<pre style="white-space:pre-wrap;word-break:break-all;">${escHtml(pretty)}</pre>`;
            metaEl.innerHTML = `<span class="text-emerald-600 dark:text-emerald-400 font-bold">${status}</span>
                <span class="text-slate-400">${dur}ms</span>
                <span class="text-slate-400">${Math.round(new TextEncoder().encode(pretty).length / 1024 * 100) / 100} KB</span>`;
        } catch(err) {
            const dur = Math.round(performance.now() - t0);
            errMsg = err.message;
            const classified = API.classifyError(err, null);
            resEl.innerHTML = `<div class="text-red-500 font-bold mb-2">${classified.type}: ${classified.message}</div>
                <div class="text-red-400 text-xs">${errMsg}</div>`;
            metaEl.innerHTML = `<span class="text-red-500 font-bold">ERR</span><span class="text-slate-400">${dur}ms</span>`;
            status = extractStatus(errMsg);
        }

        // Add to history
        historyLog.unshift({ ts: new Date(), method, endpoint, reqBody: rawBody, status, ok, resData, errMsg });
        if (historyLog.length > MAX_HIST) historyLog.pop();
        renderHistory();
        if (window.lucide) lucide.createIcons();
    }

    function extractStatus(msg) {
        const m = msg && msg.match(/HTTP (\d{3})/);
        return m ? parseInt(m[1]) : null;
    }

    function escHtml(s) {
        return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    function renderHistory() {
        const el = document.getElementById('lab-history');
        if (!el) return;
        if (historyLog.length === 0) {
            el.innerHTML = '<div class="text-xs text-slate-400 dark:text-slate-500 text-center py-3">No history yet.</div>';
            return;
        }
        const methodColors = { GET:'text-emerald-600 dark:text-emerald-400', POST:'text-blue-600 dark:text-blue-400',
            PUT:'text-amber-600', PATCH:'text-purple-600 dark:text-purple-400', DELETE:'text-red-600' };
        el.innerHTML = historyLog.map((h, i) => `
            <div onclick="DevLab.restoreHistory(${i})"
                class="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition-colors">
                <span class="text-[10px] font-bold font-mono ${methodColors[h.method]||'text-slate-500'}">${h.method}</span>
                <span class="text-xs font-mono text-slate-600 dark:text-slate-400 flex-1 truncate" title="${h.endpoint}">${h.endpoint}</span>
                <span class="text-[10px] font-bold ${h.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}">${h.status || 'ERR'}</span>
                <span class="text-[10px] text-slate-400">${h.ts.toTimeString().slice(0,8)}</span>
            </div>`).join('');
    }

    function restoreHistory(i) {
        const h = historyLog[i];
        if (!h) return;
        document.getElementById('lab-method').value = h.method;
        document.getElementById('lab-endpoint').value = h.endpoint;
        document.getElementById('lab-body').value = h.reqBody || '';
        if (h.resData) {
            document.getElementById('lab-response').innerHTML = `<pre style="white-space:pre-wrap;word-break:break-all;">${escHtml(JSON.stringify(h.resData, null, 2))}</pre>`;
        }
    }

    function clearHistory() {
        historyLog = [];
        renderHistory();
    }

    return { render, init, filterEndpoints, selectEndpoint, addHeader, formatBody, fire, restoreHistory, clearHistory };
})();
