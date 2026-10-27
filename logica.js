/* ==========================================================================
   ZOARKIDS 360 - LÓGICA DE LOGIN Y AUTENTICACIÓN (REPARADA)
   ========================================================================== */

const SUPABASE_URL = window.ZK360_CONFIG?.supabaseUrl || '';
const SUPABASE_ANON_KEY = window.ZK360_CONFIG?.supabaseAnonKey || "";

let codigoGenerado = null;
let intervaloContador = null;
let intentosFallidos = 0;
let contadorInterval = null;
let usuarioTemporal = null;
let ultimoErrorSupabase = '';

// ============ CONFIGURACIÓN DEL EASTER EGG ============
const CLICS_REQUERIDOS_LOGO = 10;    // 10 clics en el logo para modo prueba maestro
const CLICS_REQUERIDOS_TITULO = 15;  // 15 clics en el título para abrir modo prueba
const TIEMPO_ENTRE_CLICS = 1200;     // Ventana de 1.2s entre clics

let contadorClicksLogo = 0;
let contadorClicksTitulo = 0;
let tiempoUltimoClickLogo = 0;
let tiempoUltimoClickTitulo = 0;

window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const splash = document.getElementById('splash-screen');
        if (splash) {
            splash.style.opacity = '0';
            splash.style.visibility = 'hidden';
        }
    }, 2000);
    verificarBloqueoPersistente();
    iniciarEasterEggs();
    configurarBarraSeguridad();
});

function configurarBarraSeguridad() {
    const inputs = [
        { input: 'cambio-clave-nueva', barra: 'barra-seguridad-progreso', texto: 'seguridad-texto', criterios: 'seguridad-criterios', prefijo: '' },
        { input: 'reg-clave-codigo', barra: 'barra-seguridad-progreso-registro', texto: 'seguridad-texto-registro', criterios: 'seguridad-criterios-registro', prefijo: 'registro' }
    ];

    inputs.forEach(({ input, barra, texto, criterios, prefijo }) => {
        const el = document.getElementById(input);
        if (!el) return;
        el.addEventListener('input', function () {
            const clave = this.value;
            const c = validarCriteriosContrasena(clave);
            const total = Object.values(c).filter(Boolean).length;
            const porcentaje = (total / 5) * 100;

            const barraEl = document.getElementById(barra);
            const textoEl = document.getElementById(texto);
            const criteriosEl = document.getElementById(criterios);

            if (barraEl) barraEl.style.width = porcentaje + '%';
            if (textoEl) {
                if (porcentaje <= 40) {
                    barraEl.style.background = '#ff7675';
                    textoEl.textContent = 'Débil';
                    textoEl.style.color = '#ff7675';
                } else if (porcentaje <= 80) {
                    barraEl.style.background = '#f39c12';
                    textoEl.textContent = 'Media';
                    textoEl.style.color = '#f39c12';
                } else {
                    barraEl.style.background = '#2ecc71';
                    textoEl.textContent = 'Segura';
                    textoEl.style.color = '#2ecc71';
                }
            }
            if (criteriosEl) criteriosEl.textContent = total + '/5';

            const el8 = document.getElementById('cri-8' + (prefijo ? '-' + prefijo : ''));
            if (el8) {
                el8.innerHTML = (c.largo ? '<i class="fa-regular fa-circle-check" style="color:#2ecc71;"></i>' : '<i class="fa-regular fa-circle"></i>') + ' 8+ car';
                el8.style.color = c.largo ? '#2ecc71' : '#95a5a6';
            }
            const elMay = document.getElementById('cri-may' + (prefijo ? '-' + prefijo : ''));
            if (elMay) {
                elMay.innerHTML = (c.mayuscula ? '<i class="fa-regular fa-circle-check" style="color:#2ecc71;"></i>' : '<i class="fa-regular fa-circle"></i>') + ' Mayúscula';
                elMay.style.color = c.mayuscula ? '#2ecc71' : '#95a5a6';
            }
            const elNum = document.getElementById('cri-num' + (prefijo ? '-' + prefijo : ''));
            if (elNum) {
                elNum.innerHTML = (c.numero ? '<i class="fa-regular fa-circle-check" style="color:#2ecc71;"></i>' : '<i class="fa-regular fa-circle"></i>') + ' Número';
                elNum.style.color = c.numero ? '#2ecc71' : '#95a5a6';
            }
            const elSig = document.getElementById('cri-sig' + (prefijo ? '-' + prefijo : ''));
            if (elSig) {
                elSig.innerHTML = (c.signo ? '<i class="fa-regular fa-circle-check" style="color:#2ecc71;"></i>' : '<i class="fa-regular fa-circle"></i>') + ' Signo';
                elSig.style.color = c.signo ? '#2ecc71' : '#95a5a6';
            }
            const elEsp = document.getElementById('cri-esp' + (prefijo ? '-' + prefijo : ''));
            if (elEsp) {
                elEsp.innerHTML = (c.sinEspacios ? '<i class="fa-regular fa-circle-check" style="color:#2ecc71;"></i>' : '<i class="fa-regular fa-circle"></i>') + ' Sin espacios';
                elEsp.style.color = c.sinEspacios ? '#2ecc71' : '#95a5a6';
            }
        });
    });
}

function validarCriteriosContrasena(clave) {
    return {
        largo: clave.length >= 8,
        mayuscula: /[A-Z]/.test(clave),
        numero: /[0-9]/.test(clave),
        signo: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(clave),
        sinEspacios: !/\s/.test(clave)
    };
}

function validarContrasenaCompleta(clave) {
    const c = validarCriteriosContrasena(clave);
    return c.largo && c.mayuscula && c.numero && c.signo && c.sinEspacios;
}

function obtenerConfigSupabase() {
    const config = window.ZK360_CONFIG || {};
    if (!config.supabaseUrl || !config.supabaseAnonKey) {
        throw new Error('Configura Supabase en config.local.js antes de usar esta función.');
    }
    return {
        url: config.supabaseUrl.replace(/\/$/, ''),
        anonKey: config.supabaseAnonKey
    };
}

async function hashRespuestaSeguridad(respuesta) {
    if (!window.crypto?.subtle) {
        throw new Error('Este navegador no permite proteger la respuesta de seguridad.');
    }
    const sal = new Uint8Array(16);
    window.crypto.getRandomValues(sal);
    const salHex = Array.from(sal, byte => byte.toString(16).padStart(2, '0')).join('');
    const normalizada = respuesta.trim().toLocaleLowerCase('es');
    const digest = await window.crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(`${salHex}:${normalizada}`)
    );
    const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    return `sha256$${salHex}$${hash}`;
}

let promesaSDKSupabase;

function cargarSDKSupabase() {
    if (window.supabase?.createClient) return Promise.resolve();
    if (promesaSDKSupabase) return promesaSDKSupabase;
    promesaSDKSupabase = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.50.0';
        script.async = true;
        script.onload = () => window.supabase?.createClient
            ? resolve()
            : reject(new Error('No se pudo cargar el cliente de autenticación de Supabase.'));
        script.onerror = () => reject(new Error('No se pudo cargar el cliente de autenticación de Supabase.'));
        document.head.appendChild(script);
    }).catch(error => {
        promesaSDKSupabase = null;
        throw error;
    });
    return promesaSDKSupabase;
}

window.ZK360CargarSupabaseSDK = cargarSDKSupabase;

async function crearClienteSupabaseAuth() {
    await cargarSDKSupabase();
    const config = obtenerConfigSupabase();
    return window.supabase.createClient(config.url, config.anonKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
    });
}

async function llamarRecuperacionPregunta(body) {
    return llamarFuncionSupabase('security-question-reset', body);
}

async function llamarFuncionSupabase(nombreFuncion, body) {
    const config = obtenerConfigSupabase();
    const response = await fetch(`${config.url}/functions/v1/${encodeURIComponent(nombreFuncion)}`, {
        method: 'POST',
        cache: 'no-store',
        headers: {
            apikey: config.anonKey,
            Authorization: `Bearer ${config.anonKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(result.error || 'No se pudo verificar la respuesta de seguridad.');
    }
    return result;
}

function generarContrasenaTemporal() {
    const grupos = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '!@#$%*-_'];
    const caracteres = grupos.join('');
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    const clave = grupos.map((grupo, index) => grupo[bytes[index] % grupo.length]);
    for (let i = grupos.length; i < bytes.length; i++) {
        clave.push(caracteres[bytes[i] % caracteres.length]);
    }
    for (let i = clave.length - 1; i > 0; i--) {
        const j = bytes[i % bytes.length] % (i + 1);
        [clave[i], clave[j]] = [clave[j], clave[i]];
    }
    return clave.join('');
}

// ============ CONFIGURAR LOGO (10 CLICS - MODO PRUEBA) ============
function configurarLogoPrueba() {
    const logo = document.getElementById('logo-login') || document.querySelector('.logo-login');
    if (!logo || logo.dataset.zk360PruebaClickBound === 'true') return;

    logo.style.cursor = 'pointer';
    logo.title = `Toca ${CLICS_REQUERIDOS_LOGO} veces para acceder al modo prueba`;
    logo.dataset.zk360PruebaClickBound = 'true';
    
    logo.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();

        const ahora = Date.now();
        if (ahora - tiempoUltimoClickLogo > TIEMPO_ENTRE_CLICS) {
            contadorClicksLogo = 0;
        }
        tiempoUltimoClickLogo = ahora;
        contadorClicksLogo++;

        this.style.transform = 'scale(0.95)';
        setTimeout(() => { this.style.transform = 'scale(1)'; }, 150);

        if (contadorClicksLogo >= CLICS_REQUERIDOS_LOGO) {
            contadorClicksLogo = 0;
            solicitarAccesoModoPrueba();
        }
    });
}

function limpiarEstadoModoPrueba() {
    const nombrePagina = (window.location.pathname.split('/').pop() || '').toLowerCase();
    const esPanel = nombrePagina === 'panel.html';
    if (!esPanel) return;

    sessionStorage.removeItem('zk360_modo_prueba');
    sessionStorage.removeItem('zk360_prueba_sesion_activa');
    localStorage.removeItem('zk360_modo_prueba_vence');
    localStorage.removeItem('zk360_usuario_prueba');
    localStorage.removeItem('zk360_asistencia_local');
    localStorage.removeItem('zk360_clase_prueba');
}

window.addEventListener('beforeunload', () => {
    if (window.location.pathname.toLowerCase().includes('panel')) {
        limpiarEstadoModoPrueba();
    }
});

function tieneAccesoModoPrueba() {
    return sessionStorage.getItem('zk360_modo_prueba') === 'true';
}

function solicitarAccesoModoPrueba() {
    solicitarPinPrueba('Ingresa el PIN de prueba para acceder como maestro:').then(pin => {
        if (pin === null) return;
        if (pin !== '2000') {
            mostrarNotificacion('PIN incorrecto.', 'error');
            return;
        }
        abrirModalModoPrueba();
    });
}

function solicitarPinPrueba(mensaje) {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay activo';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'zk360-pin-titulo');
        const modal = document.createElement('form');
        modal.className = 'modal-burbuja';
        const titulo = document.createElement('h3');
        titulo.id = 'zk360-pin-titulo';
        titulo.textContent = 'Acceso de prueba';
        const texto = document.createElement('p');
        texto.textContent = mensaje;
        const entrada = document.createElement('input');
        entrada.type = 'password';
        entrada.inputMode = 'numeric';
        entrada.autocomplete = 'one-time-code';
        entrada.className = 'input-txt';
        entrada.required = true;
        entrada.maxLength = 12;
        entrada.setAttribute('aria-label', 'PIN');
        const acciones = document.createElement('div');
        acciones.style.cssText = 'display:flex;justify-content:flex-end;gap:10px;margin-top:20px;';
        const cancelar = document.createElement('button');
        cancelar.type = 'button';
        cancelar.className = 'btn-cerrar-modal btn-cancelar';
        cancelar.textContent = 'Cancelar';
        const aceptar = document.createElement('button');
        aceptar.type = 'submit';
        aceptar.className = 'btn-primary';
        aceptar.textContent = 'Continuar';
        let resuelto = false;
        const cerrar = valor => {
            if (resuelto) return;
            resuelto = true;
            document.removeEventListener('keydown', onKeyDown);
            overlay.remove();
            resolve(valor);
        };
        const onKeyDown = event => {
            if (event.key === 'Escape') cerrar(null);
        };
        modal.addEventListener('submit', event => {
            event.preventDefault();
            cerrar(entrada.value);
        });
        cancelar.addEventListener('click', () => cerrar(null));
        overlay.addEventListener('click', event => {
            if (event.target === overlay) cerrar(null);
        });
        acciones.append(cancelar, aceptar);
        modal.append(titulo, texto, entrada, acciones);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        document.addEventListener('keydown', onKeyDown);
        entrada.focus();
    });
}

function ocultarBotonesModoPruebaEnPagina() {
    const usuarioActivo = (() => {
        try {
            return JSON.parse(sessionStorage.getItem('zk360_usuario_activo') || '{}');
        } catch (e) {
            return {};
        }
    })();
    const usuarioPrueba = (() => {
        try {
            return JSON.parse(localStorage.getItem('zk360_usuario_prueba') || '{}');
        } catch (e) {
            return {};
        }
    })();
    const esPrueba = sessionStorage.getItem('zk360_modo_prueba') === 'true' ||
        localStorage.getItem('zk360_asistencia_local') === 'true' ||
        usuarioActivo.esPrueba === true || usuarioPrueba.esPrueba === true;

    if (!esPrueba) return;

    const selector = 'button, a, [role="button"], input[type="button"], input[type="submit"]';
    const ocultar = () => {
        document.querySelectorAll(selector).forEach((elemento) => {
            const texto = [
                elemento.textContent,
                elemento.getAttribute('title'),
                elemento.getAttribute('aria-label'),
                elemento.getAttribute('data-action'),
                elemento.getAttribute('onclick'),
                elemento.className,
                elemento.id
            ].filter(Boolean).map(String).join(' ').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ' ');

            const esAccionRestringida = /\b(inscribir|editar|eliminar|borrar|suprimir|ver\s*(todos|todo)|ve\s*(todos|todo)|listar\s*(todos|todo))\b/i.test(texto);
            if (esAccionRestringida) {
                elemento.hidden = true;
                elemento.style.display = 'none';
                elemento.style.visibility = 'hidden';
                elemento.setAttribute('aria-hidden', 'true');
                elemento.setAttribute('tabindex', '-1');
                if ('disabled' in elemento && !elemento.disabled) elemento.disabled = true;
            }
        });
    };

    ocultar();
    new MutationObserver(ocultar).observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true
    });
}

// ============ CONFIGURAR TÍTULO (15 CLICS - MODO PRUEBA) ============
function configurarTituloAdmin() {
    const titulo = document.getElementById('titulo-app-login') || document.querySelector('.tarjeta-login h1') || document.querySelector('.login-header h2');
    if (!titulo || titulo.dataset.zk360PruebaClickBound === 'true') return;
    
    titulo.style.cursor = 'pointer';
    titulo.title = `Toca ${CLICS_REQUERIDOS_TITULO} veces para abrir el modo prueba`;
    titulo.dataset.zk360PruebaClickBound = 'true';
    
    titulo.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const ahora = Date.now();
        if (ahora - tiempoUltimoClickTitulo > TIEMPO_ENTRE_CLICS) {
            contadorClicksTitulo = 0;
        }
        tiempoUltimoClickTitulo = ahora;
        contadorClicksTitulo++;
        
        this.style.transform = 'scale(0.95)';
        setTimeout(() => { this.style.transform = 'scale(1)'; }, 150);
        
        if (contadorClicksTitulo >= CLICS_REQUERIDOS_TITULO) {
            contadorClicksTitulo = 0;
            solicitarCodigoModoAdmin();
        }
    });
}

async function solicitarCodigoModoAdmin() {
    const pin = await solicitarPinPrueba('Ingresa el PIN de prueba para acceder como administrador:');
    if (pin === null) return;
    if (pin !== '1999') {
        mostrarNotificacion('PIN incorrecto.', 'error');
        return;
    }
    seleccionarRolPrueba('admin');
}

function abrirModalModoPrueba() {
    let modal = document.getElementById('modal-modo-prueba');
    if (!modal) {
        crearModalModoPrueba();
        modal = document.getElementById('modal-modo-prueba');
    }
    if (modal) modal.classList.add('activo');
}

function crearModalModoPrueba() {
    const modal = document.createElement('div');
    modal.id = 'modal-modo-prueba';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-burbuja">
            <h3><i class="fa-solid fa-flask" style="color:#6c5ce7;"></i> Modo Prueba</h3>
            <p class="descripcion-modal" style="font-size:13px; color:#747d8c; margin-bottom:15px;">Selecciona el rol que deseas simular</p>
            <div style="display:flex; flex-direction:column; gap:10px; margin:15px 0;">
                <button onclick="seleccionarRolPrueba('maestro_con_clase')" class="btn-enviar-clase" style="width:100%; background:#2ecc71; justify-content:center;">
                    <i class="fa-solid fa-chalkboard-user"></i> Maestro con clase asignada
                </button>
                <button onclick="seleccionarRolPrueba('maestro_sin_clase')" class="btn-enviar-clase" style="width:100%; background:#f39c12; justify-content:center;">
                    <i class="fa-solid fa-user"></i> Maestro sin clase asignada
                </button>
            </div>
            <button class="btn-cerrar-modal btn-cancelar" onclick="document.getElementById('modal-modo-prueba').classList.remove('activo')" style="width:100%; margin-top:10px;">Cancelar</button>
        </div>
    `;
    document.body.appendChild(modal);
}

// ============ SELECCIONAR ROL PRUEBA (REPARADO PERMISO DE ASIGNACIÓN) ============
function seleccionarRolPrueba(rol) {
    const roles = {
        maestro_con_clase: {
            nombre: 'Maestro Prueba',
            email: 'maestro.prueba@iglesiazoarsv.org',
            rol: 'maestro',
            seccion: 'grandes',
            esPrueba: true
        },
        maestro_sin_clase: {
            nombre: 'Maestro Prueba',
            email: 'maestro.prueba@iglesiazoarsv.org',
            rol: 'maestro',
            seccion: null,
            esPrueba: true
        },
        admin: {
            nombre: 'Admin Prueba',
            email: 'admin.prueba@iglesiazoarsv.org',
            rol: 'admin',
            seccion: 'admin_total',
            esPrueba: true
        }
    };
    const usuario = roles[rol];
    if (!usuario) {
        mostrarNotificacion('Selecciona un rol de prueba válido.', 'error');
        return;
    }

    sessionStorage.setItem('zk360_usuario_activo', JSON.stringify(usuario));
    sessionStorage.setItem('zk360_modo_prueba', 'true');
    window.location.assign('panel.html');
}

// ============ COMPATIBILIDAD: ACTIVAR MODO PRUEBA DESDE EL TÍTULO ============
function activarModoAdmin() {
    abrirModalModoPrueba();
}

function iniciarEasterEggs() {
    configurarLogoPrueba();
    configurarTituloAdmin();
}

function mostrarErrorLogin(mensaje = '') {
    const errorEl = document.getElementById('login-error');
    if (!errorEl) return;
    errorEl.textContent = mensaje;
    errorEl.hidden = !mensaje;
}

function obtenerPerfilMaestroOffline() {
    try {
        const perfil = JSON.parse(localStorage.getItem('zk360_maestro_offline') || 'null');
        if (!perfil || perfil.rol !== 'maestro' || !perfil.email || !perfil.seccion ||
            !perfil.expira_en || new Date(perfil.expira_en).getTime() <= Date.now()) {
            return null;
        }
        return perfil;
    } catch (error) {
        console.error('No se pudo leer el perfil offline:', error);
        return null;
    }
}

function configurarAccesoOffline() {
    const boton = document.getElementById('btn-ingresar-offline');
    const aviso = document.getElementById('aviso-ingreso-offline');
    if (!boton) return;

    const actualizar = () => {
        const disponible = !navigator.onLine && Boolean(obtenerPerfilMaestroOffline());
        boton.style.display = disponible ? 'block' : 'none';
        if (aviso) aviso.style.display = disponible ? 'block' : 'none';
    };

    boton.addEventListener('click', () => {
        const perfil = obtenerPerfilMaestroOffline();
        if (navigator.onLine || !perfil) {
            mostrarErrorLogin('El acceso sin conexión solo está disponible para un maestro que inició sesión previamente en este dispositivo.');
            actualizar();
            return;
        }
        const usuario = {
            nombre: perfil.nombre,
            email: perfil.email,
            rol: 'maestro',
            pareja: perfil.pareja || null,
            seccion: perfil.seccion
        };
        sessionStorage.setItem('zk360_usuario_activo', JSON.stringify(usuario));
        sessionStorage.setItem('zk360_modo_offline', 'true');
        window.location.assign('panel.html');
    });

    window.addEventListener('online', actualizar);
    window.addEventListener('offline', actualizar);
    actualizar();
}

document.addEventListener('DOMContentLoaded', function() {
    const tema = localStorage.getItem('zoarkids_tema_activo') || 'predeterminado';
    document.documentElement.setAttribute('data-tema', tema);
    
    iniciarEasterEggs();
    
    const session = sessionStorage.getItem('zk360_supabase_session');
    try {
        const data = JSON.parse(session || '{}');
        if (data.access_token && data.user?.email &&
            (!data.expires_at || data.expires_at * 1000 > Date.now())) {
            const perfilOffline = obtenerPerfilMaestroOffline();
            if (navigator.onLine || (perfilOffline && perfilOffline.email === data.user.email)) {
                if (!navigator.onLine) {
                    sessionStorage.setItem('zk360_usuario_activo', JSON.stringify({
                        nombre: perfilOffline.nombre,
                        email: perfilOffline.email,
                        rol: 'maestro',
                        pareja: perfilOffline.pareja || null,
                        seccion: perfilOffline.seccion
                    }));
                    sessionStorage.setItem('zk360_modo_offline', 'true');
                }
                window.location.replace('panel.html');
                return;
            }
        }
    } catch (error) {
        sessionStorage.removeItem('zk360_supabase_session');
    }
    configurarAccesoOffline();
    localStorage.removeItem('zk360_usuario_persistente');
    initLoginEvents();
    manejarEnlaceRecuperacion();
});

window.addEventListener('hashchange', manejarEnlaceRecuperacion);

function initLoginEvents() {
    const formLogin = document.getElementById('form-login');
    if (formLogin && !formLogin.dataset.init) {
        formLogin.dataset.init = "true";
        formLogin.addEventListener('submit', async function (e) {
            e.preventDefault();
            mostrarErrorLogin();

            const correo = document.getElementById('correo').value.trim().toLowerCase();
            const clave = document.getElementById('clave').value;

            if (!correo.endsWith("@iglesiazoarsv.org")) {
                const mensaje = "Solo se permiten correos oficiales (@iglesiazoarsv.org)";
                mostrarErrorLogin(mensaje);
                mostrarNotificacion(mensaje, "error");
                return;
            }

            let perfilEncontrado = false;
            try {
                const sesion = await autenticarConSupabase(correo, clave);
                const usuarioAuth = sesion.user;
                if (!usuarioAuth || (usuarioAuth.email || '').toLowerCase() !== correo) {
                    throw new Error('Supabase no pudo validar la identidad del correo.');
                }
                if (!usuarioAuth.email_confirmed_at && !usuarioAuth.confirmed_at) {
                    const mensaje = 'Debes confirmar tu correo desde el mensaje enviado por Supabase antes de iniciar sesión.';
                    mostrarErrorLogin(mensaje);
                    mostrarNotificacion(mensaje, 'error');
                    return;
                }

                sessionStorage.setItem('zk360_supabase_session', JSON.stringify({
                    access_token: sesion.access_token,
                    refresh_token: sesion.refresh_token,
                    expires_at: sesion.expires_at,
                    user: usuarioAuth
                }));

                // El perfil se consulta después de autenticar para que PostgREST
                // reciba el JWT del usuario y aplique RLS.
                const perfiles = await llamarSupabase('usuarios?email=eq.' + encodeURIComponent(correo));
                if (!Array.isArray(perfiles)) {
                    sessionStorage.removeItem('zk360_supabase_session');
                    const mensaje = ultimoErrorSupabase
                        ? `No se pudo validar el perfil: ${ultimoErrorSupabase}`
                        : 'No se pudo validar el perfil en Supabase.';
                    mostrarErrorLogin(mensaje);
                    mostrarNotificacion(mensaje, 'error');
                    return;
                }
                const perfil = perfiles.find((registro) =>
                    String(registro.email || '').trim().toLowerCase() === correo
                ) || null;
                perfilEncontrado = Boolean(perfil);
                if (perfil) {
                    intentosFallidos = 0;
                    autenticarUsuario(correo, { ...perfil, ...usuarioAuth });
                    return;
                }
                sessionStorage.removeItem('zk360_supabase_session');
                const mensaje = 'El correo fue validado, pero no tiene un perfil registrado. Contacta al administrador.';
                mostrarErrorLogin(mensaje);
                mostrarNotificacion(mensaje, 'error');
            } catch (error) {
                sessionStorage.removeItem('zk360_supabase_session');
                const esCredencialIncorrecta = error.code === 'invalid_credentials';
                const mensaje = /confirm/i.test(error.message)
                    ? 'Debes confirmar tu correo desde el mensaje enviado por Supabase antes de iniciar sesión.'
                    : /no se pudo conectar|failed to fetch|network|http 5\d\d/i.test(error.message)
                        ? 'No se pudo conectar con Supabase. Verifica tu conexión e inténtalo nuevamente.'
                    : esCredencialIncorrecta
                        ? error.message
                    : perfilEncontrado
                        ? 'El perfil existe, pero la contraseña no coincide en Supabase Auth. Verifica tu contraseña o contacta al administrador para habilitar la cuenta.'
                        : error.message || 'No se pudo iniciar sesión. Verifica la configuración de Supabase y el estado de la cuenta.';
                const errorDeConexion = /no se pudo conectar|failed to fetch|network|http 5\d\d/i.test(error.message);
                if (errorDeConexion) {
                    mostrarErrorLogin(mensaje);
                    mostrarNotificacion(mensaje, 'error');
                } else if (!esCredencialIncorrecta) {
                    mostrarErrorLogin(mensaje);
                    mostrarNotificacion(mensaje, 'error');
                } else {
                    intentosFallidos++;
                    const intentosRestantes = Math.max(0, 3 - intentosFallidos);
                    const mensajeConIntentos = intentosRestantes > 0
                        ? `${mensaje} Quedan ${intentosRestantes} intento(s).`
                        : `${mensaje} Has agotado los intentos permitidos.`;
                    mostrarErrorLogin(mensajeConIntentos);
                    mostrarNotificacion(mensajeConIntentos, 'error');
                    if (intentosFallidos >= 3) {
                        const tiempo = Date.now() + 60000;
                        localStorage.setItem('zk360_bloqueo_hasta', String(tiempo));
                        activarPantallaBloqueo(60000);
                    }
                }
            }
        });
    }

    const formSolCodigo = document.getElementById('form-solicitar-codigo');
    if (formSolCodigo && !formSolCodigo.dataset.init) {
        formSolCodigo.dataset.init = "true";
        formSolCodigo.addEventListener('submit', async function (e) {
            e.preventDefault();
            const nombre = document.getElementById('sol-nombre').value.trim();
            const motivo = document.getElementById('sol-motivo').value.trim();

            if (!validarNombre(nombre)) {
                const err = document.getElementById('sol-nombre-error');
                if (err) { err.textContent = 'Nombre inválido. Solo letras, sin números ni abreviaciones.'; err.style.display = 'block'; }
                return;
            }
            const errN = document.getElementById('sol-nombre-error');
            if (errN) errN.style.display = 'none';

            if (!validarMotivo(motivo)) {
                const errM = document.getElementById('sol-motivo-error');
                if (errM) { errM.textContent = 'Motivo inválido. Máximo 50 palabras, sin groserías ni abreviaciones.'; errM.style.display = 'block'; }
                return;
            }
            const errM2 = document.getElementById('sol-motivo-error');
            if (errM2) errM2.style.display = 'none';

            const codigo = generarCodigo();
            const expiracion = new Date(Date.now() + 5 * 60 * 1000).toISOString();

            try {
                const result = await llamarSupabase("solicitudes", {
                    method: "POST",
                    body: JSON.stringify({
                        nombre: nombre,
                        motivo: motivo,
                        codigo: codigo,
                        codigo_expiracion: expiracion,
                        codigo_valido: true,
                        usuario_registrado: false,
                        intentos: 0
                    })
                });
                if (result) {
                    codigoGenerado = codigo;
                    mostrarCodigo(codigo);
                    document.getElementById('modal-solicitar-codigo').classList.remove('activo');
                }
            } catch (error) {
                console.error("Error:", error);
                mostrarNotificacion("Error al generar el código", "error");
            }
        });
    }

    const formRegCodigo = document.getElementById('form-registro-codigo');
    if (formRegCodigo && !formRegCodigo.dataset.init) {
        formRegCodigo.dataset.init = "true";
        formRegCodigo.addEventListener('submit', async function (e) {
            e.preventDefault();

            const codigo = document.getElementById('reg-codigo').value.trim().toUpperCase();
            const email = document.getElementById('reg-email').value.trim().toLowerCase();
            const clave = document.getElementById('reg-clave-codigo').value;
            const confirmar = document.getElementById('reg-clave-confirmar-codigo').value;
            const pregunta = document.getElementById('reg-pregunta').value;
            const preguntaPersonal = document.getElementById('reg-pregunta-personal').value.trim();
            const respuesta = document.getElementById('reg-respuesta').value.trim();
            const aceptoPoliticas = document.getElementById('reg-acepto-politicas').checked;

            if (!aceptoPoliticas) {
                mostrarNotificacion('Debes aceptar las Políticas de Privacidad y Condiciones de Uso', 'error');
                return;
            }

            if (!email.endsWith('@iglesiazoarsv.org')) {
                mostrarNotificacion('El correo debe ser @iglesiazoarsv.org', 'error');
                return;
            }

            if (!validarContrasenaCompleta(clave)) {
                mostrarNotificacion('La contraseña debe tener: mayúscula, número, signo y mínimo 8 caracteres', 'error');
                return;
            }
            if (clave !== confirmar) {
                mostrarNotificacion('Las contraseñas no coinciden', 'error');
                return;
            }

            let preguntaFinal = pregunta;
            if (pregunta === 'personal') {
                if (!preguntaPersonal) {
                    mostrarNotificacion('Escribe tu pregunta de seguridad', 'error');
                    return;
                }
                preguntaFinal = preguntaPersonal;
            }
            if (!respuesta || respuesta.length < 2) {
                mostrarNotificacion('Escribe una respuesta válida para tu pregunta de seguridad', 'error');
                return;
            }

            try {
                const registroAuth = await registrarConSupabase(email, clave);
                const usuarioAuth = registroAuth.user || registroAuth.session?.user;
                if (!usuarioAuth?.id) {
                    throw new Error('Supabase no devolvió una cuenta de autenticación válida.');
                }
                const respuestaHash = await hashRespuestaSeguridad(respuesta);
                const resultadoRegistro = await llamarFuncionSupabase('register-teacher-profile', {
                    auth_user_id: usuarioAuth.id,
                    email,
                    nombre: email.split('@')[0],
                    codigo,
                    pregunta: preguntaFinal,
                    respuesta_hash: respuestaHash
                });
                const nuevoUsuario = {
                    email: email,
                    nombre: resultadoRegistro.nombre || email.split('@')[0],
                    rol: 'maestro',
                };

                mostrarNotificacion('¡Registro exitoso!', 'success');
                document.getElementById('modal-registro-codigo').classList.remove('activo');
                document.getElementById('form-registro-codigo').reset();

                const sesionAuth = registroAuth.session || registroAuth;
                const usuarioRegistradoAuth = registroAuth.user || (sesionAuth && sesionAuth.user);
                if (sesionAuth && sesionAuth.access_token && usuarioRegistradoAuth) {
                    sessionStorage.setItem('zk360_supabase_session', JSON.stringify({
                        access_token: sesionAuth.access_token,
                        refresh_token: sesionAuth.refresh_token,
                        expires_at: sesionAuth.expires_at,
                        user: usuarioRegistradoAuth
                    }));
                    mostrarNotificacion('Iniciando sesión...', 'success');
                    setTimeout(() => autenticarUsuario(email, nuevoUsuario), 1000);
                } else {
                    mostrarNotificacion('Confirma tu correo desde el mensaje enviado por Supabase antes de iniciar sesión.', 'info');
                }

            } catch (error) {
                console.error("Error:", error);
                mostrarNotificacion(error.message || 'Error al registrar usuario', 'error');
            }
        });
    }

    const formCambioClave = document.getElementById('form-cambio-clave-persistente');
    if (formCambioClave && !formCambioClave.dataset.init) {
        formCambioClave.dataset.init = "true";
        formCambioClave.addEventListener('submit', async function (e) {
            e.preventDefault();

            const email = this.dataset.email || obtenerEmailRecuperacion();
            const nueva = document.getElementById('cambio-clave-nueva').value;
            const confirmar = document.getElementById('cambio-clave-confirmar').value;

            if (!validarContrasenaCompleta(nueva)) {
                mostrarNotificacion('La contraseña debe tener: mayúscula, número, signo y mínimo 8 caracteres', 'error');
                return;
            }
            if (nueva !== confirmar) {
                mostrarNotificacion('Las contraseñas no coinciden', 'error');
                return;
            }

            try {
                const accessToken = obtenerTokenRecuperacion();
                if (!accessToken) {
                    mostrarNotificacion('Abre el enlace de recuperación enviado a tu correo y vuelve a intentarlo.', 'error');
                    return;
                }
                await actualizarContrasenaAuth(nueva, accessToken);
                sessionStorage.removeItem('zk360_supabase_session');
                history.replaceState(null, document.title, window.location.pathname + window.location.search);
                mostrarNotificacion('Contraseña actualizada en Supabase. Ya puedes iniciar sesión.', 'success');
                document.getElementById('modal-cambio-clave-persistente').classList.remove('activo');
                document.getElementById('form-cambio-clave-persistente').reset();
                this.dataset.email = '';
            } catch (error) {
                console.error("Error:", error);
                mostrarNotificacion(error.message || 'No se pudo cambiar la contraseña en Supabase.', 'error');
            }
        });
    }
}

async function llamarSupabase(endpoint, opciones = {}) {
    ultimoErrorSupabase = '';
    let usuarioActivo = {};
    let usuarioPrueba = {};
    try {
        usuarioActivo = JSON.parse(sessionStorage.getItem('zk360_usuario_activo') || '{}');
    } catch (e) {}
    try {
        usuarioPrueba = JSON.parse(localStorage.getItem('zk360_usuario_prueba') || '{}');
    } catch (e) {}
    const esMaestroPrueba = [usuarioActivo, usuarioPrueba].some((usuario) =>
        usuario.rol === 'maestro' && usuario.esPrueba === true
    );
    const modoPrueba = sessionStorage.getItem('zk360_modo_prueba') === 'true' ||
        localStorage.getItem('zk360_asistencia_local') === 'true' ||
        usuarioActivo.esPrueba === true || usuarioPrueba.esPrueba === true || esMaestroPrueba;

    // En modo prueba, usar tablas locales en lugar de enviar operaciones a Supabase.
    if (modoPrueba) {
        try {
            const [tabla, query = ''] = endpoint.split('?');
            const claveLocal = `zk360_prueba_tabla_${tabla}`;
            const metodo = (opciones.method || 'GET').toUpperCase();
            const filtros = new URLSearchParams(query);
            const coincide = (registro) => [...filtros.entries()].every(([campo, valor]) => {
                if (!valor.startsWith('eq.')) return true;
                return String(registro[campo]) === decodeURIComponent(valor.slice(3));
            });
            let registros = JSON.parse(localStorage.getItem(claveLocal) || '[]');
            if (!Array.isArray(registros)) registros = [];

            if (metodo === 'GET') return registros.filter(coincide);
            if (metodo === 'POST') {
                const nuevos = JSON.parse(opciones.body || '{}');
                const lista = Array.isArray(nuevos) ? nuevos : [nuevos];
                lista.forEach((registro) => {
                    if (registro.id == null) registro.id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                    registros.push(registro);
                });
                localStorage.setItem(claveLocal, JSON.stringify(registros));
                return true;
            }
            if (metodo === 'PATCH') {
                const cambios = JSON.parse(opciones.body || '{}');
                localStorage.setItem(claveLocal, JSON.stringify(registros.map((registro) =>
                    coincide(registro) ? { ...registro, ...cambios } : registro
                )));
                return true;
            }
            if (metodo === 'DELETE') {
                localStorage.setItem(claveLocal, JSON.stringify(registros.filter((registro) => !coincide(registro))));
                return true;
            }
        } catch (error) {
            console.error('Error en almacenamiento local de prueba:', error);
            return null;
        }
    }

    const baseUrl = SUPABASE_URL.replace(/\/$/, "");
    const url = `${baseUrl}/rest/v1/${endpoint}`;

    if (!baseUrl) {
        ultimoErrorSupabase = 'No se configuró una URL del proyecto.';
        console.error("Error en Supabase:", ultimoErrorSupabase);
        return null;
    }

    const headers = {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${(() => {
            try {
                return JSON.parse(sessionStorage.getItem('zk360_supabase_session') || '{}').access_token || SUPABASE_ANON_KEY;
            } catch (e) {
                return SUPABASE_ANON_KEY;
            }
        })()}`,
        "Content-Type": "application/json",
        Prefer: (opciones.method || 'GET').toUpperCase() === 'GET'
            ? 'return=representation'
            : 'return=representation',
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0"
    };

    try {
        const response = await fetch(url, {
            ...opciones,
            cache: "no-store",
            headers: {
                ...headers,
                ...(opciones.headers || {})
            }
        });

        if (!response.ok) {
            const detalle = await response.text();
            let mensaje = detalle;
            try {
                const json = JSON.parse(detalle);
                mensaje = json.message || json.details || json.hint || detalle;
            } catch (e) {
                // Algunas respuestas del servidor no son JSON.
            }
            throw new Error(`Error HTTP ${response.status}: ${mensaje}`);
        }

        const texto = await response.text();
        return texto ? JSON.parse(texto) : true;
    } catch (error) {
        const mensaje = error instanceof TypeError
            ? `No se pudo conectar a ${baseUrl}. Verifica que el dominio Supabase sea accesible y que la URL sea correcta.`
            : error.message;
        ultimoErrorSupabase = mensaje;
        console.error("Error en Supabase:", mensaje);
        return null;
    }
}

async function autenticarConSupabase(email, password) {
    const baseUrl = (window.ZK360_SUPABASE_URL || SUPABASE_URL || '').replace(/\/$/, '');
    if (!baseUrl || !SUPABASE_ANON_KEY) {
        throw new Error('Falta la URL o la clave pública de Supabase en la configuración.');
    }

    const response = await fetch(`${baseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        cache: 'no-store',
        headers: {
            apikey: SUPABASE_ANON_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
    });
    const texto = await response.text();
    let resultado = {};
    try { resultado = texto ? JSON.parse(texto) : {}; } catch (e) {}
    if (!response.ok) {
        const detalle = [
            resultado.msg,
            resultado.message,
            resultado.error_description,
            resultado.error,
            resultado.code
        ].filter(Boolean).join(' ');
        if (/invalid login credentials|invalid_credentials/i.test(detalle)) {
            const error = new Error('El correo o la contraseña no coinciden con un usuario de Supabase Authentication. Una fila en public.usuarios, por sí sola, no crea la cuenta de acceso.');
            error.code = 'invalid_credentials';
            error.status = response.status;
            throw error;
        }
        if (/email not confirmed|email_not_confirmed/i.test(detalle)) {
            throw new Error('La cuenta existe, pero falta confirmar el correo desde el enlace enviado por Supabase.');
        }
        if (response.status === 429) {
            throw new Error('Supabase limitó temporalmente los intentos. Espera unos minutos antes de volver a probar.');
        }
        throw new Error(detalle || `Error de autenticación en Supabase (${response.status}).`);
    }
    return resultado;
}

async function registrarConSupabase(email, password) {
    const baseUrl = (window.ZK360_SUPABASE_URL || SUPABASE_URL || '').replace(/\/$/, '');
    if (!baseUrl || !SUPABASE_ANON_KEY) {
        throw new Error('Falta la URL o la clave pública de Supabase en la configuración.');
    }

    const response = await fetch(`${baseUrl}/auth/v1/signup`, {
        method: 'POST',
        cache: 'no-store',
        headers: {
            apikey: SUPABASE_ANON_KEY,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
    });
    const texto = await response.text();
    let resultado = {};
    try { resultado = texto ? JSON.parse(texto) : {}; } catch (e) {}
    if (!response.ok) {
        const detalle = `${resultado.msg || ''} ${resultado.message || ''} ${resultado.error_description || ''}`.trim();
        if (response.status === 429 || /rate limit exceeded/i.test(detalle)) {
            throw new Error('Supabase limitó temporalmente los correos de registro. Espera unos minutos antes de intentarlo de nuevo.');
        }
        throw new Error(detalle || `No se pudo crear la cuenta de autenticación (${response.status}).`);
    }
    if (!resultado.user && !(resultado.session && resultado.session.user)) {
        throw new Error('Supabase no confirmó la creación de la cuenta de autenticación.');
    }
    return resultado;
}

function obtenerTokenRecuperacion() {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    return hash.get('access_token') || sessionStorage.getItem('zk360_token_recuperacion') || '';
}

function obtenerEmailRecuperacion() {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    return hash.get('email') || sessionStorage.getItem('zk360_email_recuperacion') || '';
}

function manejarEnlaceRecuperacion() {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    if (hash.get('type') !== 'recovery' && !hash.get('access_token')) return;
    const token = hash.get('access_token');
    if (!token) {
        mostrarNotificacion('El enlace de recuperación expiró o no es válido. Solicita uno nuevo.', 'error');
        return;
    }
    sessionStorage.setItem('zk360_token_recuperacion', token);
    const email = hash.get('email') || '';
    if (email) sessionStorage.setItem('zk360_email_recuperacion', email);
    const form = document.getElementById('form-cambio-clave-persistente');
    const modal = document.getElementById('modal-cambio-clave-persistente');
    if (form) form.dataset.email = email;
    if (modal) modal.classList.add('activo');
    mostrarNotificacion('Enlace verificado. Ingresa tu nueva contraseña.', 'success');
}

async function solicitarRecuperacionAuth(email) {
    const baseUrl = (window.ZK360_SUPABASE_URL || SUPABASE_URL || '').replace(/\/$/, '');
    if (!baseUrl || !SUPABASE_ANON_KEY) {
        throw new Error('Falta la URL o la clave pública de Supabase en la configuración.');
    }
    const redirectTo = window.location.origin + window.location.pathname;
    const response = await fetch(`${baseUrl}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`, {
        method: 'POST',
        cache: 'no-store',
        headers: { apikey: SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    });
    if (!response.ok) {
        const texto = await response.text();
        let detalle = texto;
        try {
            const json = JSON.parse(texto);
            detalle = json.msg || json.message || json.error_description || texto;
        } catch (e) {}
        throw new Error(detalle || `Supabase rechazó la solicitud (${response.status}).`);
    }
}

async function actualizarContrasenaAuth(password, accessToken) {
    const baseUrl = (window.ZK360_SUPABASE_URL || SUPABASE_URL || '').replace(/\/$/, '');
    const response = await fetch(`${baseUrl}/auth/v1/user`, {
        method: 'PUT',
        cache: 'no-store',
        headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ password })
    });
    if (!response.ok) {
        const texto = await response.text();
        let detalle = texto;
        try {
            const json = JSON.parse(texto);
            detalle = json.msg || json.message || json.error_description || texto;
        } catch (e) {}
        throw new Error(detalle || `No se pudo actualizar la contraseña (${response.status}).`);
    }
    sessionStorage.removeItem('zk360_token_recuperacion');
    sessionStorage.removeItem('zk360_email_recuperacion');
}

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
        contador.textContent = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
        if (segundos <= 0) {
            clearInterval(intervaloContador);
            capa.classList.remove('activo');
            localStorage.removeItem('zk360_bloqueo_hasta');
            intentosFallidos = 0;
        }
    }, 1000);
}

function abrirPoliticas() {
    const modal = document.getElementById('modal-politicas');
    if (modal) modal.classList.add('activo');
}

function abrirSolicitarCodigo() {
    const modal = document.getElementById('modal-solicitar-codigo');
    if (modal) modal.classList.add('activo');
    const form = document.getElementById('form-solicitar-codigo');
    if (form) form.reset();
    const e1 = document.getElementById('sol-nombre-error');
    if (e1) e1.style.display = 'none';
    const e2 = document.getElementById('sol-motivo-error');
    if (e2) e2.style.display = 'none';
}

function cerrarSolicitarCodigo() {
    const modal = document.getElementById('modal-solicitar-codigo');
    if (modal) modal.classList.remove('activo');
    if (codigoGenerado) {
        invalidarCodigo(codigoGenerado);
        codigoGenerado = null;
    }
}

function validarNombre(nombre) {
    const palabrasProhibidas = ['xfa', 'xq', 'q', 'k', 't', 'd', 'xo', 'tmb', 'tb', 'xa', 'pq', 'ps', 'x'];
    const palabras = nombre.toLowerCase().split(' ');
    for (const p of palabras) {
        if (p.length < 2) return false;
        if (palabrasProhibidas.includes(p)) return false;
        if (/\d/.test(p)) return false;
    }
    return /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/.test(nombre);
}

function validarMotivo(motivo) {
    const palabras = motivo.split(/\s+/).filter(p => p.length > 0);
    if (palabras.length > 50) return false;
    const palabrasProhibidas = ['xfa', 'xq', 'q', 'k', 't', 'd', 'xo', 'tmb', 'tb', 'xa', 'pq', 'ps', 'x'];
    const groserias = ['puta', 'puto', 'mierda', 'verga', 'chinga', 'coño', 'carajo', 'joder'];
    for (const p of palabras) {
        const limpia = p.toLowerCase().replace(/[.,!?;:]/g, '');
        if (palabrasProhibidas.includes(limpia)) return false;
        if (groserias.includes(limpia)) return false;
        if (limpia.length < 2 && limpia !== 'a' && limpia !== 'e' && limpia !== 'i' && limpia !== 'o' && limpia !== 'u') return false;
    }
    return true;
}

function generarCodigo() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let codigo = 'ZK-';
    for (let i = 0; i < 4; i++) {
        codigo += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    codigo += '-' + new Date().getFullYear();
    return codigo;
}

function mostrarCodigo(codigo) {
    const elCodigo = document.getElementById('codigo-generado');
    if (elCodigo) elCodigo.textContent = codigo;
    const modal = document.getElementById('modal-mostrar-codigo');
    if (modal) modal.classList.add('activo');
    iniciarContadorCodigo(300);
}

function iniciarContadorCodigo(segundos) {
    const contador = document.getElementById('codigo-contador');
    let tiempo = segundos;
    clearInterval(contadorInterval);
    contadorInterval = setInterval(() => {
        tiempo--;
        const mins = Math.floor(tiempo / 60);
        const secs = tiempo % 60;
        if (contador) contador.textContent = String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
        if (tiempo <= 0) {
            clearInterval(contadorInterval);
            if (contador) contador.textContent = '00:00';
            mostrarNotificacion('El código ha expirado', 'error');
            cerrarMostrarCodigo();
        }
    }, 1000);
}

function copiarCodigo() {
    const el = document.getElementById('codigo-generado');
    const codigo = el ? el.textContent : '';
    if (!navigator.clipboard || !window.isSecureContext) {
        mostrarNotificacion('No se puede copiar automáticamente en este entorno', 'error');
        return;
    }
    navigator.clipboard.writeText(codigo).then(() => {
        mostrarNotificacion('Código copiado al portapapeles', 'success');
    }).catch(() => {
        mostrarNotificacion('No se pudo copiar el código', 'error');
    });
}

function irARegistroConCodigo() {
    const m1 = document.getElementById('modal-mostrar-codigo');
    if (m1) m1.classList.remove('activo');
    const m2 = document.getElementById('modal-registro-codigo');
    if (m2) m2.classList.add('activo');
    const inputCod = document.getElementById('reg-codigo');
    if (inputCod) inputCod.value = codigoGenerado || '';
}

function cerrarMostrarCodigo() {
    const m = document.getElementById('modal-mostrar-codigo');
    if (m) m.classList.remove('activo');
    clearInterval(contadorInterval);
    if (codigoGenerado) {
        invalidarCodigo(codigoGenerado);
        codigoGenerado = null;
    }
}

async function invalidarCodigo(codigo) {
    try {
        await llamarSupabase('solicitudes?codigo=eq.' + encodeURIComponent(codigo), {
            method: "PATCH",
            body: JSON.stringify({ codigo_valido: false })
        });
    } catch (error) {
        console.error("Error invalidando código:", error);
    }
}

function cerrarRegistroCodigo() {
    const m = document.getElementById('modal-registro-codigo');
    if (m) m.classList.remove('activo');
    const f = document.getElementById('form-registro-codigo');
    if (f) f.reset();
}

function autenticarUsuario(correo, usuario) {
    sessionStorage.removeItem('zk360_modo_offline');
    const perfilSesion = {
        nombre: usuario.nombre,
        rol: usuario.rol,
        pareja: usuario.pareja || null,
        email: correo,
        seccion: usuario.seccion || null
    };
    sessionStorage.setItem('zk360_usuario_activo', JSON.stringify(perfilSesion));
    if (perfilSesion.rol === 'maestro' && perfilSesion.seccion) {
        localStorage.setItem('zk360_maestro_offline', JSON.stringify({
            ...perfilSesion,
            guardado_en: new Date().toISOString(),
            expira_en: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        }));
    }
    if (usuario.rol === "admin" || usuario.rol === "pastor") {
        localStorage.setItem('zk360_usuario_persistente', JSON.stringify({
            nombre: usuario.nombre,
            rol: usuario.rol,
            pareja: usuario.pareja || null,
            email: correo
        }));
    }
    mostrarNotificacion('Inicio de sesión exitoso. Cargando tu panel…', 'success');
    setTimeout(() => { window.location.href = "panel.html"; }, 700);
}

async function solicitarEnlaceRecuperacion() {
    const email = document.getElementById('recuperar-correo').value.trim().toLowerCase();
    if (!email || !email.endsWith('@iglesiazoarsv.org')) {
        mostrarNotificacion('Ingresa un correo válido @iglesiazoarsv.org', 'error');
        return;
    }

    try {
        await solicitarRecuperacionAuth(email);
        cerrarRecuperarClave();
        mostrarNotificacion('Si existe una cuenta con ese correo, Supabase enviará un enlace para restablecer la contraseña.', 'success');
    } catch (error) {
        console.error("Error:", error);
        mostrarNotificacion(error.message || 'No se pudo solicitar la recuperación. Verifica tu conexión y la configuración de correo de Supabase.', 'error');
    }
}

async function usarPreguntaSeguridad() {
    const email = document.getElementById('recuperar-correo').value.trim().toLowerCase();
    if (!email || !email.endsWith('@iglesiazoarsv.org')) {
        mostrarNotificacion('Ingresa un correo válido @iglesiazoarsv.org', 'error');
        return;
    }

    try {
        const pregunta = await llamarRecuperacionPregunta({ action: 'get-question', email });
        const preguntaMostrada = document.getElementById('pregunta-mostrada');
        const paso1 = document.getElementById('paso-recuperar-1');
        const paso2 = document.getElementById('paso-recuperar-2');
        const campoRespuesta = document.getElementById('recuperar-respuesta');
        if (!preguntaMostrada || !paso1 || !paso2 || !campoRespuesta) {
            throw new Error('No se pudo abrir la recuperación mediante pregunta de seguridad.');
        }
        preguntaMostrada.textContent = pregunta.question;
        paso1.style.display = 'none';
        paso2.style.display = 'block';
        campoRespuesta.dataset.email = email;
    } catch (error) {
        console.error('Error al recuperar la pregunta de seguridad:', error);
        mostrarNotificacion(error.message || 'No se pudo consultar la pregunta de seguridad.', 'error');
    }
}

async function validarRespuestaSeguridad() {
    const respuesta = document.getElementById('recuperar-respuesta').value.trim();
    const email = document.getElementById('recuperar-respuesta').dataset.email;

    if (!respuesta || respuesta.length < 2) {
        mostrarNotificacion('Escribe tu respuesta', 'error');
        return;
    }

    try {
        const nuevaClave = generarContrasenaTemporal();
        const { token_hash: tokenHash } = await llamarRecuperacionPregunta({
            action: 'verify-answer',
            email,
            answer: respuesta
        });
        if (!tokenHash) throw new Error('No se pudo emitir una sesión segura de recuperación.');

        const clienteAuth = await crearClienteSupabaseAuth();
        const { error: errorVerificacion } = await clienteAuth.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery'
        });
        if (errorVerificacion) throw errorVerificacion;
        const { error: errorActualizacion } = await clienteAuth.auth.updateUser({ password: nuevaClave });
        if (errorActualizacion) throw errorActualizacion;

        mostrarClaveTemporal(nuevaClave);
        document.getElementById('modal-recuperar-clave').classList.remove('activo');
        document.getElementById('recuperar-respuesta').value = '';
        document.getElementById('recuperar-correo').value = '';
        document.getElementById('paso-recuperar-1').style.display = 'block';
        document.getElementById('paso-recuperar-2').style.display = 'none';
        document.getElementById('correo').value = email;

    } catch (error) {
        console.error("Error:", error);
        mostrarNotificacion(error.message || 'Error al validar respuesta', 'error');
    }
}

function mostrarClaveTemporal(clave) {
    let modal = document.getElementById('modal-clave-temporal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-clave-temporal';
        modal.className = 'modal-overlay';
        modal.style.cssText = 'position:fixed;inset:0;z-index:10000;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.55);';
        modal.innerHTML = `
            <div class="modal-burbuja">
                <h3><i class="fa-solid fa-key"></i> Contraseña temporal</h3>
                <p>Guarda esta clave. Se te solicitará cambiarla al iniciar sesión.</p>
                <input id="clave-temporal-valor" type="text" readonly
                    style="width:100%; text-align:center; font-size:20px; font-weight:bold; margin:12px 0;">
                <button type="button" class="btn-enviar-clase" style="width:100%; justify-content:center;"
                    onclick="copiarClaveTemporal()">
                    <i class="fa-solid fa-copy"></i> Copiar clave
                </button>
                <button type="button" class="btn-cerrar-modal btn-cancelar" style="width:100%; margin-top:10px;"
                    onclick="cerrarModalClaveTemporal()">
                    Cerrar
                </button>
            </div>`;
        document.body.appendChild(modal);
    }
    document.getElementById('clave-temporal-valor').value = clave;
    modal.style.display = 'flex';
    modal.classList.add('activo');
}

function cerrarModalClaveTemporal() {
    const modal = document.getElementById('modal-clave-temporal');
    if (!modal) return;
    modal.classList.remove('activo');
    modal.style.display = 'none';
}

function copiarClaveTemporal() {
    const campo = document.getElementById('clave-temporal-valor');
    if (!campo) return;
    if (!navigator.clipboard || !window.isSecureContext) {
        mostrarNotificacion('No se puede copiar automáticamente en este entorno', 'error');
        return;
    }
    navigator.clipboard.writeText(campo.value).then(() => {
        mostrarNotificacion('Clave temporal copiada', 'success');
    }).catch(() => {
        mostrarNotificacion('No se pudo copiar la clave temporal', 'error');
    });
}

function cerrarRecuperarClave() {
    const modal = document.getElementById('modal-recuperar-clave');
    if (modal) modal.classList.remove('activo');
    const respuesta = document.getElementById('recuperar-respuesta');
    const correo = document.getElementById('recuperar-correo');
    const paso1 = document.getElementById('paso-recuperar-1');
    const paso2 = document.getElementById('paso-recuperar-2');
    if (respuesta) respuesta.value = '';
    if (correo) correo.value = '';
    if (paso1) paso1.style.display = 'block';
    if (paso2) paso2.style.display = 'none';
}

function mostrarNotificacion(mensaje, tipo = "info") {
    let contenedor = document.getElementById("notificacion-sistema");

    if (!contenedor) {
        contenedor = document.createElement("div");
        contenedor.id = "notificacion-sistema";
        contenedor.style.cssText = [
            'position:fixed',
            'top:20px',
            'right:20px',
            'z-index:2147483647',
            'display:flex',
            'flex-direction:column',
            'gap:10px',
            'width:min(380px,calc(100vw - 40px))',
            'pointer-events:none',
            'isolation:isolate'
        ].join(';');
        contenedor.setAttribute('role', 'status');
        contenedor.setAttribute('aria-live', 'polite');
        document.body.appendChild(contenedor);
    }

    const notif = document.createElement("div");
    notif.className = `notificacion-burbuja ${tipo}`;
    notif.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
    const colores = {
        error: ['#ffe5e5', '#b42318'],
        success: ['#e7f8ed', '#167a3e'],
        warning: ['#fff4d6', '#8a5a00'],
        info: ['#e8f1ff', '#155eef']
    };
    const [fondo, color] = colores[tipo] || colores.info;
    notif.style.cssText = [
        'display:block',
        'visibility:hidden',
        'opacity:0',
        'transform:translateY(-8px)',
        'transition:opacity .2s ease,transform .2s ease',
        'padding:14px 18px',
        'border-radius:12px',
        'background:' + fondo,
        'color:' + color,
        'border:1px solid ' + color,
        'box-shadow:0 6px 20px rgba(0,0,0,.2)',
        'font:600 15px/1.4 Arial,sans-serif',
        'pointer-events:auto',
        'align-items:flex-start',
        'max-height:65vh',
        'overflow-y:auto',
        'overflow-wrap:anywhere',
        'white-space:pre-wrap'
    ].join(';');
    const texto = document.createElement('span');
    texto.textContent = String(mensaje);
    texto.style.cssText = 'flex:1;min-width:0;overflow-wrap:anywhere;white-space:pre-wrap;';
    const cerrar = document.createElement('button');
    cerrar.type = 'button';
    cerrar.setAttribute('aria-label', 'Cerrar notificación');
    cerrar.textContent = '×';
    cerrar.addEventListener('click', () => notif.remove());
    notif.append(texto, cerrar);

    contenedor.appendChild(notif);
    while (contenedor.children.length > 4) contenedor.firstElementChild.remove();

    notif.style.visibility = 'visible';
    notif.style.opacity = '1';
    notif.style.transform = 'translateY(0)';

    setTimeout(() => {
        notif.style.opacity = '0';
        notif.style.transform = 'translateY(-8px)';
        setTimeout(() => notif.remove(), 220);
    }, tipo === 'error' ? 12000 : 8000);
}

// En modo prueba la gestión es únicamente local: no se muestran acciones que
// puedan editar, eliminar o listar todos los registros. La comprobación de si
// el niño ya existe sigue siendo responsabilidad de la acción "Inscribir".
function configurarAccionesModoPrueba() {
    const usuario = (() => {
        try {
            return JSON.parse(sessionStorage.getItem('zk360_usuario_activo') || '{}');
        } catch (e) {
            return {};
        }
    })();
    let usuarioPruebaLocal = {};
    try {
        usuarioPruebaLocal = JSON.parse(localStorage.getItem('zk360_usuario_prueba') || '{}');
    } catch (e) {}
    const esPrueba = sessionStorage.getItem('zk360_modo_prueba') === 'true' ||
        localStorage.getItem('zk360_asistencia_local') === 'true' ||
        usuario.esPrueba === true || usuarioPruebaLocal.esPrueba === true;
    if (!esPrueba) return;

    const ocultarAcciones = () => {
        document.querySelectorAll('button, a, [role="button"], input[type="button"], input[type="submit"]').forEach((elemento) => {
            const texto = [
                elemento.textContent,
                elemento.getAttribute('title'),
                elemento.getAttribute('aria-label'),
                elemento.getAttribute('data-action'),
                elemento.getAttribute('onclick'),
                elemento.className,
                elemento.id
            ].filter(Boolean).map(String).join(' ').toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, ' ');
            const esAccionRestringida = /\b(inscribir|editar|modificar|eliminar|borrar|suprimir)\b|\bver\s*(todos|todo)\b|\bve\s*(todos|todo)\b|\blistar\s*(todos|todo)\b/i.test(texto);
            if (esAccionRestringida) {
                if (!elemento.hidden) elemento.hidden = true;
                if (elemento.style.getPropertyValue('display') !== 'none' ||
                    elemento.style.getPropertyPriority('display') !== 'important') {
                    elemento.style.setProperty('display', 'none', 'important');
                }
                if (elemento.getAttribute('aria-hidden') !== 'true') elemento.setAttribute('aria-hidden', 'true');
                if (elemento.getAttribute('tabindex') !== '-1') elemento.setAttribute('tabindex', '-1');
                if ('disabled' in elemento && !elemento.disabled) elemento.disabled = true;
            }
        });
    };

    // El maestro simulado conserva solo Inscribir; llamarSupabase intercepta
    // sus lecturas y escrituras para que se almacenen exclusivamente en local.
    ocultarAcciones();
    const clasePrueba = usuario.tieneClase === true || usuario.claseAsignada === true
        ? {
            id: 'prueba-infancia',
            nombre: 'Clase de Infancia',
            seccion: usuario.seccion || 'infancia',
            asignada: true,
            local: true,
            maestros: [{ id: 'prueba-maestro', nombre: usuario.nombre, email: usuario.email, rol: usuario.rol }],
            maestros_asignados: [{ id: 'prueba-maestro', nombre: usuario.nombre, email: usuario.email, rol: usuario.rol }]
        }
        : null;
    if (clasePrueba) {
        localStorage.setItem('zk360_clase_prueba', JSON.stringify(clasePrueba));
        window.dispatchEvent(new CustomEvent('zk360:clase-prueba-lista', { detail: clasePrueba }));
    }

    new MutationObserver(ocultarAcciones).observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true
    });
}

if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', configurarAccionesModoPrueba, { once: true });
} else {
    configurarAccionesModoPrueba();
}