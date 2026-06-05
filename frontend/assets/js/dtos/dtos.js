/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║           STUDNET — DATA TRANSFER OBJECTS (DTOs)                 ║
 * ║  Définition et construction de tous les DTOs de la plateforme    ║
 * ║  Pattern : DTO (Data Transfer Object) + Factory Method          ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Règle : Aucun adapteur n'envoie de données brutes.
 * Toute donnée sortante est construite via un DTO.
 */

'use strict';

// ─── AUTH DTOs ────────────────────────────────────────────────────────────────

/**
 * DTO de commande de connexion.
 * @param {string} email
 * @param {string} password
 * @returns {{ email: string, password: string, requestDate: string }}
 */
function LoginCommand(email, password) {
    return {
        email,
        password,
        requestDate: new Date().toISOString(),
    };
}

/**
 * DTO de commande d'inscription.
 * @param {Object} p
 * @returns {Object}
 */
function RegisterCommand({ firstName, lastName, major, email, password }) {
    return {
        firstName,
        lastName,
        academicInfo: {
            major,
            year: 'L3',
        },
        credentials: { email, password },
    };
}

// ─── POST DTOs ────────────────────────────────────────────────────────────────

/**
 * Commande de création d'un post.
 * @param {Object} p
 * @returns {Object}
 */
function CreatePostCommand({ authorId, content, type, imageUrl = null }) {
    return { authorId, content, type, imageUrl };
}

// ─── USER DTOs ────────────────────────────────────────────────────────────────

/**
 * Commande de mise à jour d'avatar.
 * @param {string} avatarUrl
 * @returns {{ avatarUrl: string }}
 */
function UpdateAvatarCommand(avatarUrl) {
    return { avatarUrl };
}

// ─── CHAT DTOs ────────────────────────────────────────────────────────────────

/**
 * DTO de message sortant vers le ChatService (WebSocket).
 * @param {Object} p
 * @returns {Object}
 */
function ChatMessagePayload({ conversationId = null, text, imgUrl = null, imageUrl = null, audioUrl = null }) {
    return { conversationId, text, imgUrl, imageUrl: imageUrl || imgUrl, audioUrl };
}

// ─── EXPORT ───────────────────────────────────────────────────────────────────
if (typeof module !== 'undefined') {
    module.exports = {
        LoginCommand,
        RegisterCommand,
        CreatePostCommand,
        UpdateAvatarCommand,
        ChatMessagePayload,
    };
} else {
    window.DTOs = {
        LoginCommand,
        RegisterCommand,
        CreatePostCommand,
        UpdateAvatarCommand,
        ChatMessagePayload,
    };
}
