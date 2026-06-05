/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║           STUDNET — POST SERVICE (SOA)                           ║
 * ║  Couche Service : logique métier des publications               ║
 * ║  Consomme : PostService Microservice via API Gateway             ║
 * ╚══════════════════════════════════════════════════════════════════╝
 *
 * Patterns appliqués :
 *   - CQRS : séparation commandes (like, create) / requêtes (getAll, getMe)
 *   - Optimistic Update : la UI se met à jour avant confirmation serveur
 */

'use strict';

/* global HttpClient, ServiceRegistry, DTOs */

const PostService = (() => {
    const BASE = ServiceRegistry.resolveService('posts');

    return {
        /**
         * [Query] Récupère tous les posts du fil d'actualité.
         * @returns {Promise<Object[]>}
         */
        async getAll() {
            return HttpClient.httpGet(`${BASE}`);
        },

        /**
         * [Query] Récupère les posts de l'utilisateur connecté.
         * @returns {Promise<Object[]>}
         */
        async getMyPosts() {
            return HttpClient.httpGet(`${BASE}/me`);
        },

        /**
         * [Command - CreatePostCommand] Publie un nouveau post.
         * @param {{ authorId: string, content: string, type: string, imageUrl?: string }} params
         * @returns {Promise<Object>} Post créé
         */
        async create(params) {
            const dto = DTOs.CreatePostCommand(params);
            return HttpClient.httpPost(`${BASE}`, dto);
        },

        /**
         * [Command - WriteCommand] Ajoute ou retire un like sur un post.
         * Note : Le retour serveur confirme le nouvel état (liked / unliked).
         * @param {string} postId
         * @returns {Promise<{ liked: boolean, likes: number }>}
         */
        async toggleLike(postId) {
            return HttpClient.httpPost(`${BASE}/${postId}/like`, {});
        },

        async getComments(postId) {
            return HttpClient.httpGet(`${BASE}/${postId}/comments`);
        },

        async addComment(postId, content) {
            return HttpClient.httpPost(`${BASE}/${postId}/comments`, { content });
        },
    };
})();

if (typeof module !== 'undefined') {
    module.exports = { PostService };
} else {
    window.PostService = PostService;
}
