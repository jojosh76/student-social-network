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

/* global AuthService, AppUI */

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const params = {
        firstName: document.getElementById('firstname').value.trim(),
        lastName:  document.getElementById('lastname').value.trim(),
        major:     document.getElementById('major').value,
        email:     document.getElementById('email').value.trim(),
        password:  document.getElementById('password').value,
    };
    const emailOk = /^[A-Za-z0-9._%+-]+@ictuniversity\.edu\.cm$/i.test(params.email);
    const passwordOk = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,}$/.test(params.password);

    if (!emailOk) {
        AppUI.notify("Utilise uniquement ton email @ictuniversity.edu.cm.", 'error');
        return;
    }

    if (!passwordOk) {
        AppUI.notify("Mot de passe: 6 caracteres minimum, une majuscule, un chiffre et un symbole.", 'error');
        return;
    }

    try {
        await AuthService.register(params);
        AppUI.notify("Inscription validée. Tu peux maintenant te connecter.", 'success');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 900);
    } catch (err) {
        AppUI.notify("Impossible de créer ce compte. Vérifie les informations saisies.", 'error');
    }
});
