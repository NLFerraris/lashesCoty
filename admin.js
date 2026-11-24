import { Agenda } from "./models.js";

// Contraseña rápida de acceso para la dueña (luego se puede migrar a Firebase Auth)
const PIN_ADMIN = "coty2026";
const acceso = sessionStorage.getItem("lashes_admin_ok");
if (!acceso) {
    const ingresado = prompt("Ingresá la clave de administración de Lashes Coty:");
    if (ingresado !== PIN_ADMIN) {
        alert("Clave incorrecta.");
        window.location.href = "index.html";
    } else {
        sessionStorage.setItem("lashes_admin_ok", "true");
    }
}

const agenda = new Agenda();
const inputFecha = document.getElementById("admin-fecha");
const listaTurnos = document.getElementById("lista-turnos");
const contadorTurnos = document.getElementById("contador-turnos");

let desuscribirListener = null;

function suscribirAFecha(fecha) {
    if (desuscribirListener) desuscribirListener();

    desuscribirListener = agenda.escucharTurnosPorFecha(fecha, (turnos) => {
        const ordenados = turnos.sort((a, b) => a.horaInicio - b.horaInicio);
        contadorTurnos.textContent = `${ordenados.length} ${ordenados.length === 1 ? 'turno' : 'turnos'}`;
        listaTurnos.innerHTML = "";

        if (ordenados.length === 0) {
            listaTurnos.innerHTML = `<p class="hint">No hay turnos agendados para esta fecha.</p>`;
            return;
        }

        ordenados.forEach(turno => {
            const item = document.createElement("div");
            item.className = "appointment-item";

            const inicioTxt = Agenda.formatearHora(turno.horaInicio);
            const finTxt = Agenda.formatearHora(turno.horaFin);
            const esConfirmado = turno.estado === "CONFIRMADO";

            item.innerHTML = `
                <div class="appointment-info">
                    <strong>${inicioTxt} - ${finTxt} | ${turno.clienteNombre}</strong>
                    <span>${turno.servicio.nombre} • Tel: ${turno.clienteTelefono}</span>
                    <span class="status-pill ${esConfirmado ? 'status-confirmed' : 'status-pending'}">
                        ${esConfirmado ? 'Seña Confirmada' : 'Pendiente de Seña'}
                    </span>
                </div>
                <div class="item-actions">
                    ${!esConfirmado ? `<button class="btn-confirm-deposit">Aprobar Seña</button>` : ''}
                    <button class="btn-cancel">Cancelar</button>
                </div>
            `;

            if (!esConfirmado) {
                item.querySelector(".btn-confirm-deposit").addEventListener("click", async () => {
                    await agenda.confirmarSenia(turno.id);
                });
            }

            item.querySelector(".btn-cancel").addEventListener("click", async () => {
                if (confirm(`¿Cancelar el turno de ${turno.clienteNombre}? El horario volverá a quedar libre.`)) {
                    await agenda.eliminarTurno(turno.id);
                }
            });

            listaTurnos.appendChild(item);
        });
    });
}

const hoy = new Date().toISOString().split("T")[0];
inputFecha.value = hoy;
suscribirAFecha(hoy);

inputFecha.addEventListener("change", () => {
    suscribirAFecha(inputFecha.value);
});