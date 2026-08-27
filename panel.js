/* ==========================================================================
   ZOARKIDS 360 - LÓGICA COMPLETA DEL PANEL (v16.0)
   ========================================================================== */

// ============ CONFIGURACIÓN DE SUPABASE ============
const SUPABASE_URL = "https://yxumadojoswvipmkxgbo.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4dW1hZG9qb3N3dmlwbWt4Z2JvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4NDg4MjQsImV4cCI6MjEwMzQyNDgyNH0.6mat0P0BEP3Y0hni6BFhdO7yD8dfrDpGvkkfVx4kDTI";

// ============ CRONOGRAMA 2026 ============
const cronogramaOficial2026 = {
    "30/8/2026": { pi: "Marí y Jonathan", me: "Flor", gr: "Erik", seccion: { "marí": "infancia", "jonathan": "infancia", "flor": "medianos", "erik": "grandes" } },
    "6/9/2026": { pi: "Marisol y Maribel", me: "Erik", gr: "Dina", seccion: { "marisol": "infancia", "maribel": "infancia", "erik": "medianos", "dina": "grandes" } },
    "13/9/2026": { pi: "Dina y Flor", me: "Brenda", gr: "Yeny", seccion: { "dina": "infancia", "flor": "infancia", "brenda": "medianos", "yeny": "grandes" } },
    "20/9/2026": { pi: "Yeny y Fernando", me: "Marisol", gr: "Flor", seccion: { "yeny": "infancia", "fernando": "infancia", "marisol": "medianos", "flor": "grandes" } },
    "27/9/2026": { pi: "Brenda y Claudia", me: "Jonathan", gr: "Dina", seccion: { "brenda": "infancia", "claudia": "infancia", "jonathan": "medianos", "dina": "grandes" } },
    "4/10/2026": { pi: "Marí y Jonathan", me: "Flor", gr: "Yeny", seccion: { "marí": "infancia", "jonathan": "infancia", "flor": "medianos", "yeny": "grandes" } },
    "11/10/2026": { pi: "Marisol y Maribel", me: "Dina", gr: "Erik", seccion: { "marisol": "infancia", "maribel": "infancia", "dina": "medianos", "erik": "grandes" } },
    "18/10/2026": { pi: "Dina y Flor", me: "Claudia", gr: "Yeny", seccion: { "dina": "infancia", "flor": "infancia", "claudia": "medianos", "yeny": "grandes" } },
    "25/10/2026": { pi: "Yeny y Fernando", me: "Marí", gr: "Erik", seccion: { "yeny": "infancia", "fernando": "infancia", "marí": "medianos", "erik": "grandes" } },
    "1/11/2026": { pi: "Brenda y Claudia", me: "Maribel", gr: "Flor", seccion: { "brenda": "infancia", "claudia": "infancia", "maribel": "medianos", "flor": "grandes" } },
    "8/11/2026": { pi: "Marí y Jonathan", me: "Yeny", gr: "Dina", seccion: { "marí": "infancia", "jonathan": "infancia", "yeny": "medianos", "dina": "grandes" } },
    "15/11/2026": { pi: "Marisol y Maribel", me: "Flor", gr: "Erik", seccion: { "marisol": "infancia", "maribel": "infancia", "flor": "medianos", "erik": "grandes" } },
    "22/11/2026": { pi: "Dina y Flor", me: "Brenda", gr: "Yeny", seccion: { "dina": "infancia", "flor": "infancia", "brenda": "medianos", "yeny": "grandes" } },
    "29/11/2026": { pi: "Yeny y Fernando", me: "Claudia", gr: "Flor", seccion: { "yeny": "infancia", "fernando": "infancia", "claudia": "medianos", "flor": "grandes" } },
    "6/12/2026": { pi: "Brenda y Claudia", me: "Marí", gr: "Dina", seccion: { "brenda": "infancia", "claudia": "infancia", "marí": "medianos", "dina": "grandes" } },
    "13/12/2026": { pi: "Marí y Jonathan", me: "Marisol", gr: "Yeny", seccion: { "marí": "infancia", "jonathan": "infancia", "marisol": "medianos", "yeny": "grandes" } },
    "20/12/2026": { pi: "Marisol y Maribel", me: "Dina", gr: "Erik", seccion: { "marisol": "infancia", "maribel": "infancia", "dina": "medianos", "erik": "grandes" } },
    "27/12/2026": { pi: "Dina y Flor", me: "Jonathan", gr: "Yeny", seccion: { "dina": "infancia", "flor": "infancia", "jonathan": "medianos", "yeny": "grandes" } }
};

// ============ VARIABLES GLOBALES ============
let usuarioSesion = null;
let seccionAsignadaMaestro = null;
let bancoAlumnosCompleto = [];
let bancoAlumnosFiltrados = [];
let idNinoAEditar = null;
let asistenciaEnviadaHoy = false;
let solicitudEdicionPendiente = false;
let modoAdminVerTodos = false;
let archivosSubidos = [];

// ============ NOTIFICACIÓN CON 30 SEGUNDOS ============
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
            <button onclick="this.parentElement.remove()" style="background:none; border:none; color:#95a5a6; cursor:pointer; font-size:18px;">&times;</button>
        </div>
    `;

    setTimeout(() => {
        const notifEl = document.querySelector('.notificacion-burbuja');
        if (notifEl) notifEl.style.opacity = '0';
        setTimeout(() => {
            const cont = document.getElementById('notificacion-sistema');
            if (cont) cont.innerHTML = '';
        }, 500);
    }, 30000);
}

// ============ FUNCIÓN PARA LLAMAR A SUPABASE ============
async function llamarSupabase(endpoint, opciones = {}) {
    const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
    const headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    };

    const config = {
        ...opciones,
        headers: { ...headers, ...opciones.headers }
    };

    try {
        const response = await fetch(url, config);
        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error en Supabase:", error);
        mostrarNotificacion("Error de conexión con el servidor", "error");
        return null;
    }
}

// ============ FUNCIONES PARA SUPABASE ============
async function cargarAlumnosDesdeSupabase(seccion = null) {
    try {
        let endpoint = "alumnos?order=id.asc";
        if (seccion && seccion !== "todos") {
            endpoint = `alumnos?seccion=eq.${seccion}&order=id.asc`;
        }
        const data = await llamarSupabase(endpoint);
        if (data) {
            return data;
        }
        return [];
    } catch (error) {
        console.error("Error cargando alumnos:", error);
        return [];
    }
}

async function guardarAlumnoEnSupabase(alumno) {
    try {
        const data = await llamarSupabase("alumnos", {
            method: "POST",
            body: JSON.stringify(alumno)
        });
        return data;
    } catch (error) {
        console.error("Error guardando alumno:", error);
        return null;
    }
}

async function actualizarAlumnoEnSupabase(id, datos) {
    try {
        const data = await llamarSupabase(`alumnos?id=eq.${id}`, {
            method: "PATCH",
            body: JSON.stringify(datos)
        });
        return data;
    } catch (error) {
        console.error("Error actualizando alumno:", error);
        return null;
    }
}

async function eliminarAlumnoEnSupabase(id) {
    try {
        const data = await llamarSupabase(`alumnos?id=eq.${id}`, {
            method: "DELETE"
        });
        return data;
    } catch (error) {
        console.error("Error eliminando alumno:", error);
        return null;
    }
}

async function guardarAsistenciaEnSupabase(asistencia) {
    try {
        const data = await llamarSupabase("asistencia", {
            method: "POST",
            body: JSON.stringify(asistencia)
        });
        return data;
    } catch (error) {
        console.error("Error guardando asistencia:", error);
        return null;
    }
}

async function actualizarClasesTotales(id, nuevasClases) {
    try {
        const data = await llamarSupabase(`alumnos?id=eq.${id}`, {
            method: "PATCH",
            body: JSON.stringify({ clases_totales: nuevasClases })
        });
        return data;
    } catch (error) {
        console.error("Error actualizando clases totales:", error);
        return null;
    }
}

async function guardarLogEnSupabase(log) {
    try {
        const data = await llamarSupabase("logs", {
            method: "POST",
            body: JSON.stringify(log)
        });
        return data;
    } catch (error) {
        console.error("Error guardando log:", error);
        return null;
    }
}

// ============ NOTIFICACIONES PUSH ============
function registrarDispositivoParaPush() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'denied') {
        mostrarNotificacion("Activa las notificaciones desde la configuración de tu navegador", "warning");
        return;
    }
    if (Notification.permission === 'granted') {
        return;
    }
    Notification.requestPermission().then(permiso => {
        if (permiso === 'granted') {
            mostrarNotificacion("Notificaciones activadas. Recibirás alertas de tus turnos.", "success");
        }
    });
}

function enviarNotificacionPush(titulo, mensaje) {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
        mostrarNotificacion(` ${titulo}: ${mensaje}`, "info");
        return;
    }
    try {
        const notif = new Notification(titulo, {
            body: mensaje,
            icon: 'logo.png',
            tag: 'zoarkids_notificacion',
            requireInteraction: true
        });
        notif.onclick = function() { window.focus(); this.close(); };
        setTimeout(() => notif.close(), 30000);
    } catch (e) {
        mostrarNotificacion(` ${titulo}: ${mensaje}`, "info");
    }
}

// ============ VERIFICAR TURNO Y NOTIFICAR ============
function verificarTurnoYNotificar() {
    const hoy = new Date();
    const dia = hoy.getDay();

    if (dia === 4) {
        const claveFecha = calcularProximoDomingo();
        const turno = cronogramaOficial2026[claveFecha];
        if (turno) {
            const nombreLower = usuarioSesion.nombre.toLowerCase();
            let seccionEncontrada = null;
            for (const [nombre, seccion] of Object.entries(turno.seccion)) {
                if (nombre === nombreLower) {
                    seccionEncontrada = seccion;
                    break;
                }
            }
            if (!seccionEncontrada && usuarioSesion.pareja) {
                const parejaLower = usuarioSesion.pareja.toLowerCase();
                for (const [nombre, seccion] of Object.entries(turno.seccion)) {
                    if (nombre === parejaLower) {
                        seccionEncontrada = seccion;
                        break;
                    }
                }
            }
            if (seccionEncontrada) {
                const nombresSeccion = {
                    "infancia": "Primera Infancia (1-3 años)",
                    "medianos": "Medianos (4-8 años)",
                    "grandes": "Grandes (9-12 años)"
                };
                enviarNotificacionPush(
                    'ZoarKids 360 - Recordatorio de Turno',
                    `${usuarioSesion.nombre}, estás encargado de ${nombresSeccion[seccionEncontrada] || seccionEncontrada} este domingo.`
                );
            }
        }
    }

    if (dia === 0 && hoy.getHours() >= 14 && hoy.getHours() < 15) {
        if (seccionAsignadaMaestro && seccionAsignadaMaestro !== "admin_total") {
            const nombresSeccion = {
                "infancia": "Primera Infancia (1-3 años)",
                "medianos": "Medianos (4-8 años)",
                "grandes": "Grandes (9-12 años)"
            };
            enviarNotificacionPush(
                'ZoarKids 360 - Tu turno está próximo',
                `${usuarioSesion.nombre}, tu clase de ${nombresSeccion[seccionAsignadaMaestro] || seccionAsignadaMaestro} comienza en 1 hora.`
            );
        }
    }
}

// ============ INICIALIZACIÓN ============
window.addEventListener('DOMContentLoaded', async () => {
    document.addEventListener('gesturestart', function(e) { e.preventDefault(); e.stopPropagation(); return false; }, { passive: false });
    document.addEventListener('gesturechange', function(e) { e.preventDefault(); e.stopPropagation(); return false; }, { passive: false });
    document.addEventListener('gestureend', function(e) { e.preventDefault(); e.stopPropagation(); return false; }, { passive: false });
    document.addEventListener('touchmove', function(e) {
        if (e.touches && e.touches.length >= 2) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    }, { passive: false });
    document.addEventListener('wheel', function(e) {
        if (e.ctrlKey) {
            e.preventDefault();
            e.stopPropagation();
            return false;
        }
    }, { passive: false });

    const sesionTemporal = sessionStorage.getItem('zk360_usuario_activo');
    const sesionPersistente = localStorage.getItem('zk360_usuario_persistente');

    if (sesionPersistente) {
        usuarioSesion = JSON.parse(sesionPersistente);
    } else if (sesionTemporal) {
        usuarioSesion = JSON.parse(sesionTemporal);
    }

    if (!usuarioSesion) {
        window.location.href = "index.html";
        return;
    }

    document.getElementById('txt-nombre-usuario').textContent = `${usuarioSesion.nombre} (${usuarioSesion.rol.toUpperCase()})`;
    document.getElementById('avatar-inicial').textContent = usuarioSesion.nombre.charAt(0);
    document.getElementById('perf-nombre').textContent = usuarioSesion.nombre;
    document.getElementById('perf-correo').textContent = `${usuarioSesion.nombre.toLowerCase()}@iglesiazoarsv.org`;
    document.getElementById('perf-rol').textContent = usuarioSesion.rol;

    procesarAlgoritmoCalendarioKids();
    document.getElementById('perf-seccion').textContent = seccionAsignadaMaestro || "Sin asignación";

    configurarMenuSegunRol();

    if (usuarioSesion.rol === "admin" || usuarioSesion.rol === "pastor") {
        document.getElementById('zona-acciones-admin-asistencia').style.display = 'flex';
    }

    await cargarAlumnosSegunRol();
    cargarHistorialAuditoria();
    configurarEventos();
    setTimeout(registrarDispositivoParaPush, 3000);
    setTimeout(verificarTurnoYNotificar, 5000);
});

// ============ CONFIGURAR MENÚ ============
function configurarMenuSegunRol() {
    const esAdmin = usuarioSesion.rol === "admin" || usuarioSesion.rol === "pastor";
    document.getElementById('menu-registros').style.display = esAdmin ? 'flex' : 'none';
    document.getElementById('menu-reportes').style.display = esAdmin ? 'flex' : 'none';
    if (!esAdmin) {
        const seccionPerfil = document.querySelector('#desplegable-usuario p:last-child');
        if (seccionPerfil && seccionPerfil.innerHTML.includes('Sección asignada')) {
            seccionPerfil.style.display = 'none';
        }
    }
}

// ============ CONFIGURAR EVENTOS ============
function configurarEventos() {
    document.querySelectorAll('.menu-link[data-vista]').forEach(link => {
        link.addEventListener('click', function() {
            const vista = this.dataset.vista;
            activarVistaPestaña(vista, this);
        });
    });

    document.getElementById('trigger-menu').addEventListener('click', function(e) {
        e.stopPropagation();
        document.getElementById('menu-lateral').classList.toggle('abierto');
    });

    document.addEventListener('click', function(e) {
        const menu = document.getElementById('menu-lateral');
        const trigger = document.getElementById('trigger-menu');
        if (window.innerWidth <= 768 && menu.classList.contains('abierto')) {
            if (!menu.contains(e.target) && !trigger.contains(e.target)) {
                menu.classList.remove('abierto');
            }
        }
    });

    document.getElementById('wrapper-perfil-click').addEventListener('click', function(e) {
        e.stopPropagation();
        document.getElementById('desplegable-usuario').classList.toggle('activo');
    });

    document.addEventListener('click', () => {
        document.getElementById('desplegable-usuario').classList.remove('activo');
    });

    document.getElementById('trigger-info-app').addEventListener('click', () => {
        document.getElementById('pantalla-modal-creditos').classList.add('activo');
    });

    document.getElementById('btn-cerrar-modal-click').addEventListener('click', () => {
        document.getElementById('pantalla-modal-creditos').classList.remove('activo');
    });

    document.getElementById('btn-subir-archivo').addEventListener('click', function() {
        const opciones = document.createElement('div');
        opciones.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.5); z-index: 9999;
            display: flex; align-items: center; justify-content: center;
            backdrop-filter: blur(4px);
        `;
        opciones.id = 'dialogo-camara-archivo';

        opciones.innerHTML = `
            <div style="background: white; border-radius: 24px; padding: 30px; max-width: 350px; width: 100%; text-align: center; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                <h3 style="margin-bottom: 20px; color: #2c3e50;"><i class="fa-solid fa-file-arrow-up"></i> Subir Archivo</h3>
                <p style="color: #747d8c; margin-bottom: 20px;">¿Cómo deseas capturar el archivo?</p>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <button onclick="abrirCamara()" style="background: #2575fc; color: white; border: none; padding: 14px; border-radius: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 16px;">
                        <i class="fa-solid fa-camera"></i> Tomar Foto con Cámara
                    </button>
                    <button onclick="abrirArchivos()" style="background: #6c5ce7; color: white; border: none; padding: 14px; border-radius: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 16px;">
                        <i class="fa-solid fa-folder-open"></i> Seleccionar de Archivos
                    </button>
                    <button onclick="cerrarDialogoCamara()" style="background: #ff7675; color: white; border: none; padding: 12px; border-radius: 14px; font-weight: 600; cursor: pointer;">
                        Cancelar
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(opciones);
    });

    document.getElementById('captura-cuaderno').addEventListener('change', function(e) {
        procesarArchivoSeleccionado(this);
    });

    document.getElementById('captura-camara').addEventListener('change', function(e) {
        procesarArchivoSeleccionado(this);
    });

    document.getElementById('btn-confirmar-envio').addEventListener('click', function() {
        const inputArchivo = document.getElementById('captura-cuaderno');
        const inputCamara = document.getElementById('captura-camara');
        const archivo = inputArchivo.files[0] || inputCamara.files[0];
        if (!archivo) {
            mostrarNotificacion("Por favor, selecciona un archivo primero.", "error");
            return;
        }
        registrarCargaClase(archivo);
    });

    document.getElementById('btn-guardar-asistencia-final').addEventListener('click', function() {
        if (this.disabled) {
            mostrarNotificacion("La ventana de asistencia está cerrada.", "warning");
            return;
        }
        enviarAsistenciaSupabase();
    });

    document.getElementById('btn-logout-click').addEventListener('click', function() {
        if (confirm("¿Estás seguro de que quieres cerrar sesión? Se cerrará tu sesión actual.")) {
            window.cerrarSesion();
        }
    });

    document.getElementById('btn-pedir-ayuda').addEventListener('click', function() {
        document.querySelector('[data-vista="ayuda"]').click();
        document.getElementById('desplegable-usuario').classList.remove('activo');
    });

    document.getElementById('btn-cumpleaneros').addEventListener('click', function() {
        mostrarCumpleaneros();
    });

    document.getElementById('btn-ver-tabla-completa').addEventListener('click', function() {
        modoAdminVerTodos = !modoAdminVerTodos;
        this.textContent = modoAdminVerTodos ? 'Ver Mi Sección' : 'Ver Todos';
        this.style.background = modoAdminVerTodos ? '#2ecc71' : '#6c5ce7';
        cargarAlumnosSegunRol();
    });

    document.getElementById('btn-abrir-modal-nuevo-nino').addEventListener('click', () => {
        document.getElementById('modal-registro-niño').classList.add('activo');
    });
    document.getElementById('btn-cancelar-nino-modal').addEventListener('click', () => {
        cerrarModalRegistro();
    });

    document.getElementById('btn-abrir-modal-editar-nino').addEventListener('click', () => {
        document.getElementById('modal-buscar-editar').classList.add('activo');
    });
    document.getElementById('btn-cerrar-busq-edit').addEventListener('click', () => {
        cerrarModalEditar();
    });

    document.getElementById('btn-abrir-modal-eliminar-nino').addEventListener('click', () => {
        document.getElementById('modal-eliminar-alumno').classList.add('activo');
    });
    document.getElementById('btn-cerrar-busq-del').addEventListener('click', () => {
        cerrarModalEliminar();
    });

    document.getElementById('form-registro-alumno').addEventListener('submit', async function(e) {
        e.preventDefault();
        await registrarNuevoAlumno(this);
    });

    document.getElementById('form-edicion-campos-nino').addEventListener('submit', async function(e) {
        e.preventDefault();
        await actualizarAlumno(this);
    });

    document.getElementById('txt-ayuda-mensaje').addEventListener('input', function() {
        const contador = document.getElementById('contador-caracteres');
        const max = 500;
        const actual = this.value.length;
        contador.textContent = `${actual}/${max}`;
        if (actual > max) {
            contador.style.color = '#ff7675';
            this.style.borderColor = '#ff7675';
        } else {
            contador.style.color = '#95a5a6';
            this.style.borderColor = '#dfe4ea';
        }
    });

    document.getElementById('btn-solicitar-edicion')?.addEventListener('click', function() {
        document.getElementById('modal-solicitar-edicion').classList.add('activo');
    });

    document.getElementById('btn-cancelar-solicitud').addEventListener('click', function() {
        document.getElementById('modal-solicitar-edicion').classList.remove('activo');
        document.getElementById('txt-justificacion-edicion').value = '';
    });

    document.getElementById('input-filtro-reportes').addEventListener('input', function() {
        const termino = this.value.toLowerCase().trim();
        const resultados = document.getElementById('resultados-busqueda-reportes');
        const tabla = document.getElementById('tabla-logs-cuerpo');

        if (termino) {
            const logs = JSON.parse(localStorage.getItem('zk360_historial')) || [];
            const filtrados = logs.filter(log => 
                log.usuario.toLowerCase().includes(termino) || 
                log.accion.toLowerCase().includes(termino) ||
                log.fecha.toLowerCase().includes(termino)
            );

            if (filtrados.length === 0) {
                resultados.innerHTML = '<p style="color:#95a5a6; text-align:center; padding:15px;">No se encontraron resultados</p>';
                tabla.style.display = 'none';
                return;
            }

            resultados.innerHTML = filtrados.slice(0, 30).map(log => `
                <div style="padding:10px 12px; border-bottom:1px solid #eef2f7; font-size:13px; background:white; border-radius:8px; margin-bottom:4px;">
                    <strong style="color:#1e3799;">${log.usuario}</strong>
                    <span style="color:#2c3e50;"> - ${log.accion}</span>
                    <span style="color:#95a5a6; font-size:11px; display:block; margin-top:3px;">${log.fecha}</span>
                </div>
            `).join('');
            tabla.style.display = 'none';
        } else {
            resultados.innerHTML = '';
            tabla.style.display = 'table';
            cargarHistorialAuditoria();
        }
    });
}

// ============ FUNCIONES DE CÁMARA Y ARCHIVOS ============
function abrirCamara() {
    document.getElementById('captura-camara').click();
    cerrarDialogoCamara();
}

function abrirArchivos() {
    document.getElementById('captura-cuaderno').click();
    cerrarDialogoCamara();
}

function cerrarDialogoCamara() {
    const dialogo = document.getElementById('dialogo-camara-archivo');
    if (dialogo) dialogo.remove();
}

function procesarArchivoSeleccionado(input) {
    const file = input.files[0];
    const vistaPrevia = document.getElementById('vista-previa-archivo');
    const iconoPrevia = document.getElementById('icono-previa');
    const nombrePrevia = document.getElementById('nombre-previa');
    const tamanoPrevia = document.getElementById('tamano-previa');

    if (file) {
        vistaPrevia.style.display = 'block';
        nombrePrevia.textContent = file.name;
        tamanoPrevia.textContent = `(${(file.size / 1024).toFixed(1)} KB)`;

        const ext = file.name.split('.').pop().toLowerCase();
        const iconos = {
            'pdf': 'fa-file-pdf', 'doc': 'fa-file-word', 'docx': 'fa-file-word',
            'xls': 'fa-file-excel', 'xlsx': 'fa-file-excel',
            'ppt': 'fa-file-powerpoint', 'pptx': 'fa-file-powerpoint',
            'jpg': 'fa-file-image', 'jpeg': 'fa-file-image', 'png': 'fa-file-image', 'gif': 'fa-file-image'
        };
        iconoPrevia.className = `fa-solid ${iconos[ext] || 'fa-file'}`;
        iconoPrevia.style.color = iconos[ext] ? '#2575fc' : '#95a5a6';
    } else {
        vistaPrevia.style.display = 'none';
    }
}

// ============ CERRAR MODALES ============
function cerrarModalRegistro() {
    document.getElementById('modal-registro-niño').classList.remove('activo');
    document.getElementById('form-registro-alumno').reset();
}

function cerrarModalEditar() {
    document.getElementById('modal-buscar-editar').classList.remove('activo');
    document.getElementById('form-edicion-campos-nino').style.display = 'none';
    document.getElementById('txt-codigo-buscar-edit').value = '';
    document.getElementById('edit-nombre-input').value = '';
    document.getElementById('edit-fecha-nacimiento').value = '';
}

function cerrarModalEliminar() {
    document.getElementById('modal-eliminar-alumno').classList.remove('activo');
    document.getElementById('txt-codigo-buscar-del').value = '';
}

function cerrarModalCumpleaneros() {
    document.getElementById('modal-cumpleaneros').classList.remove('activo');
}

function cerrarModalVistaPrevia() {
    document.getElementById('modal-vista-previa').classList.remove('activo');
    document.getElementById('contenido-vista-previa').innerHTML = '';
}

// ============ NAVEGACIÓN ============
function activarVistaPestaña(idVista, btnElemento) {
    document.querySelectorAll('.modulo-vista').forEach(v => v.classList.remove('activo'));
    document.querySelectorAll('.menu-link[data-vista]').forEach(l => l.classList.remove('activo'));

    const target = document.getElementById(`modulo-${idVista}`);
    if (target) target.classList.add('activo');
    if (btnElemento) btnElemento.classList.add('activo');

    if (idVista === 'asistencia') {
        cargarAlumnosSegunRol();
    }

    if (idVista === 'reportes') {
        cargarHistorialAuditoria();
    }

    if (window.innerWidth <= 768) {
        document.getElementById('menu-lateral').classList.remove('abierto');
    }
}

// ============ CALENDARIO ============
function calcularProximoDomingo() {
    const hoy = new Date();
    const dia = hoy.getDay();
    const diasFaltantes = dia === 0 ? 0 : 7 - dia;
    const domingo = new Date(hoy);
    domingo.setDate(hoy.getDate() + diasFaltantes);
    return `${domingo.getDate()}/${domingo.getMonth() + 1}/${domingo.getFullYear()}`;
}

function procesarAlgoritmoCalendarioKids() {
    const claveFecha = calcularProximoDomingo();
    const turno = cronogramaOficial2026[claveFecha];

    if (turno) {
        document.getElementById('docente-pi').textContent = turno.pi;
        document.getElementById('docente-me').textContent = turno.me;
        document.getElementById('docente-gr').textContent = turno.gr;

        const nombreLower = usuarioSesion.nombre.toLowerCase();
        let encontrado = false;
        
        for (const [nombre, seccion] of Object.entries(turno.seccion)) {
            if (nombre === nombreLower) {
                seccionAsignadaMaestro = seccion;
                encontrado = true;
                break;
            }
        }

        if (!encontrado && usuarioSesion.pareja) {
            const parejaLower = usuarioSesion.pareja.toLowerCase();
            for (const [nombre, seccion] of Object.entries(turno.seccion)) {
                if (nombre === parejaLower) {
                    seccionAsignadaMaestro = seccion;
                    encontrado = true;
                    break;
                }
            }
        }

        if (!encontrado) {
            seccionAsignadaMaestro = null;
        }
    }

    if (usuarioSesion.rol === "admin" || usuarioSesion.rol === "pastor") {
        seccionAsignadaMaestro = "admin_total";
    }

    const msgFecha = document.getElementById('msg-restriccion-fecha');
    const hoy = new Date();
    const dia = hoy.getDay();

    if (usuarioSesion.rol === "admin" || usuarioSesion.rol === "pastor") {
        msgFecha.innerHTML = '<i class="fa-solid fa-unlock-keyhole"></i> Modo Admin - Envíos sin restricciones';
    } else if (dia === 0) {
        document.getElementById('captura-cuaderno').disabled = true;
        document.getElementById('captura-camara').disabled = true;
        document.getElementById('btn-subir-archivo').classList.add('deshabilitado');
        document.getElementById('btn-confirmar-envio').classList.add('deshabilitado');
        msgFecha.innerHTML = '<i class="fa-solid fa-lock"></i> Envíos bloqueados los domingos';
    } else {
        msgFecha.innerHTML = '<i class="fa-solid fa-lock-open"></i> Ventana activa para subir material';
    }
}

// ============ CARGAR ALUMNOS ============
async function cargarAlumnosSegunRol() {
    const panelNoAsignado = document.getElementById('contenedor-mensaje-no-asignado');
    const panelAsistencia = document.getElementById('contenedor-asistencia-activa');

    if (!seccionAsignadaMaestro) {
        panelNoAsignado.style.display = 'block';
        panelAsistencia.style.display = 'none';
        return;
    }

    panelNoAsignado.style.display = 'none';
    panelAsistencia.style.display = 'block';

    let salaAFiltrar = seccionAsignadaMaestro;

    if (usuarioSesion.rol === "admin" || usuarioSesion.rol === "pastor") {
        if (modoAdminVerTodos) {
            salaAFiltrar = "todos";
        } else {
            salaAFiltrar = seccionAsignadaMaestro === "admin_total" ? "infancia" : seccionAsignadaMaestro;
        }
    }

    document.getElementById('asistencia-seccion-actual').textContent = salaAFiltrar === "todos" ? "TODAS LAS SECCIONES" : salaAFiltrar;

    try {
        let alumnos = await cargarAlumnosDesdeSupabase(salaAFiltrar === "todos" ? null : salaAFiltrar);
        if (!alumnos || alumnos.length === 0) {
            alumnos = [];
        }

        bancoAlumnosCompleto = alumnos;
        bancoAlumnosFiltrados = alumnos;

        const tabla = document.getElementById('tabla-asistencia-niños-cuerpo');
        tabla.innerHTML = "";

        if (alumnos.length === 0) {
            tabla.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:25px; color:#95a5a6;">No hay alumnos registrados en esta sección.</td></tr>`;
            return;
        }

        alumnos.forEach((niño, index) => {
            const fila = document.createElement('tr');
            const numeroOrden = index + 1;
            fila.innerHTML = `
                <td>${numeroOrden}</td>
                <td>${niño.nombre_completo}</td>
                <td style="text-align:center;"><input type="checkbox" class="asistencia-checkbox" data-id="${niño.id}"></td>
                <td style="text-align:center;">${niño.clases_totales || 0}</td>
            `;
            tabla.appendChild(fila);
        });

        const hoy = new Date();
        const hora = hoy.getHours();
        const btnGuardar = document.getElementById('btn-guardar-asistencia-final');
        const txtEstado = document.getElementById('txt-estado-horario-asistencia');

        if (usuarioSesion.rol === "admin" || usuarioSesion.rol === "pastor") {
            btnGuardar.disabled = false;
            btnGuardar.classList.remove('deshabilitado');
            txtEstado.innerHTML = '<i class="fa-solid fa-unlock"></i> Modo Admin - Sin restricciones';
            return;
        }

        if (hoy.getDay() === 0 && hora >= 15 && hora < 16) {
            btnGuardar.disabled = false;
            btnGuardar.classList.remove('deshabilitado');
            txtEstado.innerHTML = '<i class="fa-regular fa-clock"></i> Ventana abierta (3:00 PM - 4:00 PM)';
        } else {
            btnGuardar.disabled = true;
            btnGuardar.classList.add('deshabilitado');
            txtEstado.innerHTML = '<i class="fa-regular fa-clock"></i> Fuera de horario dominical';
        }

    } catch (err) {
        console.error("Error:", err);
        mostrarNotificacion("Error al cargar la lista de alumnos", "error");
    }
}

// ============ CUMBLEAÑEROS ============
function mostrarCumpleaneros() {
    const modal = document.getElementById('modal-cumpleaneros');
    const lista = document.getElementById('lista-cumpleaneros');
    const mesActual = new Date().getMonth();

    const cumpleaneros = bancoAlumnosCompleto.filter(alumno => {
        if (!alumno.fecha_nacimiento) return false;
        const fecha = new Date(alumno.fecha_nacimiento);
        return fecha.getMonth() === mesActual;
    });

    if (cumpleaneros.length === 0) {
        lista.innerHTML = '<p style="color:#95a5a6; text-align:center;">No hay cumpleañeros este mes.</p>';
    } else {
        lista.innerHTML = cumpleaneros.map((alumno) => {
            const fecha = new Date(alumno.fecha_nacimiento);
            const dia = fecha.getDate();
            const mes = fecha.toLocaleString('es', { month: 'long' });
            return `
                <div style="display:flex; justify-content:space-between; padding:8px 12px; border-bottom:1px solid #eef2f7;">
                    <span><strong>${alumno.id}.</strong> ${alumno.nombre_completo}</span>
                    <span style="color:#f39c12;"><i class="fa-solid fa-cake-candles"></i> ${dia} de ${mes}</span>
                    <span style="color:#95a5a6; font-size:12px;">${alumno.seccion}</span>
                </div>
            `;
        }).join('');
    }

    modal.classList.add('activo');
}

// ============ REGISTRAR NUEVO ALUMNO (CORREGIDO - PERMITE 2014-2026) ============
async function registrarNuevoAlumno(form) {
    const nombre = document.getElementById('reg-nombre').value.trim();
    const seccion = document.getElementById('reg-seccion').value;
    const nacimiento = document.getElementById('reg-nacimiento').value;

    if (!nombre || !seccion || !nacimiento) {
        mostrarNotificacion("Por favor, completa todos los campos", "error");
        return;
    }

    const fechaNac = new Date(nacimiento);
    const añoNacimiento = fechaNac.getFullYear();
    const añoActual = new Date().getFullYear();

    // CORREGIDO: Permite años desde 2014 hasta el año actual (2026)
    if (añoNacimiento < 2014 || añoNacimiento > añoActual) {
        mostrarNotificacion(`La fecha debe ser entre 2014 y ${añoActual} (niños de 0 a 12 años)`, "error");
        return;
    }

    const nuevoAlumno = {
        nombre_completo: nombre,
        seccion: seccion,
        fecha_nacimiento: nacimiento,
        clases_totales: 0
    };

    try {
        const result = await guardarAlumnoEnSupabase(nuevoAlumno);
        if (result) {
            mostrarNotificacion(`Alumno registrado con éxito`, "success");
            cerrarModalRegistro();
            await cargarAlumnosSegunRol();
            
            await guardarLogEnSupabase({
                usuario: usuarioSesion.nombre,
                accion: `Registró a ${nombre} en ${seccion}`,
                fecha: new Date().toISOString()
            });
        }
    } catch (err) {
        mostrarNotificacion("Error al registrar el alumno", "error");
    }
}

// ============ VERIFICAR CÓDIGO PARA EDITAR ============
window.verificarCodigoParaEditar = function() {
    const cod = parseInt(document.getElementById('txt-codigo-buscar-edit').value);
    if (isNaN(cod) || cod <= 0) {
        mostrarNotificacion("Ingresa un código válido", "error");
        return;
    }

    const nino = bancoAlumnosCompleto.find(x => x.id === cod);
    if (!nino) {
        mostrarNotificacion("Código no encontrado", "error");
        return;
    }

    idNinoAEditar = cod;
    document.getElementById('edit-nombre-input').value = nino.nombre_completo;
    document.getElementById('edit-seccion-select').value = nino.seccion;
    if (nino.fecha_nacimiento) {
        document.getElementById('edit-fecha-nacimiento').value = nino.fecha_nacimiento;
    }
    document.getElementById('form-edicion-campos-nino').style.display = 'block';
    mostrarNotificacion("Alumno encontrado, edita los datos", "success");
};

// ============ ACTUALIZAR ALUMNO (CORREGIDO - PERMITE 2014-2026) ============
async function actualizarAlumno(form) {
    const nuevoNombre = document.getElementById('edit-nombre-input').value.trim();
    const nuevaSec = document.getElementById('edit-seccion-select').value;
    const nuevaFecha = document.getElementById('edit-fecha-nacimiento').value;

    if (!nuevoNombre) {
        mostrarNotificacion("El nombre no puede estar vacío", "error");
        return;
    }

    if (nuevaFecha) {
        const fechaNac = new Date(nuevaFecha);
        const añoNacimiento = fechaNac.getFullYear();
        const añoActual = new Date().getFullYear();

        // CORREGIDO: Permite años desde 2014 hasta el año actual (2026)
        if (añoNacimiento < 2014 || añoNacimiento > añoActual) {
            mostrarNotificacion(`La fecha debe ser entre 2014 y ${añoActual} (niños de 0 a 12 años)`, "error");
            return;
        }
    }

    const nino = bancoAlumnosCompleto.find(a => a.id === idNinoAEditar);
    if (!nino) {
        mostrarNotificacion("Error: Alumno no encontrado", "error");
        return;
    }

    let cambios = false;
    const datosActualizar = {};

    if (nino.nombre_completo !== nuevoNombre) {
        datosActualizar.nombre_completo = nuevoNombre;
        cambios = true;
    }
    if (nino.seccion !== nuevaSec) {
        datosActualizar.seccion = nuevaSec;
        cambios = true;
    }
    if (nino.fecha_nacimiento !== nuevaFecha) {
        datosActualizar.fecha_nacimiento = nuevaFecha;
        cambios = true;
    }

    if (!cambios) {
        mostrarNotificacion("No se detectaron cambios para actualizar", "info");
        return;
    }

    try {
        const result = await actualizarAlumnoEnSupabase(idNinoAEditar, datosActualizar);
        if (result) {
            mostrarNotificacion("Alumno actualizado con éxito", "success");
            cerrarModalEditar();
            await cargarAlumnosSegunRol();
            
            await guardarLogEnSupabase({
                usuario: usuarioSesion.nombre,
                accion: `Actualizó datos del alumno ${nino.nombre_completo}`,
                fecha: new Date().toISOString()
            });
        }
    } catch (err) {
        mostrarNotificacion("Error al actualizar", "error");
    }
}

// ============ ELIMINAR ALUMNO ============
window.verificarCodigoParaEliminar = async function() {
    const cod = parseInt(document.getElementById('txt-codigo-buscar-del').value);
    if (isNaN(cod) || cod <= 0) {
        mostrarNotificacion("Ingresa un código válido", "error");
        return;
    }

    const nino = bancoAlumnosCompleto.find(x => x.id === cod);
    if (!nino) {
        mostrarNotificacion("Código no encontrado", "error");
        return;
    }

    if (!confirm(`¿Eliminar permanentemente a "${nino.nombre_completo}"? Esta acción no se puede deshacer.`)) return;

    try {
        const result = await eliminarAlumnoEnSupabase(cod);
        if (result !== null) {
            mostrarNotificacion("Alumno eliminado del sistema", "success");
            cerrarModalEliminar();
            await cargarAlumnosSegunRol();
            
            await guardarLogEnSupabase({
                usuario: usuarioSesion.nombre,
                accion: `Eliminó a ${nino.nombre_completo}`,
                fecha: new Date().toISOString()
            });
        }
    } catch (err) {
        mostrarNotificacion("Error al eliminar", "error");
    }
};

// ============ ENVIAR ASISTENCIA ============
window.enviarAsistenciaSupabase = async function() {
    const checkboxes = document.querySelectorAll('.asistencia-checkbox:checked');
    if (checkboxes.length === 0) {
        mostrarNotificacion("Selecciona al menos un alumno presente", "error");
        return;
    }

    const seccion = document.getElementById('asistencia-seccion-actual').textContent;
    const maestro = document.getElementById('chk-asistencia-maestro-firmado');

    if (!maestro.checked && usuarioSesion.rol !== "admin" && usuarioSesion.rol !== "pastor") {
        mostrarNotificacion("Por favor, marca tu asistencia como maestro", "warning");
        return;
    }

    const fechaHoy = new Date().toISOString().split('T')[0];
    const alumnosPresentes = [];

    document.querySelectorAll('.asistencia-checkbox:checked').forEach(cb => {
        const id = parseInt(cb.dataset.id);
        const alumno = bancoAlumnosCompleto.find(a => a.id === id);
        if (alumno) {
            alumnosPresentes.push({
                alumno_id: id,
                nombre: alumno.nombre_completo
            });
        }
    });

    try {
        for (const alumno of alumnosPresentes) {
            await guardarAsistenciaEnSupabase({
                alumno_id: alumno.alumno_id,
                fecha: fechaHoy,
                presente: true,
                seccion: seccion,
                maestro: usuarioSesion.nombre
            });

            const nino = bancoAlumnosCompleto.find(a => a.id === alumno.alumno_id);
            if (nino) {
                const nuevasClases = (nino.clases_totales || 0) + 1;
                await actualizarClasesTotales(alumno.alumno_id, nuevasClases);
            }
        }

        await cargarAlumnosSegunRol();

        mostrarNotificacion(`Asistencia reportada: ${alumnosPresentes.length} alumnos presentes en ${seccion}`, "success");

        await guardarLogEnSupabase({
            usuario: usuarioSesion.nombre,
            accion: `Reportó asistencia - ${alumnosPresentes.length} alumnos en ${seccion}`,
            fecha: new Date().toISOString()
        });

        const btnGuardar = document.getElementById('btn-guardar-asistencia-final');
        btnGuardar.disabled = false;
        btnGuardar.style.background = '#e67e22';
        btnGuardar.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Solicitar Edición';
        btnGuardar.onclick = function() {
            document.getElementById('modal-solicitar-edicion').classList.add('activo');
        };
        
        const txtEstado = document.getElementById('txt-estado-horario-asistencia');
        txtEstado.innerHTML = '<i class="fa-solid fa-check-circle" style="color:#2ecc71;"></i> Asistencia ya reportada';

    } catch (err) {
        mostrarNotificacion("Error al reportar asistencia", "error");
    }
};

// ============ SOLICITAR EDICIÓN ============
window.enviarSolicitudEdicion = async function() {
    const justificacion = document.getElementById('txt-justificacion-edicion').value.trim();

    if (!justificacion) {
        mostrarNotificacion("Por favor, escribe una justificación válida", "error");
        return;
    }

    if (justificacion.length < 10) {
        mostrarNotificacion("La justificación debe tener al menos 10 caracteres", "error");
        return;
    }

    try {
        await guardarLogEnSupabase({
            usuario: usuarioSesion.nombre,
            accion: `Solicitó edición de asistencia: ${justificacion.substring(0, 50)}...`,
            fecha: new Date().toISOString()
        });

        mostrarNotificacion("Solicitud enviada al administrador", "success");
        document.getElementById('modal-solicitar-edicion').classList.remove('activo');
        document.getElementById('txt-justificacion-edicion').value = '';

        if (usuarioSesion.rol !== "admin" && usuarioSesion.rol !== "pastor") {
            enviarNotificacionPush('Solicitud de Edición', `${usuarioSesion.nombre} solicita editar asistencia`);
        }
    } catch (err) {
        mostrarNotificacion("Error al enviar la solicitud", "error");
    }
};

// ============ REGISTRAR CARGA DE CLASE ============
window.registrarCargaClase = function(archivo) {
    if (!archivo) {
        mostrarNotificacion("Selecciona un archivo primero", "error");
        return;
    }

    const nombreArchivo = archivo.name;
    const fecha = new Date().toLocaleDateString();
    const ext = nombreArchivo.split('.').pop().toLowerCase();

    const archivoData = {
        nombre: nombreArchivo,
        fecha: fecha,
        maestro: usuarioSesion.nombre,
        tipo: ext,
        tamano: archivo.size,
        data: archivo
    };
    archivosSubidos.push(archivoData);

    const tabla = document.getElementById('tabla-archivos-storage-cuerpo');
    if (tabla) {
        const iconos = {
            'pdf': 'fa-file-pdf', 'doc': 'fa-file-word', 'docx': 'fa-file-word',
            'xls': 'fa-file-excel', 'xlsx': 'fa-file-excel',
            'ppt': 'fa-file-powerpoint', 'pptx': 'fa-file-powerpoint',
            'jpg': 'fa-file-image', 'jpeg': 'fa-file-image', 'png': 'fa-file-image', 'gif': 'fa-file-image'
        };
        const icono = iconos[ext] || 'fa-file';
        const color = iconos[ext] ? '#2575fc' : '#95a5a6';

        const fila = document.createElement('tr');
        fila.innerHTML = `
            <td>${fecha}</td>
            <td>${usuarioSesion.nombre}</td>
            <td>${nombreArchivo}</td>
            <td style="text-align:center;">
                <i class="fa-solid ${icono}" style="font-size:28px; color:${color}; cursor:pointer;" 
                   onclick="verVistaPrevia('${nombreArchivo}')" title="Ver vista previa"></i>
            </td>
            <td style="text-align:center;">
                <button class="btn-admin" onclick="descargarArchivo('${nombreArchivo}')" style="font-size:12px; padding:4px 12px;">
                    <i class="fa-solid fa-download"></i>
                </button>
            </td>
        `;
        tabla.appendChild(fila);
    }

    mostrarNotificacion("Material enviado al administrador", "success");

    guardarLogEnSupabase({
        usuario: usuarioSesion.nombre,
        accion: `Subió material: ${nombreArchivo}`,
        fecha: new Date().toISOString()
    });

    document.getElementById('captura-cuaderno').value = '';
    document.getElementById('captura-camara').value = '';
    document.getElementById('vista-previa-archivo').style.display = 'none';
    cerrarDialogoCamara();
};

// ============ VER VISTA PREVIA ============
window.verVistaPrevia = function(nombreArchivo) {
    const archivo = archivosSubidos.find(a => a.nombre === nombreArchivo);
    if (!archivo) {
        mostrarNotificacion("Archivo no encontrado", "error");
        return;
    }

    const modal = document.getElementById('modal-vista-previa');
    const contenido = document.getElementById('contenido-vista-previa');
    const ext = archivo.tipo;

    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) {
        const reader = new FileReader();
        reader.onload = function(e) {
            contenido.innerHTML = `
                <img src="${e.target.result}" style="max-width:100%; max-height:450px; border-radius:12px; box-shadow:0 4px 15px rgba(0,0,0,0.1);">
                <p style="margin-top:10px; font-size:13px; color:#747d8c;">${archivo.nombre} (${(archivo.tamano / 1024).toFixed(1)} KB)</p>
            `;
        };
        reader.readAsDataURL(archivo.data);
        modal.classList.add('activo');
        return;
    }

    if (ext === 'pdf') {
        const reader = new FileReader();
        reader.onload = function(e) {
            contenido.innerHTML = `
                <iframe src="${e.target.result}" style="width:100%; height:450px; border-radius:12px; border:1px solid #eef2f7;"></iframe>
                <p style="margin-top:10px; font-size:13px; color:#747d8c;">${archivo.nombre} (${(archivo.tamano / 1024).toFixed(1)} KB)</p>
            `;
        };
        reader.readAsDataURL(archivo.data);
        modal.classList.add('activo');
        return;
    }

    contenido.innerHTML = `
        <div style="padding:40px 20px; background:#f8f9fa; border-radius:16px;">
            <i class="fa-solid fa-file" style="font-size:72px; color:#2575fc;"></i>
            <p style="font-size:18px; font-weight:600; margin-top:15px;">${archivo.nombre}</p>
            <p style="color:#747d8c; font-size:14px;">${(archivo.tamano / 1024).toFixed(1)} KB - ${archivo.tipo.toUpperCase()}</p>
            <p style="color:#95a5a6; font-size:13px; margin-top:10px;">Subido por: ${archivo.maestro} - ${archivo.fecha}</p>
            <button class="btn-enviar-clase" onclick="descargarArchivo('${archivo.nombre}')" style="margin-top:15px; padding:10px 30px;">
                <i class="fa-solid fa-download"></i> Descargar
            </button>
        </div>
    `;

    modal.classList.add('activo');
};

// ============ DESCARGAR ARCHIVO ============
window.descargarArchivo = function(nombreArchivo) {
    const archivo = archivosSubidos.find(a => a.nombre === nombreArchivo);
    if (!archivo) {
        mostrarNotificacion("Archivo no encontrado", "error");
        return;
    }

    const link = document.createElement('a');
    link.href = URL.createObjectURL(archivo.data);
    link.download = archivo.nombre;
    link.click();
    URL.revokeObjectURL(link.href);

    mostrarNotificacion("Descargando archivo...", "success");
};

// ============ EXPORTAR REPORTE ============
window.descargarReporte = function() {
    if (archivosSubidos.length === 0) {
        mostrarNotificacion("No hay archivos para exportar", "warning");
        return;
    }

    let contenido = "Fecha,Maestro,Documento,Tipo,Tamaño\n";
    archivosSubidos.forEach(a => {
        contenido += `${a.fecha},${a.maestro},${a.nombre},${a.tipo},${(a.tamano / 1024).toFixed(1)} KB\n`;
    });

    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Reporte_Materiales_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);

    mostrarNotificacion("Reporte exportado con éxito", "success");
};

// ============ HISTORIAL ============
async function cargarHistorialAuditoria() {
    const tabla = document.getElementById('tabla-logs-cuerpo');
    if (!tabla) return;

    try {
        const logs = await llamarSupabase("logs?order=id.desc&limit=50");
        tabla.innerHTML = "";

        if (!logs || logs.length === 0) {
            tabla.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#95a5a6; padding:20px;">No hay registros de actividad</td></tr>`;
            return;
        }

        logs.forEach(log => {
            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td><strong>${log.usuario}</strong></td>
                <td>${log.accion}</td>
                <td style="color:#747d8c;">${new Date(log.fecha).toLocaleString()}</td>
            `;
            tabla.appendChild(fila);
        });
    } catch (err) {
        const logs = JSON.parse(localStorage.getItem('zk360_historial')) || [];
        tabla.innerHTML = "";

        if (logs.length === 0) {
            tabla.innerHTML = `<tr><td colspan="3" style="text-align:center; color:#95a5a6; padding:20px;">No hay registros de actividad</td></tr>`;
            return;
        }

        logs.reverse().forEach(log => {
            const fila = document.createElement('tr');
            fila.innerHTML = `
                <td><strong>${log.usuario}</strong></td>
                <td>${log.accion}</td>
                <td style="color:#747d8c;">${log.fecha}</td>
            `;
            tabla.appendChild(fila);
        });
    }
}

// ============ AYUDA ============
function abrirSugerencia() {
    document.getElementById('area-mensaje-ayuda').style.display = 'block';
    document.getElementById('txt-ayuda-mensaje').placeholder = "Escribe tu sugerencia para mejorar ZoarKids 360...";
    document.getElementById('txt-ayuda-mensaje').focus();
    document.getElementById('manual-uso-container').style.display = 'none';
}

function abrirReporteError() {
    document.getElementById('area-mensaje-ayuda').style.display = 'block';
    document.getElementById('txt-ayuda-mensaje').placeholder = "Describe el error que encontraste...";
    document.getElementById('txt-ayuda-mensaje').focus();
    document.getElementById('manual-uso-container').style.display = 'none';
}

function toggleManual() {
    const container = document.getElementById('manual-uso-container');
    if (container.style.display === 'block') {
        container.style.display = 'none';
    } else {
        container.style.display = 'block';
        document.getElementById('area-mensaje-ayuda').style.display = 'none';
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

function enviarMensajeAyuda() {
    const mensaje = document.getElementById('txt-ayuda-mensaje').value;
    const max = 500;

    if (mensaje.length === 0) {
        mostrarNotificacion("Escribe un mensaje antes de enviar", "error");
        return;
    }

    if (mensaje.length > max) {
        mostrarNotificacion(`El mensaje excede el límite de ${max} caracteres. Actual: ${mensaje.length}`, "error");
        return;
    }

    if (mensaje.length < 10) {
        mostrarNotificacion("El mensaje debe tener al menos 10 caracteres", "error");
        return;
    }

    mostrarNotificacion("Mensaje enviado al administrador", "success");
    document.getElementById('txt-ayuda-mensaje').value = "";
    document.getElementById('area-mensaje-ayuda').style.display = 'none';
    document.getElementById('contador-caracteres').textContent = '0/500';

    guardarLogEnSupabase({
        usuario: usuarioSesion.nombre,
        accion: `Envió mensaje de ayuda: ${mensaje.substring(0, 50)}...`,
        fecha: new Date().toISOString()
    });

    enviarNotificacionPush('Mensaje de Ayuda', `${usuarioSesion.nombre} envió un mensaje`);
}

// ============ CERRAR SESIÓN ============
window.cerrarSesion = function() {
    sessionStorage.clear();
    localStorage.removeItem('zk360_usuario_persistente');
    window.location.replace("index.html");
};
