const PASOS_ONBOARDING = [
    { target: '#menu-lateral', titulo: 'Navegación', msg: 'Accede a los módulos desde el menú.' },
    { target: '#modulo-dashboard', titulo: 'Dashboard', msg: 'Métricas en tiempo real.' }
];

let pasoActual = 0;

window.iniciarOnboardingForzado = function () {
    if (localStorage.getItem('zk360_onboarding_completed') === 'true') return;
    pasoActual = 0;
    mostrarPasoOnboarding(pasoActual);
};

function mostrarPasoOnboarding(index) {
    if (index >= PASOS_ONBOARDING.length) {
        localStorage.setItem('zk360_onboarding_completed', 'true');
        return;
    }
}