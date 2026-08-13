/**
 * Banking & Payments
 * Sequence: Company → Accounting (accounts) → Bank Accounts → Transactions → Reconcile
 */
const Banking = (function () {
    'use strict';
    let activeTab = 'accounts', bankAccounts = [];

    function render() { setTimeout(() => load(), 0); return `<div id="bankContent">${UI.skeleton(2,1)}</div>`; }

    async function load() {
        try { const r = await API.get('/api/v1/bank-accounts'); bankAccounts = r.data.content || r.data || []; }
        catch (_) { bankAccounts = []; }
        renderContent();
    }

    function renderContent() {
        const c = document.getElementById('bankContent');
        if (!c) return;
        c.innerHTML = `<div class="space-y-5">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 class="font-display text-2xl font-bold text-slate-800 dark:text-slate-100">Banking & Payments</h1>
                    <p class="text-sm text-slate-600 dark:text-slate-300 mt-1">Bank accounts, transactions, reconciliation and payment records</p>
                </div>
                <button onclick="Banking.openAccountForm()"
                    class="px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-xl font-semibold text-sm shadow-lg hover:scale-105 transition-all flex items-center gap-2">
                    <i data-lucide="plus" class="w-4 h-4"></i>Link Bank Account
                </button>
            </div>
            <div class="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-2xl p-4 flex gap-3">
                <i data-lucide="git-branch" class="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5"></i>
                <div class="text-sm text-teal-700 dark:text-teal-300">
                    <strong>Sequence:</strong> Company → <strong>Link Bank Account</strong> → Record Transactions → Monthly Reconciliation → Payments in/out
                </div>
            </div>
            <div class="flex gap-2 border-b border-slate-200 dark:border-slate-700">
                ${['accounts','transactions','payments'].map(t => `<button onclick="Banking.setTab('${t}')"
                    class="px-4 py-2 text-sm font-semibold rounded-t-xl transition-colors ${activeTab===t
                        ? 'bg-gradient-to-r from-teal-500 to-emerald-600 text-white'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}">
                    ${t.charAt(0).toUpperCase()+t.slice(1)}
                </button>`).join('')}
            </div>
            <div id="bankTabContent">${renderTab()}</div>
        </div>`;
        lucide.createIcons();
    }

    function renderTab() {
        if (activeTab==='accounts')     return renderAccounts();
        if (activeTab==='transactions') return renderTransactions();
        if (activeTab==='payments')     return renderPayments();
        return '';
    }

    function renderAccounts() {
        if (!bankAccounts.length) return UI.emptyState('No bank accounts linked', 'landmark', { label: 'Link First Account', onclick: 'Banking.openAccountForm()' });
        const typeColors = { CURRENT:'blue', SAVINGS:'emerald' };
        return `<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            ${bankAccounts.map(a => {
                const col = typeColors[a.accountType] || 'slate';
                return `<div class="bg-white dark:bg-slate-800 rounded-2xl border border-amber-100 dark:border-slate-700 p-5 hover:shadow-md transition-shadow">
                    <div class="flex items-start justify-between mb-4">
                        <div class="flex items-center gap-3">
                            <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-emerald-500 flex items-center justify-center">
                                <i data-lucide="landmark" class="w-6 h-6 text-white"></i>
                            </div>
                            <div>
                                <p class="font-bold text-slate-800 dark:text-slate-100">${a.bankName}</p>
                                <p class="text-xs font-mono text-slate-500">••••${(a.accountNumber||'').slice(-4)}</p>
                            </div>
                        </div>
                        <span class="px-2 py-0.5 rounded-full text-xs font-bold bg-${col}-100 text-${col}-700 dark:bg-${col}-900/30 dark:text-${col}-300">${a.accountType}</span>
                    </div>
                    <div class="flex items-end justify-between">
                        <div>
                            <p class="text-xs text-slate-500 mb-0.5">Balance</p>
                            <p class="font-bold text-2xl text-slate-800 dark:text-slate-100">${UI.formatCurrency(a.balance||0)}</p>
                        </div>
                        <div class="flex gap-2">
                            <button onclick="Banking.openTxnForm(${a.id})" class="px-3 py-1.5 text-xs font-bold bg-teal-50 text-teal-600 hover:bg-teal-100 rounded-xl transition-colors">+ Txn</button>
                            <button onclick="Banking.viewTransactions(${a.id})" class="px-3 py-1.5 text-xs font-bold bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 rounded-xl transition-colors">History</button>
                        </div>
                    </div>
                    <p class="text-xs font-mono text-slate-400 mt-2">IFSC: ${a.ifsc||'—'}</p>
                </div>`;
            }).join('')}
        </div>`;
    }

    function renderTransactions() {
        return `<div class="bg-white dark:bg-slate-800 rounded-2xl border border-amber-100 dark:border-slate-700 p-5 space-y-4">
            <div class="flex gap-3 flex-wrap">
                <select id="txn-acc" class="px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none">
                    <option value="">Select bank account</option>
                    ${bankAccounts.map(a => `<option value="${a.id}">${a.bankName} ••••${(a.accountNumber||'').slice(-4)}</option>`).join('')}
                </select>
                <input type="month" id="txn-month" value="${new Date().toISOString().slice(0,7)}"
                    class="px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none">
                <button onclick="Banking.loadTransactions()" class="px-4 py-2 bg-teal-500 text-white rounded-xl text-sm font-bold hover:bg-teal-600 transition-colors">Load</button>
            </div>
            <div id="txn-list" class="text-sm text-slate-400 text-center py-8">Select an account and click Load</div>
        </div>`;
    }

    function renderPayments() {
        return `<div class="space-y-4">
            <div class="bg-white dark:bg-slate-800 rounded-2xl border border-amber-100 dark:border-slate-700 p-5">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="font-bold text-slate-800 dark:text-slate-100">Record Payment</h3>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div><label class="text-xs font-bold text-slate-600 dark:text-slate-300">Type</label>
                        <select id="pay-type" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm">
                            <option>INWARD</option><option>OUTWARD</option>
                        </select></div>
                    <div><label class="text-xs font-bold text-slate-600 dark:text-slate-300">Amount ₹</label>
                        <input id="pay-amount" type="number" step="0.01" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm"></div>
                    <div><label class="text-xs font-bold text-slate-600 dark:text-slate-300">Mode</label>
                        <select id="pay-mode" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm">
                            <option>CASH</option><option>UPI</option><option>NEFT</option><option>RTGS</option><option>CHEQUE</option><option>CARD</option>
                        </select></div>
                    <div><label class="text-xs font-bold text-slate-600 dark:text-slate-300">Date</label>
                        <input id="pay-date" type="date" value="${new Date().toISOString().slice(0,10)}" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm"></div>
                    <div><label class="text-xs font-bold text-slate-600 dark:text-slate-300">Entity Type</label>
                        <select id="pay-entity-type" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm">
                            <option>CUSTOMER</option><option>SUPPLIER</option>
                        </select></div>
                    <div><label class="text-xs font-bold text-slate-600 dark:text-slate-300">Entity ID</label>
                        <input id="pay-entity-id" type="number" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm" placeholder="Customer / Supplier ID"></div>
                    <div class="col-span-2"><label class="text-xs font-bold text-slate-600 dark:text-slate-300">Reference (UTR / Cheque #)</label>
                        <input id="pay-ref" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm" placeholder="e.g. UTR123456789"></div>
                </div>
                <button onclick="Banking.recordPayment()"
                    class="mt-4 px-5 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-bold rounded-xl text-sm hover:scale-105 transition-transform">
                    Record Payment
                </button>
            </div>
            <div class="bg-white dark:bg-slate-800 rounded-2xl border border-amber-100 dark:border-slate-700 p-5">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="font-bold text-slate-800 dark:text-slate-100">Recent Payments</h3>
                    <button onclick="Banking.loadPayments()" class="text-xs text-teal-500 font-semibold hover:text-teal-600">Refresh</button>
                </div>
                <div id="pay-list" class="text-sm text-slate-400 text-center py-6">Click Refresh to load</div>
            </div>
        </div>`;
    }

    function setTab(t) { activeTab = t; document.getElementById('bankTabContent').innerHTML = renderTab(); lucide.createIcons(); }

    function openAccountForm() {
        UI.openModal({ title: 'Link Bank Account', size: 'sm', content: `
            <div class="space-y-3">
                <div><label class="text-xs font-bold text-slate-600 dark:text-slate-300">Bank Name *</label>
                    <input id="ba-bank" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm" placeholder="e.g. HDFC Bank"></div>
                <div class="grid grid-cols-2 gap-3">
                    <div><label class="text-xs font-bold text-slate-600 dark:text-slate-300">Account Number *</label>
                        <input id="ba-acc" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm font-mono"></div>
                    <div><label class="text-xs font-bold text-slate-600 dark:text-slate-300">IFSC *</label>
                        <input id="ba-ifsc" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm font-mono" placeholder="HDFC0001234"></div>
                    <div><label class="text-xs font-bold text-slate-600 dark:text-slate-300">Account Type</label>
                        <select id="ba-type" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm"><option>CURRENT</option><option>SAVINGS</option></select></div>
                    <div><label class="text-xs font-bold text-slate-600 dark:text-slate-300">Opening Balance ₹</label>
                        <input id="ba-balance" type="number" step="0.01" value="0" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm"></div>
                </div>
            </div>`,
            actions: [
                { label: 'Link Account', class: 'px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-xl font-bold', onclick: 'Banking.saveAccount()' },
                { label: 'Cancel', onclick: 'UI.closeAllModals()' }
            ]
        });
    }

    async function saveAccount() {
        const d = { bankName: document.getElementById('ba-bank').value, accountNumber: document.getElementById('ba-acc').value,
            ifsc: document.getElementById('ba-ifsc').value, accountType: document.getElementById('ba-type').value,
            openingBalance: parseFloat(document.getElementById('ba-balance').value)||0 };
        if (!d.bankName || !d.accountNumber) { UI.toast('Bank name and account number required', 'warning'); return; }
        try { await API.post('/api/v1/bank-accounts', d); UI.toast('Account linked!', 'success'); UI.closeAllModals(); await load(); }
        catch (e) { UI.toast(e.message, 'error'); }
    }

    function openTxnForm(accountId) {
        UI.openModal({ title: 'Record Transaction', size: 'sm', content: `
            <div class="space-y-3">
                <div class="grid grid-cols-2 gap-3">
                    <div><label class="text-xs font-bold text-slate-600 dark:text-slate-300">Type</label>
                        <select id="t-type" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm"><option>CREDIT</option><option>DEBIT</option></select></div>
                    <div><label class="text-xs font-bold text-slate-600 dark:text-slate-300">Amount ₹</label>
                        <input id="t-amount" type="number" step="0.01" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm"></div>
                </div>
                <div><label class="text-xs font-bold text-slate-600 dark:text-slate-300">Description</label>
                    <input id="t-desc" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm"></div>
                <div class="grid grid-cols-2 gap-3">
                    <div><label class="text-xs font-bold text-slate-600 dark:text-slate-300">Date</label>
                        <input id="t-date" type="date" value="${new Date().toISOString().slice(0,10)}" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm"></div>
                    <div><label class="text-xs font-bold text-slate-600 dark:text-slate-300">Reference</label>
                        <input id="t-ref" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm"></div>
                </div>
            </div>`,
            actions: [
                { label: 'Record', class: 'px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-xl font-bold', onclick: `Banking.saveTxn(${accountId})` },
                { label: 'Cancel', onclick: 'UI.closeAllModals()' }
            ]
        });
    }

    async function saveTxn(accountId) {
        const d = { type: document.getElementById('t-type').value, amount: parseFloat(document.getElementById('t-amount').value)||0,
            description: document.getElementById('t-desc').value, date: document.getElementById('t-date').value,
            reference: document.getElementById('t-ref').value };
        try { await API.post(`/api/v1/bank-accounts/${accountId}/transactions`, d); UI.toast('Transaction recorded!', 'success'); UI.closeAllModals(); await load(); }
        catch (e) { UI.toast(e.message, 'error'); }
    }

    async function viewTransactions(accountId) { activeTab = 'transactions'; renderContent(); setTimeout(() => { document.getElementById('txn-acc').value = accountId; loadTransactions(); }, 100); }

    async function loadTransactions() {
        const accId = document.getElementById('txn-acc').value;
        const month = document.getElementById('txn-month').value;
        const el = document.getElementById('txn-list');
        if (!accId) { UI.toast('Select a bank account', 'warning'); return; }
        try {
            const r = await API.get(`/api/v1/bank-accounts/${accId}/transactions?page=0&size=50`);
            const txns = r.data.content || [];
            el.innerHTML = txns.length ? `<div class="space-y-2">${txns.map(t => `
                <div class="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-xl">
                    <div>
                        <p class="font-semibold text-sm text-slate-800 dark:text-slate-100">${t.description||'—'}</p>
                        <p class="text-xs text-slate-500">${UI.formatDateTime(t.date||t.createdAt)} · ${t.reference||'No ref'}</p>
                    </div>
                    <span class="font-bold text-sm ${t.type==='CREDIT'?'text-emerald-600':'text-red-500'}">
                        ${t.type==='CREDIT'?'+':'−'}${UI.formatCurrency(t.amount||0)}
                    </span>
                </div>`).join('')}</div>` : '<p class="text-center py-4 text-slate-400">No transactions found</p>';
        } catch(e) { el.innerHTML = `<p class="text-center py-4 text-red-500">${e.message}</p>`; }
    }

    async function recordPayment() {
        const d = { type: document.getElementById('pay-type').value, amount: parseFloat(document.getElementById('pay-amount').value)||0,
            mode: document.getElementById('pay-mode').value, date: document.getElementById('pay-date').value,
            entityType: document.getElementById('pay-entity-type').value, entityId: parseInt(document.getElementById('pay-entity-id').value)||null,
            reference: document.getElementById('pay-ref').value };
        try { await API.post('/api/v1/payments', d); UI.toast('Payment recorded!', 'success'); }
        catch (e) { UI.toast(e.message, 'error'); }
    }

    async function loadPayments() {
        const el = document.getElementById('pay-list');
        try {
            const r = await API.get('/api/v1/payments?page=0&size=20');
            const pays = r.data.content || [];
            el.innerHTML = pays.length ? `<div class="space-y-2">${pays.map(p => `
                <div class="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-xl">
                    <div class="flex items-center gap-3">
                        <span class="px-2 py-0.5 rounded-full text-xs font-bold ${p.type==='INWARD'?'bg-emerald-100 text-emerald-700':'bg-red-100 text-red-600'}">${p.type}</span>
                        <div>
                            <p class="font-semibold text-sm text-slate-800 dark:text-slate-100">${p.mode} · ${p.reference||'—'}</p>
                            <p class="text-xs text-slate-500">${p.entityType} #${p.entityId||'—'} · ${UI.formatDate(p.date)}</p>
                        </div>
                    </div>
                    <span class="font-bold text-sm ${p.type==='INWARD'?'text-emerald-600':'text-red-500'}">${UI.formatCurrency(p.amount||0)}</span>
                </div>`).join('')}</div>` : '<p class="text-center py-4 text-slate-400">No payments recorded</p>';
        } catch(e) { el.innerHTML = `<p class="text-center py-4 text-red-500">${e.message}</p>`; }
    }

    return { render, setTab, openAccountForm, saveAccount, openTxnForm, saveTxn, viewTransactions, loadTransactions, recordPayment, loadPayments };
})();
