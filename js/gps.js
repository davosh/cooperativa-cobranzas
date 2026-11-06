function registrarVisita(id) {
    if (!navigator.geolocation) {
        alert("❌ ERROR CRÍTICO: Tu navegador no soporta GPS.");
        return;
    }

    alert("📡 Obteniendo ubicación GPS...");

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;

            const result = prompt("✅ GPS obtenido.\n\nIngrese la observación de la visita:");
            if (!result || !result.trim()) {
                alert("Visita cancelada.");
                return;
            }

            const fechaHora = new Date().toLocaleString('es-EC');
            const listaGestiones = gestiones[id] || [];
            const notaConGps = `${result.trim()} | 📍 GPS: <a href="${mapsUrl}" target="_blank">Ver Ubicación (${lat.toFixed(5)}, ${lng.toFixed(5)})</a>`;

            listaGestiones.unshift({ fecha: fechaHora, nota: notaConGps });
            db.ref(`coop_gestiones/${id}`).set(listaGestiones);
            alert("¡Visita registrada con éxito!");
        },
        (error) => {
            let mensaje = "No se pudo obtener el GPS.";
            if (error.code === error.PERMISSION_DENIED) {
                mensaje = "❌ ACCESO DENEGADO: Permite el acceso al GPS en el navegador.";
            } else if (error.code === error.POSITION_UNAVAILABLE) {
                mensaje = "❌ GPS NO DISPONIBLE: Activa la ubicación en los ajustes del teléfono.";
            } else if (error.code === error.TIMEOUT) {
                mensaje = "⏳ TIEMPO AGOTADO: Reintenta en un espacio abierto.";
            }
            alert(mensaje + "\n\n⚠️ REGISTRO CANCELADO.");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
}