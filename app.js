import { EstudioService } from "./models.js";

const estudio = new EstudioService();

let configActual = null;
let serviciosLista = [];
let productosLista = [];
let galeriaLista = [];
let pasoActual = 1;
let categoriaFiltro = "TODOS";
let textoBusqueda = "";

const reservaState = {
    servicio: null,
    tipoTarifa: null,
    precioBase: 0,
    recargoAplicado: 0,
    motivoRecargo: "",
    esFeriadoDia: false,
    motivoFeriadoDia: "",
    fecha: "",
    horaInicio: null
};

const viewHome = document.getElementById("view-home");
const viewBooking = document.getElementById("view-booking");

function calcularTotalConRecargos() {
    return reservaState.precioBase + reservaState.recargoAplicado;
}

function actualizarBarraInferior() {
    if (!reservaState.servicio) return;
    const total = calcularTotalConRecargos();
    const extraTxt = reservaState.recargoAplicado > 0 ? " (+ recargo)" : "";
    document.getElementById("bar-label").textContent = `${reservaState.servicio.nombre}${extraTxt}`;
    document.getElementById("bar-total").textContent = `$${Number(total).toLocaleString('es-AR')}`;
}

// ==========================================
// 1. CARGA INICIAL DE PORTADA (HOME)
// ==========================================
async function cargarPortada() {
    await estudio.inicializarCatalogoBaseSiVacio();
    configActual = await estudio.obtenerConfiguracion();
    serviciosLista = await estudio.obtenerServicios(true);
    productosLista = await estudio.obtenerProductos();
    galeriaLista = await estudio.obtenerGaleria();

    document.getElementById("hero-ig").textContent = configActual.instagram || "@lashes_coty";
    document.getElementById("hero-title").textContent = configActual.nombreEstudio || "Lashes Coty";
    document.getElementById("hero-bio").textContent = configActual.bio;
    
    if (configActual.logoUrl) {
        const heroLogo = document.getElementById("hero-logo");
        heroLogo.src = configActual.logoUrl;
        heroLogo.style.display = "block";
    }

    // Galería deslizable en portada (si Coty aún no subió fotos, muestra ejemplos estéticos)
    const carousel = document.getElementById("home-gallery-carousel");
    carousel.innerHTML = "";
    const fotosMostrar = galeriaLista.length > 0 ? galeriaLista : [
        { url: "https://images.unsplash.com/photo-1583001931096-959e9a1a6223?auto=format&fit=crop&w=700&q=80", titulo: "Volumen Ruso & Efecto Foxy" },
        { url: "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=700&q=80", titulo: "Diseño personalizado de mirada" },
        { url: "https://images.unsplash.com/photo-1522337660859-02fbefca4702?auto=format&fit=crop&w=700&q=80", titulo: "Fibras Tecnológicas & Brown Lashes" }
    ];

    fotosMostrar.forEach(foto => {
        const slide = document.createElement("div");
        slide.className = "gallery-slide";
        slide.innerHTML = `
            <img src="${foto.url}" alt="${foto.titulo || 'Trabajo Lashes Coty'}">
            ${foto.titulo ? `<div class="gallery-caption">${foto.titulo}</div>` : ""}
        `;
        carousel.appendChild(slide);
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
// 3. FLUJO DE RESERVA EN 4 PASOS
// ==========================================
document.getElementById("btn-start-booking").addEventListener("click", () => {
    viewHome.style.display = "none";
    viewBooking.style.display = "block";
    irAPaso(1);
    renderizarServiciosBooking();
});

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

// --- PASO 01: RENDERIZADO Y SELECCIÓN DE SERVICIO (OCULTA RECARGOS MANUALES) ---
function renderizarServiciosBooking() {
    const container = document.getElementById("booking-services-list");
    container.innerHTML = "";

    const filtrados = serviciosLista.filter(s => {
        // Ocultamos cualquier ítem que sea recargo por feriado o por horario extra
        const nombreLower = s.nombre.toLowerCase();
        if (nombreLower.includes("feriado") || nombreLower.includes("horario extra")) return false;

        const coincideCat = categoriaFiltro === "TODOS" || s.categoria === categoriaFiltro;
        const coincideTxt = nombreLower.includes(textoBusqueda.toLowerCase());
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
                reservaState.precioBase = tipo === "SERVIS" ? srv.precioServis : srv.precioNormal;
                reservaState.recargoAplicado = 0;
                reservaState.motivoRecargo = "";

                actualizarBarraInferior();
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

// --- PASO 02: FECHA, HORARIOS Y RECARGOS AUTOMÁTICOS ---
const inputBookingDate = document.getElementById("booking-date");
const surchargeAlert = document.getElementById("surcharge-alert");
const hoyISO = new Date().toISOString().split("T")[0];
inputBookingDate.min = hoyISO;
inputBookingDate.value = hoyISO;

function evaluarRecargosAutomaticos() {
    let recargo = 0;
    const motivos = [];

    // 1. Verificar si la fecha es Feriado
    if (reservaState.esFeriadoDia) {
        recargo += Number(configActual.recargoFeriado || 10000);
        motivos.push(`Fecha feriado (${reservaState.motivoFeriadoDia || "Feriado"}): +$${Number(configActual.recargoFeriado || 10000).toLocaleString('es-AR')}`);
    }

    // 2. Verificar si el horario seleccionado es >= 18:00 hs (1080 minutos)
    if (reservaState.horaInicio !== null && reservaState.horaInicio >= 1080) {
        recargo += Number(configActual.recargoHorarioExtra || 10000);
        motivos.push(`Turno desde las 18:00 hs (horario extra): +$${Number(configActual.recargoHorarioExtra || 10000).toLocaleString('es-AR')}`);
    }

    reservaState.recargoAplicado = recargo;
    reservaState.motivoRecargo = motivos.join(" | ");

    if (recargo > 0) {
        surchargeAlert.style.display = "block";
        surchargeAlert.innerHTML = `⚠️ <strong>Adicional aplicado automáticamente:</strong><br>${motivos.join("<br>")}`;
    } else {
        surchargeAlert.style.display = "none";
    }

    actualizarBarraInferior();
}

async function cargarSlotsPaso2() {
    const grid = document.getElementById("booking-slots-grid");
    grid.innerHTML = `<p class="hint" style="grid-column:1/-1;">Buscando horarios libres...</p>`;
    reservaState.horaInicio = null;
    reservaState.fecha = inputBookingDate.value;

    const { slots, esFeriado, motivoFeriado } = await estudio.obtenerHorariosDisponibles(reservaState.fecha, reservaState.servicio.duracionMinutos);
    reservaState.esFeriadoDia = esFeriado;
    reservaState.motivoFeriadoDia = motivoFeriado;
    evaluarRecargosAutomaticos();

    grid.innerHTML = "";

    if (slots.length === 0) {
        grid.innerHTML = `<p class="hint" style="grid-column:1/-1;">No hay turnos disponibles para este día (cerrado o agenda completa). Probá otra fecha.</p>`;
        return;
    }

    slots.forEach(mins => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "slot-btn";
        const esExtra = mins >= 1080;
        btn.innerHTML = `${EstudioService.formatearHora(mins)}${esExtra ? '<br><small style="font-size:0.65rem; font-weight:500;">+Extra</small>' : ''}`;

        btn.addEventListener("click", () => {
            document.querySelectorAll("#booking-slots-grid .slot-btn").forEach(b => b.classList.remove("selected"));
            btn.classList.add("selected");
            reservaState.horaInicio = mins;
            evaluarRecargosAutomaticos();
        });
        grid.appendChild(btn);
    });
}

inputBookingDate.addEventListener("change", cargarSlotsPaso2);

// --- PASO 04: RESUMEN Y COPIAR ALIAS ---
function prepararPaso4() {
    const senia = configActual.montoSeniaFija;
    const totalFinal = calcularTotalConRecargos();
    const saldoRestante = Math.max(0, totalFinal - senia);
    const [a, m, d] = reservaState.fecha.split("-");

    const filaRecargo = reservaState.recargoAplicado > 0
        ? `<div><span>Adicional (${reservaState.motivoRecargo})</span><strong>+$${Number(reservaState.recargoAplicado).toLocaleString('es-AR')}</strong></div>`
        : "";

    document.getElementById("booking-summary-details").innerHTML = `
        <div><span>Servicio</span><strong>${reservaState.servicio.nombre}</strong></div>
        <div><span>Modalidad</span><strong>${reservaState.tipoTarifa === "SERVIS" ? "Servis / Retoque" : "Colocación / Único"}</strong></div>
        <div><span>Fecha y hora</span><strong>${d}/${m}/${a} a las ${EstudioService.formatearHora(reservaState.horaInicio)} hs</strong></div>
        <div><span>Valor base</span><strong>$${Number(reservaState.precioBase).toLocaleString('es-AR')}</strong></div>
        ${filaRecargo}
        <div><span>Total final</span><strong>$${Number(totalFinal).toLocaleString('es-AR')}</strong></div>
    `;

    document.getElementById("summary-senia").textContent = `$${Number(senia).toLocaleString('es-AR')}`;
    document.getElementById("summary-alias").textContent = configActual.aliasBancario;
    document.getElementById("summary-saldo-info").textContent =
        `Saldo restante en el estudio: $${Number(saldoRestante).toLocaleString('es-AR')} en efectivo (o +$${Number(configActual.recargoTransferencia).toLocaleString('es-AR')} abonando el saldo por transferencia).`;
}

document.getElementById("btn-copy-alias").addEventListener("click", async (e) => {
    try {
        await navigator.clipboard.writeText(configActual.aliasBancario);
    } catch { /* fallback */ }
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
            const totalFinal = calcularTotalConRecargos();

            await estudio.agendarTurno({
                clienteNombre: nombre,
                clienteTelefono: telefono,
                notas,
                servicioNombre: reservaState.servicio.nombre,
                tipoTarifa: reservaState.tipoTarifa,
                precioTotal: totalFinal,
                recargoAplicado: reservaState.recargoAplicado,
                motivoRecargo: reservaState.motivoRecargo,
                seniaMonto: senia,
                duracionMinutos: reservaState.servicio.duracionMinutos,
                fecha: reservaState.fecha,
                horaInicio: reservaState.horaInicio
            });

            const [a, m, d] = reservaState.fecha.split("-");
            const horaTxt = EstudioService.formatearHora(reservaState.horaInicio);
            const tipoTxt = reservaState.tipoTarifa === "SERVIS" ? " (Servis)" : "";
            const recargoLinea = reservaState.recargoAplicado > 0
                ? `⚠️ *Adicional aplicado:* +$${Number(reservaState.recargoAplicado).toLocaleString('es-AR')} (${reservaState.motivoRecargo})\n`
                : "";

            const mensaje = `Hola Coty! Acabo de reservar un turno en *${configActual.nombreEstudio}*:\n\n` +
                `✨ *Servicio:* ${reservaState.servicio.nombre}${tipoTxt}\n` +
                `📅 *Fecha:* ${d}/${m}/${a}\n` +
                `⏰ *Horario:* ${horaTxt} hs\n` +
                `👤 *Nombre:* ${nombre}\n` +
                recargoLinea +
                `💰 *Total del servicio:* $${Number(totalFinal).toLocaleString('es-AR')}\n` +
                `💸 *Seña a transferir:* $${Number(senia).toLocaleString('es-AR')}\n` +
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