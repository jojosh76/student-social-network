document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) window.location.href = 'index.html';

    // 1. Charger les infos de l'utilisateur (User Service)
    await loadUserProfile();

    // 2. Charger les posts de cet utilisateur (Post Service)
    await loadUserPosts();
});

async function loadUserProfile() {
    try {
        const response = await fetch('http://localhost:3003/api/users/me', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const user = await response.json();

        document.getElementById('userName').textContent = user.firstName + " " + user.lastName;
        document.getElementById('userBio').textContent = user.bio || "Étudiant StudNet";
        document.getElementById('userMajor').textContent = user.major;
        document.getElementById('userEmail').textContent = user.email;
        if (user.avatar) document.getElementById('userAvatar').src = user.avatar;
    } catch (err) {
        console.error("Erreur User Service:", err);
    }
}

async function loadUserPosts() {
    const postsContainer = document.getElementById('userPosts');
    try {
        // On demande au PostService uniquement les posts de l'utilisateur connecté
        const response = await fetch('http://localhost:3002/api/posts/me', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const posts = await response.json();

        if (posts.length === 0) {
            postsContainer.innerHTML = "<p class='card' style='padding:20px'>Aucune publication pour le moment.</p>";
            return;
        }

        postsContainer.innerHTML = posts.map(post => `
            <article class="post-card card" style="margin-bottom:20px; padding:20px;">
                <small>${new Date(post.createdAt).toLocaleDateString()}</small>
                <p style="margin-top:10px">${post.content}</p>
                ${post.imageUrl ? `<img src="${post.imageUrl}" style="width:100%; border-radius:10px; margin-top:10px;">` : ''}
            </article>
        `).join('');
    } catch (err) {
        console.error("Erreur Post Service:", err);
    }
}

// Gestion de l'upload d'avatar (File Service)
document.getElementById('avatarInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        const formData = new FormData();
        formData.append('file', file);

        // On envoie au File Service
        const uploadRes = await fetch('http://localhost:3006/api/upload', {
            method: 'POST',
            body: formData
        });
        const data = await uploadRes.json();

        // Une fois uploadé, on met à jour le profil via le User Service
        await fetch('http://localhost:3003/api/users/update-avatar', {
            method: 'PATCH',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ avatarUrl: data.url })
        });

        document.getElementById('userAvatar').src = data.url;
    }
});