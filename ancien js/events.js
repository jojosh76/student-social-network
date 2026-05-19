document.addEventListener('DOMContentLoaded', () => {
    loadEvents();
    setupFilters();
});

async function loadEvents(category = 'all') {
    const grid = document.getElementById('eventsGrid');
    grid.innerHTML = '<div class="loading">Chargement des événements...</div>';

    try {
        // Dans une architecture microservices :
        // const response = await fetch(`http://localhost:5004/api/events?category=${category}`);
        // const events = await response.json();

        // Simulation de données
        const mockEvents = [
            {
                id: 1,
                title: "Hackathon StudNet 2026",
                date: new Date(2026, 4, 15),
                location: "Amphi A",
                category: "academic",
                image: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=500"
            },
            {
                id: 2,
                title: "Gala de fin d'année",
                date: new Date(2026, 5, 20),
                location: "Palais des Congrès",
                category: "social",
                image: "https://images.unsplash.com/photo-1516997121675-4c2d04fe1301?w=500"
            }
        ];

        renderEvents(mockEvents);
    } catch (err) {
        grid.innerHTML = '<p>Erreur lors de la récupération des événements.</p>';
    }
}

function renderEvents(events) {
    const grid = document.getElementById('eventsGrid');
    grid.innerHTML = events.map(event => `
        <div class="event-card card">
            <img src="${event.image}" alt="${event.title}" class="event-banner">
            <div class="event-date-floating">
                <span class="day">${event.date.getDate()}</span>
                <span class="month">${event.date.toLocaleString('fr-FR', {month: 'short'})}</span>
            </div>
            <div class="event-body">
                <span class="event-category">${event.category}</span>
                <h3>${event.title}</h3>
                <div class="event-meta">
                    <i class="fas fa-map-marker-alt"></i> ${event.location}
                </div>
                <button class="btn-participate" onclick="joinEvent(${event.id})">Je participe</button>
            </div>
        </div>
    `).join('');
}

function setupFilters() {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelector('.filter-btn.active').classList.remove('active');
            e.target.classList.add('active');
            loadEvents(e.target.dataset.cat);
        });
    });
}

async function joinEvent(eventId) {
    // Logique Event-Driven :
    // On émet une action vers le EventService qui publiera un événement
    // "USER_JOINED_EVENT" que le NotificationService écoutera pour envoyer un rappel.
    alert(`Inscription enregistrée pour l'événement #${eventId} !`);
}