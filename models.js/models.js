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