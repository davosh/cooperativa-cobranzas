function cargarCarteraBaseGoogleSheets() {
    const urlConToken = `${APPS_SCRIPT_URL}?token=${encodeURIComponent(SECRET_TOKEN)}`;

    fetch(urlConToken)
        .then(response => response.json())
        .then(result => {
            if (result.status === "success" && result.data && result.data.length > 1) {
                procesarFilasDirectas(result.data);
            } else {
                console.error("Error de acceso:", result.message);
                alert("❌ No se pudo autenticar la lectura de la cartera base.");
            }
        })
        .catch(err => {
            console.error("Error conectando con el proxy:", err);
        });
}

async function consultarTablaAmortizacion(numPrestamo, nombreSocio) {
    const modal = document.getElementById('modalAmortizacion');
    const title = document.getElementById('modalTitle');
    const loading = document.getElementById('modalLoading');
    const errorDiv = document.getElementById('modalError');
    const container = document.getElementById('modalTableContainer');

    title.innerText = `📋 Tabla de Amortización - Op: ${numPrestamo}`;
    loading.style.display = 'block';
    errorDiv.style.display = 'none';
    container.innerHTML = '';
    modal.style.display = 'flex';

    try {
        // Sanitización estricta de parámetros antes de la consulta
const numLimpio = String(numPrestamo).replace(/[^a-zA-Z0-9]/g, '');
const requestUrl = `${APPS_SCRIPT_URL}?token=${encodeURIComponent(SECRET_TOKEN)}&action=consultaAmortizacion&numeroprestamo=${encodeURIComponent(numLimpio)}`;
        const response = await fetch(requestUrl);
        if (!response.ok) throw new Error(`Error en el servidor proxy (${response.status})`);

        const resResult = await response.json();
        if (resResult.status === "error") throw new Error(resResult.message || "Error al procesar la solicitud.");

        let data = resResult.data;
        if (typeof data === 'string') {
            try { data = JSON.parse(data); } catch(e) {}
        }

        loading.style.display = 'none';
        let listaCuotas = Array.isArray(data) ? data : (data.tabla || data.cuotas || data.data || []);
        
        if (!Array.isArray(listaCuotas) || listaCuotas.length === 0) {
            container.innerHTML = `<p style="text-align:center; color:#64748b;">No se encontraron cuotas para la operación N° ${numPrestamo}.</p>`;
            return;
        }

        let html = `
            <p style="margin-bottom: 8px;"><b>Socio:</b> ${nombreSocio}</p>
            <table class="amort-table">
                <thead>
                    <tr>
                        <th># Cuota</th>
                        <th>Vencimiento</th>
                        <th>Capital ($)</th>
                        <th>Interés ($)</th>
                        <th>Otros / Mora ($)</th>
                        <th>Valor Cuota ($)</th>
                        <th>Estado</th>
                    </tr>
                </thead>
                <tbody>
        `;

        listaCuotas.forEach(c => {
            const numCuota = c.Cuota !== undefined ? c.Cuota : (c.cuota || '-');
            let fechaVenc = c.Fecha || c.fecha_vencimiento || '-';
            if (typeof fechaVenc === 'string' && fechaVenc.includes('T')) {
                fechaVenc = fechaVenc.split('T')[0];
            }

            const capital = parseFloat(c.Capital || 0);
            const interes = parseFloat(c.Interes || 0);
            const otrosXV = parseFloat(c.Otros_x_V || 0);
            const otrosVenc = parseFloat(c.Otros_Venc || 0);
            const moraVal = parseFloat(c.Mora || 0);
            const totalOtrosMora = otrosXV + otrosVenc + moraVal;

            const totalCuotaBackend = c["TOTAL_CUOTA"] || c["TOTAL CUOTA"] || c.Total || c.total || c.valor_cuota;
            const totalCuota = totalCuotaBackend !== undefined ? parseFloat(totalCuotaBackend).toFixed(2) : (capital + interes + totalOtrosMora).toFixed(2);
            
            const estadoRaw = String(c.Estado || 'PENDIENTE').trim().toUpperCase();

            let badgeClass = 'badge-success';
            if (estadoRaw === 'VENCIDA' || estadoRaw === 'VENCIDO' || estadoRaw === 'MORA') {
                badgeClass = 'badge-danger';
            } else if (estadoRaw === 'PAGADO' || estadoRaw === 'PAGADA' || estadoRaw === 'CANCELADO') {
                badgeClass = 'badge-teal';
            } else if (estadoRaw === 'PENDIENTE') {
                badgeClass = 'badge-success';
            }

            html += `
                <tr>
                    <td><b>${numCuota}</b></td>
                    <td>${fechaVenc}</td>
                    <td>$${capital.toFixed(2)}</td>
                    <td>$${interes.toFixed(2)}</td>
                    <td>$${totalOtrosMora.toFixed(2)}</td>
                    <td><strong>$${totalCuota}</strong></td>
                    <td><span class="badge ${badgeClass}">${estadoRaw}</span></td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        container.innerHTML = html;

    } catch (err) {
        console.error("Error al consultar amortización:", err);
        loading.style.display = 'none';
        errorDiv.innerText = `❌ No se pudo obtener la tabla de amortización: ${err.message}`;
        errorDiv.style.display = 'block';
    }
}

function cerrarModalAmortizacion() {
    document.getElementById('modalAmortizacion').style.display = 'none';
}

