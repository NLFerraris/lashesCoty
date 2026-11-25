import { 
    db, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, setDoc, getDoc, query, where, onSnapshot 
} from "./firebase-config.js";

export class Servicio {
    constructor(id, nombre, categoria, duracionMinutos, precioNormal, precioServis = null, descripcion = "", activo = true) {
        this.id = id;
        this.nombre = nombre;
        this.categoria = categoria; // "LASHES" | "EFECTOS" | "ADICIONALES"
        this.duracionMinutos = duracionMinutos;
        this.precioNormal = precioNormal;
        this.precioServis = precioServis; // null si no aplica servis (ej: remoción)
        this.descripcion = descripcion;
        this.activo = activo;
    }
}

export class Producto {
    constructor(id, marca, nombre, precio, imagenUrl = "", activo = true) {
        this.id = id;
        this.marca = marca;
        this.nombre = nombre;
        this.precio = precio;
        this.imagenUrl = imagenUrl;
        this.activo = activo;
    }
}

export class Turno {
    constructor(id, clienteNombre, clienteTelefono, servicioNombre, tipoTarifa, precioTotal, seniaMonto, duracionMinutos, fecha, horaInicioMinutos, estado = "PENDIENTE_SEÑA") {
        this.id = id;
        this.clienteNombre = clienteNombre;
        this.clienteTelefono = clienteTelefono;
        this.servicioNombre = servicioNombre;
        this.tipoTarifa = tipoTarifa; // "COLOCACION" | "SERVIS" | "UNICO"
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
        this.bloqueosRef = collection(db, "bloqueos");
        this.configDocRef = doc(db, "configuracion", "general");
    }

    // --- CONFIGURACIÓN GENERAL Y HORARIOS SEMANALES ---
    async obtenerConfiguracion() {
        const snap = await getDoc(this.configDocRef);
        if (snap.exists()) return snap.data();

        // Configuración inicial basada en @lashes_coty
        const defaultConfig = {
            nombreEstudio: "Lashes Coty",
            instagram: "@lashes_coty",
            bio: "Estudio especializado en extensiones de pestañas y diseño de mirada. Cada servicio comienza con una evaluación personalizada.",
            whatsappNumero: "5491138219738",
            aliasBancario: "LASHES.COTY.MP",
            montoSeniaFija: 15000,
            recargoTransferencia: 2000,
            intervaloMinutos: 30,
            // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
            horariosSemana: {
                0: { abierto: false, apertura: 540, cierre: 1140 },
                1: { abierto: false, apertura: 540, cierre: 1140 },
                2: { abierto: true, apertura: 540, cierre: 1200 },  // 09:00 a 20:00
                3: { abierto: true, apertura: 540, cierre: 1200 },
                4: { abierto: true, apertura: 540, cierre: 1200 },
                5: { abierto: true, apertura: 540, cierre: 1200 },
                6: { abierto: true, apertura: 540, cierre: 1140 }   // 09:00 a 19:00
            }
        };
        await setDoc(this.configDocRef, defaultConfig);
        return defaultConfig;
    }

    async guardarConfiguracion(nuevaConfig) {
        await setDoc(this.configDocRef, nuevaConfig, { merge: true });
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

    // Carga inicial automática con la lista de precios de la imagen si la colección está vacía
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
            { nombre: "Remoción de otra colega", categoria: "ADICIONALES", duracionMinutos: 45, precioNormal: 10000, precioServis: null, descripcion: "Retiro cuidadoso de trabajo externo." },
            { nombre: "Horario extra (Dsp 18hs)", categoria: "ADICIONALES", duracionMinutos: 30, precioNormal: 10000, precioServis: null, descripcion: "Adicional por turno fuera de franja regular." },
            { nombre: "Feriado recargo", categoria: "ADICIONALES", duracionMinutos: 30, precioNormal: 10000, precioServis: null, descripcion: "Adicional aplicable en días feriados." }
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

    // --- BLOQUEOS DE FECHAS / HORARIOS (Francos, vacaciones, etc.) ---
    async obtenerBloqueosPorFecha(fecha) {
        const q = query(this.bloqueosRef, where("fecha", "==", fecha));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    async obtenerTodosLosBloqueos() {
        const snap = await getDocs(this.bloqueosRef);
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    async crearBloqueo(fecha, todoElDia, horaInicio = 0, horaFin = 1440, motivo = "No disponible") {
        await addDoc(this.bloqueosRef, { fecha, todoElDia, horaInicio, horaFin, motivo });
    }

    async eliminarBloqueo(id) {
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

        if (!reglaDia || !reglaDia.abierto) return [];

        const bloqueos = await this.obtenerBloqueosPorFecha(fecha);
        if (bloqueos.some(b => b.todoElDia)) return [];

        const turnosDelDia = await this.obtenerTurnosPorFecha(fecha);
        const disponibles = [];
        const paso = config.intervaloMinutos || 30;

        for (let inicio = reglaDia.apertura; inicio + duracionMinutos <= reglaDia.cierre; inicio += paso) {
            const fin = inicio + duracionMinutos;
            const pisaTurno = turnosDelDia.some(t => t.seSuperponeCon(inicio, fin));
            const pisaBloqueo = bloqueos.some(b => inicio < b.horaFin && fin > b.horaInicio);

            if (!pisaTurno && !pisaBloqueo) {
                disponibles.push(inicio);
            }
        }
        return disponibles;
    }

    async agendarTurno(datosTurno) {
        const disponibles = await this.obtenerHorariosDisponibles(datosTurno.fecha, datosTurno.duracionMinutos);
        if (!disponibles.includes(datosTurno.horaInicio)) {
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