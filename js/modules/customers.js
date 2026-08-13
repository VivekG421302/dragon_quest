/**
 * Customers — CRM module
 * Sequence: Company → Auth → Customers
 */
const Customers = (function () {
    'use strict';
    let customers = [], currentPage = 0, totalPages = 0, search = '', segment = '';

    function render() {
        setTimeout(async () => { await load(); }, 0);
        return `<div id="customersContent">${UI.skeleton(4, 1)}</div>`;
    }

    async function load(page = 0) {
        try {
            const p = new URLSearchParams({ page, size: 15, sort: 'name,asc' });
            if (search) p.append('search', search);
            if (segment) p.append('segment', segment);
            const r = await API.get(`/api/v1/customers?${p}`);
            customers = r.data.content || [];
            currentPage = r.data.number || 0;
            totalPages = r.data.totalPages || 0;
        } catch (_) { customers = []; }
        renderContent();
    }

    function renderContent() {
        const c = document.getElementById('customersContent');
        if (!c) return;
        c.innerHTML = `
        <div class="space-y-5">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 class="font-display text-2xl font-bold text-slate-800 dark:text-slate-100">Customers</h1>
                    <p class="text-sm text-slate-600 dark:text-slate-300 mt-1">CRM — manage customer relationships, segments and credit</p>
                </div>
                <button onclick="Customers.openForm()"
                    class="px-4 py-2.5 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-semibold text-sm shadow-lg hover:scale-105 transition-all flex items-center gap-2">
                    <i data-lucide="user-plus" class="w-4 h-4"></i>New Customer
                </button>
            </div>

            <!-- Sequence info -->
            <div class="bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 rounded-2xl p-4 flex gap-3">
                <i data-lucide="info" class="w-5 h-5 text-sky-600 dark:text-sky-400 flex-shrink-0 mt-0.5"></i>
                <div class="text-sm text-sky-700 dark:text-sky-300">
                    <strong>Sequence:</strong> Company Setup → Auth login → <strong>Customers</strong>.
                    Customers belong to an org — ensure you are authenticated before creating records.
                </div>
            </div>

            <!-- Filters -->
            <div class="flex flex-col sm:flex-row gap-3 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-amber-100 dark:border-slate-700">
                <div class="relative flex-1">
                    <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"></i>
                    <input value="${search}" oninput="Customers.setSearch(this.value)"
                        class="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
                        placeholder="Search name, email, phone…">
                </div>
                <select onchange="Customers.setSegment(this.value)"
                    class="px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none">
                    <option value="">All Segments</option>
                    <option value="REGULAR" ${segment==='REGULAR'?'selected':''}>Regular</option>
                    <option value="VIP" ${segment==='VIP'?'selected':''}>VIP</option>
                    <option value="WHOLESALE" ${segment==='WHOLESALE'?'selected':''}>Wholesale</option>
                </select>
            </div>

            <!-- Table -->
            ${customers.length === 0 ? UI.emptyState('No customers yet', 'users', { label: 'Add First Customer', onclick: 'Customers.openForm()' }) : `
            <div class="bg-white dark:bg-slate-800 rounded-2xl border border-amber-100 dark:border-slate-700 overflow-hidden shadow-sm">
                <div class="overflow-x-auto">
                    <table class="w-full story-table">
                        <thead><tr>
                            <th class="px-4 py-3 text-left text-xs">Customer</th>
                            <th class="px-4 py-3 text-left text-xs">Contact</th>
                            <th class="px-4 py-3 text-left text-xs">Segment</th>
                            <th class="px-4 py-3 text-right text-xs">Total Purchases</th>
                            <th class="px-4 py-3 text-right text-xs">Credit Limit</th>
                            <th class="px-4 py-3 text-right text-xs">Actions</th>
                        </tr></thead>
                        <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
                            ${customers.map(cu => `<tr class="group">
                                <td class="px-4 py-3">
                                    <div class="flex items-center gap-3">
                                        <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                            ${(cu.name||'?')[0].toUpperCase()}
                                        </div>
                                        <div>
                                            <p class="font-semibold text-sm text-slate-800 dark:text-slate-100">${cu.name}</p>
                                            <p class="text-xs text-slate-500 dark:text-slate-400">${cu.gstIn||'No GST'}</p>
                                        </div>
                                    </div>
                                </td>
                                <td class="px-4 py-3">
                                    <p class="text-sm text-slate-700 dark:text-slate-200">${cu.email||'—'}</p>
                                    <p class="text-xs text-slate-500 dark:text-slate-400">${cu.phone||'—'}</p>
                                </td>
                                <td class="px-4 py-3">
                                    <span class="px-2 py-1 rounded-full text-xs font-bold
                                        ${cu.segment==='VIP'?'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300':
                                          cu.segment==='WHOLESALE'?'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300':
                                          'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}">
                                        ${cu.segment||'REGULAR'}
                                    </span>
                                </td>
                                <td class="px-4 py-3 text-right font-semibold text-sm text-slate-800 dark:text-slate-100">${UI.formatCurrency(cu.totalPurchases||0)}</td>
                                <td class="px-4 py-3 text-right text-sm text-slate-600 dark:text-slate-300">${UI.formatCurrency(cu.creditLimit||0)}</td>
                                <td class="px-4 py-3 text-right">
                                    <div class="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onclick="Customers.viewLedger(${cu.id})" class="p-1.5 rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100" title="View ledger"><i data-lucide="book-open" class="w-4 h-4"></i></button>
                                        <button onclick="Customers.openForm(${cu.id})" class="p-1.5 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100" title="Edit"><i data-lucide="pencil" class="w-4 h-4"></i></button>
                                        <button onclick="Customers.delete(${cu.id},'${cu.name}')" class="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100" title="Delete"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                                    </div>
                                </td>
                            </tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            ${UI.pagination(currentPage + 1, totalPages, 'Customers.goToPage')}`}
        </div>`;
        lucide.createIcons();
    }

    function openForm(id) {
        const cu = id ? customers.find(c => c.id === id) : null;
        UI.openModal({
            title: cu ? 'Edit Customer' : 'New Customer',
            size: 'md',
            content: `<form id="customerForm" class="space-y-4">
                <div class="grid grid-cols-2 gap-3">
                    <div class="col-span-2">
                        <label class="text-xs font-bold text-slate-600 dark:text-slate-300">Name *</label>
                        <input name="name" value="${cu?.name||''}" required class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm">
                    </div>
                    <div>
                        <label class="text-xs font-bold text-slate-600 dark:text-slate-300">Email</label>
                        <input name="email" type="email" value="${cu?.email||''}" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm">
                    </div>
                    <div>
                        <label class="text-xs font-bold text-slate-600 dark:text-slate-300">Phone</label>
                        <input name="phone" value="${cu?.phone||''}" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm">
                    </div>
                    <div>
                        <label class="text-xs font-bold text-slate-600 dark:text-slate-300">GSTIN</label>
                        <input name="gstIn" value="${cu?.gstIn||''}" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm">
                    </div>
                    <div>
                        <label class="text-xs font-bold text-slate-600 dark:text-slate-300">Segment</label>
                        <select name="segment" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm">
                            <option ${cu?.segment==='REGULAR'?'selected':''}>REGULAR</option>
                            <option ${cu?.segment==='VIP'?'selected':''}>VIP</option>
                            <option ${cu?.segment==='WHOLESALE'?'selected':''}>WHOLESALE</option>
                        </select>
                    </div>
                    <div>
                        <label class="text-xs font-bold text-slate-600 dark:text-slate-300">Credit Limit (₹)</label>
                        <input name="creditLimit" type="number" value="${cu?.creditLimit||0}" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm">
                    </div>
                    <div class="col-span-2">
                        <label class="text-xs font-bold text-slate-600 dark:text-slate-300">Address</label>
                        <textarea name="address" rows="2" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm">${cu?.address||''}</textarea>
                    </div>
                </div>
            </form>`,
            actions: [
                { label: cu ? 'Save Changes' : 'Create Customer', class: 'px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-xl font-bold',
                  onclick: `Customers.save(${cu?.id||'null'})` },
                { label: 'Cancel', onclick: 'UI.closeAllModals()' }
            ]
        });
    }

    async function save(id) {
        const d = UI.getFormData('customerForm');
        d.creditLimit = parseFloat(d.creditLimit) || 0;
        try {
            if (id) { await API.put(`/api/v1/customers/${id}`, d); UI.toast('Customer updated!', 'success'); }
            else { await API.post('/api/v1/customers', d); UI.toast('Customer created!', 'success'); }
            UI.closeAllModals(); await load(currentPage);
        } catch (e) { UI.toast(e.message, 'error'); }
    }

    async function delete_(id, name) {
        if (!confirm(`Delete "${name}"?`)) return;
        try { await API.del(`/api/v1/customers/${id}`); UI.toast('Deleted', 'success'); await load(currentPage); }
        catch (e) { UI.toast(e.message, 'error'); }
    }

    async function viewLedger(id) {
        try {
            const r = await API.get(`/api/v1/customers/${id}/ledger`);
            const entries = r.data.content || r.data || [];
            UI.openModal({ title: 'Customer Ledger', size: 'lg', content: `
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead><tr class="border-b border-slate-200 dark:border-slate-700">
                            <th class="px-3 py-2 text-left text-xs font-bold text-slate-500">Date</th>
                            <th class="px-3 py-2 text-left text-xs font-bold text-slate-500">Description</th>
                            <th class="px-3 py-2 text-right text-xs font-bold text-slate-500">Debit</th>
                            <th class="px-3 py-2 text-right text-xs font-bold text-slate-500">Credit</th>
                            <th class="px-3 py-2 text-right text-xs font-bold text-slate-500">Balance</th>
                        </tr></thead>
                        <tbody>${entries.length ? entries.map(e => `<tr class="border-b border-slate-100 dark:border-slate-700">
                            <td class="px-3 py-2 text-slate-600 dark:text-slate-300">${UI.formatDateTime(e.date||e.createdAt)}</td>
                            <td class="px-3 py-2 text-slate-700 dark:text-slate-200">${e.description||e.type||'—'}</td>
                            <td class="px-3 py-2 text-right text-red-600">${e.debit ? UI.formatCurrency(e.debit) : '—'}</td>
                            <td class="px-3 py-2 text-right text-emerald-600">${e.credit ? UI.formatCurrency(e.credit) : '—'}</td>
                            <td class="px-3 py-2 text-right font-semibold text-slate-800 dark:text-slate-100">${UI.formatCurrency(e.balance||0)}</td>
                        </tr>`).join('') : '<tr><td colspan="5" class="text-center py-6 text-slate-400">No ledger entries</td></tr>'}</tbody>
                    </table>
                </div>`, actions: [{ label: 'Close', onclick: 'UI.closeAllModals()' }] });
        } catch (e) { UI.toast(e.message, 'error'); }
    }

    const setSearch = UI.debounce(v => { search = v; currentPage = 0; load(0); }, 400);
    function setSegment(v) { segment = v; currentPage = 0; load(0); }
    function goToPage(p) { currentPage = p - 1; load(currentPage); }

    return { render, openForm, save, delete: delete_, viewLedger, setSearch, setSegment, goToPage };
})();
