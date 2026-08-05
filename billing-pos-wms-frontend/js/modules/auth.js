/**
 * Authentication Module
 * Signup & Login with JWT Bearer Token management
 */
const Auth = (function() {
    'use strict';

    let isLoginMode = true;

    function init() {
        // If already authenticated, redirect to dashboard
        if (API.isAuthenticated()) {
            App.navigateTo('dashboard');
            return;
        }

        lucide.createIcons();
    }

    function render() {
        return `
            <div class="min-h-[80vh] flex items-center justify-center px-4">
                <div class="w-full max-w-md">
                    <!-- Auth Card -->
                    <div class="bg-white dark:bg-slate-800 rounded-3xl p-8 border border-amber-100 dark:border-slate-700 shadow-2xl shadow-purple-500/10 relative overflow-hidden">
                        <!-- Decorative blobs -->
                        <div class="absolute -top-10 -right-10 w-32 h-32 bg-purple-200/30 dark:bg-purple-900/20 rounded-full blur-2xl"></div>
                        <div class="absolute -bottom-10 -left-10 w-32 h-32 bg-pink-200/30 dark:bg-pink-900/20 rounded-full blur-2xl"></div>

                        <div class="relative z-10">
                            <!-- Header -->
                            <div class="text-center mb-8">
                                <div class="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/20 animate-float">
                                    <i data-lucide="${isLoginMode ? 'key-round' : 'user-plus'}" class="w-8 h-8 text-white"></i>
                                </div>
                                <h2 class="font-display text-2xl font-bold text-slate-800 dark:text-slate-100">${isLoginMode ? 'Welcome Back!' : 'Join the Kingdom'}</h2>
                                <p class="text-slate-500 dark:text-slate-400 mt-1 text-sm">${isLoginMode ? 'Sign in to manage your realm' : 'Create your merchant account'}</p>
                            </div>

                            <!-- Form -->
                            <form id="authForm" onsubmit="Auth.handleSubmit(event)" class="space-y-4">
                                ${!isLoginMode ? `
                                <div>
                                    <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Organization Name</label>
                                    <div class="relative">
                                        <i data-lucide="building-2" class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"></i>
                                        <input type="text" name="organizationName" required
                                            class="story-input w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100"
                                            placeholder="Acme Corp">
                                    </div>
                                </div>
                                ` : ''}

                                <div>
                                    <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Username</label>
                                    <div class="relative">
                                        <i data-lucide="user" class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"></i>
                                        <input type="text" name="username" required minlength="3"
                                            class="story-input w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100"
                                            placeholder="merchant_king">
                                    </div>
                                </div>

                                ${!isLoginMode ? `
                                <div>
                                    <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Email</label>
                                    <div class="relative">
                                        <i data-lucide="mail" class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"></i>
                                        <input type="email" name="email" required
                                            class="story-input w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100"
                                            placeholder="king@realm.com">
                                    </div>
                                </div>
                                ` : ''}

                                <div>
                                    <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Password</label>
                                    <div class="relative">
                                        <i data-lucide="lock" class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"></i>
                                        <input type="password" name="password" required minlength="8"
                                            class="story-input w-full pl-10 pr-10 py-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100"
                                            placeholder="••••••••">
                                        <button type="button" onclick="Auth.togglePassword(this)" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                            <i data-lucide="eye" class="w-5 h-5"></i>
                                        </button>
                                    </div>
                                </div>

                                ${!isLoginMode ? `
                                <div>
                                    <label class="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Confirm Password</label>
                                    <div class="relative">
                                        <i data-lucide="lock" class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"></i>
                                        <input type="password" name="confirmPassword" required
                                            class="story-input w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-slate-800 dark:text-slate-100"
                                            placeholder="••••••••">
                                    </div>
                                </div>
                                ` : ''}

                                <button type="submit" id="authSubmitBtn"
                                    class="w-full py-3.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white font-bold rounded-xl shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2">
                                    <span>${isLoginMode ? 'Sign In' : 'Create Account'}</span>
                                    <i data-lucide="arrow-right" class="w-5 h-5"></i>
                                </button>
                            </form>

                            <!-- Toggle Mode -->
                            <div class="mt-6 text-center">
                                <p class="text-sm text-slate-500 dark:text-slate-400">
                                    ${isLoginMode ? "Don't have an account?" : "Already have an account?"}
                                    <button onclick="Auth.toggleMode()" class="ml-1 text-purple-500 hover:text-purple-600 font-bold transition-colors">
                                        ${isLoginMode ? 'Sign Up' : 'Sign In'}
                                    </button>
                                </p>
                            </div>

                            <!-- Demo hint -->
                            <div class="mt-6 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
                                <p class="text-xs text-amber-700 dark:text-amber-300 text-center">
                                    <i data-lucide="sparkles" class="w-3 h-3 inline mr-1"></i>
                                    Make sure your Spring Boot backend is running with CORS enabled!
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function toggleMode() {
        isLoginMode = !isLoginMode;
        App.navigateTo('auth');
    }

    function togglePassword(btn) {
        const input = btn.parentElement.querySelector('input');
        const icon = btn.querySelector('i');

        if (input.type === 'password') {
            input.type = 'text';
            icon.setAttribute('data-lucide', 'eye-off');
        } else {
            input.type = 'password';
            icon.setAttribute('data-lucide', 'eye');
        }
        lucide.createIcons();
    }

    async function handleSubmit(e) {
        e.preventDefault();

        const btn = document.getElementById('authSubmitBtn');
        const originalContent = btn.innerHTML;

        // Validation
        const rules = {
            username: { required: true, minLength: 3 },
            password: { required: true, minLength: 8 }
        };

        if (!isLoginMode) {
            rules.organizationName = { required: true };
            rules.email = { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, patternMessage: 'Please enter a valid email' };
            rules.confirmPassword = { required: true, match: 'password', matchMessage: 'Passwords do not match' };
        }

        const validation = UI.validateForm('authForm', rules);
        if (!validation.valid) return;

        const data = UI.getFormData('authForm');

        btn.disabled = true;
        btn.innerHTML = `<div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div><span>${isLoginMode ? 'Signing in...' : 'Creating account...'}</span>`;

        try {
            if (isLoginMode) {
                // Login
                const result = await API.post('/api/v1/auth/login', {
                    username: data.username,
                    password: data.password
                });

                API.setToken(result.data.token);
                App.setUser(result.data.user);
                UI.toast('Welcome back, ' + result.data.user.username + '!', 'success');
                App.navigateTo('dashboard');

            } else {
                // Signup
                const result = await API.post('/api/v1/auth/signup', {
                    organizationName: data.organizationName,
                    username: data.username,
                    email: data.email,
                    password: data.password,
                    confirmPassword: data.confirmPassword
                });

                UI.toast('Account created! Please sign in.', 'success');
                isLoginMode = true;
                App.navigateTo('auth');
            }
        } catch (error) {
            UI.toast(error.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalContent;
            lucide.createIcons();
        }
    }

    // ===== Public API =====
    return {
        init,
        render,
        toggleMode,
        togglePassword,
        handleSubmit
    };
})();
