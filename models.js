import { 
    db, collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, where, onSnapshot 
} from "./firebase-config.js";

export class Servicio {
    constructor(id, nombre, duracionMinutos, precio, porcentajeSenia = 50) {
        this.id = id;
        this.nombre = nombre;
        this.duracionMinutos = duracionMinutos;
        this.precio = precio;
        this.porcentajeSenia = porcentajeSenia;
    }

    obtenerMontoSenia() {
        return Math.round((this.precio * this.porcentajeSenia) / 100);
    }
}

export class Turno {
    constructor(id, clienteNombre, clienteTelefono, servicio, fecha, horaInicioMinutos, estado = "PENDIENTE_SEÑA") {
        this.id = id;
        this.clienteNombre = clienteNombre;
        this.clienteTelefono = clienteTelefono;
        this.servicio = servicio;
        this.fecha = fecha;
        this.horaInicio = horaInicioMinutos;
        this.horaFin = horaInicioMinutos + servicio.duracionMinutos;
        this.estado = estado;
    }

    seSuperponeCon(inicioOtro, finOtro) {
        return this.horaInicio < finOtro && this.horaFin > inicioOtro;
    }
}

export class Agenda {
    constructor(horaApertura = 540, horaCierre = 1140, intervaloMinutos = 30) {
        this.horaApertura = horaApertura;
        this.horaCierre = horaCierre;
        this.intervaloMinutos = intervaloMinutos;
        this.turnosRef = collection(db, "turnos");
    }

    // Consulta en Firestore los turnos de una fecha específica
    async obtenerTurnosPorFecha(fecha) {
        const q = query(this.turnosRef, where("fecha", "==", fecha));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            const srv = new Servicio(
                data.servicio.id,
                data.servicio.nombre,
                data.servicio.duracionMinutos,
                data.servicio.precio,
                data.servicio.porcentajeSenia ?? 50
            );
            return new Turno(docSnap.id, data.clienteNombre, data.clienteTelefono, srv, data.fecha, data.horaInicio, data.estado);
        });
    }

    // Escucha cambios en tiempo real para el panel de administración
    escucharTurnosPorFecha(fecha, callback) {
        const q = query(this.turnosRef, where("fecha", "==", fecha));
        return onSnapshot(q, (snapshot) => {
            const turnos = snapshot.docs.map(docSnap => {
                const data = docSnap.data();
                const srv = new Servicio(
                    data.servicio.id,
                    data.servicio.nombre,
                    data.servicio.duracionMinutos,
                    data.servicio.precio,
                    data.servicio.porcentajeSenia ?? 50
                );
                return new Turno(docSnap.id, data.clienteNombre, data.clienteTelefono, srv, data.fecha, data.horaInicio, data.estado);
            });
            callback(turnos);
        });
    }

    async obtenerHorariosDisponibles(fecha, servicio) {
        const disponibles = [];
        const turnosDelDia = await this.obtenerTurnosPorFecha(fecha);

        for (let inicio = this.horaApertura; inicio + servicio.duracionMinutos <= this.horaCierre; inicio += this.intervaloMinutos) {
            const fin = inicio + servicio.duracionMinutos;
            const estaOcupado = turnosDelDia.some(turno => turno.seSuperponeCon(inicio, fin));
            if (!estaOcupado) {
                disponibles.push(inicio);
            }
        }
        return disponibles;
    }

    async agendarTurno(clienteNombre, clienteTelefono, servicio, fecha, horaInicioMinutos) {
        // Re-validación contra la nube justo antes de escribir
        const disponibles = await this.obtenerHorariosDisponibles(fecha, servicio);
        if (!disponibles.includes(horaInicioMinutos)) {
            throw new Error("¡Ups! Alguien acaba de reservar ese horario hace unos segundos. Por favor elegí otro.");
        }

        const nuevoTurnoData = {
            clienteNombre,
            clienteTelefono,
            servicio: {
                id: servicio.id,
                nombre: servicio.nombre,
                duracionMinutos: servicio.duracionMinutos,
                precio: servicio.precio,
                porcentajeSenia: servicio.porcentajeSenia
            },
            fecha,
            horaInicio: horaInicioMinutos,
            horaFin: horaInicioMinutos + servicio.duracionMinutos,
            estado: "PENDIENTE_SEÑA",
            creadoEn: new Date().toISOString()
        };

        const docRef = await addDoc(this.turnosRef, nuevoTurnoData);
        return new Turno(docRef.id, clienteNombre, clienteTelefono, servicio, fecha, horaInicioMinutos, "PENDIENTE_SEÑA");
    }

    async confirmarSenia(id) {
        const turnoDoc = doc(db, "turnos", id);
        await updateDoc(turnoDoc, { estado: "CONFIRMADO" });
    }

    async eliminarTurno(id) {
        const turnoDoc = doc(db, "turnos", id);
        await deleteDoc(turnoDoc);
    }

    static formatearHora(minutos) {
        const hrs = Math.floor(minutos / 60).toString().padStart(2, '0');
        const mins = (minutos % 60).toString().padStart(2, '0');
        return `${hrs}:${mins}`;
    }
}