const firebaseConfig = globalThis.ZK360_CONFIG?.firebase || {};
const VAPID_KEY = globalThis.ZK360_CONFIG?.firebaseVapidKey || '';

function validarConfigFirebase() {
    const obligatorios = ['apiKey', 'authDomain', 'projectId', 'messagingSenderId', 'appId'];
    return obligatorios.every(campo => typeof firebaseConfig[campo] === 'string' && firebaseConfig[campo].trim()) &&
        typeof VAPID_KEY === 'string' && VAPID_KEY.trim().length > 20;
}
