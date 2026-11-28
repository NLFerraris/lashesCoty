import { EstudioService } from "./models.js";

// Validación de PIN de acceso rápido
const PIN_ADMIN = "coty2026";
if (!sessionStorage.getItem("lashes_admin_ok")) {
    const ingresado = prompt("Ingresá la clave de administración de Lashes Coty:");
    if (ingresado !== PIN_ADMIN) {
        alert("Clave incorrecta.");
        window.location.href = "index.html";
    } else {
        sessionStorage.setItem("lashes_admin_ok", "true");
    }
}

const estudio = new EstudioService();

// --- NAVEGACIÓN POR PESTAÑAS ---
document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".tab-panel").forEach(p => p.classList.remove("active"));
        btn.classList.add("active");
        document.getElementById(btn.dataset.tab).classList.add("active");
    });
});

// ==========================================
// 1. GESTIÓN DE TURNOS EN TIEMPO REAL
// ==========================================
const inputFechaAdmin = document.getElementById("admin-fecha");
const listaTurnos = document.getElementById("lista-turnos");
const contadorTurnos = document.getElementById("contador-turnos");
let desuscribirTurnos = null;

function suscribirTurnosFecha(fecha) {
    if (desuscribirTurnos) desuscribirTurnos();
    desuscribirTurnos = estudio.escucharTurnosPorFecha(fecha, (turnos) => {
        const ordenados = turnos.sort((a, b) => a.horaInicio - b.horaInicio);
        contadorTurnos.textContent = `${ordenados.length} ${ordenados.length === 1 ? 'turno' : 'turnos'}`;
        listaTurnos.innerHTML = "";

        if (ordenados.length === 0) {
            listaTurnos.innerHTML = `<p class="hint">No hay turnos agendados para esta fecha.</p>`;
            return;
        }

        ordenados.forEach(t => {
            const item = document.createElement("div");
            item.className = "appointment-item";
            const inicioTxt = EstudioService.formatearHora(t.horaInicio);
            const finTxt = EstudioService.formatearHora(t.horaFin);
            const esConfirmado = t.estado === "CONFIRMADO";
            const etiquetaTipo = t.tipoTarifa === "SERVIS" ? " (Servis)" : (t.tipoTarifa === "COLOCACION" ? " (1ra vez)" : "");

            item.innerHTML = `
                <div class="appointment-info">
                    <strong>${inicioTxt} - ${finTxt} | ${t.clienteNombre}</strong>
                    <span>${t.servicioNombre}${etiquetaTipo} • $${Number(t.precioTotal).toLocaleString('es-AR')}</span>
                    <span>Tel: ${t.clienteTelefono}</span>
                    <span class="status-pill ${esConfirmado ? 'status-confirmed' : 'status-pending'}">
                        ${esConfirmado ? 'Seña Confirmada ($' + Number(t.seniaMonto).toLocaleString('es-AR') + ')' : 'Pendiente de Seña'}
                    </span>
                </div>
                <div class="item-actions">
                    ${!esConfirmado ? `<button class="btn-confirm-deposit">Aprobar Seña</button>` : ''}
                    <button class="btn-cancel">Cancelar</button>
                </div>
            `;

            if (!esConfirmado) {
                item.querySelector(".btn-confirm-deposit").addEventListener("click", async () => {
                    await estudio.confirmarSenia(t.id);
                });
            }

            item.querySelector(".btn-cancel").addEventListener("click", async () => {
                if (confirm(`¿Cancelar el turno de ${t.clienteNombre}? El horario quedará libre nuevamente.`)) {
                    await estudio.eliminarTurno(t.id);
                }
            });

            listaTurnos.appendChild(item);
        });
    });
}

// ==========================================
// 2. GESTIÓN DE SERVICIOS Y PRECIOS
// ==========================================
const formServicio = document.getElementById("form-servicio");
const listaServiciosAdmin = document.getElementById("lista-servicios-admin");
const btnCancelarEdicionSrv = document.getElementById("btn-cancelar-edicion-srv");

async function cargarServiciosAdmin() {
    await estudio.inicializarCatalogoBaseSiVacio();
    const servicios = await estudio.obtenerServicios(false);
    listaServiciosAdmin.innerHTML = "";

    servicios.forEach(srv => {
        const div = document.createElement("div");
        div.className = "admin-list-item";
        const textoPrecios = srv.precioServis
            ? `Colocación: $${Number(srv.precioNormal).toLocaleString('es-AR')} | Servis: $${Number(srv.precioServis).toLocaleString('es-AR')}`
            : `Precio: $${Number(srv.precioNormal).toLocaleString('es-AR')}`;

        div.innerHTML = `
            <div>
                <strong>${srv.nombre}</strong> <small>(${srv.categoria} • ${srv.duracionMinutos} min)</small><br>
                <span style="font-size:0.85rem; color:var(--muted);">${textoPrecios}</span>
            </div>
            <div style="display:flex; gap:0.3rem;">
                <button class="btn-sm btn-edit-srv">Editar</button>
                <button class="btn-cancel btn-del-srv">Borrar</button>
            </div>
        `;

        div.querySelector(".btn-edit-srv").addEventListener("click", () => {
            document.getElementById("srv-id").value = srv.id;
            document.getElementById("srv-nombre").value = srv.nombre;
            document.getElementById("srv-categoria").value = srv.categoria;
            document.getElementById("srv-duracion").value = srv.duracionMinutos;
            document.getElementById("srv-precio-normal").value = srv.precioNormal;
            document.getElementById("srv-precio-servis").value = srv.precioServis || "";
            document.getElementById("srv-descripcion").value = srv.descripcion || "";
            document.getElementById("form-servicio-titulo").textContent = "Editando: " + srv.nombre;
            btnCancelarEdicionSrv.style.display = "block";
            formServicio.scrollIntoView({ behavior: "smooth" });
        });

        div.querySelector(".btn-del-srv").addEventListener("click", async () => {
            if (confirm(`¿Eliminar "${srv.nombre}" del catálogo?`)) {
                await estudio.eliminarServicio(srv.id);
                await cargarServiciosAdmin();
            }
        });

        listaServiciosAdmin.appendChild(div);
    });
}

btnCancelarEdicionSrv.addEventListener("click", () => {
    formServicio.reset();
    document.getElementById("srv-id").value = "";
    document.getElementById("form-servicio-titulo").textContent = "Agregar / Editar Servicio";
    btnCancelarEdicionSrv.style.display = "none";
});

formServicio.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = document.getElementById("srv-id").value || null;
    const precioServisVal = document.getElementById("srv-precio-servis").value;

    const data = {
        nombre: document.getElementById("srv-nombre").value.trim(),
        categoria: document.getElementById("srv-categoria").value,
        duracionMinutos: parseInt(document.getElementById("srv-duracion").value),
        precioNormal: parseInt(document.getElementById("srv-precio-normal").value),
        precioServis: precioServisVal ? parseInt(precioServisVal) : null,
        descripcion: document.getElementById("srv-descripcion").value.trim()
    };

    await estudio.guardarServicio(data, id);
    btnCancelarEdicionSrv.click();
    await cargarServiciosAdmin();
    alert("Servicio guardado correctamente.");
});

// ==========================================
// 3. GESTIÓN DE PRODUCTOS
// ==========================================
const formProducto = document.getElementById("form-producto");
const listaProductosAdmin = document.getElementById("lista-productos-admin");

async function cargarProductosAdmin() {
    const productos = await estudio.obtenerProductos();
    listaProductosAdmin.innerHTML = productos.length === 0 ? `<p class="hint">Todavía no cargaste productos.</p>` : "";

    productos.forEach(p => {
        const div = document.createElement("div");
        div.className = "admin-list-item";
        div.innerHTML = `
            <div>
                <small style="color:var(--muted);">${p.marca}</small><br>
                <strong>${p.nombre}</strong> — $${Number(p.precio).toLocaleString('es-AR')}
            </div>
            <button class="btn-cancel">Eliminar</button>
        `;
        div.querySelector("button").addEventListener("click", async () => {
            await estudio.eliminarProducto(p.id);
            await cargarProductosAdmin();
        });
        listaProductosAdmin.appendChild(div);
    });
}

formProducto.addEventListener("submit", async (e) => {
    e.preventDefault();
    await estudio.guardarProducto({
        marca: document.getElementById("prod-marca").value.trim(),
        nombre: document.getElementById("prod-nombre").value.trim(),
        precio: parseInt(document.getElementById("prod-precio").value),
        imagenUrl: document.getElementById("prod-imagen").value.trim()
    });
    formProducto.reset();
    await cargarProductosAdmin();
    alert("Producto publicado.");
});

// ==========================================
// 4. HORARIOS, CONFIGURACIÓN Y BLOQUEOS
// ==========================================
const diasNombres = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const horariosContainer = document.getElementById("horarios-semana-container");

function minutosATimeInput(mins) {
    return EstudioService.formatearHora(mins);
}
function timeInputAMinutos(str) {
    const [h, m] = str.split(":").map(Number);
    return h * 60 + m;
}

// --- SUBIDA Y COMPRESIÓN DE LOGO ---
function procesarYGuardarLogo(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = async () => {
                const canvas = document.createElement("canvas");
                const size = 250;
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext("2d");

                const minSide = Math.min(img.width, img.height);
                const sx = (img.width - minSide) / 2;
                const sy = (img.height - minSide) / 2;
                ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);

                const logoBase64 = canvas.toDataURL("image/webp", 0.85);
                await estudio.guardarConfiguracion({ logoUrl: logoBase64 });
                resolve(logoBase64);
            };
            img.onerror = reject;
            img.src = event.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

document.getElementById("cfg-logo-file").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
        const nuevoLogo = await procesarYGuardarLogo(file);
        document.getElementById("admin-logo-preview").src = nuevoLogo;
        alert("Logo actualizado correctamente.");
    } catch {
        alert("No se pudo procesar la imagen. Probá con otro archivo.");
    }
});

// --- CARGA Y GUARDADO DE CONFIGURACIÓN ---
async function cargarConfiguracionYBloqueos() {
    const cfg = await estudio.obtenerConfiguracion();

    if (cfg.logoUrl) {
        document.getElementById("admin-logo-preview").src = cfg.logoUrl;
    }

    document.getElementById("cfg-senia").value = cfg.montoSeniaFija;
    document.getElementById("cfg-recargo").value = cfg.recargoTransferencia;
    document.getElementById("cfg-alias").value = cfg.aliasBancario;
    document.getElementById("cfg-whatsapp").value = cfg.whatsappNumero;

    horariosContainer.innerHTML = "";
    for (let d = 0; d < 7; d++) {
        const regla = cfg.horariosSemana[d];
        const row = document.createElement("div");
        row.className = "day-row";
        row.innerHTML = `
            <label style="margin:0; display:flex; align-items:center; gap:0.4rem;">
                <input type="checkbox" id="dia-abierto-${d}" ${regla.abierto ? "checked" : ""}> ${diasNombres[d]}
            </label>
            <input type="time" id="dia-apertura-${d}" value="${minutosATimeInput(regla.apertura)}">
            <input type="time" id="dia-cierre-${d}" value="${minutosATimeInput(regla.cierre)}">
        `;
        horariosContainer.appendChild(row);
    }

    await cargarBloqueosAdmin();
}

document.getElementById("form-config").addEventListener("submit", async (e) => {
    e.preventDefault();
    const horariosSemana = {};
    for (let d = 0; d < 7; d++) {
        horariosSemana[d] = {
            abierto: document.getElementById(`dia-abierto-${d}`).checked,
            apertura: timeInputAMinutos(document.getElementById(`dia-apertura-${d}`).value),
            cierre: timeInputAMinutos(document.getElementById(`dia-cierre-${d}`).value)
        };
    }

    await estudio.guardarConfiguracion({
        montoSeniaFija: parseInt(document.getElementById("cfg-senia").value),
        recargoTransferencia: parseInt(document.getElementById("cfg-recargo").value),
        aliasBancario: document.getElementById("cfg-alias").value.trim(),
        whatsappNumero: document.getElementById("cfg-whatsapp").value.trim(),
        horariosSemana
    });
    alert("Configuración y horarios guardados.");
});

document.getElementById("form-config").addEventListener("submit", async (e) => {
    e.preventDefault();
    const horariosSemana = {};
    for (let d = 0; d < 7; d++) {
        horariosSemana[d] = {
            abierto: document.getElementById(`dia-abierto-${d}`).checked,
            apertura: timeInputAMinutos(document.getElementById(`dia-apertura-${d}`).value),
            cierre: timeInputAMinutos(document.getElementById(`dia-cierre-${d}`).value)
        };
    }

    await estudio.guardarConfiguracion({
        montoSeniaFija: parseInt(document.getElementById("cfg-senia").value),
        recargoTransferencia: parseInt(document.getElementById("cfg-recargo").value),
        aliasBancario: document.getElementById("cfg-alias").value.trim(),
        whatsappNumero: document.getElementById("cfg-whatsapp").value.trim(),
        horariosSemana
    });
    alert("Configuración y horarios guardados.");
});

async function cargarBloqueosAdmin() {
    const lista = document.getElementById("lista-bloqueos-admin");
    const especiales = await estudio.obtenerTodasLasFechasEspeciales();
    lista.innerHTML = especiales.length === 0 ? `<p class="hint">No hay fechas especiales cargadas.</p>` : "";

    especiales.forEach(b => {
        const div = document.createElement("div");
        div.className = "admin-list-item";
        const etiqueta = b.tipo === "FERIADO" ? "🎉 Feriado (+Recargo)" : "🚫 Cerrado";
        div.innerHTML = `
            <div><strong>${b.fecha}</strong> • ${etiqueta}<br><small>${b.motivo}</small></div>
            <button class="btn-cancel">Quitar</button>
        `;
        div.querySelector("button").addEventListener("click", async () => {
            await estudio.eliminarFechaEspecial(b.id);
            await cargarBloqueosAdmin();
        });
        lista.appendChild(div);
    });
}

document.getElementById("form-bloqueo").addEventListener("submit", async (e) => {
    e.preventDefault();
    const fecha = document.getElementById("bloq-fecha").value;
    const tipo = document.getElementById("bloq-tipo").value;
    const motivo = document.getElementById("bloq-motivo").value.trim();
    await estudio.crearFechaEspecial(fecha, tipo, motivo);
    document.getElementById("form-bloqueo").reset();
    await cargarBloqueosAdmin();
});

async function cargarGaleriaAdmin() {
    const lista = document.getElementById("lista-galeria-admin");
    const fotos = await estudio.obtenerGaleria();
    lista.innerHTML = fotos.length === 0 ? `<p class="hint">Usando fotos de muestra. Agregá tus propias fotos arriba.</p>` : "";

    fotos.forEach(f => {
        const div = document.createElement("div");
        div.className = "admin-list-item";
        div.innerHTML = `
            <div><strong>${f.titulo || "Foto de galería"}</strong><br><small style="word-break:break-all;">${f.url.slice(0, 40)}...</small></div>
            <button class="btn-cancel">Borrar</button>
        `;
        div.querySelector("button").addEventListener("click", async () => {
            await estudio.eliminarFotoGaleria(f.id);
            await cargarGaleriaAdmin();
        });
        lista.appendChild(div);
    });
}

document.getElementById("form-galeria").addEventListener("submit", async (e) => {
    e.preventDefault();
    const url = document.getElementById("gal-url").value.trim();
    const titulo = document.getElementById("gal-titulo").value.trim();
    await estudio.agregarFotoGaleria(url, titulo);
    document.getElementById("form-galeria").reset();
    await cargarGaleriaAdmin();
});

// Inicializar todo el panel
const hoy = new Date().toISOString().split("T")[0];
inputFechaAdmin.value = hoy;
suscribirTurnosFecha(hoy);
inputFechaAdmin.addEventListener("change", () => suscribirTurnosFecha(inputFechaAdmin.value));

cargarServiciosAdmin();
cargarProductosAdmin();
cargarConfiguracionYBloqueos();
cargarGaleriaAdmin();