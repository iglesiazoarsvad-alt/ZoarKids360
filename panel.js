/* ==========================================================================
   ZOARKIDS 360 - LÓGICA COMPLETA DEL PANEL (VERSIÓN CORREGIDA)
   ========================================================================== */

// ============ CONFIGURACIÓN DE SUPABASE ============
const SUPABASE_URL = window.ZK360_CONFIG?.supabaseUrl || "";
const SUPABASE_ANON_KEY = window.ZK360_CONFIG?.supabaseAnonKey || "";
const CLAVE_ALUMNOS_MODO_PRUEBA = 'zk360_alumnos_modo_prueba';
const CONFIGURACION_HORARIO_DEFAULT = {
    dia_asistencia: 0,
    hora_inicio_asistencia: '14:45',
    hora_fin_asistencia: '17:00',
    dias_solicitud_sustituto: [1, 2],
    motivo: 'Horario habitual',
    actualizado_por: '',
    actualizado_en: ''
};
let configuracionHorario = { ...CONFIGURACION_HORARIO_DEFAULT };

// ============ CRONOGRAMA 2026 ============
const cronogramaOficial2026 = {
    "20/9/2026": { pi: "Yeny y Fernando", me: "Marisol", gr: "Dina", seccion: { "yeny": "infancia", "fernando": "infancia", "marisol": "medianos", "dina": "grandes" } },
    "27/9/2026": { pi: "Brenda y Claudia", me: "Maribel", gr: "Flor", seccion: { "brenda": "infancia", "claudia": "infancia", "maribel": "medianos", "flor": "grandes" } },
    "4/10/2026": { pi: "Marí y Jonathan", me: "Claudia", gr: "Erick", seccion: { "marí": "infancia", "jonathan": "infancia", "claudia": "medianos", "erick": "grandes" } },
    "11/10/2026": { pi: "Maribel", me: "Jonathan", gr: "Yeny", seccion: { "marisol": "infancia", "maribel": "infancia", "jonathan": "medianos", "yeny": "grandes" } },
    "18/10/2026": { pi: "Dina Y Flor", me: "Brenda", gr: "Erick", seccion: { "dina": "infancia", "flor": "infancia", "brenda": "medianos", "erick": "grandes" } },
    "25/10/2026": { pi: "Yeny y Fernando", me: "Mari", gr: "Flor", seccion: { "yeny": "infancia", "fernando": "infancia", "mari": "medianos", "flor": "grandes" } },
    "1/11/2026": { pi: "Brenda y Claudia", me: "Dina", gr: "Yeny", seccion: { "brenda": "infancia", "claudia": "infancia", "dina": "medianos", "yeny": "grandes" } },
    "8/11/2026": { pi: "Marí y Jonathan", me: "Erick", gr: "Dina", seccion: { "marí": "infancia", "jonathan": "infancia", "erick": "medianos", "dina": "grandes" } },
    "15/11/2026": { pi: "Maribel", me: "Claudia", gr: "Erick", seccion: { "marisol": "infancia", "maribel": "infancia", "claudia": "medianos", "erick": "grandes" } },
    "22/11/2026": { pi: "Dina Y Flor", me: "Jonathan", gr: "Yeny", seccion: { "dina": "infancia", "flor": "infancia", "jonathan": "medianos", "yeny": "grandes" } },
    "29/11/2026": { pi: "Yeny y Fernando", me: "Marisol", gr: "Flor", seccion: { "yeny": "infancia", "fernando": "infancia", "marisol": "medianos", "flor": "grandes" } },
    "6/12/2026": { pi: "Brenda y Claudia", me: "Erick", gr: "Dina", seccion: { "brenda": "infancia", "claudia": "infancia", "erick": "medianos", "dina": "grandes" } },
    "13/12/2026": { pi: "Marí y Jonathan", me: "Claudia", gr: "Erick", seccion: { "marí": "infancia", "jonathan": "infancia", "claudia": "medianos", "erick": "grandes" } },
    "20/12/2026": { pi: "Maribel", me: "Yeny", gr: "Flor", seccion: { "marisol": "infancia", "maribel": "infancia", "yeny": "medianos", "flor": "grandes" } },
    "27/12/2026": { pi: "Dina Y Flor", me: "Brenda", gr: "Yeny", seccion: { "dina": "infancia", "flor": "infancia", "brenda": "medianos", "yeny": "grandes" } }
};

// ============ VARIABLES GLOBALES ============
let usuarioSesion = null;
let seccionAsignadaMaestro = null;
let bancoAlumnosCompleto = [];
let idNinoAEditar = null;
let asistenciaEnviadaHoy = false;
let asistenciaModificacionActiva = false;
let motivoModificacionAsistencia = '';
let seccionAsistenciaActual = null;
let asistenciaReportadaPor = null;
let modoAdminVerTodos = false;
let leccionEditando = null;
let eventoEditandoId = null;
let timerInactividad = null;
let timerCerrarSesionInactividad = null;
let ultimaActividad = Date.now();
let modoPrueba = false;
let modoOffline = false;
let sincronizacionOfflineEnCurso = false;
let ultimoStatusHttpSupabase = null;
let leccionSeleccionada = null;
let preguntasEstudio = [];
let preguntaActual = 0;
let respuestasCorrectas = 0;
let contadorNotificaciones = 0;
let notificacionesPendientes = [];
let intervaloNotificacionesAdmin = null;
let esClaveTemporal = false;
let inactividadPausada = false;
let cacheDashboard = null;
let cacheTimestamp = null;
const CACHE_TTL = 300000;
let chatGrupalAbierto = true;
let chatPersonalCon = null;
let secuenciaCargaMensajes = 0;
let intervaloActualizacionChat = null;
let intervaloBadgeChat = null;
let promesaSDKStorage = null;
let solicitudesPendientes = [];
let parejasRechazadas = [];

// ============ TEMAS VISUALES ============
const TEMAS = {
    'predeterminado': { 
        nombre: 'Azul Zoar Vibrante', 
        icono: 'fa-sun',
        descripcion: 'Modo Claro / Predeterminado'
    },
    'azul-esmeralda': { 
        nombre: 'Azul Esmeralda', 
        icono: 'fa-tree',
        descripcion: 'Natural / Verde Neón'
    },
    'dark-purpura': { 
        nombre: 'Púrpura Deep', 
        icono: 'fa-gem',
        descripcion: 'Morado Obispo Institucional'
    },
    'galaxia': { 
        nombre: 'Galaxia Premium', 
        icono: 'fa-galaxy',
        descripcion: 'Glassmorphism & Cian Neón'
    }
};

const TEMAS_ORDER = ['predeterminado', 'azul-esmeralda', 'dark-purpura', 'galaxia'];

function estaEnHorarioAsistencia(fecha = new Date()) {
    const horaActual = fecha.getHours() * 60 + fecha.getMinutes();
    const horaInicio = horaAMinutos(configuracionHorario.hora_inicio_asistencia);
    const horaFin = horaAMinutos(configuracionHorario.hora_fin_asistencia);
    return fecha.getDay() === Number(configuracionHorario.dia_asistencia) &&
        horaInicio !== null && horaFin !== null &&
        horaActual >= horaInicio && horaActual < horaFin;
}

// ============ SISTEMA DE TEMAS ============
// ============ APLICAR TEMA - CORREGIDO ============
function aplicarTema(temaId) {
    // Mantener únicamente temas válidos para evitar que una selección
    // inválida termine aplicando accidentalmente el tema predeterminado.
    if (!Object.prototype.hasOwnProperty.call(TEMAS, temaId)) {
        temaId = 'predeterminado';
    }

    const html = document.documentElement;
    // La hoja de estilos puede utilizar cualquiera de las dos variantes.
    // Actualizar ambas evita que el botón cambie el estado guardado pero no
    // el fondo visual.
    html.setAttribute('data-tema', temaId);
    html.setAttribute('data-theme', temaId);
    localStorage.setItem('zoarkids_tema_activo', temaId);
    
    console.log(' Tema cambiado a:', temaId);
    
    // Actualizar botón en header
    const btnTema = document.getElementById('btn-cambiar-tema');
    if (btnTema) {
        const tema = TEMAS[temaId] || TEMAS['predeterminado'];
        btnTema.innerHTML = `<i class="fas ${tema.icono}" aria-hidden="true"></i><span class="btn-cambiar-tema-texto">Tema</span>`;
        btnTema.title = `Tema: ${tema.nombre}`;
        btnTema.setAttribute('aria-label', `Cambiar tema. Tema actual: ${tema.nombre}`);
    }
    
    // Actualizar botón en sidebar
    const btnTemaSidebar = document.getElementById('btn-cambiar-tema-sidebar');
    if (btnTemaSidebar) {
        const tema = TEMAS[temaId] || TEMAS['predeterminado'];
        btnTemaSidebar.innerHTML = `<i class="fas ${tema.icono}"></i> <span>${tema.nombre}</span>`;
    }
    
    // Guardar en Supabase
    if (usuarioSesion && usuarioSesion.email) {
        guardarTemaPreferido(usuarioSesion.email, temaId);
    }
    
}

function obtenerTemaActual() {
    return localStorage.getItem('zoarkids_tema_activo') || 'predeterminado';
}

async function guardarTemaPreferido(email, temaId) {
    try {
        await llamarSupabase('usuarios?email=eq.' + encodeURIComponent(email), {
            method: "PATCH",
            body: JSON.stringify({ tema_preferido: temaId })
        });
    } catch (error) {
        console.error('Error guardando tema:', error);
    }
}

async function cargarTemaPreferido(email) {
    try {
        const usuarios = await llamarSupabase('usuarios?email=eq.' + encodeURIComponent(email));
        if (usuarios && usuarios.length > 0 && usuarios[0].tema_preferido) {
            const tema = usuarios[0].tema_preferido;
            localStorage.setItem('zoarkids_tema_activo', tema);
            aplicarTema(tema);
            return tema;
        }
    } catch (error) {
        console.error('Error cargando tema:', error);
    }
    return null;
}

function cambiarTemaSiguiente() {
    const actual = obtenerTemaActual();
    let idx = TEMAS_ORDER.indexOf(actual);
    let siguiente = TEMAS_ORDER[(idx + 1) % TEMAS_ORDER.length];
    aplicarTema(siguiente);
}

// ============ MODAL DE BIENVENIDA TEMAS ============
function mostrarModalBienvenidaTemas() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay activo';
    modal.id = 'modal-bienvenida-temas';
    modal.style.zIndex = '10000';
    modal.innerHTML = `
        <div class="modal-burbuja" style="max-width:550px; text-align:center;">
            <div style="margin-bottom:20px;">
                <i class="fas fa-palette" style="font-size:48px; color:#2575fc;"></i>
                <h3 style="margin-top:10px;">Elige tu Estilo</h3>
                <p style="color:#747d8c; font-size:14px;">Selecciona el tema visual que prefieras para la aplicación</p>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                ${Object.entries(TEMAS).map(([id, tema]) => `
                    <div onclick="window.seleccionarTemaBienvenida('${id}')" 
                         style="padding:15px; border-radius:16px; cursor:pointer; border:2px solid #dfe4ea; 
                                transition:all 0.3s ease; background:white;"
                         onmouseover="this.style.borderColor='#2575fc'; this.style.transform='scale(1.02)'"
                         onmouseout="this.style.borderColor='#dfe4ea'; this.style.transform='scale(1)'">
                        <div style="font-size:32px; margin-bottom:8px;"><i class="fas ${tema.icono}"></i></div>
                        <div style="font-weight:600; font-size:14px; color:#1e3799;">${tema.nombre}</div>
                        <div style="font-size:11px; color:#747d8c;">${tema.descripcion}</div>
                    </div>
                `).join('')}
            </div>
            <div style="margin-top:15px; font-size:12px; color:#95a5a6;">
                <i class="fas fa-sync-alt"></i> Puedes cambiar el tema en cualquier momento
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

window.seleccionarTemaBienvenida = function(temaId) {
    const modal = document.getElementById('modal-bienvenida-temas');
    if (modal) modal.remove();
    
    aplicarTema(temaId);
    localStorage.setItem('zoarkids_onboarding_temas', 'true');
    
    if (usuarioSesion && usuarioSesion.email) {
        guardarTemaPreferido(usuarioSesion.email, temaId);
        llamarSupabase('usuarios?email=eq.' + encodeURIComponent(usuarioSesion.email), {
            method: "PATCH",
            body: JSON.stringify({ onboarding_completado: true })
        });
    }
    
    // Iniciar onboarding del sistema después de seleccionar tema
    setTimeout(() => {
        if (typeof iniciarOnboardingSistema === 'function') {
            iniciarOnboardingSistema();
        }
    }, 500);
};

// ============ BOTÓN DE CAMBIO RÁPIDO CON LONG-PRESS ============
function configurarBotonTema() {
    const btnTema = document.getElementById('btn-cambiar-tema');
    if (!btnTema) return;
    
    let pressTimer = null;
    let longPress = false;
    
    const temaActual = obtenerTemaActual();
    const tema = TEMAS[temaActual] || TEMAS['predeterminado'];
    btnTema.innerHTML = `<i class="fas ${tema.icono}" aria-hidden="true"></i><span class="btn-cambiar-tema-texto">Tema</span>`;
    btnTema.title = `Tema: ${tema.nombre} (Click: siguiente, Mantener: menú)`;
    btnTema.setAttribute('aria-label', `Cambiar tema. Tema actual: ${tema.nombre}`);
    
    btnTema.addEventListener('mousedown', function() {
        longPress = false;
        pressTimer = setTimeout(() => {
            longPress = true;
            mostrarMenuTemas(this);
        }, 800);
    });
    
    btnTema.addEventListener('mouseup', function() {
        clearTimeout(pressTimer);
        if (!longPress) {
            cambiarTemaSiguiente();
        }
    });
    
    btnTema.addEventListener('mouseleave', function() {
        clearTimeout(pressTimer);
    });
    
    btnTema.addEventListener('touchstart', function() {
        longPress = false;
        pressTimer = setTimeout(() => {
            longPress = true;
            mostrarMenuTemas(this);
        }, 800);
    });
    
    btnTema.addEventListener('touchend', function() {
        clearTimeout(pressTimer);
        if (!longPress) {
            cambiarTemaSiguiente();
        }
    });
    
    const btnTemaSidebar = document.getElementById('btn-cambiar-tema-sidebar');
    if (btnTemaSidebar) {
        btnTemaSidebar.addEventListener('click', function() {
            cambiarTemaSiguiente();
        });
    }
}

function mostrarMenuTemas(elemento) {
    const menuExistente = document.getElementById('menu-temas-flotante');
    if (menuExistente) menuExistente.remove();
    
    const rect = elemento.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.id = 'menu-temas-flotante';
    menu.style.cssText = `
        position: fixed;
        top: ${rect.bottom + 10}px;
        right: 10px;
        background: var(--bg-card-main, #ffffff);
        border-radius: 16px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        border: 1px solid var(--border-color, #eef2f7);
        padding: 12px;
        z-index: 9999;
        min-width: 200px;
        backdrop-filter: blur(10px);
        animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    `;
    
    menu.innerHTML = Object.entries(TEMAS).map(([id, tema]) => `
        <div onclick="window.seleccionarTemaDesdeMenu('${id}')" 
             style="display:flex; align-items:center; gap:12px; padding:10px 14px; 
                    border-radius:10px; cursor:pointer; transition:all 0.2s ease;
                    ${obtenerTemaActual() === id ? 'background:var(--bg-card-inner, #f0f4f8);' : ''}"
             onmouseover="this.style.background='var(--bg-card-inner, #f0f4f8)'"
             onmouseout="this.style.background='${obtenerTemaActual() === id ? 'var(--bg-card-inner, #f0f4f8)' : 'transparent'}'">
            <i class="fas ${tema.icono}" style="font-size:20px; color:var(--azul-botones, #2575fc);"></i>
            <div>
                <div style="font-weight:600; font-size:13px; color:var(--text-main, #2c3e50);">${tema.nombre}</div>
                <div style="font-size:11px; color:var(--text-muted, #747d8c);">${tema.descripcion}</div>
            </div>
            ${obtenerTemaActual() === id ? '<i class="fas fa-check-circle" style="color:#2ecc71; margin-left:auto;"></i>' : ''}
        </div>
    `).join('');
    
    document.body.appendChild(menu);
    
    setTimeout(() => {
        document.addEventListener('click', function cerrarMenu(e) {
            if (!menu.contains(e.target) && e.target !== elemento) {
                menu.remove();
                document.removeEventListener('click', cerrarMenu);
            }
        });
    }, 100);
}

window.seleccionarTemaDesdeMenu = function(temaId) {
    const menu = document.getElementById('menu-temas-flotante');
    if (menu) menu.remove();
    aplicarTema(temaId);
};

// ============ FUNCIONES DE SUPABASE ============
async function llamarSupabase(endpoint, opciones = {}) {
    ultimoStatusHttpSupabase = null;
    if (modoPrueba) {
        try {
            const [tabla, query = ''] = endpoint.split('?');
            const key = `zk360_prueba_tabla_${tabla}`;
            const method = (opciones.method || 'GET').toUpperCase();
            const filters = new URLSearchParams(query);
            const matches = row => [...filters.entries()].every(([field, value]) =>
                !value.startsWith('eq.') || String(row[field]) === value.slice(3)
            );
            let rows = JSON.parse(localStorage.getItem(key) || '[]');
            if (!Array.isArray(rows)) rows = [];
            if (method === 'GET') return rows.filter(matches);
            if (method === 'POST') {
                const payload = JSON.parse(opciones.body || '{}');
                (Array.isArray(payload) ? payload : [payload]).forEach(row => {
                    if (row.id == null) row.id = `local-${Date.now()}-${crypto.randomUUID()}`;
                    rows.push(row);
                });
                localStorage.setItem(key, JSON.stringify(rows));
                return true;
            }
            if (method === 'PATCH') {
                const changes = JSON.parse(opciones.body || '{}');
                localStorage.setItem(key, JSON.stringify(rows.map(row => matches(row) ? { ...row, ...changes } : row)));
                return true;
            }
            if (method === 'DELETE') {
                localStorage.setItem(key, JSON.stringify(rows.filter(row => !matches(row))));
                return true;
            }
        } catch (error) {
            console.error('Error en datos locales de prueba:', error);
            return null;
        }
    }
    const method = (opciones.method || 'GET').toUpperCase();
    const esLectura = method === 'GET';
    const opcionesRemotas = { ...opciones };
    delete opcionesRemotas.__desdeCola;
    if (!navigator.onLine) {
        if (esLectura) {
            try {
                const respuestaLocal = await window.ZK360OfflineStore?.getResponse(endpoint);
                if (respuestaLocal !== undefined && respuestaLocal !== null) return respuestaLocal;
            } catch (error) {
                console.error('No se pudo leer la caché offline:', error);
            }
            return null;
        }
        return encolarCambioOffline(endpoint, method, opcionesRemotas);
    }
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        mostrarNotificacion('Configura Supabase en config.local.js.', 'error');
        return null;
    }

    const url = SUPABASE_URL + '/rest/v1/' + endpoint;
    const session = (() => {
        try {
            return JSON.parse(sessionStorage.getItem('zk360_supabase_session') || '{}');
        } catch {
            return {};
        }
    })();
    let accessToken = session.access_token;
    if (!accessToken) {
        if (opciones.__desdeCola) return null;
        if (modoOffline) {
            if (esLectura) return await window.ZK360OfflineStore?.getResponse(endpoint) ?? null;
            return encolarCambioOffline(endpoint, method, opcionesRemotas);
        }
        mostrarNotificacion('La sesión expiró. Inicia sesión nuevamente.', 'error');
        window.location.replace('index.html');
        return null;
    }
    if (session.expires_at && session.expires_at * 1000 <= Date.now()) {
        if (!session.refresh_token) {
            sessionStorage.removeItem('zk360_supabase_session');
            if (opciones.__desdeCola) return null;
            if (modoOffline) {
                if (esLectura) return await window.ZK360OfflineStore?.getResponse(endpoint) ?? null;
                return encolarCambioOffline(endpoint, method, opcionesRemotas);
            }
            window.location.replace('index.html');
            return null;
        }
        try {
            const refreshed = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
                method: 'POST',
                cache: 'no-store',
                headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: session.refresh_token })
            });
            const refreshedSession = await refreshed.json().catch(() => ({}));
            if (!refreshed.ok || !refreshedSession.access_token) {
                sessionStorage.removeItem('zk360_supabase_session');
                if (opciones.__desdeCola) return null;
                if (modoOffline) {
                    if (esLectura) return await window.ZK360OfflineStore?.getResponse(endpoint) ?? null;
                    return encolarCambioOffline(endpoint, method, opcionesRemotas);
                }
                window.location.replace('index.html');
                return null;
            }
            sessionStorage.setItem('zk360_supabase_session', JSON.stringify({
                access_token: refreshedSession.access_token,
                refresh_token: refreshedSession.refresh_token,
                expires_at: refreshedSession.expires_at,
                user: refreshedSession.user
            }));
            accessToken = refreshedSession.access_token;
        } catch (error) {
            if (!esLectura && !opciones.__desdeCola && error instanceof TypeError) {
                return encolarCambioOffline(endpoint, method, opcionesRemotas);
            }
            if (esLectura) return window.ZK360OfflineStore?.getResponse(endpoint) ?? null;
            return null;
        }
    }
    const headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": "Bearer " + accessToken,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    };
    const config = { ...opcionesRemotas, headers: { ...headers, ...opcionesRemotas.headers } };
    let response;
    try {
        response = await fetch(url, config);
    } catch (error) {
        console.error("Error en Supabase:", error);
        if (!esLectura && !opciones.__desdeCola &&
            (error instanceof TypeError || !navigator.onLine)) {
            return encolarCambioOffline(endpoint, method, opcionesRemotas);
        }
        if (esLectura && error instanceof TypeError) {
            try {
                return await window.ZK360OfflineStore?.getResponse(endpoint) ?? null;
            } catch (cacheError) {
                console.error('No se pudo consultar la caché offline:', cacheError);
            }
        }
        mostrarNotificacion(error.message || "Error de conexión con el servidor", "error");
        return null;
    }

    if (!response.ok) {
        ultimoStatusHttpSupabase = response.status;
        const error = new Error('Supabase respondió con HTTP ' + response.status);
        console.error("Error en Supabase:", error);
        if (response.status === 401) sessionStorage.removeItem('zk360_supabase_session');
        mostrarNotificacion(error.message, "error");
        return null;
    }

    let resultado;
    try {
        const texto = await response.text();
        resultado = texto ? JSON.parse(texto) : true;
    } catch (error) {
        console.error('Supabase devolvió una respuesta inválida:', error);
        mostrarNotificacion('El servidor respondió, pero no se pudo interpretar su respuesta.', 'error');
        return null;
    }

    try {
        if (esLectura) {
            await window.ZK360OfflineStore?.setResponse(endpoint, resultado);
        } else if (opciones.__desdeCola) {
            await window.ZK360OfflineStore?.invalidateTable(endpoint.split('?')[0]);
        } else {
            await window.ZK360OfflineStore?.applyMutationToCaches(endpoint, method, opciones.body ? JSON.parse(opciones.body) : {}, Date.now());
        }
    } catch (error) {
        console.error('La operación en Supabase funcionó, pero no se actualizó la caché offline:', error);
        mostrarNotificacion('Se guardó en Supabase, pero no se pudo actualizar la copia offline.', 'warning');
    }
    return resultado;
}

async function encolarCambioOffline(endpoint, method, opciones) {
    if (modoPrueba) return null;
    if (usuarioSesion?.rol !== 'maestro' || !seccionAsignadaMaestro ||
        seccionAsignadaMaestro === 'admin_total' || !window.ZK360OfflineStore) {
        mostrarNotificacion('Este cambio necesita conexión y una sesión de maestro asignado.', 'warning');
        return null;
    }
    try {
        const body = opciones.body ? JSON.parse(opciones.body) : {};
        await window.ZK360OfflineStore.enqueueMutation({
            endpoint,
            method,
            body,
            ownerEmail: usuarioSesion.email
        });
        mostrarNotificacion('Cambio guardado en este dispositivo; se sincronizará al recuperar internet.', 'success');
        publicarEstadoColaOffline();
        return true;
    } catch (error) {
        console.error('No se pudo guardar el cambio para sincronizarlo:', error);
        mostrarNotificacion('No se pudo guardar el cambio offline en este dispositivo.', 'error');
        return null;
    }
}

function publicarEstadoColaOffline(requiereAutenticacion = false, mensaje = '') {
    window.ZK360OfflineStore?.listMutations().then(cambios => {
        window.dispatchEvent(new CustomEvent('zk360:offline-sync-status', {
            detail: {
                pending: cambios.length,
                offline: !navigator.onLine,
                requiresLogin: requiereAutenticacion,
                message: mensaje
            }
        }));
    }).catch(error => console.error('No se pudo consultar la cola offline:', error));
}

async function sincronizarCambiosOffline() {
    if (!navigator.onLine || modoPrueba || !window.ZK360OfflineStore || sincronizacionOfflineEnCurso) return;
    sincronizacionOfflineEnCurso = true;
    try {
        const cambios = await window.ZK360OfflineStore.listMutations();
        if (!cambios.length) {
            publicarEstadoColaOffline();
            return;
        }
        const session = (() => {
            try { return JSON.parse(sessionStorage.getItem('zk360_supabase_session') || '{}'); }
            catch (error) { return {}; }
        })();
        if (!session.access_token) {
            publicarEstadoColaOffline(true);
            return;
        }
        if (session.user?.email && usuarioSesion?.email &&
            session.user.email.toLowerCase() !== usuarioSesion.email.toLowerCase()) {
            publicarEstadoColaOffline(true, 'Inicia sesión con la cuenta del maestro que guardó estos cambios.');
            return;
        }
        const cambiosUsuario = cambios.filter(item =>
            String(item.ownerEmail || '').toLowerCase() === String(usuarioSesion?.email || '').toLowerCase()
        );
        if (!cambiosUsuario.length) {
            publicarEstadoColaOffline(true, 'Inicia sesión con la cuenta del maestro que guardó estos cambios.');
            return;
        }
        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
            publicarEstadoColaOffline(false, 'Configura Supabase para sincronizar los cambios pendientes.');
            return;
        }

        let falloSincronizacion = false;
        let requiereAutenticacion = false;
        let mensajeSincronizacion = '';
        let sincronizados = 0;
        for (const cambio of cambiosUsuario) {
            if (!navigator.onLine) break;
            if (['PATCH', 'DELETE'].includes(cambio.method)) {
                if (!Array.isArray(cambio.baseline) || !cambio.baseline.length) {
                    await window.ZK360OfflineStore.removeMutation(cambio.id);
                    await window.ZK360OfflineStore.invalidateTable(cambio.endpoint.split('?')[0]);
                    mostrarNotificacion('Se descartó un cambio offline porque no había una versión previa para compararlo. Se conservaron los datos de Supabase.', 'warning');
                    continue;
                }
                const servidor = await llamarSupabase(cambio.endpoint);
                if (!Array.isArray(servidor)) {
                    falloSincronizacion = true;
                    requiereAutenticacion = ultimoStatusHttpSupabase === 401 ||
                        !sessionStorage.getItem('zk360_supabase_session');
                    mensajeSincronizacion = requiereAutenticacion
                        ? 'Inicia sesión para continuar la sincronización de tus cambios.'
                        : '';
                    break;
                }
                if (!window.ZK360OfflineStore.equalSnapshots(cambio.baseline, servidor)) {
                    await window.ZK360OfflineStore.removeMutation(cambio.id);
                    await window.ZK360OfflineStore.invalidateTable(cambio.endpoint.split('?')[0]);
                    mostrarNotificacion('Hubo un cambio simultáneo en Supabase. Se conservaron los datos del servidor y no se aplicó el cambio offline.', 'warning');
                    continue;
                }
            }

            const resultado = await llamarSupabase(cambio.endpoint, {
                method: cambio.method,
                body: JSON.stringify(cambio.body),
                __desdeCola: true
            });
            if (resultado === null) {
                if (cambio.method === 'POST' && ultimoStatusHttpSupabase === 409) {
                    await window.ZK360OfflineStore.removeMutation(cambio.id);
                    try {
                        await window.ZK360OfflineStore.invalidateTable(cambio.endpoint.split('?')[0]);
                    } catch (error) {
                        console.error('No se pudo actualizar la caché tras un conflicto de sincronización:', error);
                    }
                    mostrarNotificacion('El servidor ya contiene un registro en conflicto. Se conservó la versión de Supabase.', 'warning');
                    continue;
                }
                falloSincronizacion = true;
                requiereAutenticacion = ultimoStatusHttpSupabase === 401 ||
                    !sessionStorage.getItem('zk360_supabase_session');
                mensajeSincronizacion = requiereAutenticacion
                    ? 'Inicia sesión para continuar la sincronización de tus cambios.'
                    : '';
                break;
            }
            await window.ZK360OfflineStore.removeMutation(cambio.id);
            sincronizados++;
            if (cambio.endpoint.split('?')[0] === 'mensajes' &&
                cambio.method === 'POST' &&
                typeof cambio.body?.receptor === 'string') {
                void enviarPushChat(
                    cambio.body.receptor,
                    cambio.body.tipo === 'imagen'
                        ? `${usuarioSesion.nombre} te envió una imagen.`
                        : `${usuarioSesion.nombre}: ${String(cambio.body.mensaje || '')}`
                );
            }
        }
        if (sincronizados) {
            mostrarNotificacion(`${sincronizados} cambio(s) guardado(s) offline se sincronizaron con Supabase.`, 'success');
        }
        publicarEstadoColaOffline(requiereAutenticacion, mensajeSincronizacion || (falloSincronizacion
            ? 'No se pudo completar la sincronización. Se reintentará cuando el servicio esté disponible.'
            : ''));
    } catch (error) {
        console.error('Falló la sincronización offline:', error);
        publicarEstadoColaOffline(false, 'No se pudo completar la sincronización. Se reintentará cuando el servicio esté disponible.');
    } finally {
        sincronizacionOfflineEnCurso = false;
    }
}

async function cargarAlumnos(seccion = null) {
    try {
        let endpoint = "alumnos?order=id.asc";
        if (seccion && seccion !== "todos") {
            endpoint = 'alumnos?seccion=eq.' + seccion + '&order=id.asc';
        }
        const data = await llamarSupabase(endpoint);
        return data || [];
    } catch (error) { return []; }
}

async function validarUsuarioRegistrado(email) {
    if (!email) return false;
    const usuarios = await llamarSupabase('usuarios?email=eq.' + encodeURIComponent(email) + '&select=email,nombre,rol,pareja,seccion');
    if (usuarios === null) return null;
    return usuarios.length > 0 ? usuarios[0] : false;
}

async function guardarAlumno(alumno) {
    return await llamarSupabase("alumnos", { method: "POST", body: JSON.stringify(alumno) });
}

async function actualizarAlumno(id, datos) {
    return await llamarSupabase('alumnos?id=eq.' + id, { method: "PATCH", body: JSON.stringify(datos) });
}

async function eliminarAlumno(id) {
    return await llamarSupabase('alumnos?id=eq.' + id, { method: "DELETE" });
}

async function guardarLog(log) {
    try {
        const resultado = await llamarSupabase("logs", { method: "POST", body: JSON.stringify(log) });
        if (resultado === null) throw new Error(ultimoErrorSupabase || 'Supabase no confirmó el registro del historial.');
    } catch (error) {
        console.error('No se pudo guardar el evento en el historial remoto:', error);
        const logs = JSON.parse(localStorage.getItem('zk360_historial') || '[]');
        logs.push(log);
        localStorage.setItem('zk360_historial', JSON.stringify(logs));
    }
}

// ============ NOTIFICACIONES ============
function mostrarNotificacion(mensaje, tipo = "info") {
    const textoMensaje = String(mensaje);

    let contenedor = document.getElementById('notificacion-sistema');
    if (!contenedor) {
        contenedor = document.createElement('div');
        contenedor.id = 'notificacion-sistema';
        document.body.appendChild(contenedor);
    }
    
    const colores = { info: '#2575fc', success: '#2ecc71', error: '#ff7675', warning: '#f39c12' };
    const iconos = { info: 'fa-circle-info', success: 'fa-circle-check', error: 'fa-triangle-exclamation', warning: 'fa-triangle-exclamation' };
    
    const burbuja = document.createElement('div');
    burbuja.className = `notificacion-burbuja ${tipo}`;
    burbuja.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
    burbuja.setAttribute('aria-label', textoMensaje);
    burbuja.style.cssText = 'align-items:flex-start;max-height:65vh;overflow-y:auto;overflow-wrap:anywhere;white-space:pre-wrap;';
    burbuja.style.borderLeftColor = colores[tipo] || '#2575fc';
    const icono = document.createElement('i');
    icono.className = `fas ${iconos[tipo] || 'fa-circle-info'}`;
    icono.setAttribute('aria-hidden', 'true');
    const texto = document.createElement('span');
    texto.textContent = textoMensaje;
    texto.style.cssText = 'flex:1;min-width:0;overflow-wrap:anywhere;white-space:pre-wrap;';
    const cerrar = document.createElement('button');
    cerrar.type = 'button';
    cerrar.setAttribute('aria-label', 'Cerrar notificación');
    cerrar.style.cssText = 'background:none;border:none;color:#95a5a6;cursor:pointer;font-size:18px;';
    cerrar.textContent = '×';
    cerrar.addEventListener('click', () => burbuja.remove());
    burbuja.append(icono, texto, cerrar);
    contenedor.appendChild(burbuja);
    while (contenedor.children.length > 4) contenedor.firstElementChild.remove();

    setTimeout(() => {
        burbuja.style.opacity = '0';
        setTimeout(() => burbuja.remove(), 500);
    }, tipo === 'error' ? 12000 : 8000);
}

function claveAlmacenNotificaciones() {
    const email = String(usuarioSesion?.email || 'sin-usuario').trim().toLowerCase();
    return `zk360_notificaciones_eventos_${email}`;
}

function guardarNotificacionesCampana() {
    try {
            localStorage.setItem(claveAlmacenNotificaciones(), JSON.stringify(notificacionesPendientes));
    } catch (error) {
        console.error('No se pudieron guardar las notificaciones importantes:', error);
    }
}

function registrarNotificacionImportante({ id, mensaje, detalle = '', tipo = 'info' }) {
    if (modoPrueba || modoOffline || !id || !mensaje) return false;
    const idEvento = String(id);
    if (notificacionesPendientes.some(item =>
        item.id === idEvento ||
        (item.mensaje === String(mensaje) && item.detalle === String(detalle || mensaje) &&
            Date.now() - Date.parse(item.timestamp) < 30000)
    )) return false;
    notificacionesPendientes.push({
        id: idEvento,
        mensaje: String(mensaje),
        detalle: String(detalle || mensaje),
        tipo,
        timestamp: new Date().toISOString(),
        leida: false
    });
    contadorNotificaciones = notificacionesPendientes.filter(item => !item.leida).length;
    guardarNotificacionesCampana();
    actualizarBadgeNotificaciones();
    return true;
}

async function revisarEventosImportantesAdmin() {
    if (modoPrueba || modoOffline || !usuarioSesion || usuarioSesion.rol !== 'admin') return;
    try {
        const claveCursor = `zk360_notificaciones_cursor_${usuarioSesion.email}`;
        const cursorGuardado = localStorage.getItem(claveCursor);
        if (cursorGuardado === null) {
            const logsRecientes = await llamarSupabase('logs?order=id.desc&limit=50');
            if (!Array.isArray(logsRecientes)) return;
            const mayorId = logsRecientes.reduce((maximo, log) => Math.max(maximo, Number(log.id) || 0), 0);
            localStorage.setItem(claveCursor, String(mayorId));
            return;
        }

        let cursor = Number(cursorGuardado);
        if (!Number.isFinite(cursor)) throw new Error('El cursor de notificaciones no es válido.');
        while (true) {
            const cursorAnterior = cursor;
            const logs = await llamarSupabase(`logs?id=gt.${cursor}&order=id.asc&limit=1000`);
            if (!Array.isArray(logs)) return;
            logs.forEach(log => {
                const id = Number(log.id);
                cursor = Math.max(cursor, Number.isFinite(id) ? id : cursor);
                if (!/^(Envió asistencia|Subió foto|Envió lección|Solicitó sustituto)/i.test(String(log.accion || ''))) return;
                const fecha = new Date(log.fecha);
                const textoFecha = Number.isNaN(fecha.getTime()) ? '' : ` · ${fecha.toLocaleDateString()}`;
                const mensaje = String(log.accion);
                const detalle = `${log.usuario || 'Un usuario'}${textoFecha}`;
                const nuevoEvento = registrarNotificacionImportante({
                    id: `actividad-${log.id}`,
                    mensaje,
                    detalle,
                    tipo: 'info'
                });
                if (nuevoEvento) mostrarNotificacion(`${mensaje} · ${detalle}`, 'info');
            });
            if (logs.length) localStorage.setItem(claveCursor, String(cursor));
            if (logs.length === 1000 && cursor === cursorAnterior) {
                throw new Error('No se pudo avanzar el cursor al consultar las notificaciones.');
            }
            if (logs.length < 1000) break;
        }
    } catch (error) {
        console.error('No se pudieron consultar las notificaciones de actividad:', error);
    }
}

function confirmarAccion(mensaje) {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay activo';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        const modal = document.createElement('div');
        modal.className = 'modal-burbuja';
        const texto = document.createElement('p');
        texto.textContent = mensaje;
        const acciones = document.createElement('div');
        acciones.style.cssText = 'display:flex;justify-content:flex-end;gap:10px;margin-top:20px;';
        const cancelar = document.createElement('button');
        cancelar.type = 'button';
        cancelar.className = 'btn-cerrar-modal btn-cancelar';
        cancelar.textContent = 'Cancelar';
        const aceptar = document.createElement('button');
        aceptar.type = 'button';
        aceptar.className = 'btn-primary';
        aceptar.textContent = 'Confirmar';
        let resuelto = false;
        const cerrar = resultado => {
            if (resuelto) return;
            resuelto = true;
            overlay.remove();
            resolve(resultado);
        };
        cancelar.addEventListener('click', () => cerrar(false));
        aceptar.addEventListener('click', () => cerrar(true));
        overlay.addEventListener('click', event => {
            if (event.target === overlay) cerrar(false);
        });
        acciones.append(cancelar, aceptar);
        modal.append(texto, acciones);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        aceptar.focus();
    });
}

window.confirmarAccion = confirmarAccion;

function actualizarBadgeNotificaciones() {
    const badge = document.getElementById('notificacion-contador');
    if (badge) {
        badge.textContent = contadorNotificaciones > 99 ? '99+' : String(contadorNotificaciones);
        badge.style.display = contadorNotificaciones > 0 ? 'inline' : 'none';
    }
}

window.abrirNotificaciones = function() {
    const modal = document.getElementById('modal-notificaciones');
    if (modal) {
        modal.classList.add('activo');
        cargarNotificacionesEnModal();
        notificacionesPendientes = notificacionesPendientes.map(item => ({ ...item, leida: true }));
        contadorNotificaciones = 0;
        guardarNotificacionesCampana();
        actualizarBadgeNotificaciones();
    }
};

function cargarNotificacionesEnModal() {
    const container = document.getElementById('lista-notificaciones');
    if (!container) return;
    container.replaceChildren();
    if (!notificacionesPendientes.length) {
        const vacio = document.createElement('p');
        vacio.style.cssText = 'text-align:center;padding:30px;color:#95a5a6';
        vacio.textContent = 'Aquí aparecerán actualizaciones importantes: asistencia, fotos, lecciones y sustituciones.';
        container.appendChild(vacio);
        return;
    }
    notificacionesPendientes.slice().reverse().forEach(notificacion => {
        const item = document.createElement('article');
        item.className = 'notificacion-lista-item';
        const encabezado = document.createElement('button');
        encabezado.type = 'button';
        encabezado.className = 'notificacion-lista-encabezado';
        encabezado.setAttribute('aria-expanded', 'false');
        encabezado.classList.toggle('no-leida', !notificacion.leida);
        encabezado.textContent = String(notificacion.mensaje || 'Notificación');
        const detalle = document.createElement('div');
        detalle.className = 'notificacion-lista-detalle';
        detalle.hidden = true;
        const detalleTexto = String(notificacion.detalle || '');
        const descripcion = document.createElement('p');
        descripcion.textContent = detalleTexto;
        const fecha = document.createElement('small');
        const instante = new Date(notificacion.timestamp);
        fecha.textContent = Number.isNaN(instante.getTime()) ? '' : instante.toLocaleString();
        const tipo = document.createElement('small');
        tipo.className = 'notificacion-lista-tipo';
        tipo.textContent = ({
            error: 'Requiere atención',
            warning: 'Aviso',
            success: 'Acción completada',
            info: 'Información'
        })[notificacion.tipo] || 'Notificación';
        encabezado.addEventListener('click', () => {
            detalle.hidden = !detalle.hidden;
            encabezado.setAttribute('aria-expanded', String(!detalle.hidden));
        });
        if (detalleTexto && detalleTexto !== String(notificacion.mensaje || '')) detalle.appendChild(descripcion);
        detalle.append(tipo, fecha);
        item.append(encabezado, detalle);
        container.appendChild(item);
    });
}

// ============ GESTIÓN DE INACTIVIDAD ============
const INACTIVIDAD_TIMEOUT = 60000;

function iniciarTimerInactividad() {
    if (inactividadPausada) return;
    clearTimeout(timerInactividad);
    const comprobarInactividad = () => {
        const inactivoPor = Date.now() - ultimaActividad;
        if (inactivoPor < INACTIVIDAD_TIMEOUT) {
            timerInactividad = setTimeout(comprobarInactividad, INACTIVIDAD_TIMEOUT - inactivoPor);
            return;
        }
        if (inactividadPausada) return;
        mostrarNotificacion('Sesión expirada por inactividad. Cualquier interacción antes de salir reinicia el contador.', 'warning');
        clearTimeout(timerCerrarSesionInactividad);
        timerCerrarSesionInactividad = setTimeout(() => { window.cerrarSesion(); }, 2000);
    };
    timerInactividad = setTimeout(comprobarInactividad, Math.max(0, INACTIVIDAD_TIMEOUT - (Date.now() - ultimaActividad)));
}

function reiniciarTimerInactividad() {
    ultimaActividad = Date.now();
    clearTimeout(timerCerrarSesionInactividad);
    timerCerrarSesionInactividad = null;
    if (inactividadPausada) inactividadPausada = false;
    iniciarTimerInactividad();
}

function pausarInactividad() {
    inactividadPausada = true;
    clearTimeout(timerInactividad);
    clearTimeout(timerCerrarSesionInactividad);
    timerCerrarSesionInactividad = null;
}

function reanudarInactividad() {
    inactividadPausada = false;
    ultimaActividad = Date.now();
    iniciarTimerInactividad();
}

// Eventos que reinician el timer
document.addEventListener('mousemove', reiniciarTimerInactividad);
document.addEventListener('pointerdown', reiniciarTimerInactividad);
document.addEventListener('keydown', reiniciarTimerInactividad);
document.addEventListener('input', reiniciarTimerInactividad);
document.addEventListener('change', reiniciarTimerInactividad);
document.addEventListener('wheel', reiniciarTimerInactividad, { passive: true });
document.addEventListener('scroll', reiniciarTimerInactividad, { passive: true, capture: true });
document.addEventListener('touchstart', reiniciarTimerInactividad, { passive: true });

// ============ INICIALIZACIÓN ============
window.addEventListener('DOMContentLoaded', async () => {
    // Cargar tema guardado
    const temaGuardado = localStorage.getItem('zoarkids_tema_activo') || 'predeterminado';
    aplicarTema(temaGuardado);
    console.log(' Tema aplicado:', temaGuardado);

    const btnTema = document.getElementById('btn-cambiar-tema');
    if (btnTema) {
        const tema = TEMAS[temaGuardado] || TEMAS['predeterminado'];
        btnTema.innerHTML = `<i class="fas ${tema.icono}" aria-hidden="true"></i><span class="btn-cambiar-tema-texto">Tema</span>`;
    }

    // Cargar notificaciones pendientes
    localStorage.removeItem('zk360_notificaciones_pendientes');

    // Recuperar sesión
    const sesionTemporal = sessionStorage.getItem('zk360_usuario_activo');
    const sesionPersistente = localStorage.getItem('zk360_usuario_persistente');
    const esPrueba = sessionStorage.getItem('zk360_modo_prueba') === 'true';
    const perfilOffline = (() => {
        try { return JSON.parse(localStorage.getItem('zk360_maestro_offline') || 'null'); }
        catch (error) { return null; }
    })();
    const perfilOfflineValido = perfilOffline?.rol === 'maestro' && perfilOffline.seccion &&
        perfilOffline.expira_en && new Date(perfilOffline.expira_en).getTime() > Date.now();
    modoOffline = sessionStorage.getItem('zk360_modo_offline') === 'true';
    
    if (esPrueba) {
        modoPrueba = true;
        usuarioSesion = JSON.parse(sesionTemporal);
        const labelPrueba = document.getElementById('modo-prueba-label');
        if (labelPrueba) labelPrueba.style.display = 'block';
        const btnRevertir = document.getElementById('btn-revertir-prueba');
        if (btnRevertir) btnRevertir.style.display = 'block';
    } else if (sesionPersistente) {
        usuarioSesion = JSON.parse(sesionPersistente);
    } else if (sesionTemporal) {
        usuarioSesion = JSON.parse(sesionTemporal);
    }

    if (!modoPrueba && !navigator.onLine) {
        if (usuarioSesion?.rol !== 'maestro' || !perfilOfflineValido ||
            perfilOffline.email !== usuarioSesion.email) {
            sessionStorage.removeItem('zk360_usuario_activo');
            sessionStorage.removeItem('zk360_modo_offline');
            window.location.replace('index.html');
            return;
        }
        modoOffline = true;
        sessionStorage.setItem('zk360_modo_offline', 'true');
    }

    if (modoOffline && (!perfilOfflineValido ||
        usuarioSesion?.rol !== 'maestro' ||
        perfilOffline.email !== usuarioSesion.email)) {
        sessionStorage.removeItem('zk360_modo_offline');
        sessionStorage.removeItem('zk360_usuario_activo');
        window.location.replace('index.html');
        return;
    }
    if (!modoPrueba && !navigator.onLine && usuarioSesion?.rol !== 'maestro') {
        sessionStorage.removeItem('zk360_usuario_activo');
        sessionStorage.removeItem('zk360_modo_offline');
        window.location.replace('index.html');
        return;
    }
    
    if (!usuarioSesion) { 
        window.location.href = "index.html"; 
        return; 
    }
    esClaveTemporal = sessionStorage.getItem('zk360_clave_temporal') === 'true' ||
        localStorage.getItem(`zk360_clave_temporal_${String(usuarioSesion.email || '').toLowerCase()}`) === 'true';

    try {
        const notificacionesGuardadas = JSON.parse(localStorage.getItem(claveAlmacenNotificaciones()) || '[]');
        notificacionesPendientes = Array.isArray(notificacionesGuardadas)
            ? notificacionesGuardadas.filter(item => item && typeof item.id === 'string')
            : [];
        contadorNotificaciones = notificacionesPendientes.filter(item => !item.leida).length;
        actualizarBadgeNotificaciones();
    } catch (error) {
        console.error('No se pudieron cargar las notificaciones importantes:', error);
        notificacionesPendientes = [];
        contadorNotificaciones = 0;
        actualizarBadgeNotificaciones();
    }

    // No aceptar sesiones persistidas de usuarios que ya no están registrados.
    // En modo de prueba se conserva el usuario local; si Supabase no responde,
    // no se invalida una sesión legítima por un fallo temporal de conexión.
    if (!modoPrueba && !modoOffline && navigator.onLine) {
        const usuarioRegistrado = await validarUsuarioRegistrado(usuarioSesion.email);
        if (usuarioRegistrado === false) {
            sessionStorage.removeItem('zk360_usuario_activo');
            localStorage.removeItem('zk360_usuario_persistente');
            window.location.replace('index.html');
            return;
        }
        if (usuarioRegistrado) {
            usuarioSesion = { ...usuarioSesion, ...usuarioRegistrado };
            sessionStorage.setItem('zk360_usuario_activo', JSON.stringify(usuarioSesion));
            if (usuarioSesion.rol === 'maestro' && usuarioSesion.seccion) {
                localStorage.setItem('zk360_maestro_offline', JSON.stringify({
                    nombre: usuarioSesion.nombre,
                    email: usuarioSesion.email,
                    rol: 'maestro',
                    pareja: usuarioSesion.pareja || null,
                    seccion: usuarioSesion.seccion,
                    guardado_en: new Date().toISOString(),
                    expira_en: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                }));
            }
            if (localStorage.getItem('zk360_usuario_persistente')) {
                localStorage.setItem('zk360_usuario_persistente', JSON.stringify(usuarioSesion));
            }
        }
    }

    const esAdmin = usuarioSesion.rol === "admin" || usuarioSesion.rol === "pastor";
    const menuConfiguracion = document.getElementById('menu-configuracion');
    const menuActividades = document.getElementById('menu-actividades');
    const btnAgregarActividad = document.getElementById('btn-agregar-actividad');
    if (menuConfiguracion) menuConfiguracion.style.display = usuarioSesion.rol === 'maestro' ? 'none' : 'flex';
    if (menuActividades) menuActividades.style.display = usuarioSesion.rol === 'maestro' ? 'flex' : 'none';
    document.querySelectorAll('[data-admin-only]').forEach(tab => {
        tab.hidden = usuarioSesion.rol !== 'admin';
    });
    if (btnAgregarActividad) btnAgregarActividad.style.display = usuarioSesion.rol === 'admin' ? 'inline-flex' : 'none';
    gestionarPermisosHistorial();

    // Cargar tema preferido desde Supabase
    const temaPreferido = await cargarTemaPreferido(usuarioSesion.email);
    if (temaPreferido) {
        aplicarTema(temaPreferido);
    }

    // Verificar si es primer inicio (onboarding de temas)
    const onboardingTemas = localStorage.getItem('zoarkids_onboarding_temas') === 'true';
    if (!onboardingTemas) {
        setTimeout(mostrarModalBienvenidaTemas, 800);
    }

    // Actualizar UI del usuario - verificar existencia de elementos
    const nombreUsuario = document.getElementById('txt-nombre-usuario');
    if (nombreUsuario) nombreUsuario.textContent = usuarioSesion.nombre + ' (' + usuarioSesion.rol.toUpperCase() + ')';
    
    const avatarInicial = document.getElementById('avatar-inicial');
    if (avatarInicial) avatarInicial.textContent = usuarioSesion.nombre.charAt(0);
    
    const perfNombre = document.getElementById('perf-nombre');
    if (perfNombre) perfNombre.textContent = usuarioSesion.nombre;
    
    const perfCorreo = document.getElementById('perf-correo');
    if (perfCorreo) perfCorreo.textContent = usuarioSesion.email || usuarioSesion.nombre.toLowerCase() + '@iglesiazoarsv.org';
    
    const perfRol = document.getElementById('perf-rol');
    if (perfRol) perfRol.textContent = usuarioSesion.rol;

    // Procesar calendario y asignación
    await cargarTurnoProximoDomingo();
    procesarCalendario();
    const perfSeccion = document.getElementById('perf-seccion');
    if (perfSeccion) perfSeccion.textContent = seccionAsignadaMaestro || "Sin asignación";
    const botonSustituto = document.getElementById('btn-solicitar-sustituto');
    if (botonSustituto) {
        const puedeSolicitar = usuarioSesion.rol === 'maestro' &&
            Boolean(seccionAsignadaMaestro) &&
            seccionAsignadaMaestro !== 'admin_total';
        botonSustituto.hidden = !puedeSolicitar;
    }

    // Mostrar la zona de botones para TODOS los usuarios (Maestros y Admins)
const zonaAdmin = document.getElementById('zona-acciones-admin-asistencia');
if (zonaAdmin) {
    zonaAdmin.style.display = 'flex';

    // ============ CONTROL STRICTO DE BOTONES SEGÚN EL ROL ============
    
    // Evaluar si es Admin o Pastor
    const esAdmin = usuarioSesion && usuarioSesion.rol === "admin";

    // 1. Mostrar la barra de acciones
    const zonaAccionesAsistencia = document.getElementById('zona-acciones-admin-asistencia');
    if (zonaAccionesAsistencia) {
        zonaAccionesAsistencia.style.display = 'flex';
    }

    // 2. Control de visibilidad de botones específicos
    const btnVerTabla = document.getElementById('btn-ver-tabla-completa');
    const btnEditar = document.getElementById('btn-abrir-modal-editar-nino');
    const btnEliminar = document.getElementById('btn-abrir-modal-eliminar-nino');
    const btnInscribir = document.getElementById('btn-abrir-modal-nuevo-nino');
    const btnCumpleaneros = document.getElementById('btn-cumpleaneros');
    const btnCumpleanerosSinClase = document.getElementById('btn-cumpleaneros-sin-clase');
    if (btnInscribir) btnInscribir.style.display = '';
    if (btnCumpleaneros) btnCumpleaneros.style.display = '';
    if (btnCumpleanerosSinClase) btnCumpleanerosSinClase.style.display = '';

    if (usuarioSesion?.rol !== 'admin') {
        // MAESTROS (Entorno Real / Cuentas predeterminadas)
        if (btnVerTabla) btnVerTabla.style.display = 'none'; // NUNCA muestra "Ver Todos"
        if (btnEditar) btnEditar.style.display = 'none';     // Oculta Editar
        if (btnEliminar) btnEliminar.style.display = 'none'; // Oculta Eliminar
    } else {
        // ADMINISTRADORES Y PASTORES
        if (btnVerTabla) btnVerTabla.style.display = 'inline-block';
        if (btnEditar) btnEditar.style.display = 'inline-block';
        if (btnEliminar) btnEliminar.style.display = 'inline-block';
    }}

// Ocultar los botones de Editar y Eliminar para Maestros, dejando solo "Inscribir"
if (usuarioSesion?.rol !== 'admin') {
    const btnEditar = document.getElementById('btn-abrir-modal-editar-nino');
    const btnEliminar = document.getElementById('btn-abrir-modal-eliminar-nino');
    
    if (btnEditar) btnEditar.style.display = 'none';
    if (btnEliminar) btnEliminar.style.display = 'none';
}

    if (esClaveTemporal) {
        setTimeout(() => {
            abrirModalCambiarClave(true);
        }, 1000);
    }

    configurarNavegacion();
    configurarBotonTema();
    configurarVistasAdministrativas();
    await cargarConfiguracionHorario(false);
    if (usuarioSesion.rol === 'admin') {
        await actualizarBadgeFeedbackAdmin();
        window.timerFeedbackAdmin = setInterval(actualizarBadgeFeedbackAdmin, 60000);
    }
    await cargarAlumnosSegunRol();
    await verificarBloqueoSustituto();
    
    // Cargar dashboard inmediatamente
    cargarDashboard();
    cargarBiblioteca();
    cargarGaleria('todas');
    cargarChats();
    actualizarBadgeChat();
    clearInterval(intervaloBadgeChat);
    intervaloBadgeChat = setInterval(actualizarBadgeChat, 30000);
    document.getElementById('chat-input-imagen')?.addEventListener('change', enviarImagenChat);
    cargarActividadesMensuales();
    await revisarEventosImportantesAdmin();
    clearInterval(intervaloNotificacionesAdmin);
    intervaloNotificacionesAdmin = setInterval(revisarEventosImportantesAdmin, 30000);
    window.addEventListener('online', sincronizarCambiosOffline);
    window.addEventListener('online', () => {
        if (modoOffline && !sessionStorage.getItem('zk360_supabase_session')) {
            publicarEstadoColaOffline(true);
        }
    });
    window.addEventListener('offline', () => publicarEstadoColaOffline());
    await sincronizarCambiosOffline();
    publicarEstadoColaOffline(modoOffline && !sessionStorage.getItem('zk360_supabase_session'));

    if (!modoPrueba) { 
        await verificarOnboarding(); 
    } else {
        // ============ INICIALIZAR MODO PRUEBA ============
        console.log(' Modo Prueba detectado - Aplicando sin restricciones');
        
        // Cargar script de prueba si no está cargado
        if (typeof window.initModoPrueba === 'undefined') {
            try {
                // Verificar si el script ya existe
                let scriptExistente = document.querySelector('script[src*="prueba.js"]');
                if (!scriptExistente) {
                    const script = document.createElement('script');
                    script.src = 'prueba.js?v=' + Date.now();
                    script.onload = function() {
                        console.log(' script prueba.js cargado');
                        if (typeof window.initModoPrueba === 'function') {
                            window.initModoPrueba();
                        }
                    };
                    script.onerror = function() {
                        console.warn(' No se pudo cargar prueba.js, aplicando modo prueba manual');
                        aplicarModoPruebaManual();
                    };
                    document.head.appendChild(script);
                } else {
                    if (typeof window.initModoPrueba === 'function') {
                        window.initModoPrueba();
                    }
                }
            } catch (e) {
                console.warn(' Error cargando prueba.js, aplicando modo prueba manual', e);
                aplicarModoPruebaManual();
            }
        } else {
            window.initModoPrueba();
        }
    }

    iniciarTimerInactividad();

    // ============ OCULTAR HISTORIAL POR COMPLETO A MAESTROS ============
function gestionarPermisosHistorial() {
    const esAdmin = usuarioSesion && (usuarioSesion.rol === "admin" || usuarioSesion.rol === "pastor");
    const opcionMenuHistorial = document.querySelector('.menu-link[data-vista="historial"]');
    const moduloHistorial = document.getElementById('modulo-historial');

    if (opcionMenuHistorial) {
        opcionMenuHistorial.hidden = usuarioSesion?.rol === 'maestro' || !esAdmin;
        opcionMenuHistorial.style.display = opcionMenuHistorial.hidden ? 'none' : 'flex';
    }
    if (moduloHistorial) moduloHistorial.hidden = !esAdmin;
}

// Ejecutar al cargar la página
gestionarPermisosHistorial();
});

// ============ MODO PRUEBA MANUAL (FALLBACK) ============
function aplicarModoPruebaManual() {
    console.log('🧪 Aplicando modo prueba manual (sin restricciones)');
    
    // Desbloquear botón de asistencia
    const btnGuardar = document.getElementById('btn-guardar-asistencia-final');
    if (btnGuardar) {
        btnGuardar.disabled = false;
        btnGuardar.classList.remove('deshabilitado');
        btnGuardar.innerHTML = '<i class="fa-solid fa-flask"></i> Prueba: Reportar Asistencia';
    }
    
    // Desbloquear nueva lección
    document.querySelectorAll('#btn-nueva-leccion, #btn-nueva-leccion-inicio').forEach(btn => {
        if (btn) {
            btn.disabled = false;
            btn.title = 'Modo Prueba - Sin restricciones';
        }
    });
    
    // Desbloquear sustituto
    const btnSustituto = document.getElementById('btn-solicitar-sustituto');
    if (btnSustituto) {
        btnSustituto.disabled = false;
        btnSustituto.title = 'Modo Prueba - Sin restricciones';
    }
    
    // Mostrar indicador
    mostrarIndicadorPruebaManual();
    
    mostrarNotificacion('Modo Prueba activado: puedes explorar las funciones sin modificar datos reales.', 'info');
}

// ============ INDICADOR DE PRUEBA MANUAL ============
function mostrarIndicadorPruebaManual() {
    document.getElementById('indicador-modo-prueba')?.remove();
}

// ============ EXPORTAR FUNCIONES DE PRUEBA ============
window.desactivarModoPrueba = async function() {
    if (await confirmarAccion('¿Salir del modo prueba? Volverás a la pantalla de login.')) {
        sessionStorage.removeItem('zk360_modo_prueba');
        sessionStorage.removeItem('zk360_usuario_activo');
        const indicador = document.getElementById('indicador-modo-prueba');
        if (indicador) indicador.style.display = 'none';
        mostrarNotificacion('Saliendo del modo prueba...', 'warning');
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 500);
    }
};

// ============ ONBOARDING DEL SISTEMA ============
function iniciarOnboardingSistema() {
    const pasos = [
        { titulo: "Bienvenido a ZoarKids 360", descripcion: "Sistema de gestión para la Escuela Dominical de la Iglesia Zoar.", selector: null },
        { titulo: "Tu rol es " + (usuarioSesion ? usuarioSesion.rol : 'Maestro'), descripcion: "Explora las funciones disponibles según tu rol.", selector: null },
        { titulo: "Menú de navegación", descripcion: "Accede a todos los módulos desde el menú lateral.", selector: '.menu-items' },
        { titulo: "Dashboard", descripcion: "Visualiza estadísticas y reportes generales.", selector: '[data-vista="dashboard"]' }
    ];

    const backdrop = document.createElement('div');
    backdrop.className = 'onboarding-backdrop';
    backdrop.id = 'onboarding-backdrop-sistema';
    backdrop.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
        z-index: 9998; display: flex; justify-content: center; align-items: center;
    `;
    
    const tooltip = document.createElement('div');
    tooltip.className = 'onboarding-tooltip';
    tooltip.style.cssText = `
        background: var(--bg-card-main, #ffffff);
        border-radius: 16px; padding: 24px; max-width: 380px; width: 100%;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3); z-index: 10000;
        animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    `;
    
    tooltip.innerHTML = `
        <div class="tooltip-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <span class="tooltip-step" style="font-size:0.8rem; color:#747d8c; font-weight:600;">Paso 1 de ${pasos.length}</span>
            <button class="tooltip-close" onclick="cerrarOnboardingSistema()" style="background:none; border:none; font-size:1.4rem; cursor:pointer; color:#95a5a6;">&times;</button>
        </div>
        <div class="tooltip-body">
            <h3 style="font-size:1.2rem; margin-bottom:8px; color:#1e3799;">${pasos[0].titulo}</h3>
            <p style="color:#747d8c; font-size:0.95rem; line-height:1.5;">${pasos[0].descripcion}</p>
        </div>
        <div class="tooltip-footer" style="display:flex; justify-content:space-between; align-items:center; margin-top:16px; gap:10px;">
            <button class="btn-secondary" onclick="cerrarOnboardingSistema()" style="background:#cbd5e1; color:#2c3e50; border:none; padding:8px 20px; border-radius:12px; font-weight:600; cursor:pointer;">Omitir</button>
            <button class="btn-primary" onclick="siguientePasoOnboardingSistema()" style="background:linear-gradient(135deg, #11998e, #38ef7d); color:white; border:none; padding:8px 20px; border-radius:12px; font-weight:600; cursor:pointer;">Siguiente <i class="fas fa-arrow-right"></i></button>
        </div>
    `;
    
    backdrop.appendChild(tooltip);
    document.body.appendChild(backdrop);
    
    window.onboardingPasos = pasos;
    window.onboardingPaso = 0;
}

function siguientePasoOnboardingSistema() {
    const pasos = window.onboardingPasos;
    const paso = window.onboardingPaso + 1;

    if (paso >= pasos.length) {
        cerrarOnboardingSistema();
        return;
    }

    window.onboardingPaso = paso;
    const tooltip = document.querySelector('.onboarding-tooltip');
    if (tooltip) {
        tooltip.querySelector('.tooltip-step').textContent = `Paso ${paso + 1} de ${pasos.length}`;
        tooltip.querySelector('.tooltip-body h3').textContent = pasos[paso].titulo;
        tooltip.querySelector('.tooltip-body p').textContent = pasos[paso].descripcion;
    }
}

function cerrarOnboardingSistema() {
    const backdrop = document.getElementById('onboarding-backdrop-sistema');
    if (backdrop) backdrop.remove();
    localStorage.setItem('zoarkids_onboarding_sistema', 'true');
}

window.cerrarOnboardingSistema = cerrarOnboardingSistema;
window.siguientePasoOnboardingSistema = siguientePasoOnboardingSistema;

// ============ VERIFICAR TURNO DEL MAESTRO - CORREGIDO ============
function verificarTurnoMaestro() {
    if (!seccionAsignadaMaestro || seccionAsignadaMaestro === "admin_total") {
        return false;
    }
    
    const claveFecha = calcularProximoDomingo();
    const turno = cronogramaOficial2026[claveFecha];
    if (!turno) return false;
    
    const nombreLower = (usuarioSesion.nombre || '').toLocaleLowerCase('es').trim();
    const parejaLower = usuarioSesion.pareja
        ? usuarioSesion.pareja.toLocaleLowerCase('es').trim()
        : '';

    if (seccionAsignadaMaestro === 'infancia') {
        const nombresInfancia = (turno.pi || '').toLocaleLowerCase('es').split(' y ').map(n => n.trim());
        return nombresInfancia.includes(nombreLower) || (parejaLower && nombresInfancia.includes(parejaLower));
    }

    if (seccionAsignadaMaestro === 'medianos') {
        return (turno.me || '').toLocaleLowerCase('es').trim() === nombreLower;
    }

    if (seccionAsignadaMaestro === 'grandes') {
        return (turno.gr || '').toLocaleLowerCase('es').trim() === nombreLower;
    }

    return false;
}

// ============ EASTER EGG - 15 CLICS ============
function iniciarEasterEgg() {
    return;
}

// ============ CONFIGURAR NAVEGACIÓN ============
function configurarNavegacion() {
    document.querySelectorAll('.menu-link[data-vista]').forEach(link => {
        link.addEventListener('click', function() {
            const vista = this.dataset.vista;
            activarVistaPestaña(vista, this);
        });
    });
    document.querySelectorAll('[data-config-tab]').forEach(button => {
        button.addEventListener('click', function() {
            activarPestanaConfiguracion(this.dataset.configTab, this);
        });
    });

    const triggerMenu = document.getElementById('trigger-menu');
    if (triggerMenu) {
        triggerMenu.addEventListener('click', function(e) {
            e.stopPropagation();
            const menu = document.getElementById('menu-lateral');
            if (menu) menu.classList.toggle('abierto');
        });
    }

    document.addEventListener('click', function(e) {
        const menu = document.getElementById('menu-lateral');
        const trigger = document.getElementById('trigger-menu');
        if (window.innerWidth <= 768 && menu && menu.classList.contains('abierto')) {
            if (!menu.contains(e.target) && !trigger.contains(e.target)) {
                menu.classList.remove('abierto');
            }
        }
    });

    const perfilWrapper = document.getElementById('wrapper-perfil-click');
    if (perfilWrapper) {
        perfilWrapper.addEventListener('click', function(e) {
            e.stopPropagation();
            const dropdown = document.getElementById('desplegable-usuario');
            if (dropdown) dropdown.classList.toggle('activo');
        });
    }

    document.addEventListener('click', () => {
        const dropdown = document.getElementById('desplegable-usuario');
        if (dropdown) dropdown.classList.remove('activo');
    });

    const triggerInfo = document.getElementById('trigger-info-app');
    if (triggerInfo) {
        triggerInfo.addEventListener('click', () => {
            const modal = document.getElementById('pantalla-modal-creditos');
            if (modal) modal.classList.add('activo');
        });
    }

    const btnCerrarModal = document.getElementById('btn-cerrar-modal-click');
    if (btnCerrarModal) {
        btnCerrarModal.addEventListener('click', () => {
            const modal = document.getElementById('pantalla-modal-creditos');
            if (modal) modal.classList.remove('activo');
        });
    }

    const btnLogout = document.getElementById('btn-logout-click');
    if (btnLogout) {
        btnLogout.addEventListener('click', function() {
            mostrarNotificacion('Cerrando sesión...', 'warning');
            setTimeout(() => { window.cerrarSesion(); }, 3000);
        });
    }

    const btnAyuda = document.getElementById('btn-pedir-ayuda');
    if (btnAyuda) {
        btnAyuda.addEventListener('click', function() {
            const ayudaLink = document.querySelector('[data-vista="ayuda"]');
            if (ayudaLink) ayudaLink.click();
            const dropdown = document.getElementById('desplegable-usuario');
            if (dropdown) dropdown.classList.remove('activo');
        });
    }

    // Eventos de asistencia
    const btnGuardarAsistencia = document.getElementById('btn-guardar-asistencia-final');
    if (btnGuardarAsistencia) {
        btnGuardarAsistencia.addEventListener('click', function() {
            if (this.disabled) { mostrarNotificacion("La ventana de asistencia está cerrada.", "warning"); return; }
            enviarAsistenciaSupabase();
        });
    }
    document.getElementById('btn-modificar-asistencia')?.addEventListener('click', solicitarModificacionAsistencia);
    document.getElementById('btn-cancelar-modificacion-asistencia')?.addEventListener('click', () => {
        document.getElementById('modal-motivo-modificacion-asistencia')?.classList.remove('activo');
    });
    document.getElementById('btn-confirmar-modificacion-asistencia')?.addEventListener('click', () => {
        if (usuarioSesion?.rol !== 'maestro') return;
        const motivo = document.getElementById('motivo-modificacion-asistencia')?.value.trim() || '';
        if (!motivo) {
            mostrarNotificacion('Escribe el motivo de la modificación.', 'warning');
            document.getElementById('motivo-modificacion-asistencia')?.focus();
            return;
        }
        habilitarModificacionAsistencia(motivo);
    });

    const btnVerTabla = document.getElementById('btn-ver-tabla-completa');
    if (btnVerTabla) {
        btnVerTabla.addEventListener('click', function() {
            if (modoPrueba) return;
            modoAdminVerTodos = !modoAdminVerTodos;
            this.textContent = modoAdminVerTodos ? 'Ver Mi Sección' : 'Ver Todos';
            this.style.background = modoAdminVerTodos ? '#2ecc71' : '#6c5ce7';
            cargarAlumnosSegunRol();
        });
    }

    const btnCumpleaneros = document.getElementById('btn-cumpleaneros');
    if (btnCumpleaneros) btnCumpleaneros.addEventListener('click', mostrarCumpleaneros);
    
    const btnCumpleanerosSinClase = document.getElementById('btn-cumpleaneros-sin-clase');
    if (btnCumpleanerosSinClase) btnCumpleanerosSinClase.addEventListener('click', mostrarCumpleaneros);

    // MODALES ALUMNOS
    const btnNuevoNino = document.getElementById('btn-abrir-modal-nuevo-nino');
    const abrirRegistroNino = () => {
            const modal = document.getElementById('modal-registro-niño');
            if (modal) modal.classList.add('activo');
            const input = document.getElementById('reg-nombre');
            if (input) input.focus();
    };
    if (btnNuevoNino) btnNuevoNino.addEventListener('click', abrirRegistroNino);
    const btnInscribirSinClase = document.getElementById('btn-inscribir-sin-clase');
    if (btnInscribirSinClase) btnInscribirSinClase.addEventListener('click', abrirRegistroNino);

    const btnCancelarNino = document.getElementById('btn-cancelar-nino-modal');
    if (btnCancelarNino) btnCancelarNino.addEventListener('click', cerrarModalRegistro);

    const btnEditarNino = document.getElementById('btn-abrir-modal-editar-nino');
    if (btnEditarNino) {
        btnEditarNino.addEventListener('click', () => {
            const modal = document.getElementById('modal-buscar-editar');
            if (modal) modal.classList.add('activo');
            const input = document.getElementById('txt-codigo-buscar-edit');
            if (input) input.focus();
        });
    }

    const btnCerrarEdit = document.getElementById('btn-cerrar-busq-edit');
    if (btnCerrarEdit) btnCerrarEdit.addEventListener('click', cerrarModalEditar);

    const btnEliminarNino = document.getElementById('btn-abrir-modal-eliminar-nino');
    if (btnEliminarNino) {
        btnEliminarNino.addEventListener('click', () => {
            const modal = document.getElementById('modal-eliminar-alumno');
            if (modal) modal.classList.add('activo');
            const input = document.getElementById('txt-codigo-buscar-del');
            if (input) input.focus();
        });
    }

    const btnCerrarDel = document.getElementById('btn-cerrar-busq-del');
    if (btnCerrarDel) btnCerrarDel.addEventListener('click', cerrarModalEliminar);

    const formRegistro = document.getElementById('form-registro-alumno');
    if (formRegistro) {
        formRegistro.addEventListener('submit', async function(e) {
            e.preventDefault();
            await registrarNuevoAlumno(this);
        });
    }

    const formEdicion = document.getElementById('form-edicion-campos-nino');
    if (formEdicion) {
        formEdicion.addEventListener('submit', async function(e) {
            e.preventDefault();
            await actualizarAlumno(this);
        });
    }

    // ENTER EN MODALES
    document.querySelectorAll('.modal-overlay input, .modal-overlay textarea, .modal-overlay select').forEach(el => {
        el.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                const modal = this.closest('.modal-overlay');
                if (modal) {
                    const btnSubmit = modal.querySelector('button[type="submit"], .btn-enviar-clase:not(.btn-cancelar)');
                    if (btnSubmit) btnSubmit.click();
                }
            }
        });
    });

    // BIBLIOTECA - Botón Nueva Lección
    const btnNuevaLeccion = document.getElementById('btn-nueva-leccion');
    if (btnNuevaLeccion) {
        btnNuevaLeccion.addEventListener('click', function() {
            const estaEnTurno = verificarTurnoMaestro();
            if (!estaEnTurno) {
                mostrarNotificacion('Solo puedes preinscribir lecciones si estás de turno en la clase del domingo en curso.', 'warning');
                return;
            }
            abrirFormularioLeccion();
        });
    }

    // BIBLIOTECA - Botón Solicitar Sustituto
    const btnSustituto = document.getElementById('btn-solicitar-sustituto');
    if (btnSustituto) {
        btnSustituto.addEventListener('click', abrirSolicitarSustituto);
    }

    // GALERÍA
    const formSubirFoto = document.getElementById('form-subir-foto');
    if (formSubirFoto) {
        formSubirFoto.addEventListener('submit', async function(e) {
            e.preventDefault();
            await subirFotoGaleria(this);
        });
    }

    // CHAT
    const chatBuscar = document.getElementById('chat-buscar');
    if (chatBuscar) {
        chatBuscar.addEventListener('input', function() {
            buscarContactos(this.value);
        });
    }

    const btnAgregarContacto = document.getElementById('btn-agregar-contacto');
    if (btnAgregarContacto) btnAgregarContacto.addEventListener('click', abrirAgregarContacto);

    // SUGERENCIAS
    const txtAyuda = document.getElementById('txt-ayuda-mensaje');
    if (txtAyuda) {
        txtAyuda.addEventListener('input', function() {
            const contador = document.getElementById('contador-caracteres');
            const max = 500;
            const actual = this.value.length;
            if (contador) {
                contador.textContent = actual + '/' + max;
                contador.style.color = actual > max ? '#ff7675' : '#95a5a6';
            }
            if (actual > max) { this.style.borderColor = '#ff7675'; } 
            else { this.style.borderColor = '#dfe4ea'; }
        });
    }

    // HISTORIAL
    const filtroHistorial = document.getElementById('input-filtro-historial');
    if (filtroHistorial) {
        filtroHistorial.addEventListener('input', function() {
            const termino = this.value.toLowerCase().trim();
            const resultados = document.getElementById('resultados-historial');
            const tabla = document.getElementById('tabla-logs-cuerpo');
            const btnLimpiar = document.getElementById('btn-limpiar-historial');
            if (btnLimpiar) btnLimpiar.style.display = termino ? 'inline-flex' : 'none';
            if (termino) {
                let logs = [];
                try {
                    const guardados = JSON.parse(localStorage.getItem('zk360_historial') || '[]');
                    if (Array.isArray(guardados)) logs = guardados;
                } catch (error) {
                    console.error('No se pudo leer el historial para filtrar:', error);
                }
                const filtrados = logs.filter(log => [log.usuario, log.accion, log.fecha]
                    .some(valor => String(valor || '').toLocaleLowerCase('es').includes(termino)));
                if (filtrados.length === 0) {
                    if (resultados) resultados.innerHTML = '<p style="color:#95a5a6; text-align:center; padding:15px;">No se encontraron resultados</p>';
                    if (tabla) tabla.style.display = 'none';
                    return;
                }
                if (resultados) {
                    resultados.replaceChildren();
                    filtrados.slice(0, 30).forEach(log => {
                        const tarjeta = document.createElement('div');
                        tarjeta.style.cssText = 'padding:10px 12px; border-bottom:1px solid #eef2f7; font-size:13px; background:white; border-radius:8px; margin-bottom:4px;';
                        const usuario = document.createElement('strong');
                        usuario.style.color = '#1e3799';
                        usuario.textContent = log.usuario || '';
                        const accion = document.createElement('span');
                        accion.style.color = '#2c3e50';
                        accion.textContent = ` - ${log.accion || ''}`;
                        const fecha = document.createElement('span');
                        fecha.style.cssText = 'color:#95a5a6; font-size:11px; display:block; margin-top:3px;';
                        fecha.textContent = log.fecha || '';
                        tarjeta.append(usuario, accion, fecha);
                        resultados.appendChild(tarjeta);
                    });
                }
                if (tabla) tabla.style.display = 'none';
            } else {
                if (resultados) resultados.replaceChildren();
                if (tabla) tabla.style.display = 'table';
                cargarHistorial();
            }
        });
    }

    const btnLimpiarHistorial = document.getElementById('btn-limpiar-historial');
    if (btnLimpiarHistorial) {
        btnLimpiarHistorial.addEventListener('click', function() {
            const input = document.getElementById('input-filtro-historial');
            if (input) input.value = '';
            this.style.display = 'none';
            const resultados = document.getElementById('resultados-historial');
            if (resultados) resultados.innerHTML = '';
            const tabla = document.getElementById('tabla-logs-cuerpo');
            if (tabla) tabla.style.display = 'table';
            const btnLimpiar = document.getElementById('btn-limpiar-historial');
            if (btnLimpiar) btnLimpiar.style.display = 'none';
            cargarHistorial();
        });
    }

    // CAMPANA DE NOTIFICACIONES
    const btnNotificaciones = document.getElementById('btn-notificaciones');
    if (btnNotificaciones) btnNotificaciones.addEventListener('click', window.abrirNotificaciones);

    // REVERTIR PRUEBA
    const btnRevertir = document.getElementById('btn-revertir-prueba');
    if (btnRevertir) {
        btnRevertir.addEventListener('click', function() {
            if (usuarioSesion.rol === 'admin') {
                seleccionarRolPrueba('maestro_con_clase');
            } else if (usuarioSesion.seccion) {
                seleccionarRolPrueba('maestro_sin_clase');
            } else {
                seleccionarRolPrueba('maestro_con_clase');
            }
        });
    }

    // CERRAR MODALES DE AYUDA
    const btnCerrarSugerencia = document.getElementById('btn-cerrar-sugerencia-modal');
    if (btnCerrarSugerencia) {
        btnCerrarSugerencia.addEventListener('click', function() {
            const modal = document.getElementById('modal-sugerencia');
            if (modal) modal.classList.remove('activo');
        });
    }

    const btnCerrarReporte = document.getElementById('btn-cerrar-reporte-modal');
    if (btnCerrarReporte) {
        btnCerrarReporte.addEventListener('click', function() {
            const modal = document.getElementById('modal-reporte-error');
            if (modal) modal.classList.remove('activo');
        });
    }

    // EASTER EGG
    setTimeout(iniciarEasterEgg, 500);
}

// ============ SOLICITAR SUSTITUTO (REPARADO Y SIEMPRE VISIBLE) ============

function validarElegibilidadSustituto() {
    const dia = new Date().getDay();
    const diasPermitidos = [1, 2];
    if (!diasPermitidos.includes(dia)) {
        const nombresDias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
        const permitidos = diasPermitidos.map(diaPermitido => nombresDias[diaPermitido]).join(' y ');
        mostrarNotificacion(`Solo puedes solicitar sustituto ${permitidos ? `los ${permitidos}` : 'en los días autorizados'}.`, 'warning');
        return false;
    }
    if (usuarioSesion?.rol !== 'maestro') {
        mostrarNotificacion('Solo los maestros pueden solicitar sustituto.', 'warning');
        return false;
    }
    if (!seccionAsignadaMaestro ||
        ['admin_total', 'sin asignación'].includes(String(seccionAsignadaMaestro).trim().toLocaleLowerCase('es'))) {
        mostrarNotificacion('No tienes una clase asignada.', 'warning');
        return false;
    }
    if (!verificarTurnoMaestro()) {
        mostrarNotificacion('No apareces en el cronograma del próximo domingo.', 'warning');
        return false;
    }
    return true;
}

async function abrirSolicitarSustituto() {
    if (!validarElegibilidadSustituto()) return;
    const bloqueo = await verificarBloqueoSustituto();
    if (bloqueo.bloqueado) {
        mostrarNotificacion(bloqueo.mensaje, 'warning');
        return;
    }
    const modal = document.getElementById('modal-sustituto');
    if (!modal) {
        mostrarNotificacion('No se encontró el modal de sustitutos.', 'error');
        return;
    }
    modal.classList.add('activo');
    modal.style.display = 'flex';
    await cargarMaestrosLibres();
}

async function cargarMaestrosLibres() {
    const lista = document.getElementById('lista-sustitutos');
    if (!lista) return;
    lista.replaceChildren();
    const cargando = document.createElement('p');
    cargando.style.cssText = 'text-align:center;padding:20px';
    cargando.textContent = 'Cargando maestros...';
    lista.appendChild(cargando);
    try {
        const fecha = calcularProximoDomingo();
        const registros = await llamarSupabase('sustituciones?fecha_domingo=eq.' + encodeURIComponent(fecha) + '&select=*');
        const usuarios = await llamarSupabase('usuarios?rol=eq.maestro&select=*');
        if (!registros || !usuarios) throw new Error('No se pudieron consultar las sustituciones o los maestros.');

        const rechazados = registros.filter(r => r.estado === 'rechazada').map(r => r.receptor_email);
        const ocupados = registros.filter(r => ['pendiente', 'aceptada', 'aceptada_parcial'].includes(r.estado)).map(r => r.receptor_email);
        const noDisponibles = new Set([...rechazados, ...ocupados]);
        const esPrimeraInfancia = seccionAsignadaMaestro === 'infancia';
        const parejaNombre = esPrimeraInfancia && usuarioSesion.pareja ? usuarioSesion.pareja.toLocaleLowerCase('es') : '';
        const disponibles = usuarios.filter(u => {
            const noEsUsuario = u.email !== usuarioSesion.email;
            const noEsPareja = !parejaNombre || (u.nombre || '').toLocaleLowerCase('es') !== parejaNombre;
            const libre = !u.seccion;
            return noEsUsuario && noEsPareja && libre && !noDisponibles.has(u.email);
        });
        window.maestrosLibresSustituto = disponibles;

        if (esPrimeraInfancia && !window.solicitudParejaSustituto?.modo) {
            lista.replaceChildren();
            const aviso = document.createElement('p');
            aviso.style.cssText = 'font-size:13px;color:#747d8c';
            aviso.textContent = 'Se solicitará primero la confirmación de tu pareja. Escribe el motivo para continuar.';
            const motivo = document.createElement('textarea');
            motivo.id = 'motivo-sustituto';
            motivo.rows = 3;
            motivo.maxLength = 500;
            motivo.placeholder = 'Motivo (mínimo 10 caracteres)';
            motivo.style.cssText = 'width:100%;padding:9px;border:1px solid #dfe4ea;border-radius:8px;resize:none;';
            const boton = document.createElement('button');
            boton.className = 'btn-primary';
            boton.textContent = 'Solicitar confirmación a mi pareja';
            boton.addEventListener('click', confirmarSolicitudInternaPareja);
            lista.append(aviso, motivo, boton);
            return;
        }
        if (!disponibles.length) {
            lista.replaceChildren();
            const aviso = document.createElement('p');
            aviso.style.cssText = 'text-align:center;padding:15px;color:#747d8c';
            aviso.textContent = 'No hay maestros libres para esta fecha.';
            lista.appendChild(aviso);
            return;
        }

        const contenedor = document.createElement('div');
        contenedor.style.marginTop = '10px';
        disponibles.forEach(usuario => {
            const fila = document.createElement('div');
            fila.style.cssText = 'padding:12px;border-bottom:1px solid #eef2f7;display:flex;justify-content:space-between;align-items:center;gap:12px;';
            const identidad = document.createElement('div');
            const nombre = document.createElement('strong');
            nombre.textContent = usuario.nombre || '';
            const correo = document.createElement('p');
            correo.style.cssText = 'font-size:12px;color:#95a5a6;margin:2px 0';
            correo.textContent = usuario.email || '';
            identidad.append(nombre, correo);
            const boton = document.createElement('button');
            boton.className = 'btn-primary';
            boton.textContent = 'Solicitar';
            boton.addEventListener('click', () => abrirFormularioSolicitud(usuario.email));
            fila.append(identidad, boton);
            contenedor.appendChild(fila);
        });
        lista.replaceChildren(contenedor);
    } catch (error) {
        console.error('Error cargando sustitutos:', error);
        lista.replaceChildren();
        const aviso = document.createElement('p');
        aviso.style.cssText = 'text-align:center;padding:20px;color:#ff7675';
        aviso.textContent = 'Error al cargar maestros disponibles.';
        lista.appendChild(aviso);
    }
}

function abrirFormularioSolicitud(email) {
    const lista = document.getElementById('lista-sustitutos');
    if (!lista) return;

    const tarjeta = document.createElement('div');
    tarjeta.style.cssText = 'background:#f8f9fa;border:1px solid #eef2f7;border-radius:12px;padding:16px;';
    const titulo = document.createElement('p');
    titulo.style.cssText = 'margin:0 0 8px;font-weight:700;color:#1e3799;';
    titulo.textContent = `Solicitud para: ${email}`;
    const label = document.createElement('label');
    label.htmlFor = 'motivo-sustituto';
    label.style.cssText = 'display:block;font-weight:600;margin:12px 0 5px';
    label.textContent = 'Motivo';
    const textarea = document.createElement('textarea');
    textarea.id = 'motivo-sustituto';
    textarea.rows = 4;
    textarea.maxLength = 500;
    textarea.required = true;
    textarea.placeholder = 'Escribe el motivo de la solicitud...';
    textarea.style.cssText = 'width:100%;padding:9px;border:1px solid #dfe4ea;border-radius:8px; resize:vertical;';
    const acciones = document.createElement('div');
    acciones.style.cssText = 'display:flex; justify-content:flex-end; gap:8px; margin-top:12px; flex-wrap:wrap;';
    const cancelar = document.createElement('button');
    cancelar.type = 'button';
    cancelar.className = 'btn-cerrar-modal btn-cancelar';
    cancelar.textContent = 'Cancelar';
    cancelar.addEventListener('click', cargarMaestrosLibres);
    const enviar = document.createElement('button');
    enviar.type = 'button';
    enviar.className = 'btn-primary';
    enviar.textContent = 'Enviar';
    enviar.addEventListener('click', () => seleccionarSustituto(email));
    acciones.append(cancelar, enviar);
    tarjeta.append(titulo, label, textarea, acciones);
    lista.replaceChildren(tarjeta);

    textarea.focus();
}

async function seleccionarSustituto(email) {
    if (!validarElegibilidadSustituto()) return;
    const motivoEl = document.getElementById('motivo-sustituto');
    const motivo = motivoEl ? motivoEl.value.trim() : '';
    if (motivo.length < 10) {
        mostrarNotificacion('Escribe un motivo de al menos 10 caracteres.', 'warning');
        if (motivoEl) motivoEl.focus();
        return;
    }
    if (parejasRechazadas.includes(email)) {
        mostrarNotificacion('Este maestro ya rechazó una solicitud para esta fecha.', 'warning');
        return;
    }
    const bloqueo = await verificarBloqueoSustituto();
    if (bloqueo.bloqueado) {
        mostrarNotificacion(bloqueo.mensaje, 'warning');
        return;
    }
    try {
        const fecha = calcularProximoDomingo();
        const registro = await llamarSupabase('sustituciones', {
            method: 'POST',
            body: JSON.stringify({
                solicitante_email: usuarioSesion.email,
                solicitante_nombre: usuarioSesion.nombre,
                receptor_email: email,
                fecha_domingo: fecha,
                seccion: seccionAsignadaMaestro,
                motivo,
                estado: 'pendiente',
                tipo: 'individual',
                expira_en: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString()
            })
        });
        if (!registro) throw new Error('No se pudo guardar la solicitud.');
        if (!modoPrueba && !modoOffline && navigator.onLine) {
            void enviarPushChat(
                email,
                `${usuarioSesion.nombre} solicita cobertura para el domingo ${mostrarFechaLegible(fecha)}. Motivo: ${motivo}`,
                'Solicitud de sustitución'
            );
        }
        const modal = document.getElementById('modal-sustituto');
        if (modal) modal.classList.remove('activo');
        const btn = document.getElementById('btn-solicitar-sustituto');
        if (btn) { btn.disabled = true; btn.title = 'Solicitud pendiente de respuesta'; }
        mostrarNotificacion('Solicitud de sustitución enviada. El maestro elegido recibirá la solicitud.', 'success');
        registrarNotificacionImportante({
            id: `sustitucion-enviada-${registro[0]?.id || registro.id || Date.now()}`,
            mensaje: 'Solicitud de sustitución enviada',
            detalle: `Para ${mostrarFechaLegible(fecha)} · ${seccionAsignadaMaestro}.`,
            tipo: 'success'
        });
        await guardarLog({
            usuario: usuarioSesion.nombre,
            accion: `Solicitó sustituto para ${mostrarFechaLegible(fecha)} (${seccionAsignadaMaestro})`,
            fecha: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error enviando solicitud:', error);
        mostrarNotificacion('No se pudo enviar la solicitud.', 'error');
    }
}

async function transferirClase(email, turno, claveSeccion, nuevosNombres) {
    try {
        // La forma de objeto se usa al aceptar solicitudes persistidas; se conservan
        // los argumentos anteriores para compatibilidad con llamadas existentes.
        const solicitud = email && typeof email === 'object' ? email : null;
        const fecha = solicitud ? solicitud.fecha_domingo : calcularProximoDomingo();
        const seccion = solicitud ? solicitud.seccion : seccionAsignadaMaestro;
        const mapa = { infancia: 'pi', medianos: 'me', grandes: 'gr' };
        const clave = solicitud ? mapa[seccion] : claveSeccion;
        const cronograma = turno || cronogramaOficial2026[fecha];
        if (!cronograma || !clave) throw new Error('No se encontró la asignación del cronograma.');

        let receptores = [];
        if (solicitud) {
            if (solicitud.grupo_id) {
                const grupo = await llamarSupabase('sustituciones?grupo_id=eq.' + encodeURIComponent(solicitud.grupo_id) + '&select=*');
                if (!grupo || grupo.length !== 2 || grupo.some(r => r.estado !== 'aceptada')) return false;
                receptores = grupo;
            } else {
                receptores = [solicitud];
            }
            const usuarios = await Promise.all(receptores.map(r => llamarSupabase('usuarios?email=eq.' + encodeURIComponent(r.receptor_email))));
            if (usuarios.some(u => !u || !u.length)) throw new Error('No se encontraron todos los sustitutos.');
            const nombresBase = (cronograma[clave] || '').split(' y ').map(n => n.trim());
            if (solicitud.grupo_id) {
                nuevosNombres = usuarios.map(u => u[0].nombre);
            } else {
                const origen = (solicitud.solicitante_nombre || '').toLocaleLowerCase('es');
                const indice = nombresBase.findIndex(n => n.toLocaleLowerCase('es') === origen);
                if (indice >= 0) nombresBase[indice] = usuarios[0][0].nombre;
                else if (nombresBase.length === 1) nombresBase[0] = usuarios[0][0].nombre;
                else nombresBase.push(usuarios[0][0].nombre);
                nuevosNombres = nombresBase;
            }
        }

        const actualizado = await llamarSupabase('cronograma?fecha=eq.' + encodeURIComponent(fecha), {
            method: 'PATCH',
            body: JSON.stringify({ [clave]: Array.isArray(nuevosNombres) ? nuevosNombres.join(' y ') : nuevosNombres })
        });
        if (actualizado === null) throw new Error('No se pudo actualizar el cronograma.');
        cronograma[clave] = Array.isArray(nuevosNombres) ? nuevosNombres.join(' y ') : nuevosNombres;

        if (solicitud) {
            for (const r of receptores) {
                await llamarSupabase('usuarios?email=eq.' + encodeURIComponent(r.receptor_email), {
                    method: 'PATCH', body: JSON.stringify({ seccion })
                });
            }
            const solicitantes = new Set(receptores.flatMap(r => [r.solicitante_email, r.pareja_email].filter(Boolean)));
            for (const solicitanteEmail of solicitantes) {
                await llamarSupabase('usuarios?email=eq.' + encodeURIComponent(solicitanteEmail), {
                    method: 'PATCH', body: JSON.stringify({ seccion: null })
                });
            }
            for (const r of receptores) {
                await llamarSupabase('sustituciones?id=eq.' + encodeURIComponent(r.id), {
                    method: 'PATCH', body: JSON.stringify({ estado: 'aceptada', aceptada_en: new Date().toISOString() })
                });
            }
            mostrarNotificacion('Sustitución aceptada y asignación transferida.', 'success');
        } else {
            await llamarSupabase('cronograma?fecha=eq.' + encodeURIComponent(fecha), {
                method: 'PATCH', body: JSON.stringify({ [clave]: nuevosNombres.join(' y ') })
            });
        }
        await verificarBloqueoSustituto();
        setTimeout(() => window.location.reload(), 1200);
        return true;
    } catch (error) {
        console.error('Error transfiriendo clase:', error);
        mostrarNotificacion('No se pudo transferir la asignación.', 'error');
        return false;
    }
}

async function confirmarSolicitudInternaPareja() {
    if (!validarElegibilidadSustituto()) return;
    const motivoEl = document.getElementById('motivo-sustituto');
    const motivo = motivoEl ? motivoEl.value.trim() : '';
    if (motivo.length < 10) {
        mostrarNotificacion('Escribe un motivo de al menos 10 caracteres.', 'warning');
        return;
    }
    if (seccionAsignadaMaestro !== 'infancia' || !usuarioSesion.pareja) {
        mostrarNotificacion('Esta confirmación solo aplica a Primera Infancia con pareja registrada.', 'error');
        return;
    }
    try {
        let pareja = typeof obtenerUsuarioPorNombre === 'function' ? await obtenerUsuarioPorNombre(usuarioSesion.pareja) : null;
        if (!pareja) {
            const resultado = await llamarSupabase('usuarios?nombre=eq.' + encodeURIComponent(usuarioSesion.pareja));
            pareja = resultado && resultado[0];
        }
        if (!pareja || !pareja.email) throw new Error('No se encontró el correo de tu pareja.');
        const resultado = await llamarSupabase('sustituciones', {
            method: 'POST',
            body: JSON.stringify({
                solicitante_email: usuarioSesion.email,
                solicitante_nombre: usuarioSesion.nombre,
                receptor_email: pareja.email,
                pareja_email: pareja.email,
                fecha_domingo: calcularProximoDomingo(),
                seccion: 'infancia',
                motivo,
                estado: 'confirmacion_pareja',
                tipo: 'confirmacion_pareja',
                expira_en: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString()
            })
        });
        if (!resultado) throw new Error('No se pudo guardar la confirmación.');
        const modal = document.getElementById('modal-sustituto');
        if (modal) modal.classList.remove('activo');
        const btn = document.getElementById('btn-solicitar-sustituto');
        if (btn) { btn.disabled = true; btn.title = 'Esperando confirmación de tu pareja'; }
        mostrarNotificacion('Solicitud enviada a tu pareja.', 'success');
        if (!modoPrueba && !modoOffline && navigator.onLine) {
            void enviarPushChat(
                pareja.email,
                `${usuarioSesion.nombre} solicita tu confirmación para cubrir Primera Infancia el domingo ${mostrarFechaLegible(calcularProximoDomingo())}.`,
                'Solicitud de sustitución'
            );
        }
        registrarNotificacionImportante({
            id: `sustitucion-pareja-${resultado[0]?.id || resultado.id || Date.now()}`,
            mensaje: 'Solicitud enviada a tu pareja',
            detalle: `Para confirmar la cobertura del domingo ${mostrarFechaLegible(calcularProximoDomingo())}.`,
            tipo: 'success'
        });
        await guardarLog({
            usuario: usuarioSesion.nombre,
            accion: `Solicitó sustituto con su pareja para ${mostrarFechaLegible(calcularProximoDomingo())}`,
            fecha: new Date().toISOString()
        });
    } catch (error) {
        console.error(error);
        mostrarNotificacion(error.message || 'No se pudo solicitar confirmación.', 'error');
    }
}

async function seleccionarModoSustitutoPareja(modo) {
    const solicitud = window.solicitudParejaSustituto;
    if (seccionAsignadaMaestro !== 'infancia' || !solicitud || modo !== 'ambos') return;
    window.solicitudParejaSustituto.modo = modo;
    const modal = document.getElementById('modal-sustituto');
    if (modal) modal.classList.add('activo');
    await cargarMaestrosLibres();
    const lista = document.getElementById('lista-sustitutos');
    if (!lista) return;
    const disponibles = window.maestrosLibresSustituto || [];
    lista.replaceChildren();
    const cabecera = document.createElement('p');
    cabecera.style.fontWeight = '600';
    cabecera.textContent = modo === 'solo'
        ? 'Selecciona un sustituto para la solicitud.'
        : 'Elijan dos maestros distintos para cubrir Primera Infancia.';
    lista.appendChild(cabecera);
    const crearSelector = (id, etiqueta) => {
        const label = document.createElement('label');
        label.htmlFor = id;
        label.style.cssText = 'display:block;margin:10px 0 4px';
        label.textContent = etiqueta;
        const select = document.createElement('select');
        select.id = id;
        select.style.cssText = 'width:100%;padding:9px;border:1px solid #dfe4ea;border-radius:8px';
        const opcionInicial = document.createElement('option');
        opcionInicial.value = '';
        opcionInicial.textContent = 'Selecciona un maestro';
        select.appendChild(opcionInicial);
        disponibles.forEach(usuario => {
            const opcion = document.createElement('option');
            opcion.value = usuario.email;
            opcion.textContent = `${usuario.nombre} (${usuario.email})`;
            select.appendChild(opcion);
        });
        lista.append(label, select);
    };
    crearSelector('sustituto-pareja-a', modo === 'ambos' ? 'Sustituto del solicitante' : 'Maestro sustituto');
    if (modo === 'ambos') crearSelector('sustituto-pareja-b', 'Sustituto de la pareja');
    const motivoLabel = document.createElement('label');
    motivoLabel.htmlFor = 'motivo-sustituto';
    motivoLabel.style.cssText = 'display:block;margin:10px 0 4px';
    motivoLabel.textContent = 'Motivo (mínimo 10 caracteres)';
    const motivo = document.createElement('textarea');
    motivo.id = 'motivo-sustituto';
    motivo.rows = 3;
    motivo.style.cssText = 'width:100%;padding:9px;border:1px solid #dfe4ea;border-radius:8px';
    motivo.value = solicitud.motivo || '';
    const enviar = document.createElement('button');
    enviar.type = 'button';
    enviar.className = 'btn-primary';
    enviar.style.marginTop = '10px';
    enviar.textContent = modo === 'ambos' ? 'Enviar ambas solicitudes' : 'Enviar solicitud';
    enviar.addEventListener('click', async () => {
        const select = document.getElementById('sustituto-pareja-a');
        if (modo === 'ambos') {
            await enviarSolicitudDoble();
            return;
        }
        if (!select?.value || motivo.value.trim().length < 10) {
            mostrarNotificacion('Selecciona un maestro y escribe un motivo de al menos 10 caracteres.', 'warning');
            return;
        }
        await seleccionarSustituto(select.value);
    });
    lista.append(motivoLabel, motivo, enviar);
}

async function enviarSolicitudDoble() {
    if (!validarElegibilidadSustituto()) return;
    if (seccionAsignadaMaestro !== 'infancia') {
        mostrarNotificacion('La solicitud en pareja solo aplica a maestros de Primera Infancia.', 'error');
        return;
    }
    const selectA = document.getElementById('sustituto-pareja-a');
    const selectB = document.getElementById('sustituto-pareja-b');
    const motivoEl = document.getElementById('motivo-sustituto');
    const motivo = motivoEl ? motivoEl.value.trim() : '';
    if (!selectA || !selectB || !selectA.value || !selectB.value) {
        mostrarNotificacion('Seleccionen dos maestros sustitutos.', 'warning');
        return;
    }
    if (selectA.value === selectB.value) {
        mostrarNotificacion('Los sustitutos deben ser distintos. Cambia una selección.', 'error');
        return;
    }
    if (motivo.length < 10) {
        mostrarNotificacion('Escribe un motivo de al menos 10 caracteres.', 'warning');
        return;
    }
    const bloqueo = await verificarBloqueoSustituto();
    if (bloqueo.bloqueado) { mostrarNotificacion(bloqueo.mensaje, 'warning'); return; }
    const original = window.solicitudParejaSustituto;
    if (!original) { mostrarNotificacion('No existe una confirmación de pareja activa.', 'error'); return; }
    try {
        const grupoId = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : 'pareja-' + Date.now() + '-' + Math.random().toString(36).slice(2);
        const parejaEmail = original.pareja_email || original.receptor_email;
        const datos = [
            { solicitante_email: original.solicitante_email, solicitante_nombre: original.solicitante_nombre, pareja_email: parejaEmail, receptor_email: selectA.value, fecha_domingo: original.fecha_domingo, seccion: 'infancia', motivo, estado: 'pendiente', tipo: 'pareja', grupo_id: grupoId, expira_en: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString() },
            { solicitante_email: original.solicitante_email, solicitante_nombre: usuarioSesion.nombre, pareja_email: parejaEmail, receptor_email: selectB.value, fecha_domingo: original.fecha_domingo, seccion: 'infancia', motivo, estado: 'pendiente', tipo: 'pareja', grupo_id: grupoId, expira_en: new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString() }
        ];
        const respuesta = await llamarSupabase('sustituciones', { method: 'POST', body: JSON.stringify(datos) });
        if (!respuesta) throw new Error('No se pudieron enviar las dos solicitudes.');
        await llamarSupabase('sustituciones?id=eq.' + encodeURIComponent(original.id), { method: 'PATCH', body: JSON.stringify({ estado: 'pareja_confirmada' }) });
        const modal = document.getElementById('modal-sustituto');
        if (modal) modal.classList.remove('activo');
        mostrarNotificacion('Las dos solicitudes fueron enviadas. La operación se cancelará si alguna se rechaza o expira.', 'success');
        if (!modoPrueba && !modoOffline && navigator.onLine) {
            await Promise.all([selectA.value, selectB.value].map(email =>
                enviarPushChat(
                    email,
                    `Solicitud de cobertura de Primera Infancia para el domingo ${mostrarFechaLegible(original.fecha_domingo)}. Responde en un plazo de 5 horas.`,
                    'Solicitud de sustitución'
                )
            ));
        }
        registrarNotificacionImportante({
            id: `sustitucion-doble-${grupoId}`,
            mensaje: 'Solicitudes de sustitución enviadas',
            detalle: `Dos maestros cubrirán Primera Infancia el domingo ${mostrarFechaLegible(original.fecha_domingo)}.`,
            tipo: 'success'
        });
        await guardarLog({
            usuario: usuarioSesion.nombre,
            accion: `Solicitó sustitutos para Primera Infancia (${mostrarFechaLegible(original.fecha_domingo)})`,
            fecha: new Date().toISOString()
        });
        const btn = document.getElementById('btn-solicitar-sustituto');
        if (btn) { btn.disabled = true; btn.title = 'Solicitudes de pareja pendientes'; }
    } catch (error) {
        console.error(error);
        mostrarNotificacion(error.message || 'No se pudieron enviar las solicitudes.', 'error');
    }
}

async function verificarBloqueoSustituto() {
    const fecha = calcularProximoDomingo();
    const vacio = { bloqueado: false, mensaje: '', asignacion: null };
    try {
        const registros = await llamarSupabase('sustituciones?fecha_domingo=eq.' + encodeURIComponent(fecha) + '&select=*');
        if (!registros) return { bloqueado: true, mensaje: 'No se pudo verificar el estado de las solicitudes.' };
        const ahora = Date.now();
        const gruposExpirados = new Set();
        for (const r of registros) {
            if (['pendiente', 'confirmacion_pareja', 'pareja_confirmada', 'aceptada_parcial'].includes(r.estado) && r.expira_en && new Date(r.expira_en).getTime() <= ahora) {
                if (r.grupo_id) gruposExpirados.add(r.grupo_id);
                else await llamarSupabase('sustituciones?id=eq.' + encodeURIComponent(r.id), { method: 'PATCH', body: JSON.stringify({ estado: 'expirada' }) });
            }
        }
        for (const grupoId of gruposExpirados) {
            await llamarSupabase('sustituciones?grupo_id=eq.' + encodeURIComponent(grupoId), { method: 'PATCH', body: JSON.stringify({ estado: 'cancelada', cancelada_en: new Date().toISOString() }) });
        }
        const vigentes = registros.filter(r => !((r.expira_en && new Date(r.expira_en).getTime() <= ahora) || (r.grupo_id && gruposExpirados.has(r.grupo_id))));
        const email = usuarioSesion && usuarioSesion.email;
        const aceptadaComoReceptor = vigentes.find(r => r.receptor_email === email && r.estado === 'aceptada');
        const aceptadaComoSolicitante = vigentes.find(r => (r.solicitante_email === email || r.pareja_email === email) && r.estado === 'aceptada');
        const pendientePropia = vigentes.find(r => (r.solicitante_email === email || r.pareja_email === email) && ['pendiente', 'confirmacion_pareja', 'pareja_confirmada', 'aceptada_parcial'].includes(r.estado));

        if (aceptadaComoReceptor) {
            seccionAsignadaMaestro = aceptadaComoReceptor.seccion;
            const nombres = { infancia: 'pi', medianos: 'me', grandes: 'gr' };
            const destino = document.getElementById('docente-' + nombres[aceptadaComoReceptor.seccion]);
            if (destino) destino.textContent = usuarioSesion.nombre;
        }

        // Ofrece respuesta accionable al receptor para solicitudes pendientes.
        window.responderSolicitudSustituto = async function(id, aceptar) {
            const fila = registros.find(r => String(r.id) === String(id));
            if (!fila || fila.receptor_email !== usuarioSesion.email) return;
            if (!aceptar) {
                if (fila.grupo_id) {
                    await llamarSupabase('sustituciones?grupo_id=eq.' + encodeURIComponent(fila.grupo_id), { method: 'PATCH', body: JSON.stringify({ estado: 'cancelada', rechazado_por: usuarioSesion.email }) });
                } else {
                    await llamarSupabase('sustituciones?id=eq.' + encodeURIComponent(fila.id), { method: 'PATCH', body: JSON.stringify({ estado: 'rechazada', respondida_en: new Date().toISOString() }) });
                }
                parejasRechazadas.push(fila.solicitante_email);
                mostrarNotificacion('Solicitud rechazada. El solicitante puede volver a intentarlo.', 'info');
                const tarjeta = document.getElementById('aviso-sustitucion-entrante');
                if (tarjeta) tarjeta.remove();
                return;
            }
            if (fila.tipo === 'confirmacion_pareja') {
                await llamarSupabase('sustituciones?id=eq.' + encodeURIComponent(fila.id), { method: 'PATCH', body: JSON.stringify({ estado: 'pareja_confirmada', confirmada_en: new Date().toISOString() }) });
                window.solicitudParejaSustituto = fila;
                const tarjeta = document.getElementById('aviso-sustitucion-entrante');
                if (tarjeta) tarjeta.remove();
                const modal = document.getElementById('modal-sustituto');
                const lista = document.getElementById('lista-sustitutos');
                if (modal && lista) {
                    modal.classList.add('activo');
                    const mensaje = document.createElement('p');
                    mensaje.textContent = 'Confirmaste la solicitud. Seleccionen dos maestros para notificar a ambos integrantes de la pareja sustituta.';
                    const ambos = document.createElement('button');
                    ambos.className = 'btn-primary';
                    ambos.textContent = 'Seleccionar pareja sustituta';
                    ambos.addEventListener('click', () => seleccionarModoSustitutoPareja('ambos'));
                    lista.replaceChildren(mensaje, ambos);
                }
                return;
            }
            if (fila.grupo_id) {
                await llamarSupabase('sustituciones?id=eq.' + encodeURIComponent(fila.id), { method: 'PATCH', body: JSON.stringify({ estado: 'aceptada', aceptada_en: new Date().toISOString() }) });
                const grupo = await llamarSupabase('sustituciones?grupo_id=eq.' + encodeURIComponent(fila.grupo_id) + '&select=*');
                const tarjeta = document.getElementById('aviso-sustitucion-entrante');
                if (tarjeta) tarjeta.remove();
                if (grupo && grupo.length === 2 && grupo.every(r => r.estado === 'aceptada')) await transferirClase(fila, null, null, null, null);
                else mostrarNotificacion('Aceptaste. La asignación se confirma cuando acepte el segundo maestro.', 'success');
                return;
            }
            await llamarSupabase('sustituciones?id=eq.' + encodeURIComponent(fila.id), { method: 'PATCH', body: JSON.stringify({ estado: 'aceptada', aceptada_en: new Date().toISOString() }) });
            const tarjeta = document.getElementById('aviso-sustitucion-entrante');
            if (tarjeta) tarjeta.remove();
            await transferirClase({ ...fila, estado: 'aceptada' }, null, null, null, null);
        };

        window.responderConfirmacionPareja = async function(id, aceptar) {
            return window.responderSolicitudSustituto(id, aceptar);
        };
        const entrante = vigentes.find(r => r.receptor_email === email && ['pendiente', 'confirmacion_pareja'].includes(r.estado));
        if (entrante) {
            registrarNotificacionImportante({
                id: `sustitucion-recibida-${entrante.id}`,
                mensaje: entrante.tipo === 'confirmacion_pareja'
                    ? 'Tu pareja solicita confirmar la cobertura'
                    : 'Nueva solicitud de sustitución',
                detalle: `${entrante.solicitante_nombre || 'Un maestro'} · domingo ${mostrarFechaLegible(entrante.fecha_domingo)} · ${entrante.motivo || 'Sin motivo indicado'}`,
                tipo: 'info'
            });
        }
        if (entrante && !document.getElementById('aviso-sustitucion-entrante')) {
            const aviso = document.createElement('div');
            aviso.id = 'aviso-sustitucion-entrante';
            aviso.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:11000;max-width:380px;background:white;padding:16px;border-radius:14px;box-shadow:0 8px 30px #0003';
            const titulo = document.createElement('strong');
            titulo.textContent = entrante.tipo === 'confirmacion_pareja' ? 'Confirmación de pareja' : 'Solicitud de sustitución';
            const detalle = document.createElement('p');
            detalle.textContent = `${entrante.solicitante_nombre || 'Un maestro'} solicita cobertura para ${entrante.fecha_domingo}. Motivo: ${entrante.motivo || 'No indicado'}`;
            const aceptar = document.createElement('button');
            aceptar.className = 'btn-primary';
            aceptar.textContent = 'Aceptar';
            aceptar.addEventListener('click', () => window.responderSolicitudSustituto(entrante.id, true));
            const rechazar = document.createElement('button');
            rechazar.className = 'btn-admin btn-danger';
            rechazar.style.marginLeft = '8px';
            rechazar.textContent = 'Rechazar';
            rechazar.addEventListener('click', () => window.responderSolicitudSustituto(entrante.id, false));
            aviso.append(titulo, detalle, aceptar, rechazar);
            document.body.appendChild(aviso);
        }
        if (typeof window.timerVerificacionSustituciones === 'undefined') {
            window.timerVerificacionSustituciones = setInterval(() => verificarBloqueoSustituto(), 60000);
        }

        const btn = document.getElementById('btn-solicitar-sustituto');
        if (btn) {
            btn.disabled = Boolean(aceptadaComoReceptor || aceptadaComoSolicitante || pendientePropia);
            btn.title = aceptadaComoReceptor ? 'Ya aceptaste cubrir esta clase' : pendientePropia ? 'Solicitud pendiente de respuesta' : aceptadaComoSolicitante ? 'Ya delegaste esta clase para este domingo' : '';
        }
        if (aceptadaComoReceptor) return { bloqueado: true, mensaje: 'Ya aceptaste cubrir esta clase', asignacion: aceptadaComoReceptor };
        if (aceptadaComoSolicitante) return { bloqueado: true, mensaje: 'Ya delegaste esta clase para este domingo.' };
        if (pendientePropia) return { bloqueado: true, mensaje: 'Ya tienes una solicitud pendiente sin respuesta.' };
        return vacio;
    } catch (error) {
        console.error('Error verificando sustituciones:', error);
        return { bloqueado: true, mensaje: 'No se pudo verificar el estado de las solicitudes.' };
    }
}

// ============ BANDEJA DE LECCIONES PENDIENTES (ADMIN) ============
async function abrirBandejaLecciones() {
    if (usuarioSesion?.rol !== 'admin') {
        mostrarNotificacion('Solo el administrador puede acceder a la bandeja de lecciones.', 'warning');
        return;
    }
    activarVistaPestaña('bandeja-lecciones', document.getElementById('menu-configuracion'));
}

async function cargarLeccionesPendientes() {
    const container = document.getElementById('contenido-bandeja-lecciones');
    if (!container) return;
    
    try {
        const lecciones = await llamarSupabase("lecciones?estado=eq.pre-inscripcion&order=id.desc");
        if (!lecciones || lecciones.length === 0) {
            container.innerHTML = '<p style="color:#95a5a6; text-align:center; padding:20px;">No hay lecciones pendientes de revisión</p>';
            return;
        }
        
        const nombresSeccion = { 'infancia': 'Primera Infancia', 'medianos': 'Medianos', 'grandes': 'Grandes' };
        
        container.innerHTML = lecciones.map(l => `
            <div style="background:#f8f9fa; border-radius:12px; padding:15px; margin-bottom:10px; border-left:4px solid #f39c12;">
                <div style="display:flex; justify-content:space-between; align-items:start;">
                    <div>
                        <h4 style="margin:0; color:#1e3799;">${l.titulo}</h4>
                        <p style="margin:4px 0; font-size:13px; color:#555;"><i class="fas fa-user"></i> ${l.autor}</p>
                        <p style="margin:4px 0; font-size:12px; color:#747d8c;">${nombresSeccion[l.seccion] || l.seccion} - ${new Date(l.fecha_domingo).toLocaleDateString()}</p>
                    </div>
                    <span class="badge-estado badge-preinscripcion"><i class="fas fa-clock"></i> Pendiente</span>
                </div>
                <div style="margin-top:10px; display:flex; gap:8px; flex-wrap:wrap;">
                    <button class="btn-admin" onclick="abrirCompletarLeccionAdmin(${l.id})" style="background:#2ecc71;">
                        <i class="fas fa-check-double"></i> Revisar y Publicar
                    </button>
                    <button class="btn-admin btn-danger" onclick="eliminarLeccion(${l.id})">
                        <i class="fas fa-trash"></i> Eliminar
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error("Error:", error);
        container.innerHTML = '<p style="color:#ff7675; text-align:center; padding:20px;">Error al cargar lecciones pendientes</p>';
    }
}

async function abrirCompletarLeccionAdmin(id) {
    try {
        const lecciones = await llamarSupabase('lecciones?id=eq.' + id);
        if (!lecciones || lecciones.length === 0) {
            mostrarNotificacion("Lección no encontrada", "error");
            return;
        }
        const l = lecciones[0];
        
        const modal = document.createElement('div');
        modal.id = 'modal-completar-admin';
        modal.className = 'modal-overlay activo';
        modal.style.zIndex = '9999';
        modal.innerHTML = `
            <div class="modal-burbuja" style="max-width:550px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <h3><i class="fas fa-check-double"></i> Publicar Lección</h3>
                    <button onclick="this.closest('.modal-overlay').remove()" style="background:none; border:none; font-size:24px; cursor:pointer; color:#95a5a6;">&times;</button>
                </div>
                <form id="form-completar-admin">
                    <div style="margin-bottom:12px;">
                        <label style="font-weight:bold; display:block; margin-bottom:4px;">Título</label>
                        <input type="text" value="${l.titulo}" disabled style="width:100%; padding:8px; border:1px solid #dfe4ea; border-radius:8px; background:#f8f9fa;">
                    </div>
                    <div style="margin-bottom:12px;">
                        <label style="font-weight:bold; display:block; margin-bottom:4px;">Resumen Oficial <span style="color:#ff7675;">*</span></label>
                        <textarea id="admin-resumen" rows="3" style="width:100%; padding:8px; border:1px solid #dfe4ea; border-radius:8px;" placeholder="Escribe el resumen oficial de la clase..." required>${l.resumen_admin || ''}</textarea>
                    </div>
                    <div style="margin-bottom:12px;">
                        <label style="font-weight:bold; display:block; margin-bottom:4px;">Portada</label>
                        <input type="file" id="admin-portada" accept="image/*" style="width:100%; padding:8px; border:1px solid #dfe4ea; border-radius:8px;">
                    </div>
                    <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:15px;">
                        <button type="button" onclick="this.closest('.modal-overlay').remove()" class="btn-cerrar-modal btn-cancelar">Cancelar</button>
                        <button type="submit" class="btn-enviar-clase" style="background:#2ecc71;">Publicar Lección</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
        
        document.getElementById('form-completar-admin').addEventListener('submit', async function(e) {
            e.preventDefault();
            await publicarLeccionAdmin(id);
        });
        
    } catch (error) {
        console.error("Error:", error);
        mostrarNotificacion("Error al cargar la lección", "error");
    }
}

async function publicarLeccionAdmin(id) {
    const resumen = document.getElementById('admin-resumen').value.trim();
    if (!resumen) {
        mostrarNotificacion("Escribe el resumen oficial de la lección", "error");
        return;
    }
    
    let portadaSubida = null;
    const portadaFile = document.getElementById('admin-portada').files[0];
    try {
        if (portadaFile) portadaSubida = await subirArchivoStorage('lecciones', portadaFile);
        const datosActualizar = {
            resumen_admin: resumen,
            estado: 'publicada',
            publicado_en: new Date().toISOString()
        };
        if (portadaSubida) datosActualizar.portada = portadaSubida.url;
        
        const resultado = await llamarSupabase('lecciones?id=eq.' + id, {
            method: "PATCH",
            body: JSON.stringify(datosActualizar)
        });
        if (!resultado) throw new Error('No se pudo guardar la publicación de la lección.');
        portadaSubida = null;
        
        mostrarNotificacion("Lección publicada exitosamente", "success");
        document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
        cargarBiblioteca();
        await guardarLog({
            usuario: usuarioSesion.nombre,
            accion: 'Publicó la lección en la biblioteca',
            fecha: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error:", error);
        if (portadaSubida) await eliminarArchivosStorage([portadaSubida]);
        mostrarNotificacion(error.message || "Error al publicar la lección", "error");
    }
}

// ============ DASHBOARD OPTIMIZADO ============
async function cargarDashboard() {
    if (cacheDashboard && cacheTimestamp && (Date.now() - cacheTimestamp) < CACHE_TTL) {
        renderizarDashboard(cacheDashboard);
        actualizarDashboardBackground();
        return;
    }
    
    try {
        const [alumnos, usuarios, asistencia] = await Promise.all([
            cargarAlumnos(),
            llamarSupabase("usuarios?rol=eq.maestro"),
            llamarSupabase("asistencia?select=alumno_id,fecha&order=fecha.desc&limit=100")
        ]);
        
        const data = {
            alumnos: alumnos || [],
            usuarios: usuarios || [],
            asistencia: asistencia || []
        };
        
        cacheDashboard = data;
        cacheTimestamp = Date.now();
        sessionStorage.setItem('zk360_cache_dashboard', JSON.stringify(data));
        sessionStorage.setItem('zk360_cache_timestamp', cacheTimestamp.toString());
        
        renderizarDashboard(data);
    } catch (error) {
        console.error("Error cargando dashboard:", error);
        const cached = sessionStorage.getItem('zk360_cache_dashboard');
        if (cached) {
            renderizarDashboard(JSON.parse(cached));
            mostrarNotificacion("Usando datos en caché", "info");
            actualizarDashboardBackground();
        } else {
            mostrarNotificacion("Error al cargar estadísticas", "error");
        }
    }
}

// ============ RENDERIZAR DASHBOARD - CORREGIDO ============
function renderizarDashboard(data) {
    const { alumnos, usuarios } = data;
    
    // Total Alumnos
    const statAlumnos = document.getElementById('stat-alumnos');
    if (statAlumnos) statAlumnos.textContent = alumnos.length || 0;
    
    // ASISTENCIA PROMEDIO - CORREGIDO
    // El promedio NO debe ser mayor a 100%
    let totalAsistencia = 0;
    let alumnosConDatos = 0;
    
    alumnos.forEach(a => {
        if (a.clases_totales !== undefined && a.clases_totales !== null) {
            totalAsistencia += a.clases_totales;
            alumnosConDatos++;
        }
    });
    
    // Promedio: suma de clases totales / cantidad de alumnos que tienen datos
    // Si el total de alumnos es 6 y cada uno tiene 6 clases, el promedio es 6 (no 217%)
    let promedio = 0;
    if (alumnosConDatos > 0) {
        promedio = Math.round(totalAsistencia / alumnosConDatos);
    }
    
    const statAsistencia = document.getElementById('stat-asistencia');
    if (statAsistencia) statAsistencia.textContent = promedio + '%';
    
    // Clases del mes - CORREGIDO (número de domingos en el mes)
    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const añoActual = hoy.getFullYear();
    let clasesMes = 0;
    const ultimoDia = new Date(añoActual, mesActual + 1, 0);
    for (let d = 1; d <= ultimoDia.getDate(); d++) {
        const fecha = new Date(añoActual, mesActual, d);
        if (fecha.getDay() === 0) clasesMes++;
    }
    const statClases = document.getElementById('stat-clases');
    if (statClases) statClases.textContent = clasesMes;
    
    // Maestros activos
    const statMaestros = document.getElementById('stat-maestros');
    if (statMaestros) statMaestros.textContent = usuarios ? usuarios.length : 0;
    
    // Renderizar barras de asistencia por sección - CORREGIDO
    renderizarBarrasAsistencia(alumnos);
    renderizarTopAsistencia(alumnos);
}

// ============ BARRAS DE ASISTENCIA POR SECCIÓN - CORREGIDO ============
function renderizarBarrasAsistencia(alumnos) {
    const secciones = ['infancia', 'medianos', 'grandes'];
    const nombres = { 'infancia': 'Primera Infancia', 'medianos': 'Medianos', 'grandes': 'Grandes' };
    const colores = { 'infancia': 'verde', 'medianos': 'naranja', 'grandes': 'rojo' };
    const contenedor = document.getElementById('barras-asistencia');
    if (!contenedor) return;
    
    contenedor.innerHTML = '';

    for (const sec of secciones) {
        const alumnosSec = alumnos.filter(a => a.seccion === sec);
        const totalSec = alumnosSec.length;
        let totalClasesSec = 0;
        
        alumnosSec.forEach(a => {
            totalClasesSec += a.clases_totales || 0;
        });
        
        // PROMEDIO CORRECTO: total de clases / total de alumnos de esa sección
        let promSec = 0;
        if (totalSec > 0) {
            promSec = Math.round(totalClasesSec / totalSec);
        }
        
        // Limitar a 100% para visualización
        const porcentajeVisual = Math.min(promSec, 100);
        
        contenedor.innerHTML += `
            <div style="margin:6px 0;">
                <div style="display:flex; justify-content:space-between; font-size:13px;">
                    <span>${nombres[sec]}</span>
                    <span>${promSec}%</span>
                </div>
                <div class="barra-container">
                    <div class="barra-progreso ${colores[sec]}" style="width:${porcentajeVisual}%;"></div>
                </div>
            </div>
        `;
    }
}

// ============ TOP ASISTENCIA ============
function renderizarTopAsistencia(alumnos) {
    const secciones = ['infancia', 'medianos', 'grandes'];
    const nombres = { 'infancia': 'Primera Infancia', 'medianos': 'Medianos', 'grandes': 'Grandes' };
    const container = document.getElementById('top-asistencia-container');
    if (!container) return;
    container.innerHTML = '';
    
    for (const sec of secciones) {
        const alumnosSec = alumnos.filter(a => a.seccion === sec);
        const ordenados = alumnosSec.sort((a, b) => (b.clases_totales || 0) - (a.clases_totales || 0));
        const top = ordenados.slice(0, 3);
        
        let topHtml = `<div class="top-col"><h5><i class="fas fa-medal"></i> ${nombres[sec]}</h5>`;
        
        if (top.length === 0) {
            topHtml += '<p style="color:#95a5a6; font-size:12px;">Sin datos</p>';
        } else {
            topHtml += top.map((a, i) => `
                <div class="top-item">
                    <span>${i+1}. ${a.nombre_completo}</span>
                    <span style="color:#2575fc; font-weight:bold;">${a.clases_totales || 0}</span>
                </div>
            `).join('');
        }
        
        topHtml += '</div>';
        container.innerHTML += topHtml;
    }
}

async function actualizarDashboardBackground() {
    try {
        const [alumnos, usuarios] = await Promise.all([
            cargarAlumnos(),
            llamarSupabase("usuarios?rol=eq.maestro")
        ]);
        const data = { alumnos: alumnos || [], usuarios: usuarios || [] };
        cacheDashboard = data;
        cacheTimestamp = Date.now();
        sessionStorage.setItem('zk360_cache_dashboard', JSON.stringify(data));
        sessionStorage.setItem('zk360_cache_timestamp', cacheTimestamp.toString());
    } catch (error) {
        console.error("Error actualizando dashboard:", error);
    }
}

// ============ ACTIVIDADES MENSUALES ============
async function cargarActividadesMensuales() {
    const container = document.getElementById('actividades-mensuales');
    if (!container) return;

    container.replaceChildren();
    try {
        const hoy = new Date();
        const mesActual = hoy.getMonth() + 1;
        const añoActual = hoy.getFullYear();
        const primerDia = `${añoActual}-${String(mesActual).padStart(2, '0')}-01`;
        const siguienteMes = new Date(añoActual, mesActual, 1);
        const limiteMes = `${siguienteMes.getFullYear()}-${String(siguienteMes.getMonth() + 1).padStart(2, '0')}-01`;
        const actividades = await llamarSupabase(
            `eventos_calendario?fecha=gte.${primerDia}&fecha=lt.${limiteMes}&order=fecha.asc`
        );
        const alumnos = await cargarAlumnos();
        const cumpleaneros = (Array.isArray(alumnos) ? alumnos : []).filter(alumno => {
            const fechaNacimiento = String(alumno.fecha_nacimiento || alumno.nacimiento || '');
            return /^\d{4}-\d{2}-\d{2}$/.test(fechaNacimiento) &&
                Number(fechaNacimiento.slice(5, 7)) === mesActual;
        });
        const crearSeccion = (titulo, icono) => {
            const seccion = document.createElement('section');
            seccion.className = 'actividad-mes-seccion';
            const encabezado = document.createElement('h4');
            const i = document.createElement('i');
            i.className = `fa-solid ${icono}`;
            encabezado.append(i, document.createTextNode(` ${titulo}`));
            seccion.appendChild(encabezado);
            return seccion;
        };
        const mostrarFecha = fecha => {
            const partes = String(fecha || '').split('-').map(Number);
            if (partes.length < 3 || !partes[2]) return 'Fecha por confirmar';
            return `${partes[2]} de ${new Date(partes[0], partes[1] - 1, partes[2]).toLocaleString('es', { month: 'long' })}`;
        };
        const obtenerEstadoFecha = fecha => {
            const [anio, mes, dia] = String(fecha || '').split('-').map(Number);
            if (!anio || !mes || !dia) return null;
            const fechaEvento = new Date(anio, mes - 1, dia);
            const hoyLocal = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
            const diferencia = Math.round((fechaEvento - hoyLocal) / 86400000);
            if (diferencia < 0) return { texto: 'Ya pasó', clase: 'fecha-actividad-pasada' };
            if (diferencia === 0) return { texto: 'Es hoy', clase: 'fecha-actividad-hoy' };
            return { texto: `Faltan ${diferencia} días`, clase: 'fecha-actividad-futura' };
        };

        if (cumpleaneros.length) {
            const seccion = crearSeccion('Cumpleaños del mes', 'fa-cake-candles');
            cumpleaneros
                .sort((a, b) => {
                    const fechaA = String(a.fecha_nacimiento || a.nacimiento || '');
                    const fechaB = String(b.fecha_nacimiento || b.nacimiento || '');
                    return Number(fechaA.slice(8, 10)) - Number(fechaB.slice(8, 10));
                })
                .forEach(alumno => {
                    const fila = document.createElement('div');
                    fila.className = 'actividad-mes-fila';
                    const nombre = document.createElement('span');
                    nombre.textContent = alumno.nombre_completo || 'Alumno';
                    const fecha = document.createElement('time');
                    fecha.textContent = mostrarFecha(alumno.fecha_nacimiento || alumno.nacimiento);
                    fila.append(nombre, fecha);
                    seccion.appendChild(fila);
                });
            container.appendChild(seccion);
        }

        const eventosDelMes = Array.isArray(actividades) ? actividades : [];
        if (eventosDelMes.length) {
            const seccion = crearSeccion('Actividades del mes', 'fa-calendar-check');
            eventosDelMes.forEach(evento => {
                const fila = document.createElement('article');
                fila.className = 'actividad-mes-fila';
                const contenido = document.createElement('div');
                const titulo = document.createElement('strong');
                titulo.textContent = evento.titulo || 'Actividad';
                contenido.appendChild(titulo);
                if (evento.descripcion) {
                    const descripcion = document.createElement('p');
                    descripcion.textContent = evento.descripcion;
                    contenido.appendChild(descripcion);
                }
                const fecha = document.createElement('time');
                fecha.textContent = mostrarFecha(evento.fecha);
                fila.append(contenido, fecha);
                const estadoFecha = obtenerEstadoFecha(evento.fecha);
                if (estadoFecha) {
                    const indicador = document.createElement('span');
                    indicador.className = `estado-fecha-actividad ${estadoFecha.clase}`;
                    indicador.textContent = estadoFecha.texto;
                    fila.appendChild(indicador);
                }
                if (usuarioSesion?.rol === 'admin') {
                    const acciones = document.createElement('div');
                    acciones.className = 'acciones-actividad-admin';
                    const editar = document.createElement('button');
                    editar.type = 'button';
                    editar.className = 'btn-admin';
                    editar.textContent = 'Editar';
                    editar.addEventListener('click', () => abrirEdicionActividad(evento));
                    const eliminar = document.createElement('button');
                    eliminar.type = 'button';
                    eliminar.className = 'btn-admin btn-danger';
                    eliminar.textContent = 'Eliminar';
                    eliminar.addEventListener('click', () => eliminarActividadMensual(evento.id));
                    acciones.append(editar, eliminar);
                    fila.appendChild(acciones);
                }
                seccion.appendChild(fila);
            });
            container.appendChild(seccion);
        }

        if (!cumpleaneros.length && !eventosDelMes.length) {
            const vacio = document.createElement('p');
            vacio.className = 'actividad-mes-vacio';
            vacio.textContent = 'No hay cumpleaños ni actividades programadas para este mes.';
            container.appendChild(vacio);
        }
    } catch (error) {
        console.error("Error cargando actividades:", error);
        const aviso = document.createElement('p');
        aviso.className = 'actividad-mes-vacio';
        aviso.textContent = navigator.onLine
            ? 'No se pudieron cargar las actividades. Intenta de nuevo.'
            : 'No hay una copia de las actividades disponible sin conexión.';
        container.replaceChildren(aviso);
    }
}

async function crearActividadMensual() {
    if (usuarioSesion?.rol !== 'admin') {
        mostrarNotificacion('Solo el administrador puede agregar actividades.', 'error');
        return;
    }
    const titulo = document.getElementById('act-titulo').value.trim();
    const descripcion = document.getElementById('act-descripcion').value.trim();
    const fecha = document.getElementById('act-fecha').value;
    const tipo = document.getElementById('act-tipo').value;
    
    if (!titulo || !fecha) {
        mostrarNotificacion('Título y fecha son obligatorios', 'error');
        return;
    }
    
    const estabaEditando = Boolean(eventoEditandoId);
    try {
        const guardado = await llamarSupabase(
            eventoEditandoId
                ? `eventos_calendario?id=eq.${encodeURIComponent(eventoEditandoId)}`
                : 'eventos_calendario',
            {
            method: eventoEditandoId ? 'PATCH' : 'POST',
            body: JSON.stringify({ titulo, descripcion, fecha, tipo, creado_por: usuarioSesion.nombre })
        });
        if (!guardado) throw new Error('No se confirmó el guardado de la actividad.');
        
        mostrarNotificacion(estabaEditando ? 'Actividad actualizada exitosamente' : 'Actividad creada exitosamente', 'success');
        const modal = document.getElementById('modal-nueva-actividad');
        if (modal) modal.classList.remove('activo');
        const formActividad = document.getElementById('form-nueva-actividad');
        if (formActividad) formActividad.reset();
        eventoEditandoId = null;
        const encabezado = modal?.querySelector('h3');
        if (encabezado) encabezado.innerHTML = '<i class="fa-solid fa-calendar-plus"></i> Agregar actividad';
        const botonGuardar = formActividad?.querySelector('button[type="submit"]');
        if (botonGuardar) botonGuardar.textContent = 'Guardar actividad';
        cargarActividadesMensuales();
        await guardarLog({
            usuario: usuarioSesion.nombre,
            accion: `${estabaEditando ? 'Actualizó' : 'Creó'} actividad "${titulo}"`,
            fecha: new Date().toISOString()
        });
    } catch (error) {
        console.error("Error:", error);
        mostrarNotificacion('Error al crear la actividad', 'error');
    }
}

function abrirEdicionActividad(evento) {
    if (usuarioSesion?.rol !== 'admin') return;
    eventoEditandoId = evento.id;
    document.getElementById('act-titulo').value = evento.titulo || '';
    document.getElementById('act-descripcion').value = evento.descripcion || '';
    document.getElementById('act-fecha').value = String(evento.fecha || '').slice(0, 10);
    document.getElementById('act-tipo').value = evento.tipo || 'evento';
    const modal = document.getElementById('modal-nueva-actividad');
    const encabezado = modal?.querySelector('h3');
    if (encabezado) encabezado.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Editar actividad';
    const botonGuardar = document.getElementById('form-nueva-actividad')?.querySelector('button[type="submit"]');
    if (botonGuardar) botonGuardar.textContent = 'Guardar cambios';
    modal?.classList.add('activo');
}

async function eliminarActividadMensual(id) {
    if (usuarioSesion?.rol !== 'admin' || !id) return;
    if (!(await confirmarAccion('¿Eliminar esta actividad permanentemente?'))) return;
    try {
        const resultado = await llamarSupabase(`eventos_calendario?id=eq.${encodeURIComponent(id)}`, { method: 'DELETE' });
        if (resultado === null) throw new Error('No se confirmó la eliminación de la actividad.');
        mostrarNotificacion('Actividad eliminada.', 'success');
        await cargarActividadesMensuales();
    } catch (error) {
        console.error('No se pudo eliminar la actividad:', error);
        mostrarNotificacion('No se pudo eliminar la actividad.', 'error');
    }
}

function configurarVistasAdministrativas() {
    const btnAgregar = document.getElementById('btn-agregar-actividad');
    btnAgregar?.addEventListener('click', () => {
        if (usuarioSesion?.rol !== 'admin') return;
        const modal = document.getElementById('modal-nueva-actividad');
        if (modal) modal.classList.add('activo');
        document.getElementById('act-titulo')?.focus();
    });

    document.getElementById('btn-cancelar-actividad')?.addEventListener('click', () => {
        document.getElementById('modal-nueva-actividad')?.classList.remove('activo');
        document.getElementById('form-nueva-actividad')?.reset();
        eventoEditandoId = null;
        const modal = document.getElementById('modal-nueva-actividad');
        const encabezado = modal?.querySelector('h3');
        if (encabezado) encabezado.innerHTML = '<i class="fa-solid fa-calendar-plus"></i> Agregar actividad';
        const botonGuardar = document.getElementById('form-nueva-actividad')?.querySelector('button[type="submit"]');
        if (botonGuardar) botonGuardar.textContent = 'Guardar actividad';
    });
    document.getElementById('form-nueva-actividad')?.addEventListener('submit', event => {
        event.preventDefault();
        crearActividadMensual();
    });
    document.getElementById('form-configuracion-horarios')?.addEventListener('submit', event => {
        event.preventDefault();
        guardarConfiguracionHorario();
    });
}

function renderizarConfiguracionHorario() {
    const dia = document.getElementById('cfg-dia-asistencia');
    const inicio = document.getElementById('cfg-hora-inicio');
    const fin = document.getElementById('cfg-hora-fin');
    const motivo = document.getElementById('cfg-motivo');
    if (!dia || !inicio || !fin || !motivo) return;
    dia.value = String(configuracionHorario.dia_asistencia);
    inicio.value = configuracionHorario.hora_inicio_asistencia;
    fin.value = configuracionHorario.hora_fin_asistencia;
    motivo.value = configuracionHorario.motivo || '';
    document.querySelectorAll('input[name="cfg-dia-sustitucion"]').forEach(input => {
        input.checked = configuracionHorario.dias_solicitud_sustituto.includes(Number(input.value));
    });
    const actualizado = document.getElementById('cfg-actualizado');
    if (actualizado) {
        actualizado.textContent = configuracionHorario.actualizado_en
            ? `Último ajuste: ${new Date(configuracionHorario.actualizado_en).toLocaleString()} · ${configuracionHorario.actualizado_por || 'Administrador'}`
            : 'Horario habitual; aún no se han realizado ajustes.';
    }
}

async function cargarConfiguracionHorario(renderizar = false) {
    let configuracion = null;
    try {
        const filas = await llamarSupabase('app_configuracion?id=eq.1&select=*');
        if (Array.isArray(filas) && filas[0]?.configuracion && typeof filas[0].configuracion === 'object') {
            configuracion = filas[0].configuracion;
        }
    } catch (error) {
        console.error('No se pudo cargar la configuración compartida de horarios:', error);
    }

    if (!configuracion) {
        try {
            configuracion = JSON.parse(localStorage.getItem('zk360_config_horario_cache') || 'null');
        } catch (error) {
            console.error('No se pudo leer la copia local de horarios:', error);
        }
    }
    configuracionHorario = {
        ...CONFIGURACION_HORARIO_DEFAULT,
        ...(configuracion || {}),
        dias_solicitud_sustituto: Array.isArray(configuracion?.dias_solicitud_sustituto)
            ? configuracion.dias_solicitud_sustituto.map(Number).filter(dia => dia >= 0 && dia <= 6)
            : [...CONFIGURACION_HORARIO_DEFAULT.dias_solicitud_sustituto]
    };
    if (configuracion) localStorage.setItem('zk360_config_horario_cache', JSON.stringify(configuracionHorario));
    if (renderizar) renderizarConfiguracionHorario();
    return configuracionHorario;
}

async function guardarConfiguracionHorario() {
    if (usuarioSesion?.rol !== 'admin') {
        mostrarNotificacion('Solo el administrador puede modificar los horarios.', 'error');
        return;
    }
    const inicio = document.getElementById('cfg-hora-inicio')?.value || '';
    const fin = document.getElementById('cfg-hora-fin')?.value || '';
    const motivo = document.getElementById('cfg-motivo')?.value.trim() || '';
    const inicioMinutos = horaAMinutos(inicio);
    const finMinutos = horaAMinutos(fin);
    if (inicioMinutos === null || finMinutos === null || finMinutos <= inicioMinutos) {
        mostrarNotificacion('El horario de cierre debe ser posterior al de apertura.', 'warning');
        return;
    }
    if (motivo.length < 5) {
        mostrarNotificacion('Escribe el motivo del ajuste (mínimo 5 caracteres).', 'warning');
        return;
    }
    const diasSustitucion = [1, 2];
    const nuevo = {
        dia_asistencia: Number(document.getElementById('cfg-dia-asistencia')?.value || 0),
        hora_inicio_asistencia: inicio,
        hora_fin_asistencia: fin,
        dias_solicitud_sustituto: diasSustitucion,
        motivo,
        actualizado_por: usuarioSesion.nombre,
        actualizado_en: new Date().toISOString()
    };
    try {
        const filas = await llamarSupabase('app_configuracion?id=eq.1&select=id');
        const existe = Array.isArray(filas) && filas.length > 0;
        const guardado = await llamarSupabase(
            existe ? 'app_configuracion?id=eq.1' : 'app_configuracion',
            {
                method: existe ? 'PATCH' : 'POST',
                body: JSON.stringify(existe
                    ? { configuracion: nuevo, actualizado_por: usuarioSesion.nombre, actualizado_en: nuevo.actualizado_en }
                    : { id: 1, configuracion: nuevo, actualizado_por: usuarioSesion.nombre, actualizado_en: nuevo.actualizado_en })
            }
        );
        if (!guardado) throw new Error('No se confirmó el guardado de los horarios.');
        configuracionHorario = nuevo;
        localStorage.setItem('zk360_config_horario_cache', JSON.stringify(nuevo));
        renderizarConfiguracionHorario();
        actualizarTextoHorarioAsistencia();
        mostrarNotificacion('Horarios compartidos actualizados.', 'success');
        await guardarLog({
            usuario: usuarioSesion.nombre,
            accion: `Ajustó horarios: ${motivo}`,
            fecha: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error guardando configuración de horarios:', error);
        mostrarNotificacion('No se pudieron guardar los horarios. Verifica la conexión y permisos.', 'error');
    }
}

function horaAMinutos(hora) {
    const partes = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hora);
    return partes ? Number(partes[1]) * 60 + Number(partes[2]) : null;
}

function actualizarTextoHorarioAsistencia() {
    const estado = document.getElementById('txt-estado-horario-asistencia');
    if (!estado) return;
    const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    estado.textContent = `Horario: ${dias[configuracionHorario.dia_asistencia]} ${configuracionHorario.hora_inicio_asistencia}–${configuracionHorario.hora_fin_asistencia}`;
}

async function cargarFeedbackAdministrador() {
    const lista = document.getElementById('lista-feedback-admin');
    if (!lista || usuarioSesion?.rol !== 'admin') return;
    lista.replaceChildren();
    const cargando = document.createElement('p');
    cargando.textContent = 'Cargando sugerencias y reportes…';
    lista.appendChild(cargando);
    try {
        const registros = await llamarSupabase('sugerencias?select=*&order=fecha.desc&limit=100');
        if (!Array.isArray(registros)) throw new Error('No se pudieron cargar los mensajes.');
        const pendientes = registros.filter(registro =>
            ['sugerencia', 'reporte'].includes(registro.tipo) &&
            !['atendida', 'resuelta', 'cerrada', 'finalizado'].includes(registro.estado)
        );
        lista.replaceChildren();
        if (!pendientes.length) {
            const vacio = document.createElement('p');
            vacio.className = 'actividad-mes-vacio';
            vacio.textContent = 'No hay sugerencias ni errores pendientes.';
            lista.appendChild(vacio);
            await actualizarBadgeFeedbackAdmin(pendientes.length);
            return;
        }
        pendientes.forEach(registro => {
            const tarjeta = document.createElement('article');
            tarjeta.className = 'feedback-admin-card';
            const titulo = document.createElement('h4');
            titulo.textContent = registro.tipo === 'sugerencia' ? 'Sugerencia' : 'Reporte de error';
            const mensaje = document.createElement('p');
            mensaje.textContent = registro.mensaje || '';
            const autor = document.createElement('small');
            autor.textContent = `${registro.usuario || 'Usuario'} · ${registro.fecha ? new Date(registro.fecha).toLocaleString() : 'Fecha no disponible'}`;
            const estado = document.createElement('span');
            estado.className = 'estado-feedback-admin';
            estado.textContent = 'En proceso';
            const resolver = document.createElement('button');
            resolver.type = 'button';
            resolver.className = 'btn-admin';
            resolver.textContent = 'Finalizar';
            resolver.addEventListener('click', () => marcarFeedbackAtendido(registro.id));
            tarjeta.append(titulo, mensaje, autor, estado, resolver);
            lista.appendChild(tarjeta);
        });
        await actualizarBadgeFeedbackAdmin(pendientes.length);
    } catch (error) {
        console.error('Error cargando sugerencias y reportes:', error);
        lista.replaceChildren();
        const aviso = document.createElement('p');
        aviso.className = 'actividad-mes-vacio';
        aviso.textContent = 'No se pudo consultar la bandeja. Revisa conexión y permisos de Supabase.';
        lista.appendChild(aviso);
    }
}

async function actualizarBadgeFeedbackAdmin(cantidadConocida) {
    if (usuarioSesion?.rol !== 'admin') return;
    try {
        const cantidad = Number.isInteger(cantidadConocida)
            ? cantidadConocida
            : (await llamarSupabase('sugerencias?select=*&limit=100') || []).filter(registro =>
                ['sugerencia', 'reporte'].includes(registro.tipo) &&
                !['atendida', 'resuelta', 'cerrada', 'finalizado'].includes(registro.estado)
            ).length;
        const badge = document.getElementById('badge-feedback-admin');
        if (badge) {
            badge.textContent = String(cantidad);
            badge.style.display = cantidad > 0 ? 'inline-flex' : 'none';
        }
    } catch (error) {
        console.error('No se pudo actualizar el contador de sugerencias y errores:', error);
    }
}

async function marcarFeedbackAtendido(id) {
    if (usuarioSesion?.rol !== 'admin' || !id) return;
    try {
        const actualizado = await llamarSupabase(`sugerencias?id=eq.${encodeURIComponent(id)}`, {
            method: 'PATCH',
            body: JSON.stringify({ estado: 'finalizado' })
        });
        if (!actualizado) throw new Error('No se confirmó la actualización del mensaje.');
        mostrarNotificacion('Reporte finalizado.', 'success');
        await cargarFeedbackAdministrador();
    } catch (error) {
        console.error('No se pudo marcar el mensaje como atendido:', error);
        mostrarNotificacion('No se pudo actualizar el mensaje.', 'error');
    }
}

// ============ CARGAR ALUMNOS ============
async function cargarAlumnosSegunRol() {
    const panelNoAsignado = document.getElementById('contenedor-mensaje-no-asignado');
    const panelAsistencia = document.getElementById('contenedor-asistencia-activa');
    if (!seccionAsignadaMaestro) {
        if (modoPrueba) {
            const alumnosLocales = JSON.parse(localStorage.getItem(CLAVE_ALUMNOS_MODO_PRUEBA) || '[]');
            bancoAlumnosCompleto = Array.isArray(alumnosLocales) ? alumnosLocales : [];
        } else {
            const alumnos = await cargarAlumnos();
            bancoAlumnosCompleto = Array.isArray(alumnos) ? alumnos : [];
        }
        if (panelNoAsignado) panelNoAsignado.style.display = 'block';
        if (panelAsistencia) panelAsistencia.style.display = 'none';
        const seccionActual = document.getElementById('asistencia-seccion-actual');
        if (seccionActual) seccionActual.textContent = 'Sin asignación';
        return;
    }
    if (panelNoAsignado) panelNoAsignado.style.display = 'none';
    if (panelAsistencia) panelAsistencia.style.display = 'block';

    let salaAFiltrar = seccionAsignadaMaestro;
    if (usuarioSesion.rol === "admin" || usuarioSesion.rol === "pastor") {
        if (modoAdminVerTodos) { salaAFiltrar = "todos"; }
        else { salaAFiltrar = seccionAsignadaMaestro === "admin_total" ? "infancia" : seccionAsignadaMaestro; }
    }
    const nombresSeccion = { "infancia": "Primera Infancia", "medianos": "Medianos", "grandes": "Grandes" };
    const seccionActual = document.getElementById('asistencia-seccion-actual');
    if (seccionActual) {
        seccionActual.textContent = salaAFiltrar === "todos" ? "TODAS LAS SECCIONES" : (nombresSeccion[salaAFiltrar] || salaAFiltrar);
    }
    seccionAsistenciaActual = salaAFiltrar;

    try {
        let alumnos;
        if (modoPrueba) {
            const alumnosLocales = JSON.parse(localStorage.getItem(CLAVE_ALUMNOS_MODO_PRUEBA) || '[]');
            alumnos = salaAFiltrar === "todos"
                ? alumnosLocales
                : alumnosLocales.filter(alumno => alumno.seccion === salaAFiltrar);
        } else {
            alumnos = await cargarAlumnos(salaAFiltrar === "todos" ? null : salaAFiltrar);
        }
        if (!alumnos || alumnos.length === 0) { alumnos = []; }
        bancoAlumnosCompleto = alumnos;
        const tabla = document.getElementById('tabla-asistencia-niños-cuerpo');
        if (!tabla) return;
        tabla.innerHTML = "";
        if (alumnos.length === 0) {
            tabla.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:25px; color:#95a5a6;">No hay alumnos registrados en esta sección.</td></tr>';
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

        const hoy = new Date();
        const btnGuardar = document.getElementById('btn-guardar-asistencia-final');
        const btnModificar = document.getElementById('btn-modificar-asistencia');
        const txtEstado = document.getElementById('txt-estado-horario-asistencia');
        const fechaRegistro = fechaEnFormatoLocal(hoy);
        const claveRegistro = `zk360_asistencia_${fechaRegistro}_${salaAFiltrar}`;
        let idsPresentes = [];
        asistenciaReportadaPor = null;
        try {
            const almacenada = JSON.parse(localStorage.getItem(claveRegistro) || 'null');
            if (almacenada?.ids && Array.isArray(almacenada.ids)) {
                idsPresentes = almacenada.ids.map(String);
                asistenciaReportadaPor = almacenada.maestroEmail || null;
            }
        } catch (error) {
            console.error('No se pudo leer la asistencia local guardada:', error);
        }
        if (!modoPrueba && !modoOffline) {
            const registros = await llamarSupabase(
                `asistencia?fecha=eq.${encodeURIComponent(fechaRegistro)}&presente=eq.true&select=alumno_id,seccion,maestro_email,maestro`
            );
            if (Array.isArray(registros)) {
                const seccionesCompatibles = {
                    infancia: ['infancia', 'primera infancia'],
                    medianos: ['medianos'],
                    grandes: ['grandes']
                }[salaAFiltrar] || [String(salaAFiltrar).toLocaleLowerCase('es')];
                const reportesSeccion = salaAFiltrar === 'todos'
                    ? registros
                    : registros.filter(registro =>
                        seccionesCompatibles.includes(String(registro.seccion || '').toLocaleLowerCase('es').trim())
                    );
                idsPresentes = reportesSeccion.map(registro => String(registro.alumno_id));
                asistenciaReportadaPor = reportesSeccion[0]?.maestro_email || null;
            }
        }
        const reporteGuardado = idsPresentes.length > 0 ||
            localStorage.getItem(`asistencia_${hoy.toDateString()}_${usuarioSesion.nombre}`) === 'true';
        asistenciaEnviadaHoy = reporteGuardado;
        asistenciaModificacionActiva = false;
        document.querySelectorAll('.asistencia-checkbox').forEach(checkbox => {
            checkbox.checked = idsPresentes.includes(String(checkbox.dataset.id));
            checkbox.disabled = reporteGuardado;
        });
        if (btnModificar) btnModificar.style.display = reporteGuardado ? 'inline-flex' : 'none';
        if (btnGuardar) {
            btnGuardar.innerHTML = '<i class="fa-solid fa-square-check"></i> Reportar Asistencia';
            btnGuardar.disabled = reporteGuardado;
            btnGuardar.classList.toggle('deshabilitado', reporteGuardado);
        }
        if (txtEstado && reporteGuardado) {
            txtEstado.innerHTML = '<i class="fas fa-check-circle" style="color:#2ecc71;"></i> Asistencia ya reportada';
        }

        if (usuarioSesion.rol === "admin" || usuarioSesion.rol === "pastor") {
            if (btnGuardar) {
                btnGuardar.disabled = reporteGuardado;
                btnGuardar.classList.toggle('deshabilitado', reporteGuardado);
            }
            if (txtEstado && !reporteGuardado) txtEstado.innerHTML = '<i class="fas fa-unlock"></i> Modo Admin - Sin restricciones';
            return;
        }

        const fechaHoy = hoy.toDateString();
        if (reporteGuardado) return;

        if (estaEnHorarioAsistencia(hoy)) {
            if (btnGuardar) {
                btnGuardar.disabled = false;
                btnGuardar.classList.remove('deshabilitado');
            }
            if (txtEstado) txtEstado.textContent = `Ventana abierta (${configuracionHorario.hora_inicio_asistencia}–${configuracionHorario.hora_fin_asistencia})`;
        } else {
            if (btnGuardar) {
                btnGuardar.disabled = true;
                btnGuardar.classList.add('deshabilitado');
            }
            if (txtEstado) txtEstado.textContent = `Fuera de horario (${configuracionHorario.hora_inicio_asistencia}–${configuracionHorario.hora_fin_asistencia})`;
        }
    } catch (err) {
        console.error("Error:", err);
        mostrarNotificacion("Error al cargar la lista de alumnos", "error");
    }
}

function habilitarModificacionAsistencia(motivo = '') {
    asistenciaModificacionActiva = true;
    motivoModificacionAsistencia = motivo;
    document.querySelectorAll('.asistencia-checkbox').forEach(checkbox => { checkbox.disabled = false; });
    const btnGuardar = document.getElementById('btn-guardar-asistencia-final');
    if (btnGuardar) {
        btnGuardar.disabled = false;
        btnGuardar.classList.remove('deshabilitado');
        btnGuardar.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Guardar cambios';
    }
    const estado = document.getElementById('txt-estado-horario-asistencia');
    if (estado) estado.textContent = 'Modificación autorizada. Revisa las marcas y guarda los cambios.';
    document.getElementById('modal-motivo-modificacion-asistencia')?.classList.remove('activo');
}

async function solicitarModificacionAsistencia() {
    if (!asistenciaEnviadaHoy) return;
    if (usuarioSesion?.rol === 'maestro') {
        const modal = document.getElementById('modal-motivo-modificacion-asistencia');
        const campo = document.getElementById('motivo-modificacion-asistencia');
        if (campo) campo.value = '';
        modal?.classList.add('activo');
        campo?.focus();
        return;
    }
    if (usuarioSesion?.rol === 'admin' || usuarioSesion?.rol === 'pastor') {
        if (await confirmarAccion('¿Deseas modificar la asistencia reportada? Las marcas actuales se conservarán para que puedas cambiarlas.')) {
            habilitarModificacionAsistencia('Confirmada por administrador');
        }
    }
}

// ============ REGISTRAR ALUMNO ============
async function registrarNuevoAlumno(formElement) {
    const inputNombre = document.getElementById('reg-nombre');
    const selectSeccion = document.getElementById('reg-seccion');
    const inputNacimiento = document.getElementById('reg-nacimiento');

    if (!inputNombre || !selectSeccion || !inputNacimiento) return;

    const nombreVal = inputNombre.value.trim();
    const seccionVal = selectSeccion.value;
    const nacimientoVal = inputNacimiento.value;

    if (!nombreVal || !seccionVal || !nacimientoVal) {
        mostrarNotificacion("Por favor, completa todos los campos para inscribir.", "warning");
        return;
    }

    // --- RESTRICCIÓN DE EDAD (Máximo 12 años) ---
    const fechaNac = new Date(nacimientoVal);
    const anioNacimiento = fechaNac.getFullYear();
    const anioActual = new Date().getFullYear(); // 2026

    // Un niño de más de 12 años nació antes de (anioActual - 12) = 2014
    if (isNaN(anioNacimiento) || anioNacimiento < (anioActual - 12) || anioNacimiento > anioActual) {
        mostrarNotificacion(`Edad no permitida. El alumno debe tener máximo 12 años (nacido entre ${anioActual - 12} y ${anioActual}).`, "error");
        return;
    }

    if (modoPrueba) {
        const alumnosLocales = JSON.parse(localStorage.getItem(CLAVE_ALUMNOS_MODO_PRUEBA) || '[]');
        const nombreNormalizado = nombreVal.toLocaleLowerCase('es').trim();
        if (alumnosLocales.some(alumno => alumno.nombre_completo.toLocaleLowerCase('es').trim() === nombreNormalizado)) {
            mostrarNotificacion(`El alumno "${nombreVal}" ya está registrado en esta sesión de prueba.`, "error");
            return;
        }

        alumnosLocales.push({
            id: Date.now(),
            nombre_completo: nombreVal,
            seccion: seccionVal,
            fecha_nacimiento: nacimientoVal,
            clases_totales: 0
        });
        localStorage.setItem(CLAVE_ALUMNOS_MODO_PRUEBA, JSON.stringify(alumnosLocales));
        mostrarNotificacion('Alumno guardado en modo prueba (local)', 'success');

        if (formElement && typeof formElement.reset === 'function') {
            formElement.reset();
        }
        cerrarModalRegistro();
        await cargarAlumnosSegunRol();
        return;
    }

    try {
        mostrarNotificacion("Verificando alumno en el sistema...", "info");

        // --- VERIFICAR DUPLICADOS EN SUPABASE ---
        const existentes = await llamarSupabase(`alumnos?nombre_completo=ilike.${encodeURIComponent(nombreVal)}`);

        if (existentes && existentes.length > 0) {
            mostrarNotificacion(`El alumno "${nombreVal}" ya está registrado en el sistema.`, "error");
            return; // Cancela la ejecución para NO volver a registrarlo
        }

        // --- INSERCIÓN EN SUPABASE ---
        const nuevoAlumno = {
            nombre_completo: nombreVal,
            seccion: seccionVal,
            fecha_nacimiento: nacimientoVal,
            clases_totales: 0
        };

        const resultado = await llamarSupabase("alumnos", { 
            method: "POST", 
            body: JSON.stringify(nuevoAlumno) 
        });

        if (resultado) {
            mostrarNotificacion(`¡Alumno "${nombreVal}" inscrito exitosamente!`, "success");

            await registrarLogAuditoria(`Inscribió al alumno: ${nombreVal} (${seccionVal})`);

            // Limpiar formulario y cerrar modal
            if (formElement && typeof formElement.reset === 'function') {
                formElement.reset();
            } else {
                const form = document.getElementById('form-registro-alumno');
                if (form) form.reset();
            }

            cerrarModal('modal-registro-niño');

            // Actualizar la lista en pantalla inmediatamente
            await cargarTablaAsistencia();
        }
    } catch (error) {
        console.error("Error al registrar alumno:", error);
        mostrarNotificacion("Error de conexión al inscribir el alumno.", "error");
    }
}

// ============ VERIFICAR CÓDIGO PARA EDITAR ============
function verificarCodigoParaEditar() {
    const input = document.getElementById('txt-codigo-buscar-edit');
    if (!input) return;
    const cod = parseInt(input.value);
    if (isNaN(cod) || cod <= 0) { mostrarNotificacion("Ingresa un código válido", "error"); return; }
    const nino = bancoAlumnosCompleto.find(x => x.id === cod);
    if (!nino) { mostrarNotificacion("Código no encontrado. Usa el ID que aparece en la tabla.", "error"); return; }
    idNinoAEditar = cod;
    const editNombre = document.getElementById('edit-nombre-input');
    if (editNombre) editNombre.value = nino.nombre_completo;
    const editSeccion = document.getElementById('edit-seccion-select');
    if (editSeccion) editSeccion.value = nino.seccion;
    const editFecha = document.getElementById('edit-fecha-nacimiento');
    if (editFecha && nino.fecha_nacimiento) editFecha.value = nino.fecha_nacimiento;
    const formEdicion = document.getElementById('form-edicion-campos-nino');
    if (formEdicion) formEdicion.style.display = 'block';
    mostrarNotificacion("Alumno encontrado, edita los datos", "success");
}

async function actualizarAlumno() {
    const nuevoNombre = document.getElementById('edit-nombre-input');
    const nuevaSec = document.getElementById('edit-seccion-select');
    const nuevaFecha = document.getElementById('edit-fecha-nacimiento');
    
    if (!nuevoNombre || !nuevaSec) return;
    const nombreVal = nuevoNombre.value.trim();
    const secVal = nuevaSec.value;
    const fechaVal = nuevaFecha ? nuevaFecha.value : '';
    
    if (!nombreVal) { mostrarNotificacion("El nombre no puede estar vacío", "error"); return; }
    if (fechaVal) {
        const fechaNac = new Date(fechaVal);
        const añoNacimiento = fechaNac.getFullYear();
        const añoActual = new Date().getFullYear();
        if (añoNacimiento < 2014 || añoNacimiento > añoActual) {
            mostrarNotificacion('La fecha debe ser entre 2014 y ' + añoActual, 'error');
            return;
        }
    }
    const nino = bancoAlumnosCompleto.find(a => a.id === idNinoAEditar);
    if (!nino) { mostrarNotificacion("Error: Alumno no encontrado", "error"); return; }
    let cambios = false;
    const datosActualizar = {};
    if (nino.nombre_completo !== nombreVal) { datosActualizar.nombre_completo = nombreVal; cambios = true; }
    if (nino.seccion !== secVal) { datosActualizar.seccion = secVal; cambios = true; }
    if (nino.fecha_nacimiento !== fechaVal) { datosActualizar.fecha_nacimiento = fechaVal; cambios = true; }
    if (!cambios) { mostrarNotificacion("No se detectaron cambios para actualizar", "info"); return; }
    try {
        const result = await actualizarAlumno(idNinoAEditar, datosActualizar);
        if (result) {
            mostrarNotificacion("Alumno actualizado con éxito", "success");
            cerrarModalEditar();
            await cargarAlumnosSegunRol();
            await guardarLog({ usuario: usuarioSesion.nombre, accion: 'Actualizó datos del alumno ' + nino.nombre_completo, fecha: new Date().toISOString() });
        }
    } catch (err) { mostrarNotificacion("Error al actualizar", "error"); }
}

function verificarCodigoParaEliminar() {
    const input = document.getElementById('txt-codigo-buscar-del');
    if (!input) return;
    const cod = parseInt(input.value);
    if (isNaN(cod) || cod <= 0) { mostrarNotificacion("Ingresa un código válido", "error"); return; }
    const nino = bancoAlumnosCompleto.find(x => x.id === cod);
    if (!nino) { mostrarNotificacion("Código no encontrado. Usa el ID que aparece en la tabla.", "error"); return; }
    mostrarNotificacion('¿Eliminar permanentemente a "' + nino.nombre_completo + '" (ID: ' + nino.id + ')? Esta acción no se puede deshacer.', 'warning');
    setTimeout(async () => {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay activo';
        modal.style.zIndex = '9999';
        modal.innerHTML = `
            <div class="modal-burbuja" style="max-width:400px; text-align:center;">
                <i class="fas fa-triangle-exclamation" style="font-size:45px; color:#ff7675;"></i>
                <h3 style="margin:10px 0;">Confirmar Eliminación</h3>
                <p style="color:#747d8c;">¿Eliminar permanentemente a "${nino.nombre_completo}"?<br>Esta acción no se puede deshacer.</p>
                <div style="display:flex; gap:10px; justify-content:center; margin-top:15px;">
                    <button class="btn-cerrar-modal btn-cancelar" onclick="this.closest('.modal-overlay').remove()" style="padding:10px 25px;">Cancelar</button>
                    <button class="btn-enviar-clase" onclick="confirmarEliminar(${nino.id})" style="background:#ff7675; padding:10px 25px;">Eliminar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }, 500);
}

async function confirmarEliminar(id) {
    document.querySelectorAll('.modal-overlay').forEach(m => m.remove());
    try {
        const result = await eliminarAlumno(id);
        if (result !== null) {
            mostrarNotificacion("Alumno eliminado del sistema", "success");
            await cargarAlumnosSegunRol();
            await guardarLog({ usuario: usuarioSesion.nombre, accion: 'Eliminó un alumno', fecha: new Date().toISOString() });
        }
    } catch (err) { mostrarNotificacion("Error al eliminar", "error"); }
}

// ============ ENVIAR ASISTENCIA ============
function fechaEnFormatoLocal(fecha = new Date()) {
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
}

function mostrarFechaLegible(fecha) {
    const texto = String(fecha || '');
    const partes = texto.split('/');
    const fechaNormalizada = partes.length === 3
        ? new Date(Number(partes[2]), Number(partes[1]) - 1, Number(partes[0]))
        : new Date(`${texto}T00:00:00`);
    return Number.isNaN(fechaNormalizada.getTime()) ? texto : fechaNormalizada.toLocaleDateString();
}

async function enviarAsistenciaSupabase() {
    const checkboxes = document.querySelectorAll('.asistencia-checkbox:checked');
    if (checkboxes.length === 0) { mostrarNotificacion("Selecciona al menos un alumno presente", "error"); return; }
    const seccion = seccionAsistenciaActual || seccionAsignadaMaestro;
    const maestro = document.getElementById('chk-asistencia-maestro-firmado');
    if (!maestro || (!maestro.checked && usuarioSesion.rol !== "admin" && usuarioSesion.rol !== "pastor")) {
        mostrarNotificacion("Por favor, marca tu asistencia como maestro", "warning");
        return;
    }
    const fechaHoy = fechaEnFormatoLocal();
    const alumnosPresentes = [];
    checkboxes.forEach(cb => {
        const alumno = bancoAlumnosCompleto.find(a => String(a.id) === String(cb.dataset.id));
        if (alumno) {
            alumnosPresentes.push({
                alumno_id: alumno.id,
                nombre: alumno.nombre_completo,
                seccion: alumno.seccion || seccion
            });
        }
    });
    const claveRegistro = `zk360_asistencia_${fechaHoy}_${seccion}`;
    try {
        if (modoPrueba) {
            localStorage.setItem(claveRegistro, JSON.stringify({
                ids: alumnosPresentes.map(alumno => String(alumno.alumno_id)),
                maestroEmail: usuarioSesion.email || '',
                maestro: usuarioSesion.nombre
            }));
        } else {
            if (asistenciaModificacionActiva && !modoOffline) {
                let filtro = `fecha=eq.${encodeURIComponent(fechaHoy)}`;
                if (seccion !== 'todos') {
                    const nombreSeccion = {
                        infancia: 'Primera Infancia',
                        medianos: 'Medianos',
                        grandes: 'Grandes'
                    }[seccion] || seccion;
                    const filtroSeccion = `(seccion.eq.${seccion},seccion.eq.${nombreSeccion})`;
                    filtro += `&or=${encodeURIComponent(filtroSeccion)}`;
                }
                if (usuarioSesion.rol !== 'admin' && usuarioSesion.rol !== 'pastor') {
                    const correoReporte = asistenciaReportadaPor || usuarioSesion.email;
                    if (correoReporte) filtro += `&maestro_email=eq.${encodeURIComponent(correoReporte)}`;
                }
                const borrado = await llamarSupabase(`asistencia?${filtro}`, { method: 'DELETE' });
                if (borrado === null) throw new Error('No se pudo reemplazar el reporte anterior.');
            }
        for (const alumno of alumnosPresentes) {
                const resultado = await llamarSupabase("asistencia", {
                    method: "POST",
                    body: JSON.stringify({
                        alumno_id: alumno.alumno_id,
                        fecha: fechaHoy,
                        presente: true,
                        seccion: alumno.seccion,
                        maestro: usuarioSesion.nombre,
                        maestro_email: asistenciaModificacionActiva &&
                            usuarioSesion.rol !== 'admin' && usuarioSesion.rol !== 'pastor' &&
                            asistenciaReportadaPor
                            ? asistenciaReportadaPor
                            : usuarioSesion.email
                    })
                });
                if (!resultado) throw new Error('No se pudo guardar la asistencia de un alumno.');
            }
        }
        const hoy = new Date().toDateString();
        localStorage.setItem('asistencia_' + hoy + '_' + usuarioSesion.nombre, 'true');
        localStorage.setItem(claveRegistro, JSON.stringify({
            ids: alumnosPresentes.map(alumno => String(alumno.alumno_id)),
            maestroEmail: asistenciaModificacionActiva &&
                usuarioSesion.rol !== 'admin' && usuarioSesion.rol !== 'pastor' &&
                asistenciaReportadaPor
                ? asistenciaReportadaPor
                : usuarioSesion.email,
            maestro: usuarioSesion.nombre
        }));
        const fechaLegible = mostrarFechaLegible(fechaHoy);
        const detalleAsistencia = `${alumnosPresentes.length} alumnos presentes en ${seccion || 'la clase'}.`;
        mostrarNotificacion(asistenciaModificacionActiva
            ? `Asistencia modificada para el ${fechaLegible}.`
            : `Asistencia enviada para el ${fechaLegible}.`, "success");
        if (!modoPrueba && !modoOffline) {
            if (usuarioSesion.rol !== 'admin') {
                registrarNotificacionImportante({
                    id: `asistencia-${usuarioSesion.email}-${Date.now()}`,
                    mensaje: `${asistenciaModificacionActiva ? 'Asistencia modificada' : 'Asistencia enviada'} · ${fechaLegible}`,
                    detalle: detalleAsistencia,
                    tipo: 'success'
                });
            }
            await guardarLog({
                usuario: usuarioSesion.nombre,
                accion: asistenciaModificacionActiva
                    ? `Modificó asistencia (${seccion || 'sin sección'}). Motivo: ${motivoModificacionAsistencia || 'Actualización del maestro'}`
                    : `Envió asistencia a ${alumnosPresentes.length} alumnos (${seccion || 'sin sección'})`,
                fecha: new Date().toISOString()
            });
        }
        asistenciaEnviadaHoy = true;
        asistenciaModificacionActiva = false;
        motivoModificacionAsistencia = '';
        cargarAlumnosSegunRol();
        const btnGuardar = document.getElementById('btn-guardar-asistencia-final');
        if (btnGuardar) {
            btnGuardar.disabled = true;
            btnGuardar.classList.add('deshabilitado');
            btnGuardar.innerHTML = '<i class="fas fa-check-circle"></i> Asistencia Reportada';
        }
        const btnModificar = document.getElementById('btn-modificar-asistencia');
        if (btnModificar) btnModificar.style.display = 'inline-flex';
    } catch (err) {
        console.error('Error guardando asistencia:', err);
        mostrarNotificacion(err.message || "Error al reportar asistencia", "error");
    }
}

// ============ CERRAR MODALES ============
function cerrarModalRegistro() {
    const modal = document.getElementById('modal-registro-niño');
    if (modal) modal.classList.remove('activo');
    const form = document.getElementById('form-registro-alumno');
    if (form) form.reset();
}

function cerrarModalEditar() {
    const modal = document.getElementById('modal-buscar-editar');
    if (modal) modal.classList.remove('activo');
    const form = document.getElementById('form-edicion-campos-nino');
    if (form) form.style.display = 'none';
    const input = document.getElementById('txt-codigo-buscar-edit');
    if (input) input.value = '';
    const editNombre = document.getElementById('edit-nombre-input');
    if (editNombre) editNombre.value = '';
    const editFecha = document.getElementById('edit-fecha-nacimiento');
    if (editFecha) editFecha.value = '';
}

function cerrarModalEliminar() {
    const modal = document.getElementById('modal-eliminar-alumno');
    if (modal) modal.classList.remove('activo');
    const input = document.getElementById('txt-codigo-buscar-del');
    if (input) input.value = '';
}

function cerrarModalCumpleaneros() {
    const modal = document.getElementById('modal-cumpleaneros');
    if (modal) modal.classList.remove('activo');
}

// ============ CUMBLEAÑEROS ============
function mostrarCumpleaneros() {
    const modal = document.getElementById('modal-cumpleaneros');
    const lista = document.getElementById('lista-cumpleaneros');
    if (!modal || !lista) return;
    
    const mesActual = new Date().getMonth();
    const cumpleaneros = bancoAlumnosCompleto.filter(alumno => {
        if (!alumno.fecha_nacimiento) return false;
        const [anio, mes, dia] = String(alumno.fecha_nacimiento).split('-').map(Number);
        const fecha = new Date(anio, mes - 1, dia);
        return fecha.getMonth() === mesActual;
    });
    if (cumpleaneros.length === 0) {
        lista.innerHTML = '<p style="color:#95a5a6; text-align:center;">No hay cumpleaños este mes.</p>';
    } else {
        lista.innerHTML = cumpleaneros.map((alumno, index) => {
            const [anio, mesNumero, diaNumero] = String(alumno.fecha_nacimiento).split('-').map(Number);
            const fecha = new Date(anio, mesNumero - 1, diaNumero);
            const dia = fecha.getDate();
            const mes = fecha.toLocaleString('es', { month: 'long' });
            return `
                <div style="display:flex; justify-content:space-between; padding:8px 12px; border-bottom:1px solid #eef2f7;">
                    <span><strong>${index + 1}.</strong> ${alumno.nombre_completo}</span>
                    <span style="color:#f39c12;"><i class="fas fa-cake-candles"></i> ${dia} de ${mes}</span>
                    <span style="color:#95a5a6; font-size:12px;">${alumno.seccion}</span>
                </div>
            `;
        }).join('');
    }
    modal.classList.add('activo');
}

// ============ BIBLIOTECA ============
async function cargarBiblioteca() {
    const grid = document.getElementById('grid-biblioteca');
    if (!grid) return;
    
    try {
        const lecciones = await llamarSupabase("lecciones?order=id.desc");
        if (!lecciones || lecciones.length === 0) {
            grid.innerHTML = '<p style="color:#95a5a6; text-align:center; grid-column:1/-1; padding:30px;">No hay lecciones disponibles.</p>';
            return;
        }

        const esAdmin = usuarioSesion.rol === "admin" || usuarioSesion.rol === "pastor";
        let leccionesMostrar = lecciones;
        if (!esAdmin) {
            leccionesMostrar = lecciones.filter(l => l.estado === 'publicada');
        }

        if (leccionesMostrar.length === 0) {
            grid.innerHTML = '<p style="color:#95a5a6; text-align:center; grid-column:1/-1; padding:30px;">No hay lecciones publicadas disponibles.</p>';
            return;
        }

        const nombresSeccion = { 'infancia': 'Primera Infancia', 'medianos': 'Medianos', 'grandes': 'Grandes' };

        grid.innerHTML = leccionesMostrar.map(l => {
            const mes = new Date(l.fecha_domingo).toLocaleString('es', { month: 'long', year: 'numeric' });
            const estadoBadge = l.estado === 'publicada' 
                ? '<span class="badge-estado badge-publicada"><i class="fas fa-check"></i> Publicada</span>'
                : '<span class="badge-estado badge-preinscripcion"><i class="fas fa-clock"></i> Pre-inscripción</span>';

            const portadaHtml = l.portada 
                ? '<img src="' + l.portada + '" alt="Portada" class="portada-biblioteca">'
                : '<div class="portada-biblioteca">' + l.titulo + '</div>';

            return `
                <div class="tarjeta-biblioteca animacion-entrada" onclick="verLeccion(${l.id})">
                    ${portadaHtml}
                    <div style="padding:15px;">
                        <div style="display:flex; justify-content:space-between; align-items:start; gap:8px;">
                            <h4 style="color:#1e3799; font-size:16px; margin:0;">${l.titulo}</h4>
                            ${estadoBadge}
                        </div>
                        <p style="color:#747d8c; font-size:12px; margin:4px 0;"><i class="fas fa-user"></i> ${l.autor}</p>
                        <p style="color:#747d8c; font-size:12px; margin:4px 0;"><i class="fas fa-calendar"></i> ${mes} - ${nombresSeccion[l.seccion] || l.seccion}</p>
                        ${l.resumen_admin ? '<p style="color:#555; font-size:13px; margin:8px 0; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">' + l.resumen_admin + '</p>' : ''}
                        <div style="display:flex; gap:8px; margin-top:10px; flex-wrap:wrap;">
                            <button class="btn-admin" onclick="event.stopPropagation(); verLeccion(${l.id})" style="font-size:11px; padding:4px 12px;"><i class="fas fa-eye"></i> Ver</button>
                            ${esAdmin && l.estado === 'pre-inscripcion' ? '<button class="btn-admin" onclick="event.stopPropagation(); abrirCompletarLeccionAdmin(' + l.id + ')" style="font-size:11px; padding:4px 12px; background:#2ecc71;"><i class="fas fa-check-double"></i> Completar</button>' : ''}
                            ${esAdmin ? '<button class="btn-admin btn-danger" onclick="event.stopPropagation(); eliminarLeccion(' + l.id + ')" style="font-size:11px; padding:4px 12px;"><i class="fas fa-trash"></i></button>' : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error("Error:", error);
        grid.innerHTML = '<p style="color:#ff7675; text-align:center; grid-column:1/-1; padding:30px;">Error al cargar las lecciones</p>';
    }
}

function filtrarBiblioteca(termino) {
    const tarjetas = document.querySelectorAll('.tarjeta-biblioteca');
    const busqueda = termino.toLowerCase().trim();
    tarjetas.forEach(tarjeta => {
        const texto = tarjeta.textContent.toLowerCase();
        tarjeta.style.display = texto.includes(busqueda) ? 'block' : 'none';
    });
}

function filtrarBibliotecaSeccion(seccion) {
    const tarjetas = document.querySelectorAll('.tarjeta-biblioteca');
    tarjetas.forEach(tarjeta => {
        if (seccion === 'todas') {
            tarjeta.style.display = 'block';
            return;
        }
        const texto = tarjeta.textContent.toLowerCase();
        tarjeta.style.display = texto.includes(seccion) ? 'block' : 'none';
    });
}

async function verLeccion(id) {
    try {
        const lecciones = await llamarSupabase('lecciones?id=eq.' + id);
        if (!lecciones || lecciones.length === 0) {
            mostrarNotificacion("Lección no encontrada", "error");
            return;
        }
        const l = lecciones[0];
        leccionSeleccionada = l;
        
        await llamarSupabase('lecciones?id=eq.' + id, {
            method: "PATCH",
            body: JSON.stringify({ lecturas: (l.lecturas || 0) + 1 })
        });
        
        const tituloEl = document.getElementById('ver-leccion-titulo');
        if (tituloEl) tituloEl.textContent = l.titulo;
        const autorEl = document.getElementById('ver-leccion-autor');
        if (autorEl) autorEl.textContent = l.autor + ' - ' + new Date(l.fecha_domingo).toLocaleDateString();

        const nombresSeccion = { 'infancia': 'Primera Infancia (1-3 años)', 'medianos': 'Medianos (4-8 años)', 'grandes': 'Grandes (9-12 años)' };
        let visualesUrl = '';
        try {
            const url = new URL(l.visuales);
            if (['http:', 'https:'].includes(url.protocol)) visualesUrl = url.href;
        } catch (error) {
            if (l.visuales) console.error('La URL de visuales de la lección no es válida:', error);
        }
        let hojaTrabajoUrl = '';
        try {
            const url = new URL(l.hoja_trabajo);
            if (['http:', 'https:'].includes(url.protocol)) hojaTrabajoUrl = url.href;
        } catch (error) {
            if (l.hoja_trabajo) console.error('La URL de la hoja de trabajo no es válida:', error);
        }

        let contenido = `
            <div style="background:#f8f9fa; padding:15px; border-radius:12px; margin-bottom:10px;">
                <p><strong><i class="fas fa-layer-group"></i> Sección:</strong> ${nombresSeccion[l.seccion] || l.seccion}</p>
                <p><strong><i class="fas fa-bible"></i> Texto memorizado:</strong> ${l.texto_memorizado}</p>
                ${l.descripcion ? '<p><strong><i class="fas fa-comment"></i> Descripción:</strong> ' + l.descripcion + '</p>' : ''}
                ${l.resumen_admin ? '<p><strong><i class="fas fa-file-lines"></i> Resumen del Admin:</strong> ' + l.resumen_admin + '</p>' : ''}
                ${l.uso_visuales ? `<p><strong><i class="fas fa-image"></i> Visuales:</strong> ${visualesUrl ? `<a href="${visualesUrl}" target="_blank" rel="noopener noreferrer">Abrir archivo</a>` : 'Sí'}</p>` : ''}
                ${hojaTrabajoUrl ? `<p><strong><i class="fas fa-file-lines"></i> Hoja de trabajo:</strong> <a href="${hojaTrabajoUrl}" target="_blank" rel="noopener noreferrer">Abrir archivo</a></p>` : ''}
                ${l.realizo_actividad ? '<p><strong><i class="fas fa-gamepad"></i> Actividad:</strong> ' + l.descripcion_actividad + '</p>' : ''}
                <div style="margin-top:10px; display:flex; gap:8px;">
                    <button class="btn-admin" onclick="verBosquejo()" style="background:#2575fc;">
                        <i class="fas fa-file-pdf"></i> Ver Bosquejo
                    </button>
                </div>
            </div>
        `;

        const contenidoEl = document.getElementById('contenido-leccion');
        if (contenidoEl) contenidoEl.innerHTML = contenido;
        const modal = document.getElementById('modal-ver-leccion');
        if (modal) modal.classList.add('activo');
    } catch (error) {
        console.error("Error:", error);
        mostrarNotificacion("Error al cargar la lección", "error");
    }
}

function verBosquejo() {
    if (!leccionSeleccionada || !leccionSeleccionada.bosquejo) {
        mostrarNotificacion('No hay bosquejo disponible para esta lección', 'warning');
        return;
    }
    const bosquejo = leccionSeleccionada.bosquejo;
    if (/^https:\/\//i.test(bosquejo)) {
        const ventanaArchivo = window.open(bosquejo, '_blank');
        if (!ventanaArchivo) mostrarNotificacion('Permite ventanas emergentes para abrir el bosquejo.', 'warning');
        else ventanaArchivo.opener = null;
        return;
    }
    if (!bosquejo.startsWith('data:')) {
        mostrarNotificacion('El enlace del bosquejo no es válido.', 'error');
        return;
    }

    const ventana = window.open('', '_blank');
    if (!ventana) {
        mostrarNotificacion('Permite ventanas emergentes para abrir el bosquejo.', 'warning');
        return;
    }
    ventana.document.title = `Bosquejo - ${leccionSeleccionada.titulo}`;
    ventana.document.body.style.cssText = 'font-family:Arial,sans-serif;padding:20px;max-width:800px;margin:0 auto;';
    const titulo = ventana.document.createElement('h1');
    titulo.textContent = leccionSeleccionada.titulo;
    const autor = ventana.document.createElement('p');
    autor.textContent = `Autor: ${leccionSeleccionada.autor}`;
    const documento = ventana.document.createElement('iframe');
    documento.src = bosquejo;
    documento.title = 'Bosquejo de la lección';
    documento.style.cssText = 'width:100%;height:80vh;border:none;';
    ventana.document.body.replaceChildren(titulo, autor, documento);
}

function modoLectura() {
    pausarInactividad();
    mostrarNotificacion('Modo Lectura activado - Inactividad pausada', 'info');
    const modal = document.getElementById('modal-ver-leccion');
    if (modal) modal.classList.remove('activo');
}

function modoEstudio() {
    pausarInactividad();
    const modal = document.getElementById('modal-ver-leccion');
    if (modal) modal.classList.remove('activo');
    iniciarEstudio();
}

function iniciarEstudio() {
    if (!leccionSeleccionada) { mostrarNotificacion('No hay lección seleccionada', 'error'); return; }
    const leccion = leccionSeleccionada;
    const tituloEl = document.getElementById('estudio-titulo');
    if (tituloEl) tituloEl.textContent = leccion.titulo;
    const contenidoEl = document.getElementById('estudio-contenido-lectura');
    if (contenidoEl) {
        contenidoEl.innerHTML = `
            <div style="background:#f8f9fa; padding:20px; border-radius:12px; margin-bottom:15px;">
                <p><strong>Texto Memorizado:</strong> ${leccion.texto_memorizado}</p>
                ${leccion.descripcion ? '<p>' + leccion.descripcion + '</p>' : ''}
                ${leccion.resumen_admin ? '<p><strong>Resumen:</strong> ' + leccion.resumen_admin + '</p>' : ''}
                ${leccion.bosquejo ? '<p><strong>Bosquejo:</strong> <a href="#" onclick="verBosquejoEstudio()">Ver bosquejo completo</a></p>' : ''}
            </div>
            <div style="text-align:center; margin-top:15px;">
                <button class="btn-enviar-clase" onclick="iniciarQuiz()">
                    <i class="fas fa-question-circle"></i> Iniciar Quiz
                </button>
            </div>
        `;
    }
    const modal = document.getElementById('modal-estudio');
    if (modal) modal.classList.add('activo');
    const lecturaEl = document.getElementById('estudio-lectura');
    if (lecturaEl) lecturaEl.style.display = 'block';
    const quizEl = document.getElementById('estudio-quiz');
    if (quizEl) quizEl.style.display = 'none';
}

function verBosquejoEstudio() {
    verBosquejo();
}

function iniciarQuiz() {
    if (!leccionSeleccionada) { mostrarNotificacion('No hay lección seleccionada', 'error'); return; }
    const leccion = leccionSeleccionada;
    
    preguntasEstudio = [
        { pregunta: '¿Cuál es el texto memorizado de esta lección?', opciones: [leccion.texto_memorizado, 'Juan 3:16', 'Proverbios 3:5', 'Salmo 23:1'], correcta: 0 },
        { pregunta: '¿Qué sección es esta lección?', opciones: ['Primera Infancia', 'Medianos', 'Grandes', 'Todas'], correcta: ['infancia', 'medianos', 'grandes'].indexOf(leccion.seccion) },
        { pregunta: '¿Quién es el autor de esta lección?', opciones: [leccion.autor, 'Admin', 'Pastor', 'Desconocido'], correcta: 0 },
        { pregunta: '¿Esta lección utilizó visuales?', opciones: ['Sí', 'No'], correcta: leccion.uso_visuales ? 0 : 1 },
        { pregunta: '¿Esta lección incluyó una actividad?', opciones: ['Sí', 'No'], correcta: leccion.realizo_actividad ? 0 : 1 },
    ];
    
    preguntaActual = 0;
    respuestasCorrectas = 0;
    const lecturaEl = document.getElementById('estudio-lectura');
    if (lecturaEl) lecturaEl.style.display = 'none';
    const quizEl = document.getElementById('estudio-quiz');
    if (quizEl) quizEl.style.display = 'block';
    mostrarPreguntaQuiz();
}

function mostrarPreguntaQuiz() {
    if (preguntaActual >= preguntasEstudio.length) {
        finalizarEstudio();
        return;
    }
    const p = preguntasEstudio[preguntaActual];
    const numeroEl = document.getElementById('estudio-pregunta-numero');
    if (numeroEl) numeroEl.textContent = 'Pregunta ' + (preguntaActual + 1) + ' de ' + preguntasEstudio.length;
    const contenedor = document.getElementById('estudio-contenido-quiz');
    if (contenedor) {
        contenedor.innerHTML = `
            <div style="background:#f8f9fa; padding:20px; border-radius:12px;">
                <p style="font-weight:bold; font-size:16px; margin-bottom:15px;">${p.pregunta}</p>
                ${p.opciones.map((op, i) => `
                    <div style="margin:8px 0;">
                        <label style="display:flex; align-items:center; gap:10px; cursor:pointer; padding:8px 12px; background:white; border-radius:8px; border:1px solid #dfe4ea; transition:0.3s;">
                            <input type="radio" name="respuesta" value="${i}" style="width:18px; height:18px;">
                            <span>${op}</span>
                        </label>
                    </div>
                `).join('')}
            </div>
        `;
    }
    const btnSiguiente = document.getElementById('btn-siguiente-pregunta');
    if (btnSiguiente) {
        btnSiguiente.textContent = preguntaActual === preguntasEstudio.length - 1 ? 'Finalizar' : 'Siguiente';
    }
}

function siguientePreguntaQuiz() {
    const selected = document.querySelector('input[name="respuesta"]:checked');
    if (!selected) { mostrarNotificacion('Selecciona una respuesta', 'warning'); return; }
    const respuesta = parseInt(selected.value);
    if (respuesta === preguntasEstudio[preguntaActual].correcta) { respuestasCorrectas++; }
    preguntaActual++;
    mostrarPreguntaQuiz();
}

function finalizarEstudio() {
    const modal = document.getElementById('modal-estudio');
    if (modal) modal.classList.remove('activo');
    reanudarInactividad();
    const total = preguntasEstudio.length;
    const porcentaje = Math.round((respuestasCorrectas / total) * 100);
    if (porcentaje >= 70) {
        mostrarNotificacion('Estudio completado! ' + respuestasCorrectas + '/' + total + ' correctas (' + porcentaje + '%)', 'success');
    } else {
        mostrarNotificacion('Estudio completado. ' + respuestasCorrectas + '/' + total + ' correctas (' + porcentaje + '%). Revisa la lección nuevamente.', 'warning');
    }
}

function cerrarEstudio() {
    const modal = document.getElementById('modal-estudio');
    if (modal) modal.classList.remove('activo');
    reanudarInactividad();
    mostrarNotificacion('Estudio finalizado', 'info');
}

async function eliminarLeccion(id) {
    if (!(await confirmarAccion('¿Eliminar esta lección permanentemente?'))) return;
    try {
        await llamarSupabase('lecciones?id=eq.' + id, { method: "DELETE" });
        mostrarNotificacion("Lección eliminada", "success");
        cargarBiblioteca();
    } catch (error) {
        console.error("Error:", error);
        mostrarNotificacion("Error al eliminar la lección", "error");
    }
}

// ============ ABRIR FORMULARIO LECCIÓN ============
function abrirFormularioLeccion() {
    if (!seccionAsignadaMaestro || seccionAsignadaMaestro === "admin_total") {
        mostrarNotificacion("Solo puedes crear lecciones si tienes una clase asignada", "warning");
        return;
    }
    const autorEl = document.getElementById('lec-autor');
    if (autorEl) autorEl.value = usuarioSesion.nombre;
    const fecha = new Date();
    const fechaFormateada = fecha.getFullYear() + '-' + String(fecha.getMonth()+1).padStart(2,'0') + '-' + String(fecha.getDate()).padStart(2,'0');
    const fechaEl = document.getElementById('lec-fecha');
    if (fechaEl) fechaEl.value = fechaFormateada;
    const seccionEl = document.getElementById('lec-seccion');
    if (seccionEl) seccionEl.value = seccionAsignadaMaestro;
    const modal = document.getElementById('modal-nueva-leccion');
    if (modal) modal.classList.add('activo');
    
    const visualesEl = document.getElementById('lec-visuales');
    if (visualesEl) {
        visualesEl.addEventListener('change', function() {
            const campo = document.getElementById('lec-campo-visuales');
            if (campo) campo.style.display = this.value === 'si' ? 'block' : 'none';
        });
    }
    const actividadEl = document.getElementById('lec-actividad');
    if (actividadEl) {
        actividadEl.addEventListener('change', function() {
            const campo = document.getElementById('lec-campo-actividad');
            if (campo) campo.style.display = this.value === 'si' ? 'block' : 'none';
        });
    }
}

document.getElementById('form-nueva-leccion').addEventListener('submit', async function(e) {
    e.preventDefault();
    const titulo = document.getElementById('lec-titulo');
    const seccion = document.getElementById('lec-seccion');
    const fecha = document.getElementById('lec-fecha');
    const descripcion = document.getElementById('lec-descripcion');
    const memorizado = document.getElementById('lec-memorizado');
    const visuales = document.getElementById('lec-visuales');
    const actividad = document.getElementById('lec-actividad');
    const descActividad = document.getElementById('lec-descripcion-actividad');
    const bosquejoFile = document.getElementById('lec-bosquejo-archivo');
    const visualesFile = document.getElementById('lec-archivo-visuales');
    const hojaFile = document.getElementById('lec-hoja-archivo');

    if (!titulo || !seccion || !fecha || !memorizado || !bosquejoFile) {
        mostrarNotificacion("Completa todos los campos obligatorios", "error");
        return;
    }
    
    const tituloVal = titulo.value.trim();
    const seccionVal = seccion.value;
    const fechaVal = fecha.value;
    const descripcionVal = descripcion ? descripcion.value.trim() : '';
    const memorizadoVal = memorizado.value.trim();
    const usoVisuales = visuales ? visuales.value === 'si' : false;
    const realizoActividad = actividad ? actividad.value === 'si' : false;
    const descActividadVal = descActividad ? descActividad.value.trim() : '';
    const bosquejoFileVal = bosquejoFile.files[0];
    const visualesFileVal = visualesFile ? visualesFile.files[0] : null;
    const hojaFileVal = hojaFile ? hojaFile.files[0] : null;

    if (!tituloVal || !seccionVal || !fechaVal || !memorizadoVal) {
        mostrarNotificacion("Completa todos los campos obligatorios", "error");
        return;
    }
    if (!bosquejoFileVal) {
        mostrarNotificacion("Sube el bosquejo de la clase", "error");
        return;
    }
    if (usoVisuales && !visualesFileVal) {
        mostrarNotificacion("Sube los visuales que usaste", "error");
        return;
    }
    if (realizoActividad && !descActividadVal) {
        mostrarNotificacion("Describe la actividad que realizaste", "error");
        return;
    }

    const archivosSubidos = [];
    try {
        const bosquejoSubido = await subirArchivoStorage('lecciones', bosquejoFileVal);
        archivosSubidos.push(bosquejoSubido);
        let visualesData = null;
        if (visualesFileVal) {
            const visualesSubidos = await subirArchivoStorage('lecciones', visualesFileVal);
            archivosSubidos.push(visualesSubidos);
            visualesData = visualesSubidos.url;
        }
        let hojaTrabajoData = null;
        if (hojaFileVal) {
            const hojaSubida = await subirArchivoStorage('lecciones', hojaFileVal);
            archivosSubidos.push(hojaSubida);
            hojaTrabajoData = hojaSubida.url;
        }

        const leccion = {
            titulo: tituloVal,
            seccion: seccionVal,
            fecha_domingo: fechaVal,
            autor: usuarioSesion.nombre,
            descripcion: descripcionVal,
            texto_memorizado: memorizadoVal,
            uso_visuales: usoVisuales,
            visuales: visualesData,
            realizo_actividad: realizoActividad,
            descripcion_actividad: descActividadVal,
            bosquejo: bosquejoSubido.url,
            hoja_trabajo: hojaTrabajoData,
            estado: 'pre-inscripcion',
            veces_editado: 0,
            lecturas: 0
        };

        const resultadoLeccion = await llamarSupabase("lecciones", { method: "POST", body: JSON.stringify(leccion) });
        if (!resultadoLeccion) throw new Error('No se pudo enviar la lección a Supabase.');
        archivosSubidos.length = 0;
        mostrarNotificacion("Lección enviada para revisión del administrador.", "success");
        if (!modoPrueba && !modoOffline) {
            const fechaLegible = mostrarFechaLegible(fechaVal);
            if (usuarioSesion.rol !== 'admin') {
                registrarNotificacionImportante({
                    id: `leccion-${usuarioSesion.email}-${Date.now()}`,
                    mensaje: `Lección enviada · ${tituloVal}`,
                    detalle: `${seccionVal} · domingo ${fechaLegible}.`,
                    tipo: 'success'
                });
            }
        }
        cerrarNuevaLeccion();
        cargarBiblioteca();
        await guardarLog({ usuario: usuarioSesion.nombre, accion: 'Envió lección "' + tituloVal + '" para ' + seccionVal, fecha: new Date().toISOString() });
    } catch (error) {
        console.error("Error:", error);
        await eliminarArchivosStorage(archivosSubidos);
        mostrarNotificacion(error.message || "Error al enviar la lección", "error");
    }
});

function cerrarNuevaLeccion() {
    const modal = document.getElementById('modal-nueva-leccion');
    if (modal) modal.classList.remove('activo');
    const form = document.getElementById('form-nueva-leccion');
    if (form) form.reset();
    const visualesCampo = document.getElementById('lec-campo-visuales');
    if (visualesCampo) visualesCampo.style.display = 'none';
    const actividadCampo = document.getElementById('lec-campo-actividad');
    if (actividadCampo) actividadCampo.style.display = 'none';
}

async function subirArchivoStorage(bucket, archivo) {
    if (modoPrueba) {
        return { url: URL.createObjectURL(archivo), bucket: null, path: null, client: null };
    }
    if (!navigator.onLine || modoOffline) {
        throw new Error('Necesitas conexión a internet para subir archivos.');
    }
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        throw new Error('Configura Supabase antes de subir archivos.');
    }

    if (!window.supabase?.createClient) {
        if (window.ZK360CargarSupabaseSDK) {
            await window.ZK360CargarSupabaseSDK();
        } else {
            if (!promesaSDKStorage) {
                promesaSDKStorage = new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.50.0';
                    script.async = true;
                    script.onload = () => window.supabase?.createClient
                        ? resolve()
                        : reject(new Error('No se pudo cargar el cliente de almacenamiento de Supabase.'));
                    script.onerror = () => reject(new Error('No se pudo cargar el cliente de almacenamiento de Supabase.'));
                    document.head.appendChild(script);
                }).catch(error => {
                    promesaSDKStorage = null;
                    throw error;
                });
            }
            await promesaSDKStorage;
        }
    }
    if (!window.supabase?.createClient) {
        throw new Error('No se pudo cargar el cliente de almacenamiento de Supabase.');
    }

    let sesion;
    try {
        sesion = JSON.parse(sessionStorage.getItem('zk360_supabase_session') || '{}');
    } catch (error) {
        console.error('No se pudo leer la sesión activa de Supabase:', error);
        throw new Error('No se pudo leer la sesión activa de Supabase.');
    }
    if (!sesion.access_token) throw new Error('Inicia sesión nuevamente antes de subir archivos.');
    if (sesion.expires_at && sesion.expires_at * 1000 <= Date.now()) {
        if (!sesion.refresh_token) throw new Error('La sesión expiró. Inicia sesión nuevamente para subir archivos.');
        const renovacion = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
            method: 'POST',
            cache: 'no-store',
            headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: sesion.refresh_token })
        });
        const sesionRenovada = await renovacion.json().catch(() => ({}));
        if (!renovacion.ok || !sesionRenovada.access_token) {
            throw new Error('La sesión expiró y no pudo renovarse. Inicia sesión nuevamente.');
        }
        sesion = {
            access_token: sesionRenovada.access_token,
            refresh_token: sesionRenovada.refresh_token,
            expires_at: sesionRenovada.expires_at,
            user: sesionRenovada.user
        };
        sessionStorage.setItem('zk360_supabase_session', JSON.stringify(sesion));
    }

    const cliente = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        },
        global: {
            headers: { Authorization: `Bearer ${sesion.access_token}` }
        }
    });

    const correo = String(usuarioSesion.email || 'usuario').toLowerCase();
    const extension = archivo.name.includes('.') ? archivo.name.split('.').pop().replace(/[^a-z0-9]/gi, '') : '';
    const identificador = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const nombreArchivo = `${identificador}${extension ? `.${extension}` : ''}`;
    const ruta = `${correo}/${nombreArchivo}`;
    const { error } = await cliente.storage.from(bucket).upload(ruta, archivo, {
        cacheControl: '3600',
        contentType: archivo.type || 'application/octet-stream',
        upsert: false
    });
    if (error) throw new Error(`No se pudo subir el archivo al bucket "${bucket}": ${error.message}`);

    const { data } = cliente.storage.from(bucket).getPublicUrl(ruta);
    if (!data?.publicUrl) {
        await cliente.storage.from(bucket).remove([ruta]);
        throw new Error(`Supabase no devolvió una URL pública para el bucket "${bucket}".`);
    }
    return { url: data.publicUrl, bucket, path: ruta, client: cliente };
}

async function eliminarArchivosStorage(archivos) {
    for (const archivo of archivos) {
        if (!archivo?.client || !archivo.bucket || !archivo.path) continue;
        const { error } = await archivo.client.storage.from(archivo.bucket).remove([archivo.path]);
        if (error) console.error(`No se pudo limpiar el archivo ${archivo.path}:`, error);
    }
}

// ============ GALERÍA ============
async function cargarGaleria(filtro) {
    const grid = document.getElementById('grid-galeria');
    if (!grid) return;
    
    try {
        let endpoint = "galeria?order=id.desc";
        if (filtro === 'cumpleaneros') {
            endpoint = "galeria?es_cumpleanero=eq.true&order=id.desc";
        } else if (filtro !== 'todas') {
            endpoint = 'galeria?seccion=eq.' + filtro + '&order=id.desc';
        }
        const fotos = await llamarSupabase(endpoint);
        if (!fotos || fotos.length === 0) {
            if (filtro === 'cumpleaneros') {
                grid.innerHTML = `
                    <div style="grid-column:1/-1; text-align:center; padding:40px;">
                        <i class="fas fa-cake-candles" style="font-size:48px; color:#f39c12;"></i>
                        <p style="color:#95a5a6; margin-top:15px;">No hay fotos de cumpleañeros publicadas</p>
                        <button class="btn-admin" onclick="abrirSubirFoto()" style="margin-top:10px;">
                            <i class="fas fa-camera"></i> Subir foto de cumpleañero
                        </button>
                    </div>
                `;
                return;
            }
            grid.innerHTML = '<p style="color:#95a5a6; text-align:center; grid-column:1/-1; padding:30px;">No hay fotos en esta sección.</p>';
            return;
        }
        grid.innerHTML = fotos.map(f => `
            <div class="tarjeta-galeria animacion-entrada">
                <img src="${f.archivo}" alt="${f.descripcion || 'Foto de clase'}">
                <div style="padding:10px;">
                    <p style="font-size:12px; color:#555;">${f.descripcion || 'Foto de clase'}</p>
                    <p style="font-size:10px; color:#95a5a6;">${new Date(f.creado_en).toLocaleDateString()} - ${f.maestro}</p>
                    ${f.es_cumpleanero ? '<span style="font-size:10px; color:#f39c12;"><i class="fas fa-cake-candles"></i> Cumpleañero</span>' : ''}
                    ${usuarioSesion.rol === 'admin' ? `
                        <button class="btn-admin btn-danger" style="font-size:10px; padding:2px 8px; margin-top:5px;" onclick="eliminarFotoGaleria(${f.id})">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    ` : ''}
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error("Error:", error);
        grid.innerHTML = '<p style="color:#ff7675; text-align:center; grid-column:1/-1; padding:30px;">Error al cargar las fotos</p>';
    }
}

function filtrarGaleria(termino) {
    const tarjetas = document.querySelectorAll('.tarjeta-galeria');
    const busqueda = termino.toLowerCase().trim();
    tarjetas.forEach(tarjeta => {
        const texto = tarjeta.textContent.toLowerCase();
        tarjeta.style.display = texto.includes(busqueda) ? 'block' : 'none';
    });
}

function abrirSubirFoto() {
    const hoy = new Date();
    if (!estaEnHorarioAsistencia(hoy)) {
        mostrarNotificacion(`Solo puedes subir fotos durante el horario configurado (${configuracionHorario.hora_inicio_asistencia}–${configuracionHorario.hora_fin_asistencia}).`, "warning");
        return;
    }
    if (!seccionAsignadaMaestro || seccionAsignadaMaestro === "admin_total") {
        mostrarNotificacion("Solo maestros con clase asignada pueden subir fotos", "warning");
        return;
    }
    const modal = document.getElementById('modal-subir-foto');
    if (modal) modal.classList.add('activo');
}

function cerrarSubirFoto() {
    const modal = document.getElementById('modal-subir-foto');
    if (modal) modal.classList.remove('activo');
    const form = document.getElementById('form-subir-foto');
    if (form) form.reset();
}

async function subirFotoGaleria() {
    const archivoInput = document.getElementById('foto-archivo');
    if (!archivoInput) return;
    const archivo = archivoInput.files[0];
    if (!archivo) {
        mostrarNotificacion("Selecciona una foto", "error");
        return;
    }

    let archivoSubido = null;
    try {
        archivoSubido = await subirArchivoStorage('galeria', archivo);
        const fotoData = {
            maestro: usuarioSesion.nombre,
            seccion: seccionAsignadaMaestro,
            fecha_domingo: calcularProximoDomingo(),
            archivo: archivoSubido.url,
            tipo: 'imagen',
            descripcion: document.getElementById('foto-descripcion') ? document.getElementById('foto-descripcion').value.trim() || 'Publicado por ' + usuarioSesion.nombre : 'Publicado por ' + usuarioSesion.nombre,
            es_cumpleanero: false,
            foto_subida: true
        };
        const resultadoFoto = await llamarSupabase("galeria", { method: "POST", body: JSON.stringify(fotoData) });
        if (!resultadoFoto) throw new Error('No se pudo guardar la foto.');
        archivoSubido = null;
        const fechaLegible = mostrarFechaLegible(fotoData.fecha_domingo);
        mostrarNotificacion(`Foto publicada para el ${fechaLegible}.`, "success");
        if (!modoPrueba && !modoOffline) {
            if (usuarioSesion.rol !== 'admin') {
                registrarNotificacionImportante({
                    id: `foto-${usuarioSesion.email}-${Date.now()}`,
                    mensaje: `Foto publicada · ${fechaLegible}`,
                    detalle: fotoData.descripcion,
                    tipo: 'success'
                });
            }
            await guardarLog({
                usuario: usuarioSesion.nombre,
                accion: `Subió foto para ${fotoData.seccion} (${fechaLegible})`,
                fecha: new Date().toISOString()
            });
        }
        cerrarSubirFoto();
        cargarGaleria('todas');
    } catch (error) {
        console.error("Error:", error);
        if (archivoSubido) await eliminarArchivosStorage([archivoSubido]);
        mostrarNotificacion(error.message || "Error al subir la foto", "error");
    }
}

async function eliminarFotoGaleria(id) {
    if (!(await confirmarAccion('¿Eliminar esta foto permanentemente?'))) return;
    try {
        await llamarSupabase('galeria?id=eq.' + id, { method: "DELETE" });
        mostrarNotificacion('Foto eliminada', 'success');
        cargarGaleria('todas');
    } catch (error) {
        console.error("Error:", error);
        mostrarNotificacion('Error al eliminar la foto', 'error');
    }
}

// ============ CHAT ============
async function cargarChats() {
    const lista = document.getElementById('lista-chats');
    if (!lista) return;
    
    try {
        const grupo = document.createElement('button');
        grupo.type = 'button';
        grupo.style.cssText = `width:100%;text-align:left;margin-bottom:10px;padding:10px;background:${chatGrupalAbierto ? '#e8f4ff' : '#f8f9fa'};border:0;border-radius:12px;cursor:pointer;`;
        const tituloGrupo = document.createElement('strong');
        const iconoGrupo = document.createElement('i');
        iconoGrupo.className = 'fas fa-users';
        tituloGrupo.append(iconoGrupo, document.createTextNode(' Grupo General'));
        const descripcionGrupo = document.createElement('p');
        descripcionGrupo.style.cssText = 'font-size:12px;color:#747d8c;margin:0;';
        descripcionGrupo.textContent = 'Todos los usuarios';
        grupo.append(tituloGrupo, descripcionGrupo);
        grupo.addEventListener('click', abrirChatGrupal);
        const elementos = [grupo];
        const contactosGuardados = JSON.parse(localStorage.getItem('zk360_contactos_' + usuarioSesion.email) || '[]');
        const contactos = Array.isArray(contactosGuardados) ? contactosGuardados.slice(0, 100) : [];
        if (contactos.length > 0) {
            const bloqueContactos = document.createElement('div');
            bloqueContactos.style.marginTop = '10px';
            const encabezado = document.createElement('p');
            encabezado.style.cssText = 'font-size:12px;color:#95a5a6;margin-bottom:8px;';
            encabezado.textContent = 'Contactos Personales';
            bloqueContactos.appendChild(encabezado);
            for (const email of contactos) {
                if (typeof email !== 'string') continue;
                const usuarios = await llamarSupabase('usuarios?email=eq.' + encodeURIComponent(email));
                if (usuarios && usuarios.length > 0) {
                    const u = usuarios[0];
                    const esActivo = chatPersonalCon === email;
                    const contacto = document.createElement('button');
                    contacto.type = 'button';
                    contacto.style.cssText = `width:100%;padding:10px;border:0;border-bottom:1px solid #eef2f7;cursor:pointer;display:flex;align-items:center;gap:10px;background:${esActivo ? '#e8f4ff' : 'transparent'};border-radius:8px;text-align:left;`;
                    const avatar = document.createElement('span');
                    avatar.style.cssText = 'width:35px;height:35px;flex:0 0 35px;border-radius:50%;background:#2575fc;color:white;display:flex;align-items:center;justify-content:center;font-weight:bold;';
                    avatar.textContent = String(u.nombre || email).charAt(0);
                    const datos = document.createElement('span');
                    const nombre = document.createElement('strong');
                    nombre.textContent = u.nombre || '';
                    const correo = document.createElement('span');
                    correo.style.cssText = 'display:block;font-size:11px;color:#95a5a6;margin:0;';
                    correo.textContent = email;
                    datos.append(nombre, correo);
                    contacto.append(avatar, datos);
                    contacto.addEventListener('click', () => abrirChatPersonal(email));
                    bloqueContactos.appendChild(contacto);
                }
            }
            elementos.push(bloqueContactos);
        }
        lista.replaceChildren(...elementos);
    } catch (error) {
        console.error("Error:", error);
        const aviso = document.createElement('p');
        aviso.style.cssText = 'color:#ff7675;text-align:center;padding:20px;';
        aviso.textContent = 'Error al cargar contactos';
        lista.replaceChildren(aviso);
    }
}

function buscarContactos(termino) {
    const contactos = document.querySelectorAll('#lista-chats > *');
    const busqueda = termino.toLowerCase().trim();
    contactos.forEach(contacto => {
        const texto = contacto.textContent.toLowerCase();
        contacto.style.display = texto.includes(busqueda) ? 'block' : 'none';
    });
}

function claveUltimoChatLeido(chat) {
    return `zk360_chat_leido_${String(usuarioSesion.email || '').toLowerCase()}_${chat}`;
}

function mensajeOcultoParaUsuario(mensaje) {
    const usuario = String(usuarioSesion.email || '').toLowerCase();
    return Array.isArray(mensaje.eliminado_para) &&
        mensaje.eliminado_para.some(email => String(email).toLowerCase() === usuario);
}

function marcarChatLeido(chat, mensajes) {
    const masReciente = (mensajes || []).reduce((maximo, mensaje) => {
        const instante = new Date(mensaje.creado_en || 0).getTime();
        return Number.isFinite(instante) ? Math.max(maximo, instante) : maximo;
    }, 0);
    if (masReciente) localStorage.setItem(claveUltimoChatLeido(chat), String(masReciente));
}

function actualizarBadgeChatConConteo(conteo) {
    const badge = document.getElementById('badge-chat-no-leidos');
    if (!badge) return;
    badge.hidden = conteo <= 0;
    badge.textContent = conteo > 99 ? '99+' : String(conteo);
    badge.title = conteo ? `${conteo} mensaje(s) sin leer` : '';
    badge.setAttribute('aria-label', conteo ? `${conteo} mensaje(s) sin leer` : 'Sin mensajes sin leer');
    badge.style.cssText = 'margin-left:auto;min-width:20px;height:20px;padding:0 6px;border-radius:999px;background:#e53935;color:#fff;font-size:11px;font-weight:700;line-height:20px;text-align:center;';
}

async function actualizarBadgeChat() {
    if (!usuarioSesion?.email || !navigator.onLine && !modoPrueba) return;
    try {
        const contactosGuardados = JSON.parse(localStorage.getItem('zk360_contactos_' + usuarioSesion.email) || '[]');
        const contactos = Array.isArray(contactosGuardados)
            ? [...new Set(contactosGuardados.filter(email => typeof email === 'string').slice(0, 100))]
            : [];
        const correoUsuario = encodeURIComponent(usuarioSesion.email);
        const [mensajesGrupo, mensajesDirectos] = await Promise.all([
            llamarSupabase('mensajes?receptor=is.null&order=id.desc&limit=1000'),
            contactos.length
                ? llamarSupabase(`mensajes?or=(emisor.eq.${correoUsuario},receptor.eq.${correoUsuario})&receptor=not.is.null&order=id.desc&limit=1000`)
                : Promise.resolve([])
        ]);
        if (!Array.isArray(mensajesGrupo) || !Array.isArray(mensajesDirectos)) return;
        const resultados = [{ chat: 'grupo', mensajes: mensajesGrupo }];
        for (const email of contactos) {
            resultados.push({
                chat: `personal_${email.toLowerCase()}`,
                mensajes: Array.isArray(mensajesDirectos)
                    ? mensajesDirectos.filter(mensaje =>
                        (mensaje.emisor === usuarioSesion.email && mensaje.receptor === email) ||
                        (mensaje.emisor === email && mensaje.receptor === usuarioSesion.email)
                    )
                    : null
            });
        }
        let total = 0;
        for (const resultado of resultados) {
            if (!Array.isArray(resultado.mensajes)) continue;
            const mensajes = resultado.mensajes.filter(mensaje =>
                mensaje.emisor !== usuarioSesion.email &&
                !mensajeOcultoParaUsuario(mensaje)
            );
            const clave = claveUltimoChatLeido(resultado.chat);
            const marcaGuardada = localStorage.getItem(clave);
            let ultimoLeido = marcaGuardada === null ? null : Number(marcaGuardada);
            if (ultimoLeido === null || !Number.isFinite(ultimoLeido)) {
                if (resultado.mensajes.length) marcarChatLeido(resultado.chat, resultado.mensajes);
                else localStorage.setItem(clave, '0');
                ultimoLeido = Number(localStorage.getItem(clave)) || 0;
            }
            const moduloVisible = document.getElementById('modulo-chat')?.classList.contains('activo');
            const conversacionVisible = document.getElementById('chat-conversacion')?.style.display !== 'none';
            const hiloActivo = moduloVisible && conversacionVisible &&
                resultado.chat === (chatGrupalAbierto
                    ? 'grupo'
                    : `personal_${String(chatPersonalCon || '').toLowerCase()}`);
            if (hiloActivo) {
                marcarChatLeido(resultado.chat, resultado.mensajes);
                continue;
            }
            total += mensajes.filter(mensaje =>
                new Date(mensaje.creado_en || 0).getTime() > ultimoLeido
            ).length;
        }
        actualizarBadgeChatConConteo(total);
    } catch (error) {
        console.error('No se pudo actualizar el contador de mensajes sin leer:', error);
    }
}

function abrirChatGrupal() {
    secuenciaCargaMensajes++;
    chatGrupalAbierto = true;
    chatPersonalCon = null;
    const mensajes = document.getElementById('chat-mensajes');
    if (mensajes) mensajes.dataset.inicializado = 'false';
    const conversacion = document.getElementById('chat-conversacion');
    if (conversacion) conversacion.style.display = 'block';
    const titulo = document.getElementById('chat-titulo-conversacion');
    if (titulo) titulo.textContent = 'Grupo General';
    const contexto = document.getElementById('chat-contexto');
    if (contexto) contexto.style.display = 'block';
    cargarMensajesGrupales();
    iniciarActualizacionChat();
    cargarChats();
}

function abrirChatPersonal(email) {
    secuenciaCargaMensajes++;
    chatGrupalAbierto = false;
    chatPersonalCon = email;
    const mensajes = document.getElementById('chat-mensajes');
    if (mensajes) mensajes.dataset.inicializado = 'false';
    const conversacion = document.getElementById('chat-conversacion');
    if (conversacion) conversacion.style.display = 'block';
    const titulo = document.getElementById('chat-titulo-conversacion');
    if (titulo) titulo.textContent = email;
    const contexto = document.getElementById('chat-contexto');
    if (contexto) contexto.style.display = 'block';
    llamarSupabase('usuarios?email=eq.' + encodeURIComponent(email)).then(usuarios => {
        if (usuarios && usuarios.length > 0 && titulo) {
            titulo.textContent = usuarios[0].nombre;
        }
    });
    cargarMensajesPersonales(email);
    iniciarActualizacionChat();
    cargarChats();
}

function iniciarActualizacionChat() {
    clearInterval(intervaloActualizacionChat);
    intervaloActualizacionChat = setInterval(() => {
        const conversacion = document.getElementById('chat-conversacion');
        if (document.hidden || !conversacion || conversacion.style.display === 'none') return;
        if (chatGrupalAbierto) cargarMensajesGrupales();
        else if (chatPersonalCon) cargarMensajesPersonales(chatPersonalCon);
    }, 15000);
}

function cerrarConversacion() {
    secuenciaCargaMensajes++;
    clearInterval(intervaloActualizacionChat);
    intervaloActualizacionChat = null;
    const conversacion = document.getElementById('chat-conversacion');
    if (conversacion) conversacion.style.display = 'none';
    const contexto = document.getElementById('chat-contexto');
    if (contexto) contexto.style.display = 'none';
    chatGrupalAbierto = true;
    chatPersonalCon = null;
}

async function cargarMensajesGrupales() {
    const container = document.getElementById('chat-mensajes');
    if (!container) return;
    const secuencia = ++secuenciaCargaMensajes;
    const mantenerAbajo = container.dataset.inicializado !== 'true' ||
        container.scrollHeight - container.scrollTop - container.clientHeight < 60;
    
    try {
        const mensajes = await llamarSupabase("mensajes?receptor=is.null&order=id.desc&limit=100");
        if (secuencia !== secuenciaCargaMensajes || !chatGrupalAbierto) return;
        if (!Array.isArray(mensajes)) {
            mostrarEstadoChat('No se pudieron cargar los mensajes. Revisa la conexión y los permisos del chat.', true);
            return;
        }
        if (mensajes.length === 0) {
            mostrarEstadoChat('Todavía no hay mensajes en el grupo.');
            return;
        }
        marcarChatLeido('grupo', mensajes);
        container.replaceChildren();
        mensajes.slice().reverse().filter(m => !mensajeOcultoParaUsuario(m))
            .forEach(m => container.appendChild(crearElementoMensajeChat(m, true)));
        container.dataset.inicializado = 'true';
        if (mantenerAbajo) container.scrollTop = container.scrollHeight;
        actualizarBadgeChat();
    } catch (error) {
        console.error("Error:", error);
        if (secuencia === secuenciaCargaMensajes) mostrarEstadoChat('Ocurrió un error al cargar los mensajes.', true);
    }
}

async function cargarMensajesPersonales(email) {
    const container = document.getElementById('chat-mensajes');
    if (!container) return;
    const secuencia = ++secuenciaCargaMensajes;
    const mantenerAbajo = container.dataset.inicializado !== 'true' ||
        container.scrollHeight - container.scrollTop - container.clientHeight < 60;
    
    try {
        const usuario = encodeURIComponent(usuarioSesion.email);
        const contacto = encodeURIComponent(email);
        const filtro = `or=(and(emisor.eq.${usuario},receptor.eq.${contacto}),and(emisor.eq.${contacto},receptor.eq.${usuario}))`;
        const mensajes = await llamarSupabase(`mensajes?${filtro}&order=id.desc&limit=100`);
        if (secuencia !== secuenciaCargaMensajes || chatGrupalAbierto || chatPersonalCon !== email) return;
        if (!Array.isArray(mensajes)) {
            mostrarEstadoChat('No se pudieron cargar los mensajes. Revisa la conexión y los permisos del chat.', true);
            return;
        }
        if (mensajes.length === 0) {
            mostrarEstadoChat('Todavía no hay mensajes con este contacto.');
            return;
        }
        const filtrados = mensajes.filter(m =>
            (m.emisor === usuarioSesion.email && m.receptor === email) ||
            (m.emisor === email && m.receptor === usuarioSesion.email)
        ).reverse();
        if (filtrados.length === 0) {
            mostrarEstadoChat('Todavía no hay mensajes con este contacto.');
            return;
        }
        marcarChatLeido(`personal_${email.toLowerCase()}`, filtrados);
        container.replaceChildren();
        filtrados.filter(m => !mensajeOcultoParaUsuario(m))
            .forEach(m => container.appendChild(crearElementoMensajeChat(m, false)));
        container.dataset.inicializado = 'true';
        if (mantenerAbajo) container.scrollTop = container.scrollHeight;
        actualizarBadgeChat();
    } catch (error) {
        console.error("Error:", error);
        if (secuencia === secuenciaCargaMensajes) mostrarEstadoChat('Ocurrió un error al cargar los mensajes.', true);
    }
}

function mostrarEstadoChat(mensaje, error = false) {
    const container = document.getElementById('chat-mensajes');
    if (!container) return;
    const estado = document.createElement('p');
    estado.style.cssText = `color:${error ? '#b42318' : '#747d8c'};text-align:center;padding:16px;`;
    estado.setAttribute('role', error ? 'alert' : 'status');
    estado.textContent = mensaje;
    container.replaceChildren(estado);
}

function crearElementoMensajeChat(mensaje, esGrupo) {
    const esPropio = mensaje.emisor === usuarioSesion.email;
    const fila = document.createElement('div');
    fila.style.cssText = `display:flex;justify-content:${esPropio ? 'flex-end' : 'flex-start'};`;
    const burbuja = document.createElement('div');
    burbuja.className = esPropio ? 'mensaje-propio' : 'mensaje-otro';
    if (esGrupo && !esPropio) {
        const emisor = document.createElement('strong');
        emisor.style.fontSize = '11px';
        emisor.textContent = mensaje.emisor || '';
        burbuja.append(emisor, document.createElement('br'));
    }

    if (mensaje.tipo === 'imagen' && /^https?:\/\//i.test(mensaje.mensaje || '')) {
        const imagen = document.createElement('img');
        imagen.src = mensaje.mensaje;
        imagen.alt = 'Imagen compartida en el chat';
        imagen.loading = 'lazy';
        imagen.style.cssText = 'display:block;max-width:min(260px,65vw);max-height:260px;object-fit:contain;border-radius:8px;';
        burbuja.appendChild(imagen);
    } else {
        const contenido = document.createElement('span');
        contenido.textContent = mensaje.tipo === 'imagen' ? 'Imagen no disponible' : mensaje.mensaje || '';
        burbuja.appendChild(contenido);
    }

    const hora = document.createElement('span');
    hora.style.cssText = `font-size:9px;color:${esPropio ? 'rgba(255,255,255,0.7)' : '#95a5a6'};display:block;text-align:right;`;
    const fecha = new Date(mensaje.creado_en);
    hora.textContent = Number.isNaN(fecha.getTime()) ? '' : fecha.toLocaleTimeString();
    burbuja.appendChild(hora);

    if (mensaje.id != null && (esPropio || usuarioSesion.rol === 'admin')) {
        const eliminar = document.createElement('button');
        eliminar.type = 'button';
        eliminar.className = 'btn-cerrar-modal';
        eliminar.textContent = 'Eliminar';
        eliminar.setAttribute('aria-label', 'Eliminar mensaje');
        eliminar.style.cssText = 'display:block;margin:4px 0 0 auto;padding:2px 6px;font-size:10px;';
        eliminar.addEventListener('click', () => eliminarMensajeChat(mensaje));
        burbuja.appendChild(eliminar);
    }
    fila.appendChild(burbuja);
    return fila;
}

async function eliminarMensajeChat(mensaje) {
    const esAdmin = usuarioSesion.rol === 'admin';
    const confirmado = await confirmarAccion(esAdmin
        ? '¿Eliminar permanentemente este mensaje?'
        : '¿Ocultar este mensaje solo de tu chat?');
    if (!confirmado) return;
    try {
        let resultado;
        if (esAdmin) {
            resultado = await llamarSupabase(`mensajes?id=eq.${encodeURIComponent(mensaje.id)}`, { method: 'DELETE' });
        } else {
            const eliminados = Array.isArray(mensaje.eliminado_para) ? mensaje.eliminado_para : [];
            const eliminadoPara = [...new Set([...eliminados, usuarioSesion.email.toLowerCase()])];
            resultado = await llamarSupabase(`mensajes?id=eq.${encodeURIComponent(mensaje.id)}&emisor=eq.${encodeURIComponent(usuarioSesion.email)}`, {
                method: 'PATCH',
                body: JSON.stringify({ eliminado_para: eliminadoPara })
            });
        }
        if (resultado === null) throw new Error('No se pudo eliminar el mensaje.');
        mostrarNotificacion(esAdmin ? 'Mensaje eliminado.' : 'Mensaje ocultado de tu chat.', 'success');
        if (chatGrupalAbierto) await cargarMensajesGrupales();
        else if (chatPersonalCon) await cargarMensajesPersonales(chatPersonalCon);
    } catch (error) {
        console.error('Error eliminando mensaje:', error);
        mostrarNotificacion(error.message || 'No se pudo eliminar el mensaje.', 'error');
    }
}

async function enviarPushChat(destinatario, texto, titulo = 'ZoarKids 360') {
    try {
        const tokens = await llamarSupabase(
            `push_tokens?email=eq.${encodeURIComponent(destinatario)}&select=token`
        );
        if (!Array.isArray(tokens) || !tokens.length) {
            mostrarNotificacion('Mensaje enviado, pero el destinatario no tiene un dispositivo con notificaciones push registradas.', 'warning');
            return;
        }
        const sesion = JSON.parse(sessionStorage.getItem('zk360_supabase_session') || '{}');
        for (const registro of tokens) {
            const respuesta = await fetch(`${SUPABASE_URL}/functions/v1/enviar-push`, {
                method: 'POST',
                headers: {
                    apikey: SUPABASE_ANON_KEY,
                    Authorization: `Bearer ${sesion.access_token || SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    token: registro.token,
                    titulo,
                    mensaje: texto.slice(0, 180)
                })
            });
            if (!respuesta.ok) {
                const detalle = await respuesta.text();
                throw new Error(`La función enviar-push respondió ${respuesta.status}: ${detalle.slice(0, 160)}`);
            }
        }
    } catch (error) {
        console.error('No se pudo enviar la notificación push del chat:', error);
        mostrarNotificacion('El mensaje se envió, pero no se pudo entregar la notificación push.', 'warning');
    }
}

async function enviarImagenChat(evento) {
    const inputArchivo = evento.currentTarget;
    const archivo = inputArchivo.files?.[0];
    if (!archivo) return;
    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!tiposPermitidos.includes(archivo.type) || archivo.size > 1024 * 1024) {
        mostrarNotificacion('Selecciona una imagen PNG, JPG, WEBP o GIF de hasta 1 MB.', 'warning');
        inputArchivo.value = '';
        return;
    }
    let archivoSubido = null;
    try {
        archivoSubido = await subirArchivoStorage('galeria', archivo);
        const enviado = await enviarMensaje({ tipo: 'imagen', mensaje: archivoSubido.url });
        if (!enviado) await eliminarArchivosStorage([archivoSubido]);
        else archivoSubido = null;
    } catch (error) {
        console.error('No se pudo preparar la imagen del chat:', error);
        if (archivoSubido) await eliminarArchivosStorage([archivoSubido]);
        mostrarNotificacion(error.message || 'No se pudo preparar la imagen.', 'error');
    } finally {
        inputArchivo.value = '';
    }
}

async function enviarMensaje(adjunto = null) {
    const input = document.getElementById('chat-input-texto');
    if (!input) return;
    const mensaje = adjunto?.mensaje || input.value.trim();
    if (!mensaje || input.dataset.enviando === 'true') return;

    input.dataset.enviando = 'true';
    const botonEnviar = input.parentElement?.querySelector('button[aria-label="Enviar mensaje"]');
    if (botonEnviar) botonEnviar.disabled = true;
    try {
        const datos = {
            emisor: usuarioSesion.email,
            mensaje: mensaje,
            tipo: adjunto?.tipo || 'texto'
        };
        if (chatGrupalAbierto) {
            datos.receptor = null;
        } else if (chatPersonalCon) {
            datos.receptor = chatPersonalCon;
        } else {
            mostrarNotificacion("Selecciona un chat primero", "warning");
            return;
        }

        const guardado = await llamarSupabase("mensajes", { method: "POST", body: JSON.stringify(datos) });
        if (!guardado) throw new Error('No se pudo guardar el mensaje.');
        if (!adjunto) input.value = '';
        if (chatGrupalAbierto) {
            cargarMensajesGrupales();
            if (!modoPrueba && !modoOffline && navigator.onLine) {
                const usuarios = await llamarSupabase('usuarios?select=email');
                const destinatarios = [...new Set((Array.isArray(usuarios) ? usuarios : [])
                    .map(usuario => String(usuario.email || '').trim().toLowerCase())
                    .filter(email => email && email !== String(usuarioSesion.email).toLowerCase()))];
                await Promise.all(destinatarios.map(email =>
                    enviarPushChat(email, `${usuarioSesion.nombre}: ${mensaje}`, 'Nuevo mensaje en el chat')
                ));
            }
        } else if (chatPersonalCon) {
            cargarMensajesPersonales(chatPersonalCon);
            if (!modoPrueba && !modoOffline && navigator.onLine) {
                void enviarPushChat(
                    chatPersonalCon,
                    adjunto ? `${usuarioSesion.nombre} te envió una imagen.` : `${usuarioSesion.nombre}: ${mensaje}`,
                    'Nuevo mensaje en el chat'
                );
            }
        }
        return true;
    } catch (error) {
        console.error("Error:", error);
        mostrarNotificacion(error.message || "No se pudo enviar el mensaje. El texto sigue en el campo para que puedas reintentarlo.", "error");
        return false;
    } finally {
        delete input.dataset.enviando;
        if (botonEnviar) botonEnviar.disabled = false;
    }
}

// ============ AGREGAR CONTACTO ============
function abrirAgregarContacto() {
    const modal = document.getElementById('modal-agregar-contacto');
    if (modal) modal.classList.add('activo');
    const input = document.getElementById('contacto-email');
    if (input) input.focus();
}

function cerrarAgregarContacto() {
    const modal = document.getElementById('modal-agregar-contacto');
    if (modal) modal.classList.remove('activo');
    const input = document.getElementById('contacto-email');
    if (input) input.value = '';
}

async function agregarContacto() {
    const input = document.getElementById('contacto-email');
    if (!input) return;
    const email = input.value.trim().toLowerCase();
    if (!email || !email.endsWith('@iglesiazoarsv.org')) {
        mostrarNotificacion("Ingresa un correo válido @iglesiazoarsv.org", "error");
        return;
    }
    if (email === usuarioSesion.email) {
        mostrarNotificacion("No puedes agregarte a ti mismo", "error");
        return;
    }

    try {
        const usuarios = await llamarSupabase('usuarios?email=eq.' + encodeURIComponent(email));
        if (!usuarios || usuarios.length === 0) {
            mostrarNotificacion("No se encontró ningún usuario con ese correo", "error");
            return;
        }
        
        const contactosUsuario = JSON.parse(localStorage.getItem('zk360_contactos_' + usuarioSesion.email) || '[]');
        if (!contactosUsuario.includes(email)) {
            contactosUsuario.push(email);
            localStorage.setItem('zk360_contactos_' + usuarioSesion.email, JSON.stringify(contactosUsuario));
        }
        
        const contactosDestino = JSON.parse(localStorage.getItem('zk360_contactos_' + email) || '[]');
        if (!contactosDestino.includes(usuarioSesion.email)) {
            contactosDestino.push(usuarioSesion.email);
            localStorage.setItem('zk360_contactos_' + email, JSON.stringify(contactosDestino));
        }
        
        mostrarNotificacion("Contacto agregado con éxito", "success");
        cerrarAgregarContacto();
        cargarChats();
        abrirChatPersonal(email);
    } catch (error) {
        console.error("Error:", error);
        mostrarNotificacion("Error al agregar contacto", "error");
    }
}

// ============ SUGERENCIAS ============
function abrirSugerencia() {
    const area = document.getElementById('area-mensaje-ayuda');
    const textarea = document.getElementById('txt-ayuda-mensaje');
    if (area) area.style.display = 'block';
    const estado = document.getElementById('estado-feedback-usuario');
    if (estado) estado.hidden = true;
    if (textarea) {
        textarea.placeholder = 'Escribe tu sugerencia para mejorar ZoarKids 360...';
        textarea.focus();
    }
    
    const btnSugerencia = document.querySelector('.btn-enviar-sugerencia');
    const btnReporte = document.querySelector('.btn-reportar-error');
    if (btnSugerencia) btnSugerencia.style.display = 'inline-flex';
    if (btnReporte) btnReporte.style.display = 'none';
    
    const manual = document.getElementById('manual-uso-container');
    if (manual) manual.style.display = 'none';
}

function abrirReporteError() {
    const area = document.getElementById('area-mensaje-ayuda');
    const textarea = document.getElementById('txt-ayuda-mensaje');
    if (area) area.style.display = 'block';
    const estado = document.getElementById('estado-feedback-usuario');
    if (estado) estado.hidden = true;
    if (textarea) {
        textarea.placeholder = 'Describe el error que encontraste...';
        textarea.focus();
    }
    
    const btnSugerencia = document.querySelector('.btn-enviar-sugerencia');
    const btnReporte = document.querySelector('.btn-reportar-error');
    if (btnSugerencia) btnSugerencia.style.display = 'none';
    if (btnReporte) btnReporte.style.display = 'inline-flex';
    
    const manual = document.getElementById('manual-uso-container');
    if (manual) manual.style.display = 'none';
}

function toggleManual() {
    const container = document.getElementById('manual-uso-container');
    if (!container) return;
    if (container.style.display === 'block') {
        container.style.display = 'none';
    } else {
        container.style.display = 'block';
        const area = document.getElementById('area-mensaje-ayuda');
        if (area) area.style.display = 'none';
        container.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

async function enviarSugerencia() {
    const textarea = document.getElementById('txt-ayuda-mensaje');
    if (!textarea) return;
    const mensaje = textarea.value.trim();
    if (!mensaje || mensaje.length < 10) {
        mostrarNotificacion('Escribe una sugerencia de al menos 10 caracteres', 'error');
        return;
    }
    if (mensaje.length > 500) {
        mostrarNotificacion('El mensaje no puede exceder los 500 caracteres', 'error');
        return;
    }
    try {
        const guardado = await llamarSupabase('sugerencias', {
            method: 'POST',
            body: JSON.stringify({ usuario: usuarioSesion.nombre, tipo: 'sugerencia', mensaje, fecha: new Date().toISOString(), estado: 'en_proceso' })
        });
        if (!guardado) throw new Error('No se confirmó el envío de la sugerencia.');
        mostrarNotificacion('Sugerencia enviada al administrador', 'success');
        const area = document.getElementById('area-mensaje-ayuda');
        if (area) area.style.display = 'none';
        const estado = document.getElementById('estado-feedback-usuario');
        if (estado) {
            estado.textContent = 'Estado: En proceso. El administrador revisará tu sugerencia.';
            estado.hidden = false;
        }
        if (textarea) textarea.value = '';
        await guardarLog({ usuario: usuarioSesion.nombre, accion: 'Envió sugerencia', fecha: new Date().toISOString() });
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('Error al enviar la sugerencia', 'error');
    }
}

async function enviarReporteError() {
    const textarea = document.getElementById('txt-ayuda-mensaje');
    if (!textarea) return;
    const mensaje = textarea.value.trim();
    if (!mensaje || mensaje.length < 10) {
        mostrarNotificacion('Describe el error con al menos 10 caracteres', 'error');
        return;
    }
    if (mensaje.length > 500) {
        mostrarNotificacion('El mensaje no puede exceder los 500 caracteres', 'error');
        return;
    }
    try {
        const guardado = await llamarSupabase('sugerencias', {
            method: 'POST',
            body: JSON.stringify({ usuario: usuarioSesion.nombre, tipo: 'reporte', mensaje, fecha: new Date().toISOString(), estado: 'en_proceso' })
        });
        if (!guardado) throw new Error('No se confirmó el envío del reporte.');
        mostrarNotificacion('Reporte enviado al administrador', 'success');
        const area = document.getElementById('area-mensaje-ayuda');
        if (area) area.style.display = 'none';
        const estado = document.getElementById('estado-feedback-usuario');
        if (estado) {
            estado.textContent = 'Estado: En proceso. El administrador revisará tu reporte.';
            estado.hidden = false;
        }
        if (textarea) textarea.value = '';
        await guardarLog({ usuario: usuarioSesion.nombre, accion: 'Envió reporte de error', fecha: new Date().toISOString() });
    } catch (error) {
        console.error('Error:', error);
        mostrarNotificacion('Error al enviar el reporte', 'error');
    }
}

// ============ HISTORIAL ============
async function cargarHistorial() {
    const tabla = document.getElementById('tabla-logs-cuerpo');
    if (!tabla) return;
    
    try {
        const logs = await llamarSupabase("logs?order=id.desc&limit=50");
        if (!Array.isArray(logs)) throw new Error(ultimoErrorSupabase || 'No se pudo cargar el historial.');
        tabla.innerHTML = "";
        if (logs.length === 0) {
            tabla.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#95a5a6; padding:20px;">No hay registros de actividad</td></tr>';
            return;
        }
        logs.forEach(log => {
            const fila = document.createElement('tr');
            const usuario = document.createElement('td');
            const nombre = document.createElement('strong');
            nombre.textContent = log.usuario || '';
            usuario.appendChild(nombre);
            const accion = document.createElement('td');
            accion.textContent = log.accion || '';
            const fecha = document.createElement('td');
            fecha.style.color = '#747d8c';
            const fechaRegistro = new Date(log.fecha);
            fecha.textContent = Number.isNaN(fechaRegistro.getTime()) ? '' : fechaRegistro.toLocaleString();
            fila.append(usuario, accion, fecha);
            tabla.appendChild(fila);
        });
        localStorage.setItem('zk360_historial', JSON.stringify(logs));
    } catch (err) {
        let logs = [];
        try {
            const local = JSON.parse(localStorage.getItem('zk360_historial') || '[]');
            if (Array.isArray(local)) logs = local;
        } catch (error) {
            console.error('No se pudo leer el historial local:', error);
        }
        tabla.innerHTML = "";
        if (logs.length === 0) {
            tabla.innerHTML = '<tr><td colspan="3" style="text-align:center; color:#ff7675; padding:20px;">No se pudo cargar el historial</td></tr>';
            return;
        }
        [...logs].reverse().forEach(log => {
            const fila = document.createElement('tr');
            const usuario = document.createElement('td');
            const nombre = document.createElement('strong');
            nombre.textContent = log.usuario || '';
            usuario.appendChild(nombre);
            const accion = document.createElement('td');
            accion.textContent = log.accion || '';
            const fecha = document.createElement('td');
            fecha.style.color = '#747d8c';
            fecha.textContent = log.fecha || '';
            fila.append(usuario, accion, fecha);
            tabla.appendChild(fila);
        });
    }
}

// ============ CAMBIAR CONTRASEÑA ============
function abrirModalCambiarClave(esTemporal = false) {
    const modal = document.getElementById('modal-cambiar-clave');
    if (modal) {
        modal.classList.add('activo');
        const titulo = document.getElementById('cambiar-clave-titulo');
        if (titulo) {
            titulo.textContent = esTemporal ? 'Cambiar Contraseña Temporal' : 'Cambiar Contraseña';
        }
        const aviso = document.getElementById('cambiar-clave-aviso');
        if (aviso) {
            aviso.textContent = esTemporal ? 'Debes establecer una nueva contraseña antes de continuar.' : 'Ingresa tu contraseña actual y la nueva';
        }
        const actual = document.getElementById('cambiar-clave-actual-panel');
        if (actual) {
            actual.value = '';
            actual.placeholder = esTemporal ? 'Contraseña temporal recibida' : 'Contraseña actual';
        }
        const nueva = document.getElementById('cambiar-clave-nueva-panel');
        if (nueva) nueva.value = '';
        const confirmar = document.getElementById('cambiar-clave-confirmar-panel');
        if (confirmar) confirmar.value = '';
    }
}

async function cambiarContrasenaPanel() {
    const actual = document.getElementById('cambiar-clave-actual-panel');
    const nueva = document.getElementById('cambiar-clave-nueva-panel');
    const confirmar = document.getElementById('cambiar-clave-confirmar-panel');
    
    if (!actual || !nueva || !confirmar) {
        mostrarNotificacion("Completa todos los campos", "error");
        return;
    }
    
    const actualVal = actual.value;
    const nuevaVal = nueva.value;
    const confirmarVal = confirmar.value;

    if (!actualVal || !nuevaVal || !confirmarVal) {
        mostrarNotificacion("Completa todos los campos", "error");
        return;
    }
    if (nuevaVal.length < 8) {
        mostrarNotificacion("La nueva contraseña debe tener al menos 8 caracteres", "error");
        return;
    }
    if (!/[A-Z]/.test(nuevaVal)) {
        mostrarNotificacion("La nueva contraseña debe tener al menos una mayúscula", "error");
        return;
    }
    if (!/[0-9]/.test(nuevaVal)) {
        mostrarNotificacion("La nueva contraseña debe tener al menos un número", "error");
        return;
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(nuevaVal)) {
        mostrarNotificacion("La nueva contraseña debe tener al menos un signo", "error");
        return;
    }
    if (/\s/.test(nuevaVal)) {
        mostrarNotificacion("La contraseña no puede contener espacios", "error");
        return;
    }
    if (nuevaVal !== confirmarVal) {
        mostrarNotificacion("Las contraseñas no coinciden", "error");
        return;
    }

    try {
        const correo = usuarioSesion.email;
        if (!correo) {
            mostrarNotificacion("No se pudo identificar al usuario", "error");
            return;
        }
        if (!window.supabase?.createClient) await window.ZK360CargarSupabaseSDK?.();
        if (!window.supabase?.createClient || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
            throw new Error('No se pudo cargar el servicio de autenticación.');
        }
        const authClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
        });
        const { data: autenticacion, error: errorAutenticacion } = await authClient.auth.signInWithPassword({
            email: correo,
            password: actualVal
        });
        if (errorAutenticacion) throw new Error('La contraseña actual es incorrecta.');
        const { error: errorActualizacion } = await authClient.auth.updateUser({ password: nuevaVal });
        if (errorActualizacion) throw errorActualizacion;
        if (autenticacion.session) {
            sessionStorage.setItem('zk360_supabase_session', JSON.stringify({
                access_token: autenticacion.session.access_token,
                refresh_token: autenticacion.session.refresh_token,
                expires_at: autenticacion.session.expires_at,
                user: autenticacion.session.user
            }));
        }
        
        mostrarNotificacion("Contraseña actualizada con éxito", "success");
        const modal = document.getElementById('modal-cambiar-clave');
        if (modal) modal.classList.remove('activo');
        const form = document.getElementById('form-cambiar-clave-panel');
        if (form) form.reset();
        
        if (esClaveTemporal) {
            sessionStorage.removeItem('zk360_clave_temporal');
            localStorage.removeItem(`zk360_clave_temporal_${String(usuarioSesion.email || '').toLowerCase()}`);
            esClaveTemporal = false;
        }
        
        await guardarLog({ usuario: usuarioSesion.nombre, accion: "Cambió su contraseña", fecha: new Date().toISOString() });
    } catch (error) {
        console.error("Error cambiando contraseña:", error);
        mostrarNotificacion("Error al cambiar contraseña", "error");
    }
}

// ============ FUNCIONES DE UTILIDAD ============
function calcularProximoDomingo() {
    const hoy = new Date();
    const dia = hoy.getDay();
    const diasFaltantes = dia === 0 ? 0 : 7 - dia;
    const domingo = new Date(hoy);
    domingo.setDate(hoy.getDate() + diasFaltantes);
    return domingo.getDate() + '/' + (domingo.getMonth() + 1) + '/' + domingo.getFullYear();
}

async function cargarTurnoProximoDomingo() {
    if (modoPrueba || modoOffline || !navigator.onLine) return;
    const fecha = calcularProximoDomingo();
    try {
        const filas = await llamarSupabase(`cronograma?fecha=eq.${encodeURIComponent(fecha)}&select=fecha,pi,me,gr`);
        const turno = Array.isArray(filas) ? filas[0] : null;
        if (!turno) return;
        const actual = cronogramaOficial2026[fecha] || { pi: '', me: '', gr: '', seccion: {} };
        cronogramaOficial2026[fecha] = {
            ...actual,
            pi: turno.pi ?? actual.pi,
            me: turno.me ?? actual.me,
            gr: turno.gr ?? actual.gr
        };
    } catch (error) {
        console.error('No se pudo cargar el cronograma actualizado:', error);
    }
}

function procesarCalendario() {
    const modoPruebaActivo = sessionStorage.getItem('zk360_modo_prueba') === 'true' || usuarioSesion?.esPrueba === true;
    if (modoPruebaActivo) {
        const piEl = document.getElementById('docente-pi');
        if (piEl) piEl.textContent = 'Marisol y Maribel';
        const meEl = document.getElementById('docente-me');
        if (meEl) meEl.textContent = 'Erik';
        const grEl = document.getElementById('docente-gr');
        if (grEl) grEl.textContent = 'Dina';
        seccionAsignadaMaestro = usuarioSesion?.rol === 'admin'
            ? 'admin_total'
            : usuarioSesion?.seccion || null;
        if (usuarioSesion?.rol === 'admin') modoAdminVerTodos = true;
        return;
    }
    if (modoOffline) {
        seccionAsignadaMaestro = usuarioSesion?.rol === 'maestro'
            ? usuarioSesion.seccion || null
            : null;
        return;
    }

    const claveFecha = calcularProximoDomingo();
    const turno = cronogramaOficial2026[claveFecha];
    if (turno) {
        const piEl = document.getElementById('docente-pi');
        if (piEl) piEl.textContent = turno.pi;
        const meEl = document.getElementById('docente-me');
        if (meEl) meEl.textContent = turno.me;
        const grEl = document.getElementById('docente-gr');
        if (grEl) grEl.textContent = turno.gr;
        
        const nombreLower = (usuarioSesion.nombre || '').toLocaleLowerCase('es').trim();
        const parejaLower = usuarioSesion.pareja
            ? usuarioSesion.pareja.toLocaleLowerCase('es').trim()
            : '';
        seccionAsignadaMaestro = null;

        // La pareja solo participa en el turno compartido de Primera Infancia.
        if (turno.pi) {
            const partesPI = turno.pi.toLocaleLowerCase('es').split(' y ').map(n => n.trim());
            if (partesPI.includes(nombreLower) || (parejaLower && partesPI.includes(parejaLower))) {
                seccionAsignadaMaestro = 'infancia';
            }
        }

        // Medianos y Grandes siempre se asignan individualmente.
        if (turno.me && turno.me.toLocaleLowerCase('es').trim() === nombreLower) {
            seccionAsignadaMaestro = 'medianos';
        }
        if (turno.gr && turno.gr.toLocaleLowerCase('es').trim() === nombreLower) {
            seccionAsignadaMaestro = 'grandes';
        }
    }
    if (usuarioSesion.rol === "admin" || usuarioSesion.rol === "pastor") {
        seccionAsignadaMaestro = "admin_total";
    }
}

function seleccionarRolPrueba(rol) {
    const roles = {
        'maestro_con_clase': { nombre: 'Maestro Prueba', rol: 'maestro', seccion: 'grandes', esPrueba: true },
        'maestro_sin_clase': { nombre: 'Maestro Prueba', rol: 'maestro', seccion: null, esPrueba: true },
        'admin': { nombre: 'Admin Prueba', rol: 'admin', seccion: 'admin_total', esPrueba: true }
    };
    const usuario = roles[rol];
    if (!usuario) return;
    sessionStorage.setItem('zk360_usuario_activo', JSON.stringify(usuario));
    sessionStorage.setItem('zk360_modo_prueba', 'true');
    mostrarNotificacion('Cambiando a rol: ' + usuario.rol, 'info');
    setTimeout(() => { window.location.reload(); }, 500);
}

function registrarPush() {
    // Los avisos se muestran en la interfaz, sin prompts ni notificaciones del navegador.
}

function activarPestanaConfiguracion(idPestana, btnElemento) {
    const pestañas = {
        actividades: 'modulo-actividades',
        horarios: 'modulo-configuracion-horarios',
        lecciones: 'modulo-bandeja-lecciones',
        reportes: 'modulo-reportes'
    };
    const destinoId = pestañas[idPestana];
    if (!destinoId) return;
    if (idPestana !== 'actividades' && usuarioSesion?.rol !== 'admin') {
        mostrarNotificacion('Esta sección está disponible solo para el administrador.', 'warning');
        return;
    }

    document.querySelectorAll('.configuracion-panel').forEach(panel => {
        panel.hidden = panel.id !== destinoId;
    });
    document.querySelectorAll('[data-config-tab]').forEach(button => {
        button.classList.toggle('activa', button.dataset.configTab === idPestana);
        button.setAttribute('aria-selected', String(button.dataset.configTab === idPestana));
    });
    if (btnElemento) btnElemento.classList.add('activa');

    if (idPestana === 'actividades') cargarActividadesMensuales();
    if (idPestana === 'horarios') cargarConfiguracionHorario(true);
    if (idPestana === 'lecciones') cargarLeccionesPendientes();
    if (idPestana === 'reportes') cargarFeedbackAdministrador();
}

function activarVistaPestaña(idVista, btnElemento) {
    const esAdmin = usuarioSesion && (usuarioSesion.rol === 'admin' || usuarioSesion.rol === 'pastor');
    if (idVista === 'historial' && !esAdmin) {
        mostrarNotificacion('El historial está disponible solo para administración.', 'warning');
        return;
    }
    const pestañaConfiguracion = {
        'configuracion-horarios': 'horarios',
        'bandeja-lecciones': 'lecciones',
        reportes: 'reportes'
    }[idVista];
    if (idVista === 'actividades' && usuarioSesion?.rol === 'maestro') {
        document.querySelectorAll('.modulo-vista').forEach(v => v.classList.remove('activo'));
        document.querySelectorAll('.menu-link[data-vista]').forEach(link => link.classList.remove('activo'));
        document.getElementById('modulo-configuracion')?.classList.add('activo');
        document.querySelector('.configuracion-pestanas')?.setAttribute('hidden', '');
        document.querySelectorAll('.configuracion-panel').forEach(panel => {
            panel.hidden = panel.id !== 'modulo-actividades';
        });
        btnElemento?.classList.add('activo');
        cargarActividadesMensuales();
        if (window.innerWidth <= 768) document.getElementById('menu-lateral')?.classList.remove('abierto');
        return;
    }
    if (idVista === 'configuracion' || pestañaConfiguracion) {
        document.querySelectorAll('.modulo-vista').forEach(v => v.classList.remove('activo'));
        document.querySelectorAll('.menu-link[data-vista]').forEach(link => link.classList.remove('activo'));
        document.getElementById('modulo-configuracion')?.classList.add('activo');
        document.querySelector('.configuracion-pestanas')?.removeAttribute('hidden');
        const enlaceConfiguracion = document.getElementById('menu-configuracion');
        if (enlaceConfiguracion) enlaceConfiguracion.classList.add('activo');
        const moduloHistorial = document.getElementById('modulo-historial');
        if (moduloHistorial) moduloHistorial.hidden = !esAdmin;
        activarPestanaConfiguracion(pestañaConfiguracion || 'actividades');
        if (window.innerWidth <= 768) document.getElementById('menu-lateral')?.classList.remove('abierto');
        return;
    }
    document.querySelectorAll('.modulo-vista').forEach(v => v.classList.remove('activo'));
    document.querySelectorAll('.menu-link[data-vista]').forEach(l => l.classList.remove('activo'));
    const target = document.getElementById('modulo-' + idVista);
    if (target) target.classList.add('activo');
    const moduloHistorial = document.getElementById('modulo-historial');
    if (moduloHistorial) moduloHistorial.hidden = !esAdmin;
    if (btnElemento) btnElemento.classList.add('activo');
    if (idVista === 'asistencia') { cargarAlumnosSegunRol(); }
    if (idVista === 'dashboard') { cargarDashboard(); }
    if (idVista === 'biblioteca') { cargarBiblioteca(); }
    if (idVista === 'galeria') { cargarGaleria('todas'); }
    if (idVista === 'chat') { cargarChats(); }
    if (idVista === 'historial') { cargarHistorial(); }
    if (idVista === 'inicio') { cargarInicio(); }
    if (window.innerWidth <= 768) { 
        const menu = document.getElementById('menu-lateral');
        if (menu) menu.classList.remove('abierto');
    }
}

function cargarInicio() {
    const fechaEl = document.getElementById('fecha-proximo-domingo');
    if (fechaEl) fechaEl.textContent = calcularProximoDomingo();
    
    const estaEnTurno = verificarTurnoMaestro();
    const btnNuevaLeccion = document.getElementById('btn-nueva-leccion-inicio');
    if (btnNuevaLeccion) {
        btnNuevaLeccion.disabled = !estaEnTurno;
        btnNuevaLeccion.title = estaEnTurno ? 'Preinscribir lección' : 'No estás de turno para esta clase';
    }
}

window.cerrarSesion = async function() {
    clearTimeout(timerInactividad);
    sessionStorage.clear();
    localStorage.removeItem('zk360_usuario_persistente');
    localStorage.removeItem('zk360_maestro_offline');
    try {
        await window.ZK360OfflineStore?.clearResponses();
    } catch (error) {
        console.error('No se pudo borrar la caché local al cerrar sesión:', error);
    }
    window.location.replace("index.html");
};

// ============ ONBOARDING (SISTEMA) ============
async function verificarOnboarding() {
    try {
        const usuarios = await llamarSupabase('usuarios?email=eq.' + encodeURIComponent(usuarioSesion.email));
        if (usuarios && usuarios.length > 0 && !usuarios[0].onboarding_completado) {
            // Iniciar onboarding del sistema después de seleccionar tema
            setTimeout(() => {
                if (typeof iniciarOnboardingSistema === 'function') {
                    iniciarOnboardingSistema();
                }
            }, 1500);
        }
    } catch (error) {
        console.error("Error verificando onboarding:", error);
    }
}

// ============ EXPORTAR PARA USO GLOBAL ============
window.mostrarNotificacion = mostrarNotificacion;
window.abrirNotificaciones = window.abrirNotificaciones;
window.cerrarSesion = window.cerrarSesion;
window.cambiarTemaSiguiente = cambiarTemaSiguiente;
window.seleccionarTemaDesdeMenu = window.seleccionarTemaDesdeMenu;
window.seleccionarTemaBienvenida = window.seleccionarTemaBienvenida;