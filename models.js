import { 
    db, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, setDoc, getDoc, query, where, onSnapshot 
} from "./firebase-config.js";

export class Turno {
    constructor(id, clienteNombre, clienteTelefono, servicioNombre, tipoTarifa, precioTotal, seniaMonto, duracionMinutos, fecha, horaInicioMinutos, estado = "PENDIENTE_SEÑA") {
        this.id = id;
        this.clienteNombre = clienteNombre;
        this.clienteTelefono = clienteTelefono;
        this.servicioNombre = servicioNombre;
        this.tipoTarifa = tipoTarifa;
        this.precioTotal = precioTotal;
        this.seniaMonto = seniaMonto;
        this.duracionMinutos = duracionMinutos;
        this.fecha = fecha;
        this.horaInicio = horaInicioMinutos;
        this.horaFin = horaInicioMinutos + duracionMinutos;
        this.estado = estado;
    }

    seSuperponeCon(inicioOtro, finOtro) {
        return this.horaInicio < finOtro && this.horaFin > inicioOtro;
    }
}

export class EstudioService {
    constructor() {
        this.turnosRef = collection(db, "turnos");
        this.serviciosRef = collection(db, "servicios");
        this.productosRef = collection(db, "productos");
        this.galeriaRef = collection(db, "galeria");
        this.bloqueosRef = collection(db, "bloqueos");
        this.configDocRef = doc(db, "configuracion", "general");
    }

    // --- CONFIGURACIÓN GENERAL Y HORARIOS SEMANALES ---
    async obtenerConfiguracion() {
        const snap = await getDoc(this.configDocRef);
        const defaultConfig = {
            nombreEstudio: "Lashes Coty",
            instagram: "@lashes_coty",
            bio: "Estudio especializado en extensiones de pestañas y diseño de mirada. Cada servicio comienza con una evaluación personalizada.",
            whatsappNumero: "5491138219738",
            aliasBancario: "LASHES.COTY.MP",
            montoSeniaFija: 15000,
            recargoTransferencia: 2000,
            recargoHorarioExtra: 10000, // Después de las 18:00 hs
            recargoFeriado: 10000,      // Días feriados
            intervaloMinutos: 30,
            horariosSemana: {
                0: { abierto: false, apertura: 540, cierre: 1140 },
                1: { abierto: false, apertura: 540, cierre: 1140 },
                2: { abierto: true, apertura: 540, cierre: 1200 },
                3: { abierto: true, apertura: 540, cierre: 1200 },
                4: { abierto: true, apertura: 540, cierre: 1200 },
                5: { abierto: true, apertura: 540, cierre: 1200 },
                6: { abierto: true, apertura: 540, cierre: 1140 }
            }
        };

        if (snap.exists()) {
            return { ...defaultConfig, ...snap.data() };
        }
        await setDoc(this.configDocRef, defaultConfig);
        return defaultConfig;
    }

    async guardarConfiguracion(nuevaConfig) {
        await setDoc(this.configDocRef, nuevaConfig, { merge: true });
    }

    // --- GALERÍA DE TRABAJOS ---
    async obtenerGaleria() {
        const snap = await getDocs(this.galeriaRef);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    async agregarFotoGaleria(url, titulo = "") {
        await addDoc(this.galeriaRef, { url, titulo, creadoEn: new Date().toISOString() });
    }

    async eliminarFotoGaleria(id) {
        await deleteDoc(doc(db, "galeria", id));
    }

    // --- SERVICIOS ---
    async obtenerServicios(soloActivos = true) {
        const snap = await getDocs(this.serviciosRef);
        let lista = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (soloActivos) lista = lista.filter(s => s.activo !== false);
        return lista;
    }

    async guardarServicio(servicioData, id = null) {
        if (id) {
            await updateDoc(doc(db, "servicios", id), servicioData);
        } else {
            await addDoc(this.serviciosRef, { ...servicioData, activo: true });
        }
    }

    async eliminarServicio(id) {
        await deleteDoc(doc(db, "servicios", id));
    }

    async inicializarCatalogoBaseSiVacio() {
        const existentes = await this.obtenerServicios(false);
        if (existentes.length > 0) return;

        const catalogoInicial = [
            { nombre: "Volumen bajo Art", categoria: "LASHES", duracionMinutos: 120, precioNormal: 28000, precioServis: 26000, descripcion: "Efecto natural con abanicos livianos." },
            { nombre: "Volumen medio Art", categoria: "LASHES", duracionMinutos: 120, precioNormal: 31000, precioServis: 29000, descripcion: "Densidad intermedia y mirada definida." },
            { nombre: "Volumen Ruso Art", categoria: "LASHES", duracionMinutos: 150, precioNormal: 36000, precioServis: 34000, descripcion: "Máximo volumen y tupidez artesanal." },
            { nombre: "Tech Light", categoria: "EFECTOS", duracionMinutos: 120, precioNormal: 34000, precioServis: 32000, descripcion: "Fibras tecnológicas livianas de acabado suave." },
            { nombre: "Tech Intenso", categoria: "EFECTOS", duracionMinutos: 120, precioNormal: 38000, precioServis: 36000, descripcion: "Fibras tecnológicas de mayor densidad y profundidad." },
            { nombre: "Foxy Natural Tech", categoria: "EFECTOS", duracionMinutos: 120, precioNormal: 34000, precioServis: 32000, descripcion: "Alargamiento progresivo hacia el extremo externo." },
            { nombre: "Foxy Intenso Tech", categoria: "EFECTOS", duracionMinutos: 150, precioNormal: 39000, precioServis: 37000, descripcion: "Efecto delineado rasgado de alto impacto." },
            { nombre: "Brasilero YY", categoria: "EFECTOS", duracionMinutos: 120, precioNormal: 31000, precioServis: 29000, descripcion: "Extensiones en forma de Y para textura entrecruzada." },
            { nombre: "Anime", categoria: "EFECTOS", duracionMinutos: 120, precioNormal: 32000, precioServis: 30000, descripcion: "Picos marcados estilo muñeca / manga." },
            { nombre: "Brown Lashes", categoria: "EFECTOS", duracionMinutos: 120, precioNormal: 32000, precioServis: 30000, descripcion: "Extensiones en tono marrón cálido." },
            { nombre: "Remoción mía", categoria: "ADICIONALES", duracionMinutos: 30, precioNormal: 10000, precioServis: null, descripcion: "Retiro seguro de set realizado en el estudio." },
            { nombre: "Remoción de otra colega", categoria: "ADICIONALES", duracionMinutos: 45, precioNormal: 10000, precioServis: null, descripcion: "Retiro cuidadoso de trabajo externo." }
        ];

        for (const item of catalogoInicial) {
            await addDoc(this.serviciosRef, { ...item, activo: true });
        }
    }

    // --- PRODUCTOS ---
    async obtenerProductos() {
        const snap = await getDocs(this.productosRef);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    async guardarProducto(prodData, id = null) {
        if (id) {
            await updateDoc(doc(db, "productos", id), prodData);
        } else {
            await addDoc(this.productosRef, { ...prodData, activo: true });
        }
    }

    async eliminarProducto(id) {
        await deleteDoc(doc(db, "productos", id));
    }

    // --- FECHAS ESPECIALES: BLOQUEOS (CERRADO) Y FERIADOS (CON RECARGO) ---
    async obtenerFechasEspecialesPorFecha(fecha) {
        const q = query(this.bloqueosRef, where("fecha", "==", fecha));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    async obtenerTodasLasFechasEspeciales() {
        const snap = await getDocs(this.bloqueosRef);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    // tipo: "CERRADO" (bloquea todo el día) | "FERIADO" (permite reservar con recargo automático)
    async crearFechaEspecial(fecha, tipo = "CERRADO", motivo = "No disponible") {
        await addDoc(this.bloqueosRef, { fecha, tipo, todoElDia: tipo === "CERRADO", motivo });
    }

    async eliminarFechaEspecial(id) {
        await deleteDoc(doc(db, "bloqueos", id));
    }

    // --- TURNOS Y DISPONIBILIDAD ---
    async obtenerTurnosPorFecha(fecha) {
        const q = query(this.turnosRef, where("fecha", "==", fecha));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(docSnap => {
            const d = docSnap.data();
            return new Turno(
                docSnap.id, d.clienteNombre, d.clienteTelefono, d.servicioNombre,
                d.tipoTarifa, d.precioTotal, d.seniaMonto, d.duracionMinutos,
                d.fecha, d.horaInicio, d.estado
            );
        });
    }

    escucharTurnosPorFecha(fecha, callback) {
        const q = query(this.turnosRef, where("fecha", "==", fecha));
        return onSnapshot(q, (snapshot) => {
            const turnos = snapshot.docs.map(docSnap => {
                const d = docSnap.data();
                return new Turno(
                    docSnap.id, d.clienteNombre, d.clienteTelefono, d.servicioNombre,
                    d.tipoTarifa, d.precioTotal, d.seniaMonto, d.duracionMinutos,
                    d.fecha, d.horaInicio, d.estado
                );
            });
            callback(turnos);
        });
    }

    async obtenerHorariosDisponibles(fecha, duracionMinutos) {
        const config = await this.obtenerConfiguracion();
        const [anio, mes, dia] = fecha.split("-").map(Number);
        const diaSemana = new Date(anio, mes - 1, dia).getDay();
        const reglaDia = config.horariosSemana[diaSemana];

        if (!reglaDia || !reglaDia.abierto) return { slots: [], esFeriado: false, motivoFeriado: "" };

        const especiales = await this.obtenerFechasEspecialesPorFecha(fecha);
        if (especiales.some(e => e.tipo === "CERRADO" || e.todoElDia === true)) {
            return { slots: [], esFeriado: false, motivoFeriado: "" };
        }

        const feriadoObj = especiales.find(e => e.tipo === "FERIADO");
        const turnosDelDia = await this.obtenerTurnosPorFecha(fecha);
        const slots = [];
        const paso = config.intervaloMinutos || 30;

        for (let inicio = reglaDia.apertura; inicio + duracionMinutos <= reglaDia.cierre; inicio += paso) {
            const fin = inicio + duracionMinutos;
            const pisaTurno = turnosDelDia.some(t => t.seSuperponeCon(inicio, fin));
            if (!pisaTurno) {
                slots.push(inicio);
            }
        }

        return {
            slots,
            esFeriado: Boolean(feriadoObj),
            motivoFeriado: feriadoObj ? feriadoObj.motivo : ""
        };
    }

    async agendarTurno(datosTurno) {
        const { slots } = await this.obtenerHorariosDisponibles(datosTurno.fecha, datosTurno.duracionMinutos);
        if (!slots.includes(datosTurno.horaInicio)) {
            throw new Error("Ese horario acaba de ocuparse. Por favor seleccioná otro.");
        }

        const payload = {
            ...datosTurno,
            horaFin: datosTurno.horaInicio + datosTurno.duracionMinutos,
            estado: "PENDIENTE_SEÑA",
            creadoEn: new Date().toISOString()
        };

        const docRef = await addDoc(this.turnosRef, payload);
        return { id: docRef.id, ...payload };
    }

    async confirmarSenia(id) {
        await updateDoc(doc(db, "turnos", id), { estado: "CONFIRMADO" });
    }

    async eliminarTurno(id) {
        await deleteDoc(doc(db, "turnos", id));
    }

    static formatearHora(minutos) {
        const hrs = Math.floor(minutos / 60).toString().padStart(2, '0');
        const mins = (minutos % 60).toString().padStart(2, '0');
        return `${hrs}:${mins}`;
    }
}