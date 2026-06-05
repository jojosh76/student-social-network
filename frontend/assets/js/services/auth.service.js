/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║           STUDNET — AUTH SERVICE (Frontend)                      ║
 * ║  Couche Service : logique métier d'authentification              ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

'use strict';

/* global HttpClient, ServiceRegistry, DTOs */

const AuthService = (() => {
    const BASE = ServiceRegistry.resolveService('auth');

    return {
        /**
         * Connexion utilisateur
         */
        async login(email, password) {
            try {
                const dto = DTOs.LoginCommand(email, password);
                const result = await HttpClient.httpPost(`${BASE}/login`, dto);
                
                if (result.token) {
                    localStorage.setItem('token', result.token);
                }
                return result;
            } catch (err) {
                console.error("❌ Erreur lors du login :", err);
                throw err;
            }
        },

        /**
         * Inscription utilisateur
         */
        async register(params) {
            try {
                const dto = DTOs.RegisterCommand(params);
                const result = await HttpClient.httpPost(`${BASE}/register`, dto);
                
                console.log("✅ Inscription réussie :", result);
                return result;
            } catch (err) {
                console.error("❌ Erreur inscription :", err);
                throw err;   // On laisse l'adapter gérer l'affichage de l'erreur
            }
        },

        /**
         * Récupère le profil de l'utilisateur connecté
         */
        async getMe() {
            return await HttpClient.httpGet(`${BASE}/me`);
        },

        /**
         * Déconnexion
         */
        logout() {
            localStorage.removeItem('token');
            window.location.href = 'index.html';
        },

        /**
         * Vérification d'authentification
         */
        requireAuth() {
            return HttpClient.requireAuth();
        }
    };
})();

// Exposition globale (très important)
if (typeof window !== 'undefined') {
    window.AuthService = AuthService;
}

if (typeof module !== 'undefined') {
    module.exports = { AuthService };
}