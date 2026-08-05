/**
 * Company Setup Module
 * Manage company profile, logo, tax info
 */
const Company = (function() {
    'use strict';

    let companyData = null;
    let isEditing = false;

    async function init() {
        await loadCompany();
    }

    async function loadCompany() {
        try {
            const result = await API.get('/api/v1/company');
            companyData = result.data;
            App.setCompany(companyData);
            renderContent();
        } catch (error) {
            // Company might not exist yet
            companyData = null;
            renderContent();
        }
    }

    function render() {
        return `<div id="companyContent" class="max-w-2xl mx-auto">${UI.skeleton(6, 1)}</div>`;
    }

    function renderContent() {
        const container = document.getElementById('companyContent');
        if (!container) return;

        if (!companyData && !isEditing) {
            container.innerHTML = `
                <div class="text-center py-16">
                    <div class="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <i data-lucide="building-2" class="w-10 h-10 text-amber-500"></i>
                    </div>
                    <h2 class="font-display text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">No Company Setup</h2>
                    <p class="text-slate-500 dark:text-slate-400 mb-6">Set up your company profile to personalize bills and receipts.</p>
                    <button onclick="Company.startEdit()" class="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all hover:scale-105">
                        Setup Company
                    </button>
                </div>
            `;
        } else if (isEditing) {
            container.innerHTML = renderForm();
        } else {
            container.innerHTML = renderView();
        }

        lucide.createIcons();
    }

    function renderView() {
        const logo = companyData.logoUrl || 'https://api.dicebear.com/7.x/initials/svg?seed=' + encodeURIComponent(companyData.name);

        return `
            <div class="bg-white dark:bg-slate-800 rounded-3xl border border-amber-100 dark:border-slate-700 shadow-sm overflow-hidden">
                <div class="h-32 bg-gradient-to-r from-purple-400 via-pink-400 to-orange-400 relative">
                    <div class="absolute -bottom-12 left-8">
                        <div class="w-24 h-24 bg-white dark:bg-slate-800 rounded-2xl p-1 shadow-lg">
                            <img src="${logo}" alt="Logo" class="w-full h-full rounded-xl object-cover">
                        </div>
                    </div>
                </div>
                <div class="pt-16 pb-8 px-8">
                    <div class="flex items-start justify-between mb-6">
                        <div>
                            <h2 class="font-display text-2xl font-bold text-slate-800 dark:text-slate-100">${companyData.name}</h2>
                            <p class="text-slate-500 dark:text-slate-400 text-sm mt-1">Company Profile</p>
                        </div>
                        <button onclick="Company.startEdit()" class="px-4 py-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 rounded-xl font-semibold text-sm hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors flex items-center gap-2">
                            <i data-lucide="pencil" class="w-4 h-4"></i>
                            Edit
                        </button>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div class="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl">
                            <div class="flex items-center gap-2 mb-2">
                                <i data-lucide="receipt" class="w-4 h-4 text-slate-400"></i>
                                <span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Tax ID</span>
                            </div>
                            <p class="font-semibold text-slate-800 dark:text-slate-100">${companyData.taxRegistration || 'Not set'}</p>
                        </div>
                        <div class="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl">
                            <div class="flex items-center gap-2 mb-2">
                                <i data-lucide="phone" class="w-4 h-4 text-slate-400"></i>
                                <span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Phone</span>
                            </div>
                            <p class="font-semibold text-slate-800 dark:text-slate-100">${companyData.phone || 'Not set'}</p>
                        </div>
                        <div class="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl">
                            <div class="flex items-center gap-2 mb-2">
                                <i data-lucide="mail" class="w-4 h-4 text-slate-400"></i>
                                <span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email</span>
                            </div>
                            <p class="font-semibold text-slate-800 dark:text-slate-100">${companyData.email || 'Not set'}</p>
                        </div>
                        <div class="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl">
                            <div class="flex items-center gap-2 mb-2">
                                <i data-lucide="map-pin" class="w-4 h-4 text-slate-400"></i>
                                <span class="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Address</span>
                            </div>
                            <p class="font-semibold text-slate-800 dark:text-slate-100">${companyData.address || 'Not set'}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function renderForm() {
        const data = companyData || {};

        return `
            <div class="bg-white dark:bg-slate-800 rounded-3xl border border-amber-100 dark:border-slate-700 shadow-sm p-8">
                <div class="flex items-center gap-3 mb-6">
                    <div class="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
                        <i data-lucide="building-2" class="w-5 h-5 text-white"></i>
                    </div>
                    <div>
                        <h2 class="font-display text-xl font-bold text-slate-800 dark:text-slate-100">${companyData ? 'Edit' : 'Setup'} Company</h2>
                        <p class="text-sm text-slate-500 dark:text-slate-400">Your business details appear on all bills and receipts</p>
                    </div>
                </div>

                <form id="companyForm" onsubmit="Company.handleSubmit(event)" class="space-y-5">
                    <div>
                        <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Company Name *</label>
                        <input type="text" name="name" required value="${data.name || ''}"
                            class="story-input w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100"
                            placeholder="Acme Corporation">
                    </div>

                    <div>
                        <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Logo URL</label>
                        <input type="url" name="logoUrl" value="${data.logoUrl || ''}"
                            class="story-input w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100"
                            placeholder="https://example.com/logo.png">
                        <p class="text-xs text-slate-400 mt-1">Leave empty for auto-generated initials logo</p>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Tax Registration / GSTIN</label>
                            <input type="text" name="taxRegistration" value="${data.taxRegistration || ''}"
                                class="story-input w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100"
                                placeholder="GSTIN123456">
                        </div>
                        <div>
                            <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Phone Number</label>
                            <input type="tel" name="phone" value="${data.phone || ''}"
                                class="story-input w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100"
                                placeholder="+1 234 567 890">
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
                        <input type="email" name="email" value="${data.email || ''}"
                            class="story-input w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100"
                            placeholder="contact@company.com">
                    </div>

                    <div>
                        <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Address</label>
                        <textarea name="address" rows="3"
                            class="story-input w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100 resize-none"
                            placeholder="123 Business Street, City, Country">${data.address || ''}</textarea>
                    </div>

                    <div class="flex items-center gap-3 pt-4">
                        <button type="submit" id="companySubmitBtn"
                            class="flex-1 py-3.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]">
                            ${companyData ? 'Save Changes' : 'Create Company'}
                        </button>
                        ${companyData ? `
                        <button type="button" onclick="Company.cancelEdit()"
                            class="px-6 py-3.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                            Cancel
                        </button>
                        ` : ''}
                    </div>
                </form>
            </div>
        `;
    }

    function startEdit() {
        isEditing = true;
        renderContent();
    }

    function cancelEdit() {
        isEditing = false;
        renderContent();
    }

    async function handleSubmit(e) {
        e.preventDefault();

        const btn = document.getElementById('companySubmitBtn');
        const originalText = btn.textContent;
        btn.disabled = true;
        btn.innerHTML = `<div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>`;

        try {
            const data = UI.getFormData('companyForm');

            const result = companyData 
                ? await API.put('/api/v1/company', data)
                : await API.post('/api/v1/company', data);

            companyData = result.data;
            App.setCompany(companyData);
            isEditing = false;
            UI.toast('Company profile saved!', 'success');
            renderContent();
        } catch (error) {
            UI.toast(error.message, 'error');
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }

    // ===== Public API =====
    return {
        init,
        render,
        startEdit,
        cancelEdit,
        handleSubmit
    };
})();
