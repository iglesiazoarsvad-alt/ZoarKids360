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

window.iniciarOnboardingForzado = function () {
    const clave = obtenerClaveOnboarding();
    if (!clave || localStorage.getItem(clave) === 'true') return;
    if (typeof window.iniciarOnboardingSistema !== 'function') {
        console.error('El tour de onboarding no está disponible.');
        return;
    }
    window.iniciarOnboardingSistema();
};

window.omitirOnboardingForzado = function () {
    const clave = obtenerClaveOnboarding();
    if (clave) localStorage.setItem(clave, 'true');
    window.cerrarOnboardingSistema?.();
};
