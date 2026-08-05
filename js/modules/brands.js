/**
 * Brand Management Module
 * CRUD with e-commerce style card grid + table view, Excel import/export
 */
const Brands = (function() {
    'use strict';

    let brands = [];
    let currentPage = 0;
    let totalPages = 0;
    let viewMode = localStorage.getItem('brandsViewMode') || 'grid';
    let searchQuery = '';
    let isEditing = false;
    let editId = null;

    async function init() {
        await loadBrands();
    }

    async function loadBrands(page = 0) {
        try {
            const params = new URLSearchParams({ page: page, size: 12, sort: 'name,asc' });
            if (searchQuery) params.append('search', searchQuery);

            const result = await API.get(`/api/v1/brands?${params}`);
            brands = result.data.content || [];
            currentPage = result.data.number || 0;
            totalPages = result.data.totalPages || 0;
            renderContent();
        } catch (error) {
            UI.toast(error.message, 'error');
            renderContent();
        }
    }

    function render() {
        return `<div id="brandsContent">${UI.skeleton(3, 4)}</div>`;
    }

    function renderContent() {
        const container = document.getElementById('brandsContent');
        if (!container) return;

        container.innerHTML = `
            <div class="space-y-6">
                <!-- Header -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 class="font-display text-2xl font-bold text-slate-800 dark:text-slate-100">Brand Management</h1>
                        <p class="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage product brands and manufacturers</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="Brands.showImport()" class="px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300 rounded-xl font-semibold text-sm hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors flex items-center gap-2">
                            <i data-lucide="file-spreadsheet" class="w-4 h-4"></i>
                            Import
                        </button>
                        <button onclick="Brands.exportData()" class="px-4 py-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-xl font-semibold text-sm hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors flex items-center gap-2">
                            <i data-lucide="download" class="w-4 h-4"></i>
                            Export
                        </button>
                        <button onclick="Brands.openForm()" class="px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold text-sm shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all hover:scale-105 flex items-center gap-2">
                            <i data-lucide="plus" class="w-4 h-4"></i>
                            Add Brand
                        </button>
                    </div>
                </div>

                <!-- Toolbar -->
                <div class="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-2xl border border-amber-100 dark:border-slate-700">
                    <div class="relative w-full sm:w-80">
                        <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"></i>
                        <input type="text" id="brandSearch" value="${searchQuery}" 
                            oninput="Brands.handleSearch(this.value)"
                            class="story-input w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-sm"
                            placeholder="Search brands...">
                    </div>
                    <div class="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 rounded-xl p-1">
                        <button onclick="Brands.setViewMode('grid')" 
                            class="p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-600 shadow-sm text-purple-500' : 'text-slate-400 hover:text-slate-600'}">
                            <i data-lucide="layout-grid" class="w-4 h-4"></i>
                        </button>
                        <button onclick="Brands.setViewMode('table')" 
                            class="p-2 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white dark:bg-slate-600 shadow-sm text-purple-500' : 'text-slate-400 hover:text-slate-600'}">
                            <i data-lucide="list" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>

                <!-- Content -->
                ${brands.length === 0 ? UI.emptyState('No brands found', 'tags', { label: 'Add First Brand', onclick: 'Brands.openForm()' }) : 
                    viewMode === 'grid' ? renderGrid() : renderTable()}

                <!-- Pagination -->
                ${brands.length > 0 ? UI.pagination(currentPage + 1, totalPages, 'Brands.goToPage') : ''}
            </div>
        `;

        lucide.createIcons();
    }

    function renderGrid() {
        return `
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                ${brands.map(brand => {
                    const logo = brand.logoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(brand.name)}&backgroundColor=ffdfba,ffd6a5,cdb4db,b5ead7,a0c4ff`;
                    return `
                        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-amber-100 dark:border-slate-700 p-5 story-card group relative">
                            <div class="flex items-start gap-4">
                                <div class="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-700 flex-shrink-0 shadow-sm">
                                    <img src="${logo}" alt="${brand.name}" class="w-full h-full object-cover" onerror="this.src='https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(brand.name)}'">
                                </div>
                                <div class="flex-1 min-w-0">
                                    <h3 class="font-bold text-slate-800 dark:text-slate-100 truncate">${brand.name}</h3>
                                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">${brand.description || 'No description'}</p>
                                </div>
                            </div>
                            <div class="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onclick="Brands.editBrand('${brand.id}')" class="flex-1 py-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 rounded-xl text-xs font-semibold hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors">
                                    Edit
                                </button>
                                <button onclick="Brands.deleteBrand('${brand.id}', '${brand.name}')" class="flex-1 py-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 rounded-xl text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors">
                                    Delete
                                </button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    function renderTable() {
        return `
            <div class="bg-white dark:bg-slate-800 rounded-2xl border border-amber-100 dark:border-slate-700 overflow-hidden shadow-sm">
                <div class="overflow-x-auto">
                    <table class="w-full story-table">
                        <thead>
                            <tr>
                                <th class="px-6 py-4 text-left text-xs">Brand</th>
                                <th class="px-6 py-4 text-left text-xs">Description</th>
                                <th class="px-6 py-4 text-right text-xs">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 dark:divide-slate-700">
                            ${brands.map(brand => {
                                const logo = brand.logoUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(brand.name)}`;
                                return `
                                    <tr class="group">
                                        <td class="px-6 py-4">
                                            <div class="flex items-center gap-3">
                                                <img src="${logo}" alt="" class="w-10 h-10 rounded-lg object-cover bg-slate-100 dark:bg-slate-700">
                                                <span class="font-semibold text-slate-800 dark:text-slate-100">${brand.name}</span>
                                            </div>
                                        </td>
                                        <td class="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">${brand.description || '-'}</td>
                                        <td class="px-6 py-4 text-right">
                                            <div class="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onclick="Brands.editBrand('${brand.id}')" class="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors">
                                                    <i data-lucide="pencil" class="w-4 h-4"></i>
                                                </button>
                                                <button onclick="Brands.deleteBrand('${brand.id}', '${brand.name}')" class="p-2 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors">
                                                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    function openForm(brand = null) {
        isEditing = !!brand;
        editId = brand?.id || null;

        const content = `
            <form id="brandForm" onsubmit="Brands.handleSubmit(event)" class="space-y-4">
                <div>
                    <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Brand Name *</label>
                    <input type="text" name="name" required value="${brand?.name || ''}"
                        class="story-input w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-700/50"
                        placeholder="e.g., Nike, Apple">
                </div>
                <div>
                    <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Logo URL</label>
                    <input type="url" name="logoUrl" value="${brand?.logoUrl || ''}"
                        class="story-input w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-700/50"
                        placeholder="https://...">
                </div>
                <div>
                    <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Description</label>
                    <textarea name="description" rows="3"
                        class="story-input w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 resize-none"
                        placeholder="Brief description of the brand">${brand?.description || ''}</textarea>
                </div>
            </form>
        `;

        UI.openModal({
            title: isEditing ? 'Edit Brand' : 'Add New Brand',
            content: content,
            actions: [
                { label: 'Cancel', onclick: 'UI.closeAllModals()' },
                { label: isEditing ? 'Save Changes' : 'Create Brand', class: 'px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold shadow-lg hover:shadow-purple-500/30 transition-all', onclick: 'Brands.handleSubmit(event)' }
            ]
        });
    }

    async function handleSubmit(e) {
        e.preventDefault();

        const data = UI.getFormData('brandForm');

        try {
            if (isEditing) {
                await API.put(`/api/v1/brands/${editId}`, data);
                UI.toast('Brand updated!', 'success');
            } else {
                await API.post('/api/v1/brands', data);
                UI.toast('Brand created!', 'success');
            }

            UI.closeAllModals();
            await loadBrands(currentPage);
        } catch (error) {
            UI.toast(error.message, 'error');
        }
    }

    async function editBrand(id) {
        const brand = brands.find(b => b.id == id);
        if (brand) openForm(brand);
    }

    async function deleteBrand(id, name) {
        const confirmed = confirm(`Are you sure you want to delete "${name}"?`);
        if (!confirmed) return;

        try {
            await API.del(`/api/v1/brands/${id}`);
            UI.toast('Brand deleted', 'success');
            await loadBrands(currentPage);
        } catch (error) {
            UI.toast(error.message, 'error');
        }
    }

    function setViewMode(mode) {
        viewMode = mode;
        localStorage.setItem('brandsViewMode', mode);
        renderContent();
    }

    const handleSearch = UI.debounce((query) => {
        searchQuery = query;
        currentPage = 0;
        loadBrands(0);
    }, 400);

    function goToPage(page) {
        currentPage = page - 1;
        loadBrands(currentPage);
    }

    function exportData() {
        const exportData = brands.map(b => ({
            ID: b.id,
            Name: b.name,
            Description: b.description || '',
            LogoURL: b.logoUrl || ''
        }));
        API.exportToExcel(exportData, 'brands_export');
        UI.toast('Brands exported to Excel', 'success');
    }

    function showImport() {
        const content = `
            <div class="space-y-4">
                ${UI.createDropZone((file) => Brands.processImport(file))}
                <div class="bg-slate-50 dark:bg-slate-900 rounded-xl p-4">
                    <p class="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2">Expected Columns:</p>
                    <div class="flex flex-wrap gap-2">
                        ${['name', 'description', 'logoUrl'].map(col => `
                            <span class="px-2 py-1 bg-white dark:bg-slate-800 rounded-lg text-xs font-mono text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">${col}</span>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        UI.openModal({
            title: 'Import Brands from Excel',
            content: content,
            size: 'md'
        });
    }

    async function processImport(file) {
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const json = XLSX.utils.sheet_to_json(sheet);

            let success = 0;
            let failed = 0;

            for (const row of json) {
                try {
                    await API.post('/api/v1/brands', {
                        name: row.name || row.Name,
                        description: row.description || row.Description || '',
                        logoUrl: row.logoUrl || row.LogoURL || ''
                    });
                    success++;
                } catch (e) {
                    failed++;
                }
            }

            UI.closeAllModals();
            UI.toast(`Imported ${success} brands${failed > 0 ? `, ${failed} failed` : ''}`, success > 0 ? 'success' : 'warning');
            await loadBrands(0);
        } catch (error) {
            UI.toast('Failed to parse file: ' + error.message, 'error');
        }
    }

    // ===== Public API =====
    return {
        init,
        render,
        openForm,
        handleSubmit,
        editBrand,
        deleteBrand,
        setViewMode,
        handleSearch,
        goToPage,
        exportData,
        showImport,
        processImport
    };
})();
