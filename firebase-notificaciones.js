function registrarServiceWorkerFirebase() {
    if (!('serviceWorker' in navigator)) {
        return Promise.reject(new Error('Este navegador no permite notificaciones push.'));
    }
    return navigator.serviceWorker.register('./firebase-messaging-sw.js');
}

async function obtenerTokenFirebaseMessaging(config, vapidKey) {
    try {
        if (!('serviceWorker' in navigator) || typeof window.PushManager === 'undefined') {
            throw new Error('Este navegador o entorno no admite notificaciones push.');
        }
        if (!config || !vapidKey) {
            throw new Error('La configuración de Firebase Push está incompleta.');
        }

        const registro = await registrarServiceWorkerFirebase();
        const registroActivo = await navigator.serviceWorker.ready;
        if (registroActivo.scope !== registro.scope ||
            !registroActivo.pushManager ||
            typeof registroActivo.pushManager.getSubscription !== 'function') {
            throw new Error('No se pudo registrar el servicio de notificaciones push en este navegador.');
        }

        const [{ getApps, initializeApp }, { getMessaging, getToken }] = await Promise.all([
            import('https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js'),
            import('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging.js')
        ]);
        const app = getApps().find(item => item.name === 'zk360-push') ||
            initializeApp(config, 'zk360-push');
        const messaging = getMessaging(app);
        const token = await getToken(messaging, {
            vapidKey,
            serviceWorkerRegistration: registroActivo
        });
        if (!token) throw new Error('Firebase no devolvió un token de notificaciones.');
        return token;
    } catch (error) {
        console.warn('Firebase Push no está disponible:', error);
        const detalle = error instanceof Error ? error.message : '';
        if (/getSubscription is not a function/i.test(detalle)) {
            throw new Error('Este navegador no ofrece soporte completo para notificaciones push.');
        }
        throw new Error(detalle || 'No se pudieron activar las notificaciones push en este navegador.');
    }
}

window.registrarServiceWorkerFirebase = registrarServiceWorkerFirebase;
window.obtenerTokenFirebaseMessaging = obtenerTokenFirebaseMessaging;
