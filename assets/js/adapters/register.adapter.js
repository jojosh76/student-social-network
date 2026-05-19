/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║           STUDNET — REGISTER ADAPTER (SOA)                       ║
 * ║  Couche Adapter : relie le formulaire d'inscription à AuthService ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Dépendances :
 *   config/service-registry.js | utils/http-client.js
 *   dtos/dtos.js               | services/auth.service.js
 */

'use strict';

/* global AuthService */

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const params = {
        firstName: document.getElementById('firstname').value.trim(),
        lastName:  document.getElementById('lastname').value.trim(),
        major:     document.getElementById('major').value,
        email:     document.getElementById('email').value.trim(),
        password:  document.getElementById('password').value,
    };

    try {
        await AuthService.register(params);
        alert("Inscription validée ! Tu peux maintenant te connecter.");
        window.location.href = 'index.html';
    } catch (err) {
        alert("Échec de l'inscription : " + err.message);
    }
});
