import { Servicio, Agenda } from "./models.js";

export const CONFIG_ESTUDIO = {
    nombre: "Lashes Coty",
    whatsappNumero: "5491138219738",
    aliasBancario: "LASHES.COTY.MP"
};

export const serviciosCatalogo = [
    new Servicio(1, "Extensiones Clásicas (Pelo por Pelo)", 90, 18000, 50),
    new Servicio(2, "Volumen Ruso / Mega Volumen", 120, 24000, 50),
    new Servicio(3, "Lifting de Pestañas + Tinte", 60, 14000, 50),
    new Servicio(4, "Perfilado y Laminado de Cejas", 45, 11000, 50),
    new Servicio(5, "Service / Retoque (15 días)", 60, 12000, 50)
];

const agenda = new Agenda(540, 1140, 30);

const selectServicio = document.getElementById("servicio");
const inputFecha = document.getElementById("fecha");
const horariosContainer = document.getElementById("horarios-container");
const inputHoraSeleccionada = document.getElementById("hora-seleccionada");
const bookingForm = document.getElementById("booking-form");
const montoSeniaEl = document.getElementById("monto-senia");
const aliasTextoEl = document.getElementById("alias-texto");
const btnCopiarAlias = document.getElementById("btn-copiar-alias");

async function inicializarApp() {
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
    await renderizarHorarios();
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

btnCopiarAlias.addEventListener("click", async () => {
    const alias = CONFIG_ESTUDIO.aliasBancario;
    try {
        await navigator.clipboard.writeText(alias);
    } catch {
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

async function renderizarHorarios() {
    horariosContainer.innerHTML = `<p class="hint">Cargando horarios disponibles...</p>`;
    inputHoraSeleccionada.value = "";

    const servicio = obtenerServicioSeleccionado();
    const fecha = inputFecha.value;
    if (!servicio || !fecha) return;

    const disponibles = await agenda.obtenerHorariosDisponibles(fecha, servicio);
    horariosContainer.innerHTML = "";

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

inputFecha.addEventListener("change", renderizarHorarios);

bookingForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const horaSeleccionada = inputHoraSeleccionada.value;
    if (!horaSeleccionada) {
        alert("Por favor, seleccioná un horario disponible antes de confirmar.");
        return;
    }

    const btnSubmit = bookingForm.querySelector("button[type='submit']");
    btnSubmit.disabled = true;
    btnSubmit.textContent = "Reservando turno...";

    const servicio = obtenerServicioSeleccionado();
    const fecha = inputFecha.value;
    const nombre = document.getElementById("nombre").value.trim();
    const telefono = document.getElementById("telefono").value.trim();

    try {
        const turnoCreado = await agenda.agendarTurno(nombre, telefono, servicio, fecha, parseInt(horaSeleccionada));
        bookingForm.reset();
        inputFecha.value = fecha;
        actualizarMontoSenia();
        await renderizarHorarios();
        abrirWhatsAppComprobante(turnoCreado);
    } catch (error) {
        alert(error.message);
        await renderizarHorarios();
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.textContent = "Reservar y Enviar Comprobante por WhatsApp";
    }
});

inicializarApp();