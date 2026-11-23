// Configuración del estudio (editable en un solo lugar)
const CONFIG_ESTUDIO = {
    nombre: "Lashes Coty",
    whatsappNumero: "5491138219738", // Formato internacional sin + ni espacios (549 + código de área + número)
    aliasBancario: "LASHES.COTY.MP"
};

// 1. Catálogo de servicios (incluye 50% de seña por defecto)
const serviciosCatalogo = [
    new Servicio(1, "Extensiones Clásicas (Pelo por Pelo)", 90, 18000, 50),
    new Servicio(2, "Volumen Ruso / Mega Volumen", 120, 24000, 50),
    new Servicio(3, "Lifting de Pestañas + Tinte", 60, 14000, 50),
    new Servicio(4, "Perfilado y Laminado de Cejas", 45, 11000, 50),
    new Servicio(5, "Service / Retoque (15 días)", 60, 12000, 50)
];

const agenda = new Agenda(540, 1140, 30);

// Referencias al DOM
const selectServicio = document.getElementById("servicio");
const inputFecha = document.getElementById("fecha");
const horariosContainer = document.getElementById("horarios-container");
const inputHoraSeleccionada = document.getElementById("hora-seleccionada");
const bookingForm = document.getElementById("booking-form");
const listaTurnos = document.getElementById("lista-turnos");
const contadorTurnos = document.getElementById("contador-turnos");
const montoSeniaEl = document.getElementById("monto-senia");
const aliasTextoEl = document.getElementById("alias-texto");
const btnCopiarAlias = document.getElementById("btn-copiar-alias");

function inicializarApp() {
    aliasTextoEl.textContent = CONFIG_ESTUDIO.aliasBancario;

    serviciosCatalogo.forEach(servicio => {
        const option = document.createElement("option");
        option.value = servicio.id;
        option.textContent = `${servicio.nombre} (${servicio.duracionMinutos} min) — $${servicio.precio.toLocaleString('es-AR')}`;
        selectServicio.appendChild(option);
    });

    const hoy = new Date().toISOString().split("T")[0];
    inputFecha.min = hoy;
    inputFecha.value = hoy;

    actualizarMontoSenia();
    actualizarVista();
}

function obtenerServicioSeleccionado() {
    const servicioId = parseInt(selectServicio.value);
    return serviciosCatalogo.find(s => s.id === servicioId);
}

function actualizarMontoSenia() {
    const servicio = obtenerServicioSeleccionado();
    if (servicio) {
        montoSeniaEl.textContent = `$${servicio.obtenerMontoSenia().toLocaleString('es-AR')}`;
    }
}

// Botón Copiar Alias compatible con celulares y navegador de Instagram
btnCopiarAlias.addEventListener("click", async () => {
    const alias = CONFIG_ESTUDIO.aliasBancario;
    try {
        await navigator.clipboard.writeText(alias);
    } catch {
        // Fallback para navegadores embebidos restrictivos
        const tempInput = document.createElement("input");
        tempInput.value = alias;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand("copy");
        document.body.removeChild(tempInput);
    }

    btnCopiarAlias.textContent = "¡Copiado!";
    btnCopiarAlias.classList.add("copied");
    setTimeout(() => {
        btnCopiarAlias.textContent = "Copiar Alias";
        btnCopiarAlias.classList.remove("copied");
    }, 2000);
});

function renderizarHorarios() {
    horariosContainer.innerHTML = "";
    inputHoraSeleccionada.value = "";

    const servicio = obtenerServicioSeleccionado();
    const fecha = inputFecha.value;
    if (!servicio || !fecha) return;

    const disponibles = agenda.obtenerHorariosDisponibles(fecha, servicio);

    if (disponibles.length === 0) {
        horariosContainer.innerHTML = `<p class="hint">No quedan horarios disponibles para esta fecha y duración.</p>`;
        return;
    }

    disponibles.forEach(minutos => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "slot-btn";
        btn.textContent = Agenda.formatearHora(minutos);

        btn.addEventListener("click", () => {
            document.querySelectorAll(".slot-btn").forEach(b => b.classList.remove("selected"));
            btn.classList.add("selected");
            inputHoraSeleccionada.value = minutos;
        });

        horariosContainer.appendChild(btn);
    });
}

function renderizarAgendaDelDia() {
    const fecha = inputFecha.value;
    const turnosDelDia = agenda.turnos
        .filter(t => t.fecha === fecha)
        .sort((a, b) => a.horaInicio - b.horaInicio);

    contadorTurnos.textContent = `${turnosDelDia.length} ${turnosDelDia.length === 1 ? 'turno' : 'turnos'}`;
    listaTurnos.innerHTML = "";

    if (turnosDelDia.length === 0) {
        listaTurnos.innerHTML = `<p class="hint">No hay turnos agendados para esta fecha.</p>`;
        return;
    }

    turnosDelDia.forEach(turno => {
        const item = document.createElement("div");
        item.className = "appointment-item";

        const horaInicioTexto = Agenda.formatearHora(turno.horaInicio);
        const horaFinTexto = Agenda.formatearHora(turno.horaFin);
        const esConfirmado = turno.estado === "CONFIRMADO";

        item.innerHTML = `
            <div class="appointment-info">
                <strong>${horaInicioTexto} - ${horaFinTexto} | ${turno.clienteNombre}</strong>
                <span>${turno.servicio.nombre} • Tel: ${turno.clienteTelefono}</span>
                <span class="status-pill ${esConfirmado ? 'status-confirmed' : 'status-pending'}">
                    ${esConfirmado ? 'Seña Confirmada' : 'Pendiente de Seña'}
                </span>
            </div>
            <div class="item-actions">
                ${!esConfirmado ? `<button class="btn-confirm-deposit" data-id="${turno.id}">Aprobar Seña</button>` : ''}
                <button class="btn-cancel" data-id="${turno.id}">Cancelar</button>
            </div>
        `;

        if (!esConfirmado) {
            item.querySelector(".btn-confirm-deposit").addEventListener("click", () => {
                agenda.confirmarSenia(turno.id);
                actualizarVista();
            });
        }

        item.querySelector(".btn-cancel").addEventListener("click", () => {
            agenda.eliminarTurno(turno.id);
            actualizarVista();
        });

        listaTurnos.appendChild(item);
    });
}

function actualizarVista() {
    renderizarHorarios();
    renderizarAgendaDelDia();
}

function formatearFechaLegible(fechaISO) {
    const [anio, mes, dia] = fechaISO.split("-");
    return `${dia}/${mes}/${anio}`;
}

function abrirWhatsAppComprobante(turno) {
    const fechaLegible = formatearFechaLegible(turno.fecha);
    const horaTexto = Agenda.formatearHora(turno.horaInicio);
    const seniaTexto = turno.servicio.obtenerMontoSenia().toLocaleString('es-AR');

    const mensaje = `Hola Coty! Acabo de reservar un turno en *${CONFIG_ESTUDIO.nombre}*:\n\n` +
        `✨ *Servicio:* ${turno.servicio.nombre}\n` +
        `📅 *Fecha:* ${fechaLegible}\n` +
        `⏰ *Horario:* ${horaTexto} hs\n` +
        `👤 *Nombre:* ${turno.clienteNombre}\n` +
        `💸 *Seña:* $${seniaTexto}\n\n` +
        `Te adjunto el comprobante de transferencia para confirmar el turno 👇`;

    const url = `https://wa.me/${CONFIG_ESTUDIO.whatsappNumero}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank");
}

selectServicio.addEventListener("change", () => {
    actualizarMontoSenia();
    renderizarHorarios();
});

inputFecha.addEventListener("change", actualizarVista);

bookingForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const horaSeleccionada = inputHoraSeleccionada.value;
    if (!horaSeleccionada) {
        alert("Por favor, seleccioná un horario disponible antes de confirmar.");
        return;
    }

    const servicio = obtenerServicioSeleccionado();
    const fecha = inputFecha.value;
    const nombre = document.getElementById("nombre").value.trim();
    const telefono = document.getElementById("telefono").value.trim();

    try {
        const turnoCreado = agenda.agendarTurno(nombre, telefono, servicio, fecha, parseInt(horaSeleccionada));
        bookingForm.reset();
        inputFecha.value = fecha;
        actualizarMontoSenia();
        actualizarVista();
        abrirWhatsAppComprobante(turnoCreado);
    } catch (error) {
        alert(error.message);
    }
});

inicializarApp();