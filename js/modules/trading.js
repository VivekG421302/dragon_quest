/**
 * Trading & Distribution — Price Lists, Promotions, Margins
 * Sequence: Products → Customers (segments) → Price Lists → Promotions
 */
const Trading = (function () {
    'use strict';
    let activeTab = 'pricelists', priceLists = [], promotions = [];

    function render() { setTimeout(() => load(), 0); return `<div id="tradingContent">${UI.skeleton(2,1)}</div>`; }

    async function load() {
        try {
            const [pr, pm] = await Promise.allSettled([API.get('/api/v1/price-lists'), API.get('/api/v1/promotions')]);
            priceLists  = pr.status==='fulfilled' ? (pr.value.data.content||pr.value.data||[]) : [];
            promotions  = pm.status==='fulfilled' ? (pm.value.data.content||pm.value.data||[]) : [];
        } catch (_) {}
        renderContent();
    }

    function renderContent() {
        const c = document.getElementById('tradingContent');
        if (!c) return;
        c.innerHTML = `<div class="space-y-5">
            <div>
                <h1 class="font-display text-2xl font-bold text-slate-800 dark:text-slate-100">Trading & Distribution</h1>
                <p class="text-sm text-slate-600 dark:text-slate-300 mt-1">Price lists per segment, promotions, discount rules and margin analysis</p>
            </div>
            <div class="bg-lime-50 dark:bg-lime-900/20 border border-lime-200 dark:border-lime-800 rounded-2xl p-4 flex gap-3">
                <i data-lucide="git-branch" class="w-5 h-5 text-lime-600 flex-shrink-0 mt-0.5"></i>
                <div class="text-sm text-lime-700 dark:text-lime-300">
                    <strong>Sequence:</strong> Products (with purchase & selling prices) → Customer Segments (RETAIL/WHOLESALE/VIP) → <strong>Price Lists</strong> → Promotions → Margin Report
                </div>
            </div>
            <div class="flex gap-2 border-b border-slate-200 dark:border-slate-700">
                ${['pricelists','promotions','margins'].map(t => `<button onclick="Trading.setTab('${t}')"
                    class="px-4 py-2 text-sm font-semibold rounded-t-xl transition-colors ${activeTab===t
                        ? 'bg-gradient-to-r from-lime-500 to-green-600 text-white'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'}">
                    ${{pricelists:'Price Lists',promotions:'Promotions',margins:'Margins'}[t]}
                </button>`).join('')}
            </div>
            <div id="tradingTabContent">${renderTab()}</div>
        </div>`;
        lucide.createIcons();
    }

    function renderTab() {
        if (activeTab==='pricelists') return renderPriceLists();
        if (activeTab==='promotions') return renderPromotions();
        if (activeTab==='margins')    return renderMargins();
        return '';
    }

    function renderPriceLists() {
        return `<div class="space-y-4">
            <div class="flex justify-end">
                <button onclick="Trading.openPriceListForm()"
                    class="px-4 py-2 bg-gradient-to-r from-lime-500 to-green-600 text-white rounded-xl font-semibold text-sm flex items-center gap-2 hover:scale-105 transition-transform">
                    <i data-lucide="plus" class="w-4 h-4"></i>New Price List
                </button>
            </div>
            ${!priceLists.length ? UI.emptyState('No price lists', 'tag', { label: 'Create Price List', onclick: 'Trading.openPriceListForm()' }) :
            `<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                ${priceLists.map(pl => {
                    const segColors = {RETAIL:'blue',WHOLESALE:'violet',VIP:'amber'};
                    const col = segColors[pl.segment]||'slate';
                    return `<div class="bg-white dark:bg-slate-800 rounded-2xl border border-amber-100 dark:border-slate-700 p-4 hover:shadow-md transition-shadow">
                        <div class="flex items-start justify-between mb-3">
                            <div>
                                <p class="font-bold text-slate-800 dark:text-slate-100">${pl.name}</p>
                                <span class="px-2 py-0.5 rounded-full text-xs font-bold mt-1 inline-block bg-${col}-100 text-${col}-700 dark:bg-${col}-900/30 dark:text-${col}-300">${pl.segment}</span>
                            </div>
                            ${pl.active ? '<span class="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">ACTIVE</span>' :
                            `<button onclick="Trading.activatePriceList(${pl.id})" class="text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full hover:bg-lime-100 hover:text-lime-700 transition-colors">Activate</button>`}
                        </div>
                        <p class="text-xs text-slate-500 dark:text-slate-400">Effective from: ${pl.effectiveFrom ? UI.formatDate(pl.effectiveFrom) : '—'}</p>
                        <p class="text-xs text-slate-500 dark:text-slate-400">${(pl.items||[]).length} product overrides</p>
                    </div>`;
                }).join('')}
            </div>`}
        </div>`;
    }

    function renderPromotions() {
        const typeColors = {FLAT:'blue',PERCENT:'emerald',BOGO:'purple'};
        return `<div class="space-y-4">
            <div class="flex justify-end">
                <button onclick="Trading.openPromoForm()"
                    class="px-4 py-2 bg-gradient-to-r from-lime-500 to-green-600 text-white rounded-xl font-semibold text-sm flex items-center gap-2 hover:scale-105 transition-transform">
                    <i data-lucide="tag" class="w-4 h-4"></i>New Promotion
                </button>
            </div>
            ${!promotions.length ? UI.emptyState('No promotions yet', 'gift', { label: 'Create Promotion', onclick: 'Trading.openPromoForm()' }) :
            `<div class="space-y-3">
                ${promotions.map(p => {
                    const col = typeColors[p.type]||'slate';
                    const now = new Date();
                    const from = p.fromDate ? new Date(p.fromDate) : null;
                    const to   = p.toDate   ? new Date(p.toDate)   : null;
                    const status = !from || !to ? 'NO DATES' : now >= from && now <= to ? 'LIVE' : now < from ? 'UPCOMING' : 'EXPIRED';
                    const statusColor = {LIVE:'emerald',UPCOMING:'blue',EXPIRED:'slate','NO DATES':'amber'}[status];
                    return `<div class="bg-white dark:bg-slate-800 rounded-2xl border border-amber-100 dark:border-slate-700 p-4 flex items-start gap-4">
                        <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-lime-400 to-green-500 flex items-center justify-center flex-shrink-0">
                            <i data-lucide="tag" class="w-6 h-6 text-white"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 flex-wrap mb-1">
                                <p class="font-bold text-slate-800 dark:text-slate-100">${p.name}</p>
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-${col}-100 text-${col}-700 dark:bg-${col}-900/30 dark:text-${col}-300">${p.type}</span>
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-${statusColor}-100 text-${statusColor}-700 dark:bg-${statusColor}-900/30 dark:text-${statusColor}-300">${status}</span>
                            </div>
                            <p class="text-sm text-slate-600 dark:text-slate-300">
                                ${p.type==='FLAT' ? `Flat ₹${p.value} off` : p.type==='PERCENT' ? `${p.value}% off` : 'Buy one get one'}
                                ${p.minOrderValue ? ` · Min order ${UI.formatCurrency(p.minOrderValue)}` : ''}
                            </p>
                            <p class="text-xs text-slate-500 mt-0.5">${p.fromDate||'—'} to ${p.toDate||'—'} · Max uses: ${p.maxUses||'∞'}</p>
                        </div>
                    </div>`;
                }).join('')}
            </div>`}
        </div>`;
    }

    function renderMargins() {
        return `<div class="bg-white dark:bg-slate-800 rounded-2xl border border-amber-100 dark:border-slate-700 p-5 space-y-4">
            <div class="flex items-center justify-between">
                <h3 class="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <i data-lucide="trending-up" class="w-5 h-5 text-lime-500"></i>Margin Report
                </h3>
                <button onclick="Trading.loadMargins()" class="px-4 py-2 bg-lime-500 text-white rounded-xl text-sm font-bold hover:bg-lime-600 transition-colors">Load Margins</button>
            </div>
            <div class="bg-lime-50 dark:bg-lime-900/20 border border-lime-200 dark:border-lime-800 rounded-xl p-3 text-xs text-lime-700 dark:text-lime-300">
                Margin = (Selling Price − Purchase Price) / Selling Price × 100. Products with margin &lt; 20% are flagged.
            </div>
            <div id="margins-data" class="text-sm text-slate-400 text-center py-8">Click Load Margins to analyse your product margins</div>
        </div>`;
    }

    function setTab(t) { activeTab = t; document.getElementById('tradingTabContent').innerHTML = renderTab(); lucide.createIcons(); }

    function openPriceListForm() {
        UI.openModal({ title: 'New Price List', size: 'md', content: `
            <div class="space-y-3">
                <div><label class="text-xs font-bold text-slate-600 dark:text-slate-300">Name *</label>
                    <input id="pl-name" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm" placeholder="e.g. Wholesale April 2025"></div>
                <div class="grid grid-cols-2 gap-3">
                    <div><label class="text-xs font-bold text-slate-600 dark:text-slate-300">Segment</label>
                        <select id="pl-seg" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm">
                            <option>RETAIL</option><option>WHOLESALE</option><option>VIP</option>
                        </select></div>
                    <div><label class="text-xs font-bold text-slate-600 dark:text-slate-300">Effective From</label>
                        <input id="pl-from" type="date" value="${new Date().toISOString().slice(0,10)}" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm"></div>
                </div>
                <p class="text-xs text-slate-500 dark:text-slate-400">Add product-specific price overrides after creating the price list.</p>
            </div>`,
            actions: [
                { label: 'Create Price List', class: 'px-4 py-2 bg-gradient-to-r from-lime-500 to-green-600 text-white rounded-xl font-bold', onclick: 'Trading.savePriceList()' },
                { label: 'Cancel', onclick: 'UI.closeAllModals()' }
            ]
        });
    }

    async function savePriceList() {
        const d = { name: document.getElementById('pl-name').value, segment: document.getElementById('pl-seg').value,
            effectiveFrom: document.getElementById('pl-from').value, items: [] };
        if (!d.name) { UI.toast('Name required', 'warning'); return; }
        try { await API.post('/api/v1/price-lists', d); UI.toast('Price list created!', 'success'); UI.closeAllModals(); await load(); }
        catch (e) { UI.toast(e.message, 'error'); }
    }

    async function activatePriceList(id) {
        try { await API.post(`/api/v1/price-lists/${id}/activate`, {}); UI.toast('Price list activated!', 'success'); await load(); }
        catch (e) { UI.toast(e.message, 'error'); }
    }

    function openPromoForm() {
        UI.openModal({ title: 'New Promotion', size: 'md', content: `
            <div class="space-y-3">
                <div><label class="text-xs font-bold text-slate-600 dark:text-slate-300">Name *</label>
                    <input id="promo-name" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm" placeholder="e.g. Summer Sale 20%"></div>
                <div class="grid grid-cols-2 gap-3">
                    <div><label class="text-xs font-bold text-slate-600 dark:text-slate-300">Type</label>
                        <select id="promo-type" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm">
                            <option>PERCENT</option><option>FLAT</option><option>BOGO</option>
                        </select></div>
                    <div><label class="text-xs font-bold text-slate-600 dark:text-slate-300">Value (% or ₹)</label>
                        <input id="promo-value" type="number" step="0.01" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm"></div>
                    <div><label class="text-xs font-bold text-slate-600 dark:text-slate-300">Min Order ₹</label>
                        <input id="promo-min" type="number" step="0.01" value="0" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm"></div>
                    <div><label class="text-xs font-bold text-slate-600 dark:text-slate-300">Max Uses</label>
                        <input id="promo-max" type="number" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm" placeholder="blank = unlimited"></div>
                    <div><label class="text-xs font-bold text-slate-600 dark:text-slate-300">From</label>
                        <input id="promo-from" type="date" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm"></div>
                    <div><label class="text-xs font-bold text-slate-600 dark:text-slate-300">To</label>
                        <input id="promo-to" type="date" class="story-input w-full mt-1 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 text-sm"></div>
                </div>
            </div>`,
            actions: [
                { label: 'Create Promotion', class: 'px-4 py-2 bg-gradient-to-r from-lime-500 to-green-600 text-white rounded-xl font-bold', onclick: 'Trading.savePromo()' },
                { label: 'Cancel', onclick: 'UI.closeAllModals()' }
            ]
        });
    }

    async function savePromo() {
        const d = { name: document.getElementById('promo-name').value, type: document.getElementById('promo-type').value,
            value: parseFloat(document.getElementById('promo-value').value)||0,
            minOrderValue: parseFloat(document.getElementById('promo-min').value)||0,
            maxUses: parseInt(document.getElementById('promo-max').value)||null,
            fromDate: document.getElementById('promo-from').value, toDate: document.getElementById('promo-to').value };
        if (!d.name) { UI.toast('Name required', 'warning'); return; }
        try { await API.post('/api/v1/promotions', d); UI.toast('Promotion created!', 'success'); UI.closeAllModals(); await load(); }
        catch (e) { UI.toast(e.message, 'error'); }
    }

    async function loadMargins() {
        const el = document.getElementById('margins-data');
        try {
            const r = await API.get('/api/v1/trading/margins');
            const items = r.data.content || r.data || [];
            el.innerHTML = `<div class="overflow-x-auto">
                <table class="w-full text-sm">
                    <thead><tr class="border-b border-slate-200 dark:border-slate-700">
                        <th class="px-3 py-2 text-left text-xs font-bold text-slate-500">Product</th>
                        <th class="px-3 py-2 text-right text-xs font-bold text-slate-500">Purchase ₹</th>
                        <th class="px-3 py-2 text-right text-xs font-bold text-slate-500">Selling ₹</th>
                        <th class="px-3 py-2 text-right text-xs font-bold text-slate-500">Margin %</th>
                    </tr></thead>
                    <tbody>${items.map(i => {
                        const margin = i.margin || (i.sellingPrice && i.purchasePrice ? ((i.sellingPrice-i.purchasePrice)/i.sellingPrice*100) : 0);
                        return `<tr class="border-b border-slate-100 dark:border-slate-700">
                            <td class="px-3 py-2 font-semibold text-slate-800 dark:text-slate-100">${i.name||i.productName}</td>
                            <td class="px-3 py-2 text-right text-slate-600 dark:text-slate-300">${UI.formatCurrency(i.purchasePrice||0)}</td>
                            <td class="px-3 py-2 text-right text-slate-600 dark:text-slate-300">${UI.formatCurrency(i.sellingPrice||0)}</td>
                            <td class="px-3 py-2 text-right font-bold ${margin<20?'text-red-500':margin<40?'text-amber-500':'text-emerald-600'}">${margin.toFixed(1)}%</td>
                        </tr>`;
                    }).join('')}</tbody>
                </table>
            </div>`;
        } catch(e) { el.innerHTML = `<p class="text-center py-4 text-red-500">${e.message}</p>`; }
    }

    return { render, setTab, openPriceListForm, savePriceList, activatePriceList, openPromoForm, savePromo, loadMargins };
})();
