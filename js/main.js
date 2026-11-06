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