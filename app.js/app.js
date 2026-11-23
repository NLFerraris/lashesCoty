// 1. Catálogo inicial de servicios del estudio
const serviciosCatalogo = [
    new Servicio(1, "Extensiones Clásicas (Pelo por Pelo)", 90, 18000),
    new Servicio(2, "Volumen Ruso / Mega Volumen", 120, 24000),
    new Servicio(3, "Lifting de Pestañas + Tinte", 60, 14000),
    new Servicio(4, "Perfilado y Laminado de Cejas", 45, 11000),
    new Servicio(5, "Service / Retoque (15 días)", 60, 12000)
];

// 2. Instanciamos la Agenda (09:00 a 19:00 hs, bloques de 30 min)
const agenda = new Agenda(540, 1140, 30);

// 3. Referencias a los elementos del DOM
const selectServicio = document.getElementById("servicio");
const inputFecha = document.getElementById("fecha");
const horariosContainer = document.getElementById("horarios-container");
const inputHoraSeleccionada = document.getElementById("hora-seleccionada");
const bookingForm = document.getElementById("booking-form");
const listaTurnos = document.getElementById("lista-turnos");
const contadorTurnos = document.getElementById("contador-turnos");

// 4. Inicialización al cargar la página
function inicializarApp() {
    // Cargar opciones en el select de servicios
    serviciosCatalogo.forEach(servicio => {
        const option = document.createElement("option");
        option.value = servicio.id;
        option.textContent = `${servicio.nombre} (${servicio.duracionMinutos} min) — $${servicio.precio.toLocaleString('es-AR')}`;
        selectServicio.appendChild(option);
    });

    // Configurar fecha mínima y valor por defecto (hoy)
    const hoy = new Date().toISOString().split("T")[0];
    inputFecha.min = hoy;
    inputFecha.value = hoy;

    actualizarVista();
}

// 5. Renderizar botones de horarios disponibles según servicio y fecha
function renderizarHorarios() {
    horariosContainer.innerHTML = "";
    inputHoraSeleccionada.value = "";

    const servicioId = parseInt(selectServicio.value);
    const servicio = serviciosCatalogo.find(s => s.id === servicioId);
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
            // Quitar selección previa y marcar el botón actual
            document.querySelectorAll(".slot-btn").forEach(b => b.classList.remove("selected"));
            btn.classList.add("selected");
            inputHoraSeleccionada.value = minutos;
        });

        horariosContainer.appendChild(btn);
    });
}

// 6. Renderizar los turnos agendados en el panel derecho
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

        item.innerHTML = `
            <div class="appointment-info">
                <strong>${horaInicioTexto} - ${horaFinTexto} | ${turno.clienteNombre}</strong>
                <span>${turno.servicio.nombre} • Tel: ${turno.clienteTelefono}</span>
            </div>
            <button class="btn-cancel" data-id="${turno.id}">Cancelar</button>
        `;

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

// 7. Eventos de usuario
selectServicio.addEventListener("change", renderizarHorarios);
inputFecha.addEventListener("change", actualizarVista);

bookingForm.addEventListener("submit", (e) => {
    e.preventDefault();

    const horaSeleccionada = inputHoraSeleccionada.value;
    if (!horaSeleccionada) {
        alert("Por favor, seleccioná un horario disponible antes de confirmar.");
        return;
    }

    const servicioId = parseInt(selectServicio.value);
    const servicio = serviciosCatalogo.find(s => s.id === servicioId);
    const fecha = inputFecha.value;
    const nombre = document.getElementById("nombre").value.trim();
    const telefono = document.getElementById("telefono").value.trim();

    try {
        agenda.agendarTurno(nombre, telefono, servicio, fecha, parseInt(horaSeleccionada));
        bookingForm.reset();
        inputFecha.value = fecha; // Mantener la fecha que estaba viendo el usuario
        actualizarVista();
    } catch (error) {
        alert(error.message);
    }
});

// Arrancar la aplicación
inicializarApp();