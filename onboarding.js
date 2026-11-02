const PASOS_ONBOARDING = [
    { target: '#menu-lateral', titulo: 'Navegación', msg: 'Accede a los módulos desde el menú.' },
    { target: '#modulo-dashboard', titulo: 'Dashboard', msg: 'Métricas en tiempo real.' }
];

let pasoActual = 0;

function obtenerClaveOnboarding() {
    try {
        const usuario = JSON.parse(
            sessionStorage.getItem('zk360_usuario_activo') ||
            localStorage.getItem('zk360_usuario_persistente') ||
            'null'
        );
        const correo = String(usuario?.email || '').trim().toLowerCase();
        return correo ? `zk360_onboarding_visto_${correo}` : null;
    } catch (error) {
        console.error('No se pudo determinar el usuario del onboarding:', error);
        return null;
    }
}

function finalizarOnboardingForzado() {
    const clave = obtenerClaveOnboarding();
    if (clave) localStorage.setItem(clave, 'true');
}

window.iniciarOnboardingForzado = function () {
    const clave = obtenerClaveOnboarding();
    if (!clave || localStorage.getItem(clave) === 'true') return;
    pasoActual = 0;
    mostrarPasoOnboarding(pasoActual);
};

function mostrarPasoOnboarding(index) {
    if (index >= PASOS_ONBOARDING.length) {
        finalizarOnboardingForzado();
        return;
    }
}

window.omitirOnboardingForzado = finalizarOnboardingForzado;