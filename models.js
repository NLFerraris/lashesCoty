class Servicio {
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

class Turno {
    constructor(id, clienteNombre, clienteTelefono, servicio, fecha, horaInicioMinutos, estado = "PENDIENTE_SEÑA") {
        this.id = id;
        this.clienteNombre = clienteNombre;
        this.clienteTelefono = clienteTelefono;
        this.servicio = servicio;
        this.fecha = fecha;
        this.horaInicio = horaInicioMinutos;
        this.horaFin = horaInicioMinutos + servicio.duracionMinutos;
        this.estado = estado; // "PENDIENTE_SEÑA" | "CONFIRMADO"
    }

    seSuperponeCon(inicioOtro, finOtro) {
        return this.horaInicio < finOtro && this.horaFin > inicioOtro;
    }
}

class Agenda {
    constructor(horaApertura = 540, horaCierre = 1140, intervaloMinutos = 30) {
        this.horaApertura = horaApertura;
        this.horaCierre = horaCierre;
        this.intervaloMinutos = intervaloMinutos;
        this.turnos = this.cargarTurnos();
    }

    obtenerHorariosDisponibles(fecha, servicio) {
        const disponibles = [];
        const turnosDelDia = this.turnos.filter(t => t.fecha === fecha);

        for (let inicio = this.horaApertura; inicio + servicio.duracionMinutos <= this.horaCierre; inicio += this.intervaloMinutos) {
            const fin = inicio + servicio.duracionMinutos;
            const estaOcupado = turnosDelDia.some(turno => turno.seSuperponeCon(inicio, fin));
            if (!estaOcupado) {
                disponibles.push(inicio);
            }
        }
        return disponibles;
    }

    agendarTurno(clienteNombre, clienteTelefono, servicio, fecha, horaInicioMinutos) {
        const disponibles = this.obtenerHorariosDisponibles(fecha, servicio);
        if (!disponibles.includes(horaInicioMinutos)) {
            throw new Error("El horario seleccionado ya no se encuentra disponible.");
        }

        const nuevoTurno = new Turno(
            Date.now(),
            clienteNombre,
            clienteTelefono,
            servicio,
            fecha,
            horaInicioMinutos,
            "PENDIENTE_SEÑA"
        );

        this.turnos.push(nuevoTurno);
        this.guardarTurnos();
        return nuevoTurno;
    }

    confirmarSenia(id) {
        const turno = this.turnos.find(t => t.id === id);
        if (turno) {
            turno.estado = "CONFIRMADO";
            this.guardarTurnos();
        }
    }

    eliminarTurno(id) {
        this.turnos = this.turnos.filter(t => t.id !== id);
        this.guardarTurnos();
    }

    guardarTurnos() {
        localStorage.setItem('lashesCoty_turnos', JSON.stringify(this.turnos));
    }

    cargarTurnos() {
        const data = localStorage.getItem('lashesCoty_turnos');
        if (!data) return [];
        return JSON.parse(data).map(t => {
            const srv = new Servicio(
                t.servicio.id,
                t.servicio.nombre,
                t.servicio.duracionMinutos,
                t.servicio.precio,
                t.servicio.porcentajeSenia ?? 50
            );
            return new Turno(t.id, t.clienteNombre, t.clienteTelefono, srv, t.fecha, t.horaInicio, t.estado || "PENDIENTE_SEÑA");
        });
    }

    static formatearHora(minutos) {
        const hrs = Math.floor(minutos / 60).toString().padStart(2, '0');
        const mins = (minutos % 60).toString().padStart(2, '0');
        return `${hrs}:${mins}`;
    }
}