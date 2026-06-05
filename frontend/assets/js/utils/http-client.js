/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║           STUDNET — HTTP CLIENT UTILITAIRE (SOA)                 ║
 * ║  Couche transverse : gestion des appels HTTP vers les services   ║
 * ║  Pattern : Facade + Template Method                              ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

'use strict';

// ─── AUTH TOKEN ───────────────────────────────────────────────────────────────

/**
 * Récupère le JWT depuis le stockage local.
 * @returns {string|null}
 */
function getToken() {
    return localStorage.getItem('token');
}

/**
 * Construit les headers HTTP standards avec authentification Bearer.
 * @param {Object} [extra={}] - Headers additionnels
 * @returns {Record<string, string>}
 */
function buildHeaders(extra = {}) {
    return {
        'Content-Type':  'application/json',
        'Accept':        'application/json',
        'Authorization': `Bearer ${getToken()}`,
        ...extra,
    };
}

// ─── GUARD D'AUTHENTIFICATION ─────────────────────────────────────────────────

/**
 * Vérifie la présence du token et redirige si absent.
 * À appeler en haut de chaque page protégée.
 */
function requireAuth() {
    if (!getToken()) {
        if (window.AppUI) {
            window.AppUI.notify("Connecte-toi pour accéder à cette page.", 'error');
        }
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

/**
 * Détruit la session côté client et redirige vers le login.
 */
function logout() {
    localStorage.removeItem('token');
    window.location.href = 'index.html';
}

// ─── HTTP CLIENT ──────────────────────────────────────────────────────────────

/**
 * Effectue un appel GET vers un microservice.
 * @param {string} url
 * @param {Object} [extraHeaders={}]
 * @returns {Promise<any>} Corps JSON de la réponse
 */
async function httpGet(url, extraHeaders = {}) {
    const response = await fetch(url, {
        method:  'GET',
        headers: buildHeaders(extraHeaders),
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${response.status} sur GET ${url}`);
    }
    return response.json();
}

/**
 * Effectue un appel POST vers un microservice.
 * @param {string} url
 * @param {Object} body - DTO à envoyer
 * @param {Object} [extraHeaders={}]
 * @returns {Promise<any>}
 */
async function httpPost(url, body, extraHeaders = {}) {
    const response = await fetch(url, {
        method:  'POST',
        headers: buildHeaders(extraHeaders),
        body:    JSON.stringify(body),
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${response.status} sur POST ${url}`);
    }
    return response.json();
}

/**
 * Effectue un appel PATCH vers un microservice.
 * @param {string} url
 * @param {Object} body
 * @returns {Promise<any>}
 */
async function httpPatch(url, body) {
    const response = await fetch(url, {
        method:  'PATCH',
        headers: buildHeaders(),
        body:    JSON.stringify(body),
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${response.status} sur PATCH ${url}`);
    }
    return response.json();
}

/**
 * Effectue un appel DELETE vers un microservice.
 * @param {string} url
 * @returns {Promise<any>}
 */
async function httpDelete(url) {
    const response = await fetch(url, {
        method:  'DELETE',
        headers: buildHeaders(),
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${response.status} sur DELETE ${url}`);
    }
    return response.json();
}

/**
 * Effectue un upload multipart/form-data (fichiers).
 * @param {string} url
 * @param {FormData} formData
 * @returns {Promise<any>}
 */
async function httpUpload(url, formData) {
    const response = await fetch(url, {
        method:  'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` }, // Pas de Content-Type (multipart auto)
        body:    formData,
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || `HTTP ${response.status} upload sur ${url}`);
    }
    return response.json();
}

// ─── HELPERS GÉNÉRAUX ─────────────────────────────────────────────────────────

/**
 * Transforme un nombre de minutes en label relatif (ex: "Il y a 2h").
 * @param {number} minutes
 * @returns {string}
 */
function formatRelativeTime(minutes) {
    if (minutes < 60) return `Il y a ${minutes} min`;
    const h = Math.floor(minutes / 60);
    if (h < 24) return `Il y a ${h}h`;
    return `Il y a ${Math.floor(h / 24)} jour(s)`;
}

/**
 * Échappe les caractères HTML dangereux pour prévenir les XSS.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ─── EXPORT ───────────────────────────────────────────────────────────────────
if (typeof module !== 'undefined') {
    module.exports = {
        getToken, buildHeaders, requireAuth, logout,
        httpGet, httpPost, httpPatch, httpDelete, httpUpload,
        formatRelativeTime, escapeHtml,
    };
} else {
    window.HttpClient = {
        getToken, buildHeaders, requireAuth, logout,
        httpGet, httpPost, httpPatch, httpDelete, httpUpload,
        formatRelativeTime, escapeHtml,
    };
}
