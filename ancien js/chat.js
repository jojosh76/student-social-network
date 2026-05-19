// Connexion au Microservice de Chat
const socket = io('https://chat-service.ton-domaine.com', {
    auth: { token: "user-jwt-token" } // Authentification
});

// Écouter les messages entrants
socket.on('new_message', (data) => {
    displayMessage(data.text, "received", data.imgUrl, data.audioUrl);
});

// 1. GESTION DES IMAGES (Upload puis Envoi Socket)
document.getElementById('imageInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        // Étape A : Envoyer au File Service (Simulation)
        const imageUrl = await uploadToFileService(file);
        
        // Étape B : Envoyer l'URL via WebSocket
        const payload = { text: "Image", imgUrl: imageUrl, audioUrl: null };
        socket.emit('send_message', payload);
        
        displayMessage("Image envoyée", "sent", imageUrl);
    }
});

// 2. GESTION DES VOICES
voiceBtn.addEventListener('mouseup', () => {
    mediaRecorder.stop();
    mediaRecorder.ondataavailable = async (e) => {
        const audioBlob = e.data;
        
        // Étape A : Upload du Blob vers le File Service
        const audioUrl = await uploadToFileService(audioBlob);
        
        // Étape B : Envoi via WebSocket
        socket.emit('send_message', { text: "Note vocale", imgUrl: null, audioUrl: audioUrl });
        
        displayMessage("Note vocale", "sent", null, audioUrl);
    };
    voiceBtn.classList.replace('voice-active', 'voice-inactive');
});

// 3. ENVOI TEXTE SIMPLE
function sendMessage() {
    const text = document.getElementById('msgContent').value;
    if (text) {
        const payload = { text: text, imgUrl: null, audioUrl: null };
        
        // Envoi au microservice
        socket.emit('send_message', payload);
        
        displayMessage(text, "sent");
        document.getElementById('msgContent').value = "";
    }
}

// Fonction utilitaire pour simuler l'appel au File Service
async function uploadToFileService(blob) {
    const formData = new FormData();
    formData.append('file', blob);
    // const res = await fetch('https://file-service/upload', { method: 'POST', body: formData });
    // return (await res.json()).url;
    return URL.createObjectURL(blob); // Temporaire pour test local
}