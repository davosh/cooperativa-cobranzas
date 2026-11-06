function iniciarSincronizacionRemota() {
    db.ref('coop_gestiones').on('value', snapshot => {
        gestiones = snapshot.val() || {};
        applyFilters();
    });

    db.ref('coop_compromisos').on('value', snapshot => {
        compromisos = snapshot.val() || {};
        applyFilters();
    });

    db.ref('coop_cobros').on('value', snapshot => {
        cobros = snapshot.val() || {};
        applyFilters();
    });
}

function procesarFilasDirectas(rows) {
    const headers = rows[0].map(h => String(h).trim());
    
    let idxOficial = 19;
    const foundIdxOficial = headers.findIndex(h => h.toLowerCase() === 'oficial');
    if (foundIdxOficial !== -1) idxOficial = foundIdxOficial;

    const idxCedula = headers.findIndex(h => h.toLowerCase().includes('identifica'));
    const idxNombre = headers.findIndex(h => h.toLowerCase() === 'nombre');
    const idxOperacion = headers.findIndex(h => h.toLowerCase().includes('operac'));
    const idxSaldo = headers.findIndex(h => h.toLowerCase().includes('saldo'));
    const idxMora = headers.findIndex(h => h.toLowerCase().includes('mora'));
    const idxFechaPago = headers.findIndex(h => h.toLowerCase().includes('fecha_pago'));
    const idxDireccion = headers.findIndex(h => h.toLowerCase().includes('direccioncliente'));
    const idxTelefono = headers.findIndex(h => h.toLowerCase().includes('telefonocliente'));

    const newCredits = [];

    for (let i = 1; i < rows.length; i++) {
        const r = rows[i];
        if (!r || r.length <= idxNombre) continue;

        const nombre = r[idxNombre !== -1 ? idxNombre : 3];
        if (!nombre || nombre === 'Nombre') continue;

        const cedula = r[idxCedula !== -1 ? idxCedula : 1] || '';
        const operacion = r[idxOperacion !== -1 ? idxOperacion : 4] || '';
        const rawSaldo = r[idxSaldo !== -1 ? idxSaldo : 10] || '0';
        const cleanSaldo = parseFloat(String(rawSaldo).replace(/\./g, '').replace(',', '.'));
        const diasMora = parseInt(r[idxMora !== -1 ? idxMora : 20] || '0');
        
        let oficialVal = r[idxOficial] ? String(r[idxOficial]).trim() : '';
        if (!oficialVal || oficialVal === 'Oficial') oficialVal = 'SIN ASESOR';

        let rawFechaPago = r[idxFechaPago !== -1 ? idxFechaPago : 23] ? String(r[idxFechaPago !== -1 ? idxFechaPago : 23]).trim() : '';
        let fechaPagoLimpia = rawFechaPago ? (rawFechaPago.includes('T') ? rawFechaPago.split('T')[0] : rawFechaPago) : 'N/A';

        const direccion = r[idxDireccion !== -1 ? idxDireccion : 50] || '';
        const telefono = r[idxTelefono !== -1 ? idxTelefono : 51] || '';
        const idClean = String(operacion || cedula || i).replace(/[^a-zA-Z0-9]/g, '');

        let saldoActual = cleanSaldo;
        if (cobros[idClean]) {
            const totalCobrado = cobros[idClean].reduce((acc, curr) => acc + curr.monto, 0);
            saldoActual = Math.max(0, cleanSaldo - totalCobrado);
        }

        newCredits.push({
            id: idClean,
            nombre: String(nombre).trim(),
            cedula: String(cedula).trim(),
            operacion: String(operacion).trim(),
            saldo: isNaN(saldoActual) ? 0 : saldoActual,
            diasMora: isNaN(diasMora) ? 0 : diasMora,
            telefono: String(telefono).trim(),
            oficial: oficialVal,
            direccion: String(direccion).trim(),
            fechaPago: fechaPagoLimpia
        });
    }

    credits = newCredits;
    populateOficialesDropdown();
    applyFilters();
}

function abrirGoogleMaps(direccion) {
    if (!direccion || direccion.trim() === '') {
        alert('El socio no tiene una dirección registrada.');
        return;
    }
    const query = encodeURIComponent(direccion + ', Imbabura, Ecuador');
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
}

function enviarWhatsApp(id) {
    const item = credits.find(c => c.id === id);
    if (!item) return;

    const comp = compromisos[id];
    let mensaje = `Estimado(a) ${item.nombre}, le saludamos de la Cooperativa. Le recordamos mantener al día su crédito N° ${item.operacion}. Saldo pendiente: $${item.saldo.toFixed(2)}.`;
    
    if (comp) {
        mensaje = `Estimado(a) ${item.nombre}, le recordamos su COMPROMISO DE PAGO pactado para el ${comp.fecha} por el valor de $${comp.monto.toFixed(2)} de su crédito N° ${item.operacion}.`;
    } else if (item.diasMora > 0) {
        mensaje = `Estimado(a) ${item.nombre}, su crédito N° ${item.operacion} registra ${item.diasMora} días de mora por $${item.saldo.toFixed(2)}. Le solicitamos regularizar su cuenta hoy.`;
    }

    let phoneClean = item.telefono.replace(/[^0-9]/g, '');
    if (phoneClean.startsWith('0')) phoneClean = '593' + phoneClean.substring(1);

    window.open(`https://wa.me/${phoneClean}?text=${encodeURIComponent(mensaje)}`, '_blank');
}

function registrarCobro(id) {
    const item = credits.find(c => c.id === id);
    if (!item) return;

    const montoInput = prompt(`Saldo actual del socio: $${item.saldo.toFixed(2)}\n\nIngrese el monto recaudado ($):`, item.saldo.toFixed(2));
    if (!montoInput) return;

    const montoPago = parseFloat(montoInput.replace(',', '.'));
    if (isNaN(montoPago) || montoPago <= 0) return;

    const medioPago = prompt("Medio de pago:\n1 = Efectivo\n2 = Transferencia / Depósito\n3 = Cheque", "1");
    let metodoTexto = "Efectivo";
    if (medioPago === "2") metodoTexto = "Transferencia / Depósito";
    if (medioPago === "3") metodoTexto = "Cheque";

    const comprobante = prompt("Comprobante / Recibo (opcional):", "") || "N/A";
    const fechaHora = new Date().toLocaleString('es-EC');

    const listaCobros = cobros[id] || [];
    listaCobros.unshift({ fecha: fechaHora, monto: montoPago, metodo: metodoTexto, comprobante: comprobante });
    db.ref(`coop_cobros/${id}`).set(listaCobros);

    const listaGestiones = gestiones[id] || [];
    listaGestiones.unshift({ fecha: fechaHora, nota: `💵 COBRO RECIBIDO: $${montoPago.toFixed(2)} (${metodoTexto}). Recibo: ${comprobante}` });
    db.ref(`coop_gestiones/${id}`).set(listaGestiones);

    if (compromisos[id]) {
        db.ref(`coop_compromisos/${id}`).remove();
    }
}

function registrarCompromiso(id) {
    const fechaCompromiso = prompt("Fecha pactada para el pago (AAAA-MM-DD):", new Date().toISOString().split('T')[0]);
    if (!fechaCompromiso) return;

    const montoCompromiso = prompt("Monto pactado a cancelar ($):");
    if (!montoCompromiso) return;

    const detalle = prompt("Observación del acuerdo:", "Pago en ventanilla");
    const fechaHora = new Date().toLocaleString('es-EC');

    db.ref(`coop_compromisos/${id}`).set({
        fecha: fechaCompromiso,
        monto: parseFloat(montoCompromiso.replace(',', '.')),
        observacion: detalle || ''
    });

    const listaGestiones = gestiones[id] || [];
    listaGestiones.unshift({ fecha: fechaHora, nota: `🤝 COMPROMISO PACTADO: $${montoCompromiso} para el ${fechaCompromiso}. Obs: ${detalle}` });
    db.ref(`coop_gestiones/${id}`).set(listaGestiones);
}

function populateOficialesDropdown() {
    const dropdown = document.getElementById('filterOficial');
    const currentVal = dropdown.value;
    dropdown.innerHTML = '<option value="TODOS">-- Todos los Asesores --</option>';
    
    const oficiales = [...new Set(credits.map(c => c.oficial))].filter(o => o && o !== 'SIN ASESOR');
    oficiales.sort().forEach(oficial => {
        const opt = document.createElement('option');
        opt.value = oficial;
        opt.textContent = `Asesor: ${oficial}`;
        dropdown.appendChild(opt);
    });
    dropdown.value = currentVal || 'TODOS';
}

function applyFilters() {
    const oficialSelected = document.getElementById('filterOficial').value;
    const estadoSelected = document.getElementById('filterEstado').value;
    const sortBy = document.getElementById('sortBy').value;
    const query = document.getElementById('searchInput').value.toLowerCase();

    const hoyObj = new Date();
    const hoyISO = hoyObj.toISOString().split('T')[0];
    const hoyDiaNum = String(hoyObj.getDate()).padStart(2, '0');
    const hoyStrLoc = hoyObj.toLocaleDateString('es-EC');

    let result = credits.filter(c => {
        const matchOficial = (oficialSelected === 'TODOS') || (c.oficial === oficialSelected);
        const matchSearch = c.nombre.toLowerCase().includes(query) || 
                            c.cedula.includes(query) || 
                            c.operacion.toLowerCase().includes(query);
        
        let matchEstado = true;
        if (estadoSelected === 'PAGAN_HOY') {
            const compHoy = compromisos[c.id] && compromisos[c.id].fecha === hoyISO;
            const fechaPagoDia = c.fechaPago && c.fechaPago.split('/')[0] === hoyDiaNum;
            matchEstado = compHoy || fechaPagoDia;
        } else if (estadoSelected === 'CON_COMPROMISO') {
            matchEstado = !!compromisos[c.id];
        } else if (estadoSelected === 'EN_MORA') {
            matchEstado = c.diasMora > 0 && c.saldo > 0;
        } else if (estadoSelected === 'CANCELADO') {
            matchEstado = c.saldo === 0;
        }

        return matchOficial && matchSearch && matchEstado;
    });

    const totalSaldo = result.reduce((acc, curr) => acc + curr.saldo, 0);
    const paganHoyCount = result.filter(c => {
        const compHoy = compromisos[c.id] && compromisos[c.id].fecha === hoyISO;
        const fechaPagoDia = c.fechaPago && c.fechaPago.split('/')[0] === hoyDiaNum;
        return compHoy || fechaPagoDia;
    }).length;

    let totalRecaudadoHoy = 0;
    Object.keys(cobros).forEach(id => {
        const socio = credits.find(c => c.id === id);
        if (socio && (oficialSelected === 'TODOS' || socio.oficial === oficialSelected)) {
            cobros[id].forEach(cb => {
                if (cb.fecha.includes(hoyStrLoc) || cb.fecha.includes(hoyISO)) {
                    totalRecaudadoHoy += cb.monto;
                }
            });
        }
    });

    document.getElementById('kpiTotal').innerText = result.length;
    document.getElementById('kpiSaldo').innerText = '$' + totalSaldo.toLocaleString('en-US', {minimumFractionDigits: 2});
    document.getElementById('kpiHoy').innerText = paganHoyCount;
    document.getElementById('kpiRecaudado').innerText = '$' + totalRecaudadoHoy.toLocaleString('en-US', {minimumFractionDigits: 2});

    render(result);
}

function render(data) {
    const clientsList = document.getElementById('clientsList');
    document.getElementById('count').innerText = data.length;
    clientsList.innerHTML = '';

    if (data.length === 0) {
        clientsList.innerHTML = '<p style="color: #64748b;">No hay socios registrados.</p>';
        return;
    }

    const hoyISO = new Date().toISOString().split('T')[0];

    data.slice(0, 100).forEach(item => {
        const div = document.createElement('div');
        let cardClass = item.saldo === 0 ? 'cancelado' : (item.diasMora > 30 ? 'mora-alta' : (item.diasMora > 0 ? 'mora-media' : 'al-dia'));
        let estadoTexto = item.saldo === 0 ? '✅ CANCELADO / $0' : (item.diasMora > 0 ? `🚨 MORA (${item.diasMora} DÍAS)` : 'AL DÍA');
        let badgeClass = item.saldo === 0 ? 'badge-teal' : (item.diasMora > 30 ? 'badge-danger' : (item.diasMora > 0 ? 'badge-warning' : 'badge-success'));

        div.className = `client-card ${cardClass}`;

        const comp = compromisos[item.id];
        let htmlCompromiso = '';
        if (comp && item.saldo > 0) {
            let alertStyle = 'compromiso-alert' + (comp.fecha === hoyISO ? ' compromiso-hoy' : (comp.fecha < hoyISO ? ' compromiso-vencido' : ''));
            htmlCompromiso = `
                <div class="${alertStyle}">
                    🤝 COMPROMISO DE PAGO: $${comp.monto.toFixed(2)} para el ${comp.fecha}
                    <br><small style="font-weight:normal;">Obs: ${comp.observacion}</small>
                </div>
            `;
        }

        const listaVisitas = gestiones[item.id] || [];
        let htmlVisitas = listaVisitas.length > 0 ? `
            <div class="historial-box">
                <strong>📌 Bitácora Compartida de la Agencia (${listaVisitas.length}):</strong>
                ${listaVisitas.map(v => `<div class="visita-item"><small><b>[${v.fecha}]:</b> ${v.nota}</small></div>`).join('')}
            </div>
        ` : '';

        div.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <strong>${item.nombre}</strong>
                <div>
                    ${comp && item.saldo > 0 ? '<span class="badge badge-indigo">CON COMPROMISO</span> ' : ''}
                    <span class="badge ${badgeClass}">${estadoTexto}</span>
                </div>
            </div>
            <p style="margin: 4px 0; font-size: 0.85rem;">🆔 Cédula: <b>${item.cedula}</b> | Op: <b>${item.operacion}</b> | Asesor: <b>${item.oficial}</b></p>
            <p style="margin: 4px 0; font-size: 0.85rem;">📍 Dirección: ${item.direccion || 'Sin registro'}</p>
            <p style="margin: 4px 0; font-size: 0.85rem;">📱 Teléfono: ${item.telefono || 'Sin registro'} | Fecha Pago: ${item.fechaPago || 'N/A'}</p>
            <p style="margin: 4px 0; font-size: 0.95rem;">💰 Saldo Pendiente: <strong>$${item.saldo.toFixed(2)}</strong></p>
            ${htmlCompromiso}
            <div style="margin-top: 8px;">
                <button class="btn-small btn-teal" onclick="registrarCobro('${item.id}')">💵 Registrar Cobro</button>
                <button class="btn-small btn-success" onclick="enviarWhatsApp('${item.id}')">📲 WhatsApp</button>
                <button class="btn-small btn-warning" onclick="abrirGoogleMaps('${item.direccion.replace(/'/g, "\\'")}')">🗺️ Maps</button>
                <button class="btn-small btn-indigo" onclick="registrarCompromiso('${item.id}')">🤝 Compromiso</button>
                <button class="btn-small btn-purple" onclick="registrarVisita('${item.id}')">📍 Visita GPS</button>
                <button class="btn-small btn-cyan" onclick="consultarTablaAmortizacion('${item.operacion}', '${item.nombre.replace(/'/g, "\\'")}')">📋 Tabla Amortización</button>
            </div>
            ${htmlVisitas}
        `;
        clientsList.appendChild(div);
    });
}
function switchTab(tabName, element) {
    currentTab = tabName;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    element.classList.add('active');
    applyFilters();
}

function applyFilters() {
    const oficialSelected = document.getElementById('filterOficial').value;
    const sortBy = document.getElementById('sortBy').value;
    const query = document.getElementById('searchInput').value.toLowerCase();

    const hoyObj = new Date();
    const hoyISO = hoyObj.toISOString().split('T')[0];
    const hoyDiaNum = String(hoyObj.getDate()).padStart(2, '0');
    const hoyStrLoc = hoyObj.toLocaleDateString('es-EC');

    let result = credits.filter(c => {
        const matchOficial = (oficialSelected === 'TODOS') || (c.oficial === oficialSelected);
        const matchSearch = c.nombre.toLowerCase().includes(query) || 
                            c.cedula.includes(query) || 
                            c.operacion.toLowerCase().includes(query);
        
        let matchEstado = true;
        if (currentTab === 'PAGAN_HOY') {
            const compHoy = compromisos[c.id] && compromisos[c.id].fecha === hoyISO;
            const fechaPagoDia = c.fechaPago && (c.fechaPago.startsWith(hoyISO) || c.fechaPago.split('/')[0] === hoyDiaNum || c.fechaPago.split('-')[2] === hoyDiaNum);
            matchEstado = compHoy || fechaPagoDia;
        } else if (currentTab === 'CON_COMPROMISO') {
            matchEstado = !!compromisos[c.id];
        } else if (currentTab === 'EN_MORA') {
            matchEstado = c.diasMora > 0 && c.saldo > 0;
        } else if (currentTab === 'CANCELADO') {
            matchEstado = c.saldo === 0;
        }

        return matchOficial && matchSearch && matchEstado;
    });

    if (sortBy === 'mora_desc') {
        result.sort((a, b) => b.diasMora - a.diasMora);
    } else if (sortBy === 'saldo_desc') {
        result.sort((a, b) => b.saldo - a.saldo);
    } else if (sortBy === 'nombre_asc') {
        result.sort((a, b) => a.nombre.localeCompare(b.nombre));
    }

    const totalSaldo = result.reduce((acc, curr) => acc + curr.saldo, 0);
    const paganHoyCount = credits.filter(c => {
        const compHoy = compromisos[c.id] && compromisos[c.id].fecha === hoyISO;
        const fechaPagoDia = c.fechaPago && (c.fechaPago.startsWith(hoyISO) || c.fechaPago.split('/')[0] === hoyDiaNum || c.fechaPago.split('-')[2] === hoyDiaNum);
        return compHoy || fechaPagoDia;
    }).length;

    let totalRecaudadoHoy = 0;
    Object.keys(cobros).forEach(id => {
        const socio = credits.find(c => c.id === id);
        if (socio && (oficialSelected === 'TODOS' || socio.oficial === oficialSelected)) {
            cobros[id].forEach(cb => {
                if (cb.fecha.includes(hoyStrLoc) || cb.fecha.includes(hoyISO)) {
                    totalRecaudadoHoy += cb.monto;
                }
            });
        }
    });

    document.getElementById('kpiTotal').innerText = result.length;
    document.getElementById('kpiSaldo').innerText = '$' + totalSaldo.toLocaleString('en-US', {minimumFractionDigits: 2});
    document.getElementById('kpiHoy').innerText = paganHoyCount;
    document.getElementById('kpiRecaudado').innerText = '$' + totalRecaudadoHoy.toLocaleString('en-US', {minimumFractionDigits: 2});

    render(result);
}