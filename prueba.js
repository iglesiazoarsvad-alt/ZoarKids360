/* ==========================================================================
   ZOARKIDS 360 - MODO PRUEBA (SIN RESTRICCIONES PARA APRENDIZAJE)
   ========================================================================== */

// ============ DETECTAR MODO PRUEBA ============
function estaEnModoPrueba() {
    return sessionStorage.getItem('zk360_modo_prueba') === 'true';
}

function obtenerUsuarioPrueba() {
    try {
        const data = sessionStorage.getItem('zk360_usuario_activo');
        return data ? JSON.parse(data) : null;
    } catch (e) {
        return null;
    }
}

// ============ SOBRESCRIBIR RESTRICCIONES EN MODO PRUEBA ============
function aplicarModoPruebaSinRestricciones() {
    if (!estaEnModoPrueba()) return;
    
    console.log('🧪 MODO PRUEBA ACTIVADO - Sin restricciones para aprendizaje');
    
    // 1. DESBLOQUEAR TODOS LOS BOTONES DE ASISTENCIA
    const btnGuardarAsistencia = document.getElementById('btn-guardar-asistencia-final');
    if (btnGuardarAsistencia) {
        btnGuardarAsistencia.disabled = false;
        btnGuardarAsistencia.classList.remove('deshabilitado');
        btnGuardarAsistencia.innerHTML = '<i class="fa-solid fa-flask"></i> Prueba: Reportar Asistencia';
        btnGuardarAsistencia.title = 'Modo Prueba - Sin restricciones';
    }
    
    // 2. DESBLOQUEAR BOTÓN DE NUEVA LECCIÓN
    const btnNuevaLeccion = document.getElementById('btn-nueva-leccion');
    if (btnNuevaLeccion) {
        btnNuevaLeccion.disabled = false;
        btnNuevaLeccion.title = 'Modo Prueba - Sin restricciones';
    }
    
    const btnNuevaLeccionInicio = document.getElementById('btn-nueva-leccion-inicio');
    if (btnNuevaLeccionInicio) {
        btnNuevaLeccionInicio.disabled = false;
        btnNuevaLeccionInicio.title = 'Modo Prueba - Sin restricciones';
    }
    
    // 3. DESBLOQUEAR SOLICITUD DE SUSTITUTO
    const btnSustituto = document.getElementById('btn-solicitar-sustituto');
    if (btnSustituto) {
        btnSustituto.disabled = false;
        btnSustituto.title = 'Modo Prueba - Sin restricciones';
    }
    
    // 4. DESBLOQUEAR SUBIR FOTOS (siempre disponible en prueba)
    const btnSubirFoto = document.querySelector('.galeria-fab');
    if (btnSubirFoto) {
        btnSubirFoto.title = 'Modo Prueba - Sin restricciones';
    }
    
    // 5. DESBLOQUEAR TODOS LOS BOTONES ADMIN (para que el usuario aprenda)
    document.querySelectorAll('.btn-admin, .btn-enviar-clase, .btn-ingresar').forEach(btn => {
        if (btn.id !== 'btn-logout-click' && btn.id !== 'btn-cerrar-modal-click') {
            btn.disabled = false;
            btn.classList.remove('deshabilitado');
        }
    });
    
    // 6. MOSTRAR INDICADOR DE MODO PRUEBA EN EL HEADER
    mostrarIndicadorPrueba();
    
    // 7. SOBRESCRIBIR VERIFICACIÓN DE TURNO (siempre verdadero en prueba)
    if (typeof window.verificarTurnoMaestro === 'function') {
        const originalVerificarTurno = window.verificarTurnoMaestro;
        window.verificarTurnoMaestro = function() {
            if (estaEnModoPrueba()) return true;
            return originalVerificarTurno();
        };
    }
    
    // 8. SOBRESCRIBIR RESTRICCIÓN DE HORARIO (siempre disponible en prueba)
    if (typeof window.cargarAlumnosSegunRol === 'function') {
        const originalCargarAlumnos = window.cargarAlumnosSegunRol;
        window.cargarAlumnosSegunRol = async function() {
            if (estaEnModoPrueba()) {
                // En modo prueba, mostrar todos los alumnos o los de la sección asignada
                const usuario = obtenerUsuarioPrueba();
                if (usuario && usuario.seccion) {
                    await originalCargarAlumnos();
                } else {
                    // Sin sección se mantienen Inscribir y Cumpleaños sin mostrar una tabla.
                    const panelNoAsignado = document.getElementById('contenedor-mensaje-no-asignado');
                    const panelAsistencia = document.getElementById('contenedor-asistencia-activa');
                    if (panelNoAsignado) panelNoAsignado.style.display = 'block';
                    if (panelAsistencia) panelAsistencia.style.display = 'none';
                    try {
                        const alumnosLocales = JSON.parse(localStorage.getItem('zk360_alumnos_modo_prueba') || '[]');
                        const alumnos = Array.isArray(alumnosLocales) ? alumnosLocales : [];
                        bancoAlumnosCompleto = alumnos;
                    } catch (e) {
                        console.warn('Error cargando alumnos en modo prueba:', e);
                    }
                }
                return;
            }
            return originalCargarAlumnos();
        };
        window.cargarAlumnosSegunRol();
    }
    
    // Los controles administrativos solo aparecen en la simulación de administrador.
    const usuario = obtenerUsuarioPrueba();
    const puedeAdministrar = usuario?.rol === 'admin';
    const btnEditar = document.getElementById('btn-abrir-modal-editar-nino');
    if (btnEditar) btnEditar.style.display = puedeAdministrar ? 'inline-flex' : 'none';

    const btnEliminar = document.getElementById('btn-abrir-modal-eliminar-nino');
    if (btnEliminar) btnEliminar.style.display = puedeAdministrar ? 'inline-flex' : 'none';

    const btnVerTodos = document.getElementById('btn-ver-tabla-completa');
    if (btnVerTodos) btnVerTodos.style.display = puedeAdministrar ? 'inline-flex' : 'none';
    
    // 10. NOTIFICACIÓN DE BIENVENIDA AL MODO PRUEBA
    mostrarNotificacion('🧪 Modo Prueba activado - Todas las funciones están desbloqueadas para aprendizaje', 'info');
}

// ============ MOSTRAR INDICADOR DE MODO PRUEBA ============
function mostrarIndicadorPrueba() {
    document.getElementById('indicador-modo-prueba')?.remove();
}

// ============ DESACTIVAR MODO PRUEBA ============
async function desactivarModoPrueba() {
    if (await window.confirmarAccion('¿Salir del modo prueba? Volverás a la pantalla de login.')) {
        sessionStorage.removeItem('zk360_modo_prueba');
        sessionStorage.removeItem('zk360_usuario_activo');
        const indicador = document.getElementById('indicador-modo-prueba');
        if (indicador) indicador.style.display = 'none';
        mostrarNotificacion('Saliendo del modo prueba...', 'warning');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 500);
    }
}

// ============ RENDERIZAR TABLA DE ASISTENCIA (PARA PRUEBA) ============
function renderizarTablaAsistencia(alumnos) {
    const tabla = document.getElementById('tabla-asistencia-niños-cuerpo');
    if (!tabla) return;
    
    tabla.innerHTML = '';
    if (!alumnos || alumnos.length === 0) {
        tabla.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:25px; color:#95a5a6;">No hay alumnos registrados. Puedes inscribir uno para practicar.</td></tr>';
        return;
    }

    alumnos.forEach((niño, index) => {
        const fila = document.createElement('tr');
        const numero = document.createElement('td');
        numero.textContent = String(index + 1);
        const nombre = document.createElement('td');
        nombre.textContent = niño.nombre_completo || '';
        const asistencia = document.createElement('td');
        asistencia.style.textAlign = 'center';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'asistencia-checkbox';
        checkbox.dataset.id = String(niño.id ?? '');
        asistencia.appendChild(checkbox);
        const clases = document.createElement('td');
        clases.style.textAlign = 'center';
        clases.textContent = String(niño.clases_totales || 0);
        fila.append(numero, nombre, asistencia, clases);
        tabla.appendChild(fila);
    });
}

// ============ INICIALIZAR MODO PRUEBA AL CARGAR EL PANEL ============
function initModoPrueba() {
    if (estaEnModoPrueba()) {
        // Esperar a que el DOM esté listo
        if (document.readyState === 'complete') {
            aplicarModoPruebaSinRestricciones();
        } else {
            document.addEventListener('DOMContentLoaded', aplicarModoPruebaSinRestricciones);
            // También ejecutar después de un pequeño retraso para asegurar
            setTimeout(aplicarModoPruebaSinRestricciones, 1000);
        }
    }
}

// ============ EXPORTAR FUNCIONES ============
window.estaEnModoPrueba = estaEnModoPrueba;
window.obtenerUsuarioPrueba = obtenerUsuarioPrueba;
window.desactivarModoPrueba = desactivarModoPrueba;
window.initModoPrueba = initModoPrueba;
window.renderizarTablaAsistencia = renderizarTablaAsistencia;

// ============ AUTO-INICIALIZAR ============
// Esta función se ejecuta cuando se carga el script
if (document.readyState === 'complete') {
    initModoPrueba();
} else {
    document.addEventListener('DOMContentLoaded', initModoPrueba);
    // Ejecutar también después de un retraso
    setTimeout(initModoPrueba, 1500);
}

console.log('🧪 Modo Prueba cargado - Sin restricciones para aprendizaje');