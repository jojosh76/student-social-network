const searchInput = document.getElementById('globalSearchInput');
const resultsContainer = document.getElementById('searchResults');
let currentFilter = 'all';

// Debounce pour éviter de surcharger le microservice à chaque touche
let timeout = null;
searchInput.addEventListener('input', (e) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => performSearch(e.target.value), 300);
});

async function performSearch(query) {
    if (query.length < 2) return;

    try {
        // Dans une architecture microservices, on interroge l'index consolidé
        const response = await fetch(`http://localhost:3005/api/search?q=${query}&type=${currentFilter}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const results = await response.json();
        renderResults(results);
    } catch (err) {
        console.error("Erreur de recherche:", err);
    }
}

function renderResults(results) {
    resultsContainer.innerHTML = results.map(item => `
        <div class="result-card ${item.type}">
            <div class="result-icon">${getIcon(item.type)}</div>
            <div class="result-content">
                <h4>${item.title}</h4>
                <p>${item.description}</p>
            </div>
            <span class="category-tag">${item.type}</span>
        </div>
    `).join('');
}