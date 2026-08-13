/**
 * Accounting — Ledger, Journal Entries, P&L, GST
 * Sequence: Company → Auth → Chart of Accounts → Journal Entries → Reports
 */
const Accounting = (function () {
    'use strict';
    let activeTab = 'accounts', accounts = [];

    function render() { setTimeout(() => load(), 0); return `<div id="accContent">${UI.skeleton(3,1)}</div>`; }

    async function load() {
        try { const r = await API.get('/api/v1/accounts?page=0&size=100'); accounts = r.data.content || []; }
        catch (_) { accounts = []; }
        renderContent();
    }

    function renderContent() {
        const c = document.getElementById('accContent');
        if (!c) return;
        const tabs = ['accounts','journal','reports','gst'];
        c.innerHTML = `<div class="space-y-5">
            <div>
                <h1 class="font-display text-2xl font-bold text-slate-800 dark:text-slate-100">Accounting & Ledger</h1>
                <p class="text-sm text-slate-600 dark:text-slate-300 mt-1">Double-entry bookkeeping — chart of accounts, journal entries, financial reports</p>
            </div>
            <div class="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-4 flex gap-3">
                <i data-lucide="git-branch" class="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5"></i>
                <div class="text-sm text-indigo-700 dark:text-indigo-300">
                    <strong>Sequence:</strong> Company → Auth → <strong>Chart of Accounts</strong> → Post Journal Entries (every sale/purchase auto-posts) → View Reports
                </div>
            </div>
            <div class="flex gap-2 flex-wrap border-b border-slate-200 dark:border-slate-700">
                ${tabs.map(t => `<button onclick="Accounting.setTab('${t}')"
                    class="px-4 py-2 text-sm font-semibold rounded-t-xl transition-colors ${activeTab===t
                        ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}">
                    ${({accounts:'Accounts',journal:'Journal',reports:'Reports',gst:'GST'})[t]}
                </button>`).join('')}
            </div>
            <div id="accTabContent">${renderTab()}</div>
        </div>`;
        lucide.createIcons();
    }

    function renderTab() {
        if (activeTab==='accounts') return renderAccounts();
        if (activeTab==='journal')  return renderJournal();
        if (activeTab==='reports')  return renderReports();
        if (activeTab==='gst')      return renderGST();
        return '';
    }

    function renderAccounts() {
        const types = ['ASSET','LIABILITY','EQUITY','INCOME','EXPENSE'];
        const typeColors = {ASSET:'emerald',LIABILITY:'red',EQUITY:'violet',INCOME:'blue',EXPENSE:'orange'};
        return `<div class="space-y-4">
            <div class="flex justify-end">
                <button onclick="Accounting.openAccountForm()"
                    class="px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl font-semibold text-sm flex items-center gap-2 hover:scale-105 transition-transform">
                    <i data-lucide="plus" class="w-4 h-4"></i>New Account
                </button>
            </div>
            ${types.map(type => {
                const grp = accounts.filter(a => a.type === type);
                if (!grp.length) return '';
                const color = typeColors[type] || 'slate';
                return `<div class="bg-white dark:bg-slate-800 rounded-2xl border border-amber-100 dark:border-slate-700 overflow-hidden">
                    <div class="px-4 py-2.5 bg-${color}-50 dark:bg-${color}-900/20 border-b border-${color}-100 dark:border-${color}-800 flex items-center justify-between">
                        <span class="font-bold text-sm text-${color}-700 dark:text-${color}-300">${type}</span>
                        <span class="text-xs text-${color}-500">${grp.length} accounts</span>
                    </div>
                    <div class="divide-y divide-slate-100 dark:divide-slate-700">
                        ${grp.map(a => `<div class="flex items-center justify-between px-4 py-2.5">
                            <div class="flex items-center gap-3">
                                <span class="font-mono text-xs text-slate-400 w-16">${a.code||'—'}</span>
                                <span class="text-sm font-semibold text-slate-800 dark:text-slate-100">${a.name}</span>
                                ${a.parentId ? '<span class="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 px-2 py-0.5 rounded-full">sub</span>' : ''}
                            </div>
                            <span class="font-bold text-sm text-slate-700 dark:text-slate-200">${UI.formatCurrency(a.balance||0)}</span>
                        </div>`).join('')}
                    </div>
                </div>`;
            }).join('')}
            ${!accounts.length ? UI.emptyState('No accounts yet', 'book-open', { label: 'Create Chart of Accounts', onclick: 'Accounting.openAccountForm()' }) : ''}
        </div>`;
    }

    function renderJournal() {
        return `<div class="space-y-4">
            <div class="bg-white dark:bg-slate-800 rounded-2xl border border-amber-100 dark:border-slate-700 p-5">
                <h3 class="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <i data-lucide="file-text" class="w-5 h-5 text-indigo-500"></i>Post Journal Entry
                </h3>
                <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-300 mb-4">
                    <strong>Double-entry rule:</strong> Sum of all debits must equal sum of all credits. Every transaction affects at least 2 accounts.
                </div>
                <div class="grid grid-cols-2 gap-3 mb-4">
                    <div><label class="text-xs font-bold text-slate-600 dark:text-slate-300">Date</label>
                        <input id="je-date" type="date" value="${new Date().toISOString().slice(0,10)}"
                            class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm"></div>
                    <div><label class="text-xs font-bold text-slate-600 dark:text-slate-300">Reference</label>
                        <input id="je-ref" placeholder="e.g. INV-001"
                            class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm"></div>
                    <div class="col-span-2"><label class="text-xs font-bold text-slate-600 dark:text-slate-300">Description</label>
                        <input id="je-desc" placeholder="e.g. Sale of goods to Priya Sharma"
                            class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm"></div>
                </div>
                <div class="mb-3">
                    <div class="flex items-center justify-between mb-2">
                        <label class="text-xs font-bold text-slate-600 dark:text-slate-300">Lines (Debit / Credit)</label>
                        <button onclick="Accounting.addJELine()" class="text-xs text-indigo-500 font-semibold hover:text-indigo-600">+ Add line</button>
                    </div>
                    <div class="grid grid-cols-12 gap-1 mb-1 text-[10px] font-bold text-slate-400 uppercase px-1">
                        <span class="col-span-5">Account ID</span><span class="col-span-3">Debit ₹</span><span class="col-span-3">Credit ₹</span><span class="col-span-1"></span>
                    </div>
                    <div id="je-lines" class="space-y-2">
                        ${['',''].map((_,i) => `<div class="grid grid-cols-12 gap-1 je-line">
                            <input placeholder="Account ID" type="number" class="je-acc col-span-5 px-2 py-1.5 bg-slate-50 dark:bg-slate-700 rounded-lg text-xs border border-slate-200 dark:border-slate-600">
                            <input placeholder="0.00" type="number" step="0.01" class="je-dr col-span-3 px-2 py-1.5 bg-slate-50 dark:bg-slate-700 rounded-lg text-xs border border-slate-200 dark:border-slate-600">
                            <input placeholder="0.00" type="number" step="0.01" class="je-cr col-span-3 px-2 py-1.5 bg-slate-50 dark:bg-slate-700 rounded-lg text-xs border border-slate-200 dark:border-slate-600">
                            <button onclick="this.closest('.je-line').remove()" class="col-span-1 text-slate-300 hover:text-red-500 text-center">✕</button>
                        </div>`).join('')}
                    </div>
                </div>
                <button onclick="Accounting.postJournal()"
                    class="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-bold rounded-xl text-sm hover:scale-105 transition-transform">
                    Post Entry
                </button>
            </div>
            <!-- Recent entries -->
            <div class="bg-white dark:bg-slate-800 rounded-2xl border border-amber-100 dark:border-slate-700 p-5">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="font-bold text-slate-800 dark:text-slate-100">Recent Journal Entries</h3>
                    <button onclick="Accounting.loadJournalEntries()" class="text-xs text-indigo-500 font-semibold hover:text-indigo-600">Refresh</button>
                </div>
                <div id="je-list" class="text-sm text-slate-400 text-center py-6">Click Refresh to load entries</div>
            </div>
        </div>`;
    }

    function renderReports() {
        const today = new Date().toISOString().slice(0,10);
        const monthStart = today.slice(0,7) + '-01';
        return `<div class="space-y-4">
            <div class="bg-white dark:bg-slate-800 rounded-2xl border border-amber-100 dark:border-slate-700 p-5">
                <h3 class="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <i data-lucide="bar-chart-2" class="w-5 h-5 text-indigo-500"></i>Financial Reports
                </h3>
                <div class="grid grid-cols-2 gap-3 mb-4">
                    <div><label class="text-xs font-bold text-slate-600 dark:text-slate-300">From</label>
                        <input id="rpt-from" type="date" value="${monthStart}" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm"></div>
                    <div><label class="text-xs font-bold text-slate-600 dark:text-slate-300">To</label>
                        <input id="rpt-to" type="date" value="${today}" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm"></div>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    ${[
                        {label:'P&L Statement',icon:'trending-up',endpoint:'/api/v1/reports/profit-loss',color:'emerald'},
                        {label:'Balance Sheet',icon:'scale',endpoint:'/api/v1/reports/balance-sheet',color:'blue'},
                        {label:'Trial Balance',icon:'list-checks',endpoint:'/api/v1/reports/trial-balance',color:'violet'},
                        {label:'Cash Flow',icon:'waves',endpoint:'/api/v1/reports/cash-flow',color:'amber'},
                    ].map(r => `<button onclick="Accounting.loadReport('${r.endpoint}','${r.label}')"
                        class="flex flex-col items-center gap-2 p-4 bg-${r.color}-50 dark:bg-${r.color}-900/20 border border-${r.color}-200 dark:border-${r.color}-800 rounded-2xl hover:scale-105 transition-transform">
                        <i data-lucide="${r.icon}" class="w-6 h-6 text-${r.color}-600 dark:text-${r.color}-400"></i>
                        <span class="text-xs font-bold text-${r.color}-700 dark:text-${r.color}-300 text-center leading-tight">${r.label}</span>
                    </button>`).join('')}
                </div>
            </div>
            <div id="rpt-output" class="hidden bg-white dark:bg-slate-800 rounded-2xl border border-amber-100 dark:border-slate-700 p-5">
                <h3 id="rpt-title" class="font-bold text-slate-800 dark:text-slate-100 mb-4"></h3>
                <div id="rpt-data" class="text-sm"></div>
            </div>
        </div>`;
    }

    function renderGST() {
        const today = new Date().toISOString().slice(0,7);
        return `<div class="space-y-4">
            <div class="bg-white dark:bg-slate-800 rounded-2xl border border-amber-100 dark:border-slate-700 p-5">
                <h3 class="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <i data-lucide="file-check" class="w-5 h-5 text-indigo-500"></i>GST Returns
                </h3>
                <div class="flex gap-3 mb-4 flex-wrap">
                    <input id="gst-period" type="month" value="${today}"
                        class="px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none">
                    <select id="gst-type" class="px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none">
                        <option value="GSTR1">GSTR-1 (Outward Supplies)</option>
                        <option value="GSTR3B">GSTR-3B (Summary)</option>
                    </select>
                    <button onclick="Accounting.generateGST()" class="px-4 py-2 bg-indigo-500 text-white rounded-xl text-sm font-bold hover:bg-indigo-600 transition-colors">Generate</button>
                    <button onclick="Accounting.loadGSTStatus()" class="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors">Check Status</button>
                </div>
                <div id="gst-output" class="text-sm text-slate-400 dark:text-slate-500 text-center py-6">Select period and generate your GST return</div>
            </div>
        </div>`;
    }

    function setTab(t) {
        activeTab = t;
        document.getElementById('accTabContent').innerHTML = renderTab();
        lucide.createIcons();
    }

    function openAccountForm() {
        UI.openModal({ title: 'New GL Account', size: 'sm', content: `
            <div class="space-y-3">
                <div><label class="text-xs font-bold text-slate-600 dark:text-slate-300">Account Name *</label>
                    <input id="acc-name" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm" placeholder="e.g. Cash in Hand"></div>
                <div class="grid grid-cols-2 gap-3">
                    <div><label class="text-xs font-bold text-slate-600 dark:text-slate-300">Code</label>
                        <input id="acc-code" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm font-mono" placeholder="e.g. 1001"></div>
                    <div><label class="text-xs font-bold text-slate-600 dark:text-slate-300">Type *</label>
                        <select id="acc-type" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm">
                            <option>ASSET</option><option>LIABILITY</option><option>EQUITY</option><option>INCOME</option><option>EXPENSE</option>
                        </select></div>
                </div>
                <div><label class="text-xs font-bold text-slate-600 dark:text-slate-300">Parent Account ID (optional)</label>
                    <input id="acc-parent" type="number" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm" placeholder="Leave blank for top-level"></div>
            </div>`,
            actions: [
                { label: 'Create Account', class: 'px-4 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 text-white rounded-xl font-bold', onclick: 'Accounting.saveAccount()' },
                { label: 'Cancel', onclick: 'UI.closeAllModals()' }
            ]
        });
    }

    async function saveAccount() {
        const d = { name: document.getElementById('acc-name').value, code: document.getElementById('acc-code').value,
            type: document.getElementById('acc-type').value, parentId: parseInt(document.getElementById('acc-parent').value)||null };
        if (!d.name) { UI.toast('Account name required', 'warning'); return; }
        try { await API.post('/api/v1/accounts', d); UI.toast('Account created!', 'success'); UI.closeAllModals(); await load(); }
        catch (e) { UI.toast(e.message, 'error'); }
    }

    function addJELine() {
        const div = document.createElement('div');
        div.className = 'grid grid-cols-12 gap-1 je-line';
        div.innerHTML = `<input placeholder="Account ID" type="number" class="je-acc col-span-5 px-2 py-1.5 bg-slate-50 dark:bg-slate-700 rounded-lg text-xs border border-slate-200 dark:border-slate-600">
            <input placeholder="0.00" type="number" step="0.01" class="je-dr col-span-3 px-2 py-1.5 bg-slate-50 dark:bg-slate-700 rounded-lg text-xs border border-slate-200 dark:border-slate-600">
            <input placeholder="0.00" type="number" step="0.01" class="je-cr col-span-3 px-2 py-1.5 bg-slate-50 dark:bg-slate-700 rounded-lg text-xs border border-slate-200 dark:border-slate-600">
            <button onclick="this.closest('.je-line').remove()" class="col-span-1 text-slate-300 hover:text-red-500 text-center">✕</button>`;
        document.getElementById('je-lines').appendChild(div);
    }

    async function postJournal() {
        const lines = [...document.querySelectorAll('.je-line')].map(l => ({
            accountId: parseInt(l.querySelector('.je-acc').value),
            debit:  parseFloat(l.querySelector('.je-dr').value) || 0,
            credit: parseFloat(l.querySelector('.je-cr').value) || 0
        })).filter(l => l.accountId);
        const totalDr = lines.reduce((s,l) => s + l.debit, 0);
        const totalCr = lines.reduce((s,l) => s + l.credit, 0);
        if (Math.abs(totalDr - totalCr) > 0.01) { UI.toast(`Debits (${UI.formatCurrency(totalDr)}) ≠ Credits (${UI.formatCurrency(totalCr)}) — must balance!`, 'warning'); return; }
        const d = { date: document.getElementById('je-date').value, description: document.getElementById('je-desc').value,
            reference: document.getElementById('je-ref').value, lines };
        try { await API.post('/api/v1/journal-entries', d); UI.toast('Journal entry posted!', 'success'); loadJournalEntries(); }
        catch (e) { UI.toast(e.message, 'error'); }
    }

    async function loadJournalEntries() {
        const el = document.getElementById('je-list');
        try {
            const r = await API.get('/api/v1/journal-entries?page=0&size=20');
            const entries = r.data.content || [];
            el.innerHTML = entries.length ? `<div class="space-y-2">${entries.map(e => `
                <div class="border border-slate-100 dark:border-slate-700 rounded-xl p-3">
                    <div class="flex items-center justify-between mb-2">
                        <span class="font-bold text-sm text-slate-800 dark:text-slate-100">${e.description||'Journal Entry'}</span>
                        <span class="text-xs text-slate-500">${UI.formatDate(e.date)}</span>
                    </div>
                    <div class="grid grid-cols-3 gap-2 text-xs font-mono">
                        ${(e.lines||[]).map(l => `<div class="col-span-3 flex justify-between text-slate-600 dark:text-slate-300">
                            <span>A/c ${l.accountId}</span>
                            ${l.debit  ? `<span class="text-blue-600">Dr ${UI.formatCurrency(l.debit)}</span>`  : ''}
                            ${l.credit ? `<span class="text-rose-600">Cr ${UI.formatCurrency(l.credit)}</span>` : ''}
                        </div>`).join('')}
                    </div>
                </div>`).join('')}</div>`
                : '<p class="text-center py-4 text-slate-400">No journal entries yet</p>';
        } catch(e) { el.innerHTML = `<p class="text-center py-4 text-red-500">${e.message}</p>`; }
    }

    async function loadReport(endpoint, title) {
        const from = document.getElementById('rpt-from')?.value;
        const to   = document.getElementById('rpt-to')?.value;
        const out = document.getElementById('rpt-output');
        const titleEl = document.getElementById('rpt-title');
        const data = document.getElementById('rpt-data');
        out.classList.remove('hidden');
        titleEl.textContent = title;
        data.innerHTML = '<div class="text-center py-4 text-slate-400">Loading…</div>';
        try {
            const p = new URLSearchParams();
            if (from) p.append('fromDate', from);
            if (to)   p.append('toDate', to);
            if (endpoint.includes('balance-sheet') || endpoint.includes('trial-balance')) { p.delete('fromDate'); p.append('asOf', to); }
            const r = await API.get(`${endpoint}?${p}`);
            data.innerHTML = `<pre class="text-xs font-mono text-slate-600 dark:text-slate-300 overflow-x-auto bg-slate-50 dark:bg-slate-900 p-4 rounded-xl">${JSON.stringify(r.data, null, 2)}</pre>`;
        } catch(e) { data.innerHTML = `<p class="text-red-500">${e.message}</p>`; }
    }

    async function generateGST() {
        const period = document.getElementById('gst-period').value;
        const type   = document.getElementById('gst-type').value;
        const el = document.getElementById('gst-output');
        el.innerHTML = '<div class="text-center py-4 text-slate-400">Generating…</div>';
        try {
            await API.post('/api/v1/gst/returns/generate', { period, type });
            el.innerHTML = `<div class="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 text-emerald-700 dark:text-emerald-300 text-sm">
                <strong>${type}</strong> for period <strong>${period}</strong> generated successfully. Check your filing portal to submit.
            </div>`;
        } catch(e) { el.innerHTML = `<p class="text-red-500 text-center py-4">${e.message}</p>`; }
    }

    async function loadGSTStatus() {
        const period = document.getElementById('gst-period').value;
        const el = document.getElementById('gst-output');
        try {
            const r = await API.get(`/api/v1/gst/returns?period=${period}`);
            el.innerHTML = `<pre class="text-xs font-mono text-slate-600 dark:text-slate-300 overflow-x-auto bg-slate-50 dark:bg-slate-900 p-4 rounded-xl">${JSON.stringify(r.data, null, 2)}</pre>`;
        } catch(e) { el.innerHTML = `<p class="text-red-500 text-center py-4">${e.message}</p>`; }
    }

    return { render, setTab, openAccountForm, saveAccount, addJELine, postJournal, loadJournalEntries, loadReport, generateGST, loadGSTStatus };
})();
