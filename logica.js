/* ==========================================================================
   ZOARKIDS 360 - LÓGICA DE LOGIN Y AUTENTICACIÓN
   ========================================================================== */

const baseDocentes = {
    "jonathan@iglesiazoarsv.org": { clave: "admin123", rol: "admin", nombre: "Jonathan" },
    "pastor@iglesiazoarsv.org": { clave: "pastor360", rol: "pastor", nombre: "Pastor General" },
    "marisol@iglesiazoarsv.org": { clave: "m123", rol: "maestra", nombre: "Marisol" },
    "maribel@iglesiazoarsv.org": { clave: "m123", rol: "maestra", nombre: "Maribel" },
    "dina@iglesiazoarsv.org": { clave: "m123", rol: "maestra", nombre: "Dina" },
    "flor@iglesiazoarsv.org": { clave: "m123", rol: "maestra", nombre: "Flor" },
    "yeny@iglesiazoarsv.org": { clave: "m123", rol: "maestra", nombre: "Yeny" },
    "fernando@iglesiazoarsv.org": { clave: "m123", rol: "maestro", nombre: "Fernando" },
    "brenda@iglesiazoarsv.org": { clave: "m123", rol: "maestra", nombre: "Brenda" },
    "claudia@iglesiazoarsv.org": { clave: "m123", rol: "maestra", nombre: "Claudia" },
    "mari@iglesiazoarsv.org": { clave: "m123", rol: "maestra", nombre: "Marí" },
    "erick@iglesiazoarsv.org": { clave: "m123", rol: "maestro", nombre: "Erick" }
};

let intentosFallidos = 0;
let intervaloContador = null;

// OCULTAR SPLASH
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if (splash) {
            splash.style.opacity = '0';
            splash.style.visibility = 'hidden';
        }
    }, 2000);
    verificarBloqueoPersistente();
});

// VERIFICAR BLOQUEO GUARDADO
function verificarBloqueoPersistente() {
    const tiempoBloqueo = localStorage.getItem('zk360_bloqueo_hasta');
    if (tiempoBloqueo) {
        const restante = parseInt(tiempoBloqueo) - Date.now();
        if (restante > 0) {
            activarPantallaBloqueo(restante);
        } else {
            localStorage.removeItem('zk360_bloqueo_hasta');
            intentosFallidos = 0;
        }
    }
}

// ACTIVAR PANTALLA DE BLOQUEO
function activarPantallaBloqueo(duracionMs) {
    const capa = document.getElementById('capa-bloqueo');
    const contador = document.getElementById('contador');
    if (!capa || !contador) return;

    capa.classList.add('activo');
    let segundos = Math.ceil(duracionMs / 1000);

    clearInterval(intervaloContador);
    intervaloContador = setInterval(() => {
        segundos--;
        const mins = Math.floor(segundos / 60);
        const secs = segundos % 60;
        contador.textContent = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;

        if (segundos <= 0) {
            clearInterval(intervaloContador);
            capa.classList.remove('activo');
            localStorage.removeItem('zk360_bloqueo_hasta');
            intentosFallidos = 0;
        }
    }, 1000);
}

// FORMULARIO DE LOGIN
document.getElementById('form-login').addEventListener('submit', function(e) {
    e.preventDefault();

    const correo = document.getElementById('correo').value.trim().toLowerCase();
    const clave = document.getElementById('clave').value;

    // Validar dominio
    if (!correo.endsWith("@iglesiazoarsv.org")) {
        mostrarNotificacion("Solo se permiten correos oficiales (@iglesiazoarsv.org)", "error");
        return;
    }

    const usuario = baseDocentes[correo];

    if (usuario && usuario.clave === clave) {
        // Guardar sesión
        sessionStorage.setItem('zk360_usuario_activo', JSON.stringify(usuario));
        if (usuario.rol === "admin" || usuario.rol === "pastor") {
            localStorage.setItem('zk360_usuario_persistente', JSON.stringify(usuario));
        }

        // Guardar en historial
        let logs = JSON.parse(localStorage.getItem('zk360_historial')) || [];
        logs.push({
            usuario: usuario.nombre,
            accion: "Inicio de sesión exitoso",
            fecha: new Date().toLocaleString()
        });
        localStorage.setItem('zk360_historial', JSON.stringify(logs));

        window.location.href = "panel.html";
    } else {
        intentosFallidos++;

        let logs = JSON.parse(localStorage.getItem('zk360_historial')) || [];
        logs.push({
            usuario: correo || "Anónimo",
            accion: `Intento fallido #${intentosFallidos}`,
            fecha: new Date().toLocaleString()
        });
        localStorage.setItem('zk360_historial', JSON.stringify(logs));

        if (intentosFallidos >= 2) {
            const tiempo = Date.now() + 60000;
            localStorage.setItem('zk360_bloqueo_hasta', String(tiempo));
            activarPantallaBloqueo(60000);
            mostrarNotificacion("Demasiados intentos. Bloqueo de 1 minuto.", "error");
        } else {
            mostrarNotificacion(`Contraseña incorrecta. ${2 - intentosFallidos} intento(s) restante(s).`, "error");
        }
    }
});

// SISTEMA DE NOTIFICACIONES GLOBAL
function mostrarNotificacion(mensaje, tipo = "info") {
    const contenedor = document.getElementById('notificacion-sistema');
    if (!contenedor) {
        const nuevo = document.createElement('div');
        nuevo.id = 'notificacion-sistema';
        document.body.appendChild(nuevo);
    }

    const colores = {
        info: '#2575fc',
        success: '#2ecc71',
        error: '#ff7675',
        warning: '#f39c12'
    };

    const iconos = {
        info: 'fa-circle-info',
        success: 'fa-circle-check',
        error: 'fa-triangle-exclamation',
        warning: 'fa-triangle-exclamation'
    };

    const notif = document.getElementById('notificacion-sistema');
    notif.innerHTML = `
        <div class="notificacion-burbuja ${tipo}" style="border-left-color: ${colores[tipo] || '#2575fc'};">
            <i class="fa-solid ${iconos[tipo] || 'fa-circle-info'}"></i>
            <span>${mensaje}</span>
            <button onclick="this.parentElement.remove()" style="background:none; border:none; color:#95a5a6; cursor:pointer; font-size:18px;">×</button>
        </div>
    `;

    setTimeout(() => {
        const notifEl = document.querySelector('.notificacion-burbuja');
        if (notifEl) notifEl.style.opacity = '0';
        setTimeout(() => {
            const cont = document.getElementById('notificacion-sistema');
            if (cont) cont.innerHTML = '';
        }, 500);
    }, 4000);
}