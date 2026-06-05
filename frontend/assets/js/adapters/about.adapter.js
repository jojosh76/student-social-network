/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║           STUDNET — ABOUT ADAPTER (SOA)                          ║
 * ║  Couche Adapter : page About Us — guard d'authentification       ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Dépendances :
 *   config/service-registry.js | utils/http-client.js
 *   services/auth.service.js
 */

'use strict';

/* global AuthService */

document.addEventListener('DOMContentLoaded', () => {
    // Guard SOA : accès refusé si non authentifié
    if (!AuthService.requireAuth()) return;

    console.log('[AboutAdapter] Utilisateur authentifié sur la page About Us');
});

document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    AuthService.logout();
});
