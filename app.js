import { EstudioService } from "./models.js";

const estudio = new EstudioService();

// Estado global de la reserva en curso
let configActual = null;
let serviciosLista = [];
let productosLista = [];
let pasoActual = 1;
let categoriaFiltro = "TODOS";
let textoBusqueda = "";

const reservaState = {
    servicio: null,
    tipoTarifa: null, // "COLOCACION" | "SERVIS" | "UNICO"
    precioFinal: 0,
    fecha: "",
    horaInicio: null
};

// Referencias de Vistas
const viewHome = document.getElementById("view-home");
const viewBooking = document.getElementById("view-booking");

// ==========================================
// 1. CARGA INICIAL DE PORTADA (HOME)
// ==========================================
async function cargarPortada() {
    await estudio.inicializarCatalogoBaseSiVacio();
    configActual = await estudio.obtenerConfiguracion();
    serviciosLista = await estudio.obtenerServicios(true);
    productosLista = await estudio.obtenerProductos();

    // Datos del estudio
    document.getElementById("hero-ig").textContent = configActual.instagram || "@lashes_coty";
    document.getElementById("hero-title").textContent = configActual.nombreEstudio || "Lashes Coty";
    document.getElementById("hero-bio").textContent = configActual.bio;

    // Lista de precios resumida en portada (primeros 6 servicios)
    const homeSrvContainer = document.getElementById("home-services-list");
    homeSrvContainer.innerHTML = "";
    serviciosLista.slice(0, 6).forEach(srv => {
        const row = document.createElement("div");
        row.className = "price-row-card";
        row.innerHTML = `
            <div>
                <strong>${srv.nombre}</strong>
                <small>${srv.duracionMinutos} min</small>
            </div>
            <div class="price-values">
                <span>$${Number(srv.precioNormal).toLocaleString('es-AR')}</span>
                ${srv.precioServis ? `<small>Servis $${Number(srv.precioServis).toLocaleString('es-AR')}</small>` : ''}
            </div>
        `;
        homeSrvContainer.appendChild(row);
    });

    // Productos en portada
    const secProd = document.getElementById("section-productos");
    const gridProd = document.getElementById("home-products-grid");
    if (productosLista.length === 0) {
        secProd.style.display = "none";
    } else {
        secProd.style.display = "block";
        gridProd.innerHTML = "";
        productosLista.forEach(prod => {
            const card = document.createElement("div");
            card.className = "product-card";
            const imgTag = prod.imagenUrl ? `<img src="${prod.imagenUrl}" alt="${prod.nombre}">` : "";
            card.innerHTML = `
                <div>
                    ${imgTag}
                    <span class="product-brand">${prod.marca}</span>
                    <div class="product-title">${prod.nombre}</div>
                    <div class="product-price">$${Number(prod.precio).toLocaleString('es-AR')}</div>
                </div>
                <button type="button" class="btn-olive-sm">Encargar</button>
            `;
            card.querySelector("button").addEventListener("click", () => abrirModalProducto(prod));
            gridProd.appendChild(card);
        });
    }

    // Horarios semanales en portada
    const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const hoursContainer = document.getElementById("home-hours-list");
    hoursContainer.innerHTML = "";
    for (let d = 0; d < 7; d++) {
        const regla = configActual.horariosSemana[d];
        const line = document.createElement("div");
        line.className = "hours-line";
        const horarioTxt = regla && regla.abierto
            ? `${EstudioService.formatearHora(regla.apertura)} a ${EstudioService.formatearHora(regla.cierre)} hs`
            : "Cerrado";
        line.innerHTML = `<span>${dias[d]}</span><strong>${horarioTxt}</strong>`;
        hoursContainer.appendChild(line);
    }
}

// ==========================================
// 2. MODAL DE PRODUCTOS POR WHATSAPP
// ==========================================
let productoSeleccionadoModal = null;
const productModal = document.getElementById("product-modal");

function abrirModalProducto(prod) {
    productoSeleccionadoModal = prod;
    document.getElementById("modal-prod-title").textContent = `${prod.marca} — ${prod.nombre}`;
    document.getElementById("modal-prod-price").textContent = `$${Number(prod.precio).toLocaleString('es-AR')}`;
    productModal.style.display = "flex";
}

document.getElementById("btn-close-modal").addEventListener("click", () => {
    productModal.style.display = "none";
});

document.getElementById("btn-send-product-wa").addEventListener("click", () => {
    const cliente = document.getElementById("modal-client-name").value.trim() || "una clienta";
    const msg = `Hola Coty! Soy *${cliente}* y me gustaría encargar este producto para retirar en el estudio:\n\n` +
        `🛍️ *Producto:* ${productoSeleccionadoModal.nombre} (${productoSeleccionadoModal.marca})\n` +
        `💵 *Precio:* $${Number(productoSeleccionadoModal.precio).toLocaleString('es-AR')}\n\n` +
        `¿Tenés stock disponible?`;
    window.open(`https://wa.me/${configActual.whatsappNumero}?text=${encodeURIComponent(msg)}`, "_blank");
    productModal.style.display = "none";
});

// ==========================================
// 3. NAVEGACIÓN DEL FLUJO DE RESERVA (4 PASOS)
// ==========================================
function abrirFlujoReserva() {
    viewHome.style.display = "none";
    viewBooking.style.display = "block";
    irAPaso(1);
    renderizarServiciosBooking();
}

document.getElementById("btn-start-booking").addEventListener("click", abrirFlujoReserva);
document.getElementById("btn-all-services").addEventListener("click", abrirFlujoReserva);

function irAPaso(numPaso) {
    pasoActual = numPaso;
    [1, 2, 3, 4].forEach(n => {
        document.getElementById(`step-${n}`).style.display = n === numPaso ? "block" : "none";
    });

    const titulos = {
        1: ["Paso 01 de 04", "Seleccioná tu servicio", "25%", "Continuar"],
        2: ["Paso 02 de 04", "Elegí fecha y horario", "50%", "Continuar"],
        3: ["Paso 03 de 04", "Completá tus datos", "75%", "Revisar resumen"],
        4: ["Paso 04 de 04", "Confirmación y Seña", "100%", "Confirmar y enviar comprobante"]
    };

    document.getElementById("step-indicator").textContent = titulos[numPaso][0];
    document.getElementById("step-title").textContent = titulos[numPaso][1];
    document.getElementById("progress-fill").style.width = titulos[numPaso][2];
    document.getElementById("btn-next-step").textContent = titulos[numPaso][3];
    window.scrollTo({ top: 0, behavior: "smooth" });
}

document.getElementById("btn-back-step").addEventListener("click", () => {
    if (pasoActual > 1) {
        irAPaso(pasoActual - 1);
    } else {
        viewBooking.style.display = "none";
        viewHome.style.display = "block";
    }
});

// --- PASO 01: RENDERIZADO Y SELECCIÓN DE SERVICIO ---
function renderizarServiciosBooking() {
    const container = document.getElementById("booking-services-list");
    container.innerHTML = "";

    const filtrados = serviciosLista.filter(s => {
        const coincideCat = categoriaFiltro === "TODOS" || s.categoria === categoriaFiltro;
        const coincideTxt = s.nombre.toLowerCase().includes(textoBusqueda.toLowerCase());
        return coincideCat && coincideTxt;
    });

    filtrados.forEach(srv => {
        const esSeleccionado = reservaState.servicio && reservaState.servicio.id === srv.id;
        const card = document.createElement("div");
        card.className = `srv-select-card ${esSeleccionado ? "selected" : ""}`;

        let botonesTarifaHTML = "";
        if (srv.precioServis) {
            const selCol = esSeleccionado && reservaState.tipoTarifa === "COLOCACION" ? "chosen" : "";
            const selSrv = esSeleccionado && reservaState.tipoTarifa === "SERVIS" ? "chosen" : "";
            botonesTarifaHTML = `
                <div class="tariff-buttons">
                    <button type="button" class="tariff-btn ${selCol}" data-tipo="COLOCACION">
                        1ra Vez • $${Number(srv.precioNormal).toLocaleString('es-AR')}
                    </button>
                    <button type="button" class="tariff-btn ${selSrv}" data-tipo="SERVIS">
                        Servis • $${Number(srv.precioServis).toLocaleString('es-AR')}
                    </button>
                </div>
            `;
        } else {
            const selUnico = esSeleccionado ? "chosen" : "";
            botonesTarifaHTML = `
                <button type="button" class="tariff-btn ${selUnico}" style="width:100%;" data-tipo="UNICO">
                    Seleccionar • $${Number(srv.precioNormal).toLocaleString('es-AR')}
                </button>
            `;
        }

        card.innerHTML = `
            <div class="srv-select-header">
                <strong>${srv.nombre}</strong>
                <small>${srv.duracionMinutos} min</small>
            </div>
            <p class="srv-select-desc">${srv.descripcion || ""}</p>
            ${botonesTarifaHTML}
        `;

        card.querySelectorAll(".tariff-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                const tipo = btn.dataset.tipo;
                reservaState.servicio = srv;
                reservaState.tipoTarifa = tipo;
                reservaState.precioFinal = tipo === "SERVIS" ? srv.precioServis : srv.precioNormal;

                document.getElementById("bar-label").textContent = `${srv.nombre} (${tipo === "SERVIS" ? "Servis" : "1ra vez"})`;
                document.getElementById("bar-total").textContent = `$${Number(reservaState.precioFinal).toLocaleString('es-AR')}`;
                renderizarServiciosBooking();
            });
        });

        container.appendChild(card);
    });
}

document.querySelectorAll(".chip").forEach(chip => {
    chip.addEventListener("click", () => {
        document.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        categoriaFiltro = chip.dataset.cat;
        renderizarServiciosBooking();
    });
});

document.getElementById("search-service").addEventListener("input", (e) => {
    textoBusqueda = e.target.value;
    renderizarServiciosBooking();
});

// --- PASO 02: FECHA Y HORARIOS ---
const inputBookingDate = document.getElementById("booking-date");
const hoyISO = new Date().toISOString().split("T")[0];
inputBookingDate.min = hoyISO;
inputBookingDate.value = hoyISO;

async function cargarSlotsPaso2() {
    const grid = document.getElementById("booking-slots-grid");
    grid.innerHTML = `<p class="hint" style="grid-column:1/-1;">Buscando horarios libres...</p>`;
    reservaState.horaInicio = null;
    reservaState.fecha = inputBookingDate.value;

    const slots = await estudio.obtenerHorariosDisponibles(reservaState.fecha, reservaState.servicio.duracionMinutos);
    grid.innerHTML = "";

    if (slots.length === 0) {
        grid.innerHTML = `<p class="hint" style="grid-column:1/-1;">No hay turnos disponibles para este día (cerrado o agenda completa). Probá otra fecha.</p>`;
        return;
    }

    slots.forEach(mins => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "slot-btn";
        btn.textContent = EstudioService.formatearHora(mins);
        btn.addEventListener("click", () => {
            document.querySelectorAll("#booking-slots-grid .slot-btn").forEach(b => b.classList.remove("selected"));
            btn.classList.add("selected");
            reservaState.horaInicio = mins;
        });
        grid.appendChild(btn);
    });
}

inputBookingDate.addEventListener("change", cargarSlotsPaso2);

// --- PASO 04: RESUMEN Y COPIAR ALIAS ---
function prepararPaso4() {
    const senia = configActual.montoSeniaFija;
    const saldoRestante = Math.max(0, reservaState.precioFinal - senia);
    const [a, m, d] = reservaState.fecha.split("-");

    document.getElementById("booking-summary-details").innerHTML = `
        <div><span>Servicio</span><strong>${reservaState.servicio.nombre}</strong></div>
        <div><span>Modalidad</span><strong>${reservaState.tipoTarifa === "SERVIS" ? "Servis / Retoque" : "Colocación / Único"}</strong></div>
        <div><span>Fecha y hora</span><strong>${d}/${m}/${a} a las ${EstudioService.formatearHora(reservaState.horaInicio)} hs</strong></div>
        <div><span>Clienta</span><strong>${document.getElementById("client-name").value.trim()}</strong></div>
        <div><span>Valor total del servicio</span><strong>$${Number(reservaState.precioFinal).toLocaleString('es-AR')}</strong></div>
    `;

    document.getElementById("summary-senia").textContent = `$${Number(senia).toLocaleString('es-AR')}`;
    document.getElementById("summary-alias").textContent = configActual.aliasBancario;
    document.getElementById("summary-saldo-info").textContent =
        `Saldo restante en el estudio: $${Number(saldoRestante).toLocaleString('es-AR')} en efectivo (o +$${Number(configActual.recargoTransferencia).toLocaleString('es-AR')} abonando el saldo por transferencia).`;
}

document.getElementById("btn-copy-alias").addEventListener("click", async (e) => {
    try {
        await navigator.clipboard.writeText(configActual.aliasBancario);
    } catch { /* fallback silencioso */ }
    e.target.textContent = "¡Copiado!";
    setTimeout(() => e.target.textContent = "Copiar Alias", 2000);
});

// --- BOTÓN PRINCIPAL CONTINUAR / CONFIRMAR ---
document.getElementById("btn-next-step").addEventListener("click", async () => {
    if (pasoActual === 1) {
        if (!reservaState.servicio) return alert("Seleccioná un servicio y modalidad para continuar.");
        irAPaso(2);
        await cargarSlotsPaso2();
    } else if (pasoActual === 2) {
        if (reservaState.horaInicio === null) return alert("Elegí un horario disponible.");
        irAPaso(3);
    } else if (pasoActual === 3) {
        const nombre = document.getElementById("client-name").value.trim();
        const tel = document.getElementById("client-phone").value.trim();
        if (!nombre || !tel) return alert("Completá tu nombre y WhatsApp.");
        prepararPaso4();
        irAPaso(4);
    } else if (pasoActual === 4) {
        const btn = document.getElementById("btn-next-step");
        btn.disabled = true;
        btn.textContent = "Registrando turno...";

        try {
            const nombre = document.getElementById("client-name").value.trim();
            const telefono = document.getElementById("client-phone").value.trim();
            const notas = document.getElementById("client-notes").value.trim();
            const senia = configActual.montoSeniaFija;

            await estudio.agendarTurno({
                clienteNombre: nombre,
                clienteTelefono: telefono,
                notas,
                servicioNombre: reservaState.servicio.nombre,
                tipoTarifa: reservaState.tipoTarifa,
                precioTotal: reservaState.precioFinal,
                seniaMonto: senia,
                duracionMinutos: reservaState.servicio.duracionMinutos,
                fecha: reservaState.fecha,
                horaInicio: reservaState.horaInicio
            });

            const [a, m, d] = reservaState.fecha.split("-");
            const horaTxt = EstudioService.formatearHora(reservaState.horaInicio);
            const tipoTxt = reservaState.tipoTarifa === "SERVIS" ? " (Servis)" : "";

            const mensaje = `Hola Coty! Acabo de reservar un turno en *${configActual.nombreEstudio}*:\n\n` +
                `✨ *Servicio:* ${reservaState.servicio.nombre}${tipoTxt}\n` +
                `📅 *Fecha:* ${d}/${m}/${a}\n` +
                `⏰ *Horario:* ${horaTxt} hs\n` +
                `👤 *Nombre:* ${nombre}\n` +
                `💸 *Seña:* $${Number(senia).toLocaleString('es-AR')}\n` +
                (notas ? `📝 *Nota:* ${notas}\n` : "") +
                `\nTe adjunto el comprobante de la seña para confirmar el turno 👇`;

            window.open(`https://wa.me/${configActual.whatsappNumero}?text=${encodeURIComponent(mensaje)}`, "_blank");
            window.location.reload();
        } catch (err) {
            alert(err.message);
            irAPaso(2);
            await cargarSlotsPaso2();
        } finally {
            btn.disabled = false;
        }
    }
});

cargarPortada();