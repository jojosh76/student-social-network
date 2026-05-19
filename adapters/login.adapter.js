/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║           STUDNET — LOGIN ADAPTER (SOA)                          ║
 * ║  Couche Adapter : relie le formulaire HTML à l'AuthService       ║
 * ║  Responsabilité unique : capture input → délègue → redirige      ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Dépendances (chargées avant ce script) :
 *   config/service-registry.js
 *   utils/http-client.js
 *   dtos/dtos.js
 *   services/auth.service.js
 */

'use strict';

/* global AuthService */

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    try {
        await AuthService.login(email, password);
        window.location.href = 'dashboard.html';
    } catch (err) {
        alert("Erreur : " + err.message);
    }
});
