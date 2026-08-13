/**
 * Purchase Orders — Procurement module
 * Sequence: Company → Suppliers (create first) → Purchase Orders
 */
const Purchase = (function () {
    'use strict';
    let orders = [], currentPage = 0, totalPages = 0, statusFilter = '';

    function render() {
        setTimeout(async () => { await load(); }, 0);
        return `<div id="purchaseContent">${UI.skeleton(3, 1)}</div>`;
    }

    async function load(page = 0) {
        try {
            const p = new URLSearchParams({ page, size: 15, sort: 'createdAt,desc' });
            if (statusFilter) p.append('status', statusFilter);
            const r = await API.get(`/api/v1/purchase-orders?${p}`);
            orders = r.data.content || [];
            currentPage = r.data.number || 0;
            totalPages = r.data.totalPages || 0;
        } catch (_) { orders = []; }
        renderContent();
    }

    function renderContent() {
        const c = document.getElementById('purchaseContent');
        if (!c) return;

        const statusBadge = (s) => ({
            DRAFT:     'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
            SENT:      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
            RECEIVED:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
            CANCELLED: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300'
        }[s] || 'bg-slate-100 text-slate-600');

        c.innerHTML = `<div class="space-y-5">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 class="font-display text-2xl font-bold text-slate-800 dark:text-slate-100">Purchase Orders</h1>
                    <p class="text-sm text-slate-600 dark:text-slate-300 mt-1">Procurement — raise POs, receive goods, track spend</p>
                </div>
                <button onclick="Purchase.openForm()"
                    class="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-semibold text-sm shadow-lg hover:scale-105 transition-all flex items-center gap-2">
                    <i data-lucide="plus" class="w-4 h-4"></i>New PO
                </button>
            </div>

            <!-- Sequence banner -->
            <div class="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-2xl p-4 flex gap-3">
                <i data-lucide="git-branch" class="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5"></i>
                <div class="text-sm text-orange-700 dark:text-orange-300">
                    <strong>Sequence:</strong>
                    <span class="inline-flex items-center gap-1 ml-1">
                        <button onclick="App.navigateTo('company')" class="underline hover:no-underline">Company</button> →
                        <button onclick="App.navigateTo('suppliers')" class="underline hover:no-underline">Suppliers</button> →
                        <button onclick="App.navigateTo('products')" class="underline hover:no-underline">Products</button> →
                        <strong>Purchase Orders</strong> → Receive goods (auto-updates stock)
                    </span>
                </div>
            </div>

            <!-- Status filter tabs -->
            <div class="flex gap-2 flex-wrap">
                ${['', 'DRAFT', 'SENT', 'RECEIVED', 'CANCELLED'].map(s => `
                <button onclick="Purchase.setStatus('${s}')"
                    class="px-4 py-1.5 rounded-xl text-sm font-semibold transition-colors ${statusFilter===s
                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-orange-300'}">
                    ${s || 'All'}
                </button>`).join('')}
            </div>

            ${orders.length === 0 ? UI.emptyState('No purchase orders', 'shopping-cart', { label: 'Create First PO', onclick: 'Purchase.openForm()' }) : `
            <div class="space-y-3">
                ${orders.map(o => `
                <div class="bg-white dark:bg-slate-800 rounded-2xl border border-amber-100 dark:border-slate-700 p-4 hover:shadow-md transition-shadow">
                    <div class="flex items-start justify-between gap-4">
                        <div class="flex items-center gap-3 flex-1 min-w-0">
                            <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-amber-400 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">PO</div>
                            <div class="min-w-0">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <p class="font-bold text-slate-800 dark:text-slate-100">PO-${String(o.id).padStart(5,'0')}</p>
                                    <span class="px-2 py-0.5 rounded-full text-xs font-bold ${statusBadge(o.status)}">${o.status}</span>
                                </div>
                                <p class="text-sm text-slate-600 dark:text-slate-300 mt-0.5">Supplier: ${o.supplierName||o.supplierId||'—'}</p>
                                <p class="text-xs text-slate-500 dark:text-slate-400">Expected: ${o.expectedDate ? UI.formatDate(o.expectedDate) : '—'} · ${o.items?.length||0} items</p>
                            </div>
                        </div>
                        <div class="text-right flex-shrink-0">
                            <p class="font-bold text-lg text-slate-800 dark:text-slate-100">${UI.formatCurrency(o.totalAmount||0)}</p>
                            <p class="text-xs text-slate-500 mt-0.5">${UI.formatDateTime(o.createdAt)}</p>
                        </div>
                    </div>
                    <div class="flex gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                        ${o.status==='DRAFT' ? `<button onclick="Purchase.send(${o.id})" class="px-3 py-1.5 text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors flex items-center gap-1"><i data-lucide="send" class="w-3 h-3"></i>Send to Supplier</button>` : ''}
                        ${o.status==='SENT' ? `<button onclick="Purchase.openReceive(${o.id})" class="px-3 py-1.5 text-xs font-bold bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors flex items-center gap-1"><i data-lucide="package-check" class="w-3 h-3"></i>Receive Goods</button>` : ''}
                        ${['DRAFT','SENT'].includes(o.status) ? `<button onclick="Purchase.cancel(${o.id})" class="px-3 py-1.5 text-xs font-bold bg-red-50 text-red-500 hover:bg-red-100 rounded-lg transition-colors">Cancel</button>` : ''}
                    </div>
                </div>`).join('')}
            </div>
            ${UI.pagination(currentPage + 1, totalPages, 'Purchase.goToPage')}`}
        </div>`;
        lucide.createIcons();
    }

    function openForm() {
        UI.openModal({ title: 'New Purchase Order', size: 'lg', content: `
            <div class="space-y-4">
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="text-xs font-bold text-slate-600 dark:text-slate-300">Supplier ID *</label>
                        <input id="po-supplierId" type="number" placeholder="e.g. 1" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm">
                    </div>
                    <div>
                        <label class="text-xs font-bold text-slate-600 dark:text-slate-300">Expected Delivery</label>
                        <input id="po-expectedDate" type="date" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm">
                    </div>
                </div>
                <div>
                    <label class="text-xs font-bold text-slate-600 dark:text-slate-300">Notes</label>
                    <textarea id="po-notes" rows="2" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm" placeholder="Special instructions…"></textarea>
                </div>
                <div>
                    <div class="flex items-center justify-between mb-2">
                        <label class="text-xs font-bold text-slate-600 dark:text-slate-300">Items *</label>
                        <button onclick="Purchase.addItemRow()" class="text-xs text-orange-500 font-semibold hover:text-orange-600">+ Add item</button>
                    </div>
                    <div id="po-items" class="space-y-2">
                        <div class="grid grid-cols-3 gap-2 po-item-row">
                            <input placeholder="Product ID" type="number" class="poi-pid px-2 py-1.5 bg-slate-50 dark:bg-slate-700 rounded-lg text-xs border border-slate-200 dark:border-slate-600">
                            <input placeholder="Qty" type="number" class="poi-qty px-2 py-1.5 bg-slate-50 dark:bg-slate-700 rounded-lg text-xs border border-slate-200 dark:border-slate-600">
                            <input placeholder="Unit cost ₹" type="number" step="0.01" class="poi-cost px-2 py-1.5 bg-slate-50 dark:bg-slate-700 rounded-lg text-xs border border-slate-200 dark:border-slate-600">
                        </div>
                    </div>
                </div>
            </div>`,
            actions: [
                { label: 'Create PO', class: 'px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-bold', onclick: 'Purchase.save()' },
                { label: 'Cancel', onclick: 'UI.closeAllModals()' }
            ]
        });
    }

    function addItemRow() {
        const container = document.getElementById('po-items');
        const row = document.createElement('div');
        row.className = 'grid grid-cols-3 gap-2 po-item-row';
        row.innerHTML = `<input placeholder="Product ID" type="number" class="poi-pid px-2 py-1.5 bg-slate-50 dark:bg-slate-700 rounded-lg text-xs border border-slate-200 dark:border-slate-600">
            <input placeholder="Qty" type="number" class="poi-qty px-2 py-1.5 bg-slate-50 dark:bg-slate-700 rounded-lg text-xs border border-slate-200 dark:border-slate-600">
            <input placeholder="Unit cost ₹" type="number" step="0.01" class="poi-cost px-2 py-1.5 bg-slate-50 dark:bg-slate-700 rounded-lg text-xs border border-slate-200 dark:border-slate-600">`;
        container.appendChild(row);
    }

    async function save() {
        const supplierId = parseInt(document.getElementById('po-supplierId').value);
        const expectedDate = document.getElementById('po-expectedDate').value;
        const notes = document.getElementById('po-notes').value;
        const items = [...document.querySelectorAll('.po-item-row')].map(r => ({
            productId: parseInt(r.querySelector('.poi-pid').value),
            quantity: parseInt(r.querySelector('.poi-qty').value),
            unitCost: parseFloat(r.querySelector('.poi-cost').value)
        })).filter(i => i.productId && i.quantity);
        if (!supplierId || items.length === 0) { UI.toast('Fill supplier and at least one item', 'warning'); return; }
        try {
            await API.post('/api/v1/purchase-orders', { supplierId, expectedDate, notes, items });
            UI.toast('Purchase order created!', 'success'); UI.closeAllModals(); await load(0);
        } catch (e) { UI.toast(e.message, 'error'); }
    }

    async function send(id) {
        try { await API.patch(`/api/v1/purchase-orders/${id}/send`, {}); UI.toast('PO sent to supplier', 'success'); await load(currentPage); }
        catch (e) { UI.toast(e.message, 'error'); }
    }

    function openReceive(id) {
        const o = orders.find(x => x.id === id);
        UI.openModal({ title: 'Receive Goods — PO-' + String(id).padStart(5,'0'), size: 'md', content: `
            <div class="space-y-3">
                <div>
                    <label class="text-xs font-bold text-slate-600 dark:text-slate-300">Supplier Invoice #</label>
                    <input id="recv-invoice" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm" placeholder="e.g. SUP-INV-001">
                </div>
                <p class="text-xs text-slate-500">All items will be marked as received in GOOD condition. Stock will be updated automatically.</p>
            </div>`,
            actions: [
                { label: 'Confirm Receipt', class: 'px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-bold', onclick: `Purchase.receive(${id})` },
                { label: 'Cancel', onclick: 'UI.closeAllModals()' }
            ]
        });
    }

    async function receive(id) {
        const o = orders.find(x => x.id === id);
        const invoiceNumber = document.getElementById('recv-invoice').value;
        const items = (o?.items || []).map(i => ({ productId: i.productId, receivedQty: i.quantity, condition: 'GOOD' }));
        try {
            await API.post(`/api/v1/purchase-orders/${id}/receive`, { items, invoiceNumber });
            UI.toast('Goods received! Stock updated.', 'success'); UI.closeAllModals(); await load(currentPage);
        } catch (e) { UI.toast(e.message, 'error'); }
    }

    async function cancel(id) {
        if (!confirm('Cancel this PO?')) return;
        try { await API.del(`/api/v1/purchase-orders/${id}`); UI.toast('PO cancelled', 'info'); await load(currentPage); }
        catch (e) { UI.toast(e.message, 'error'); }
    }

    function setStatus(s) { statusFilter = s; load(0); }
    function goToPage(p) { currentPage = p - 1; load(currentPage); }

    return { render, openForm, addItemRow, save, send, openReceive, receive, cancel, setStatus, goToPage };
})();
