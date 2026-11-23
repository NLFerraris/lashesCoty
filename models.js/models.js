class Servicio {
    constructor(id, nombre, duracionMinutos, precio) {
        this.id = id;
        this.nombre = nombre;
        this.duracionMinutos = duracionMinutos;
        this.precio = precio;
    }
}

class Turno {
    constructor(id, clienteNombre, clienteTelefono, servicio, fecha, horaInicioMinutos) {
        this.id = id;
        this.clienteNombre = clienteNombre;
        this.clienteTelefono = clienteTelefono;
        this.servicio = servicio; // Objeto de tipo Servicio
        this.fecha = fecha;       // Formato "YYYY-MM-DD"
        this.horaInicio = horaInicioMinutos; // Ej: 540 = 09:00 hs
        this.horaFin = horaInicioMinutos + servicio.duracionMinutos;
    }

    // Método auxiliar para verificar si este turno se pisa con otro rango horario
    seSuperponeCon(inicioOtro, finOtro) {
        return this.horaInicio < finOtro && this.horaFin > inicioOtro;
    }
}

class Agenda {
    constructor(horaApertura = 540, horaCierre = 1140, intervaloMinutos = 30) {
        // 540 min = 09:00 hs | 1140 min = 19:00 hs
        this.horaApertura = horaApertura;
        this.horaCierre = horaCierre;
        this.intervaloMinutos = intervaloMinutos;
        this.turnos = this.cargarTurnos();
    }

    // Genera un array de minutos libres para una fecha y servicio dados
    obtenerHorariosDisponibles(fecha, servicio) {
        const disponibles = [];
        const turnosDelDia = this.turnos.filter(t => t.fecha === fecha);

        for (let inicio = this.horaApertura; inicio + servicio.duracionMinutos <= this.horaCierre; inicio += this.intervaloMinutos) {
            const fin = inicio + servicio.duracionMinutos;
            
            // Verifica si algún turno del día se superpone con este bloque [inicio, fin]
            const estaOcupado = turnosDelDia.some(turno => turno.seSuperponeCon(inicio, fin));
            
            if (!estaOcupado) {
                disponibles.push(inicio);
            }
        }
        return disponibles;
    }

    // Registra un nuevo turno validando disponibilidad y lo persiste
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
            horaInicioMinutos
        );

        this.turnos.push(nuevoTurno);
        this.guardarTurnos();
        return nuevoTurno;
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
        // Rehidratamos los objetos planos del JSON a instancias reales de Turno y Servicio
        return JSON.parse(data).map(t => {
            const srv = new Servicio(t.servicio.id, t.servicio.nombre, t.servicio.duracionMinutos, t.servicio.precio);
            const turno = new Turno(t.id, t.clienteNombre, t.clienteTelefono, srv, t.fecha, t.horaInicio);
            return turno;
        });
    }

    // Método estático utilitario para convertir minutos (ej: 570) a texto ("09:30")
    static formatearHora(minutos) {
        const hrs = Math.floor(minutos / 60).toString().padStart(2, '0');
        const mins = (minutos % 60).toString().padStart(2, '0');
        return `${hrs}:${mins}`;
    }
}