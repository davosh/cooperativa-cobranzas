auth.onAuthStateChanged(user => {
    if (user) {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('appContent').style.display = 'block';
        document.getElementById('userDisplay').innerText = user.email;
        
        iniciarSincronizacionRemota();
        cargarCarteraBaseGoogleSheets();
    } else {
        document.getElementById('loginScreen').style.display = 'block';
        document.getElementById('appContent').style.display = 'none';
    }
});

async function ejecutarLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const errorDiv = document.getElementById('loginError');
    const btn = document.getElementById('btnLogin');

    errorDiv.style.display = 'none';
    if (!email || !password) {
        errorDiv.innerText = "Por favor ingrese su correo y contraseña.";
        errorDiv.style.display = 'block';
        return;
    }

    btn.innerText = "Verificando...";
    btn.disabled = true;

    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (err) {
        console.error(err);
        btn.innerText = "🔒 Iniciar Sesión";
        btn.disabled = false;
        
        let msg = "Credenciales incorrectas o usuario no registrado.";
        if (err.code === 'auth/operation-not-allowed') {
            msg = "⚠️ ERROR: Debes activar 'Correo electrónico/Contraseña' en Firebase Console > Authentication.";
        } else if (err.code === 'auth/user-not-found') {
            msg = "El usuario no existe en Firebase Authentication.";
        } else if (err.code === 'auth/wrong-password') {
            msg = "Contraseña incorrecta.";
        } else if (err.code === 'auth/invalid-email') {
            msg = "El correo electrónico ingresado no es válido.";
        }
        
        errorDiv.innerText = msg;
        errorDiv.style.display = 'block';
    }
}

function cerrarSesion() {
    if (confirm("¿Deseas cerrar tu sesión?")) {
        auth.signOut();
    }
}