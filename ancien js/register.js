/**
 * REGISTER ADAPTER
 */

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    // 1. Capture des éléments du formulaire
    const firstname = document.getElementById('firstname').value;
    const lastname = document.getElementById('lastname').value;
    const major = document.getElementById('major').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    // 2. Construction du RegisterCommand (Format JSON strict)
    const registerCommand = {
        firstName: firstname,
        lastName: lastname,
        academicInfo: {
            major: major,
            year: "L3" // On peut le rendre dynamique plus tard
        },
        credentials: {
            email: email,
            password: password
        }
    };

    try {
        const response = await fetch('http://localhost:3000/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(registerCommand)
        });

        if (response.status === 201) {
            alert("Inscription validée ! Tu peux maintenant te connecter.");
            window.location.href = 'index.html';
        } else {
            const errorData = await response.json();
            alert("Échec de l'inscription : " + errorData.message);
        }

    } catch (error) {
        alert("Impossible de joindre le serveur d'inscription.");
    }
});