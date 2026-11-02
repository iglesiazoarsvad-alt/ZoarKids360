importScripts(new URL('./config.js', self.location.href).href);
if (['localhost', '127.0.0.1', '[::1]'].includes(self.location.hostname)) {
    importScripts(new URL('./config.local.js', self.location.href).href);
}
importScripts(
    'https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js'
);

const firebaseConfig = self.ZK360_CONFIG?.firebase;
if (!firebaseConfig) {
    throw new Error('No se encontró la configuración de Firebase para notificaciones.');
}

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

messaging.onBackgroundMessage(payload => {
    const title = payload.notification?.title || 'ZoarKids 360';
    const options = {
        body: payload.notification?.body || payload.data?.body || '',
        icon: new URL('./icono.png', self.location.href).href,
        data: payload.data || {}
    };
    return self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
        const client = clients.find(item => 'focus' in item);
        return client ? client.focus() : self.clients.openWindow(new URL('./', self.location.href).href);
    }));
});
