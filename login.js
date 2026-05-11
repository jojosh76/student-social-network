/**

 * LOGIN ADAPTER

 * Respecte le principe de séparation des responsabilités

 */


document.getElementById('loginForm').addEventListener('submit', async (e) => {

    e.preventDefault();


    // 1. Extraction des données (Input)

    const email = document.getElementById('email').value;

    const password = document.getElementById('password').value;


    // 2. Création de l'objet de commande (DTO - Data Transfer Object)

    const loginCommand = {

        email: email,

        password: password,

        requestDate: new Date().toISOString()

    };


    try {

        // 3. Appel au Service d'Authentification (SOA)

        const response = await fetch('http://localhost:5000/api/auth/login', {

            method: 'POST',

            headers: {

                'Content-Type': 'application/json',

                'Accept': 'application/json'

            },

            body: JSON.stringify(loginCommand)

        });


        const result = await response.json();


        if (response.ok) {

            // Stockage du JWT (Clean Architecture : On stocke le token de session)

            localStorage.setItem('token', result.token);

            alert("Connexion réussie ! Redirection vers le Dashboard...");

            window.location.href = 'dashboard.html';

        } else {

            alert("Erreur : " + (result.message || "Identifiants invalides"));

        }


    } catch (error) {

        console.error("Erreur Réseau/Service :", error);

        alert("Le service d'authentification est indisponible.");

    }

});