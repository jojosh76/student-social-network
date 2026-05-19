/**
 * ABOUT US - SECURED ADAPTER
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Vérification de l'authentification (Architecture SOA)
    const token = localStorage.getItem('token');
    
    if (!token) {
        // Si pas de token, on redirige vers le login (Accès refusé)
        alert("Accès non autorisé. Veuillez vous connecter.");
        window.location.href = 'index.html';
        return;
    }

    console.log("Utilisateur authentifié sur la page About Us");
});

// 2. Gestion de la déconnexion
document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    
    // On détruit le token (Fin de session côté client)
    localStorage.removeItem('token');
    window.location.href = 'index.html';
});