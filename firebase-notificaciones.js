function registrarServiceWorkerFirebase() {
    if (!('serviceWorker' in navigator)) {
        return Promise.reject(new Error('Este navegador no permite notificaciones push.'));
    }
    return navigator.serviceWorker.register('./firebase-messaging-sw.js');
}

window.registrarServiceWorkerFirebase = registrarServiceWorkerFirebase;
