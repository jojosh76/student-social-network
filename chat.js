let mediaRecorder;
let audioChunks = [];

document.getElementById('sendBtn').addEventListener('click', sendMessage);

// 1. GESTION DES IMAGES (Envoi vers Service de Stockage)
document.getElementById('imageInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
        // En Microservices, on enverrait ce Blob vers un service S3 ou FileService
        displayMessage("Image envoyée (Simulation)", "sent", URL.createObjectURL(file));
    }
});

// 2. GESTION DE LA CAMÉRA
document.getElementById('cameraBtn').addEventListener('click', async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    const video = document.getElementById('cameraPreview');
    // Logique pour prendre une capture...
    alert("Caméra activée pour capture photo");
    stream.getTracks().forEach(track => track.stop());
});

// 3. GESTION DES VOICES (Audio Recording)
const voiceBtn = document.getElementById('voiceBtn');
voiceBtn.addEventListener('mousedown', async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.start();
    voiceBtn.classList.replace('voice-inactive', 'voice-active');
});

voiceBtn.addEventListener('mouseup', () => {
    mediaRecorder.stop();
    mediaRecorder.ondataavailable = (e) => {
        const audioUrl = URL.createObjectURL(e.data);
        displayMessage("Note vocale", "sent", null, audioUrl);
    };
    voiceBtn.classList.replace('voice-active', 'voice-inactive');
});

function sendMessage() {
    const text = document.getElementById('msgContent').value;
    if (text) {
        displayMessage(text, "sent");
        document.getElementById('msgContent').value = "";
    }
}

function displayMessage(text, type, imgUrl = null, audioUrl = null) {
    const container = document.getElementById('messageDisplay');
    const div = document.createElement('div');
    div.className = `message ${type}`;
    
    if (imgUrl) div.innerHTML = `<img src="${imgUrl}" class="chat-img">`;
    else if (audioUrl) div.innerHTML = `<audio controls src="${audioUrl}"></audio>`;
    else div.innerText = text;

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}