(() => {
    const status = document.getElementById('zk360-network-status');
    let hideTimer;

    function obtenerMensajeAsignacionOffline() {
        try {
            const usuario = JSON.parse(sessionStorage.getItem('zk360_usuario_activo') || 'null');
            const perfil = JSON.parse(localStorage.getItem('zk360_maestro_offline') || 'null');
            const seccion = usuario?.seccion || perfil?.seccion;
            if (!seccion) return '';
            const nombres = {
                infancia: 'Primera Infancia',
                medianos: 'Medianos',
                grandes: 'Grandes'
            };
            const nombreSeccion = nombres[seccion] || seccion;
            return new Date().getDay() === 0
                ? `Estás listo para recibir la sección ${nombreSeccion}. ¡Mucha suerte y bendiciones!`
                : `Estás asignado a la sección ${nombreSeccion}`;
        } catch (error) {
            console.error('No se pudo leer la asignación para el aviso offline:', error);
            return '';
        }
    }

    function showConnectionStatus(isOnline, message = '') {
        if (!status) return;
        clearTimeout(hideTimer);
        status.replaceChildren();
        const text = document.createElement('span');
        text.textContent = message || (isOnline
            ? 'Conexión restablecida. Los cambios se sincronizarán automáticamente.'
            : obtenerMensajeAsignacionOffline() || 'Sin conexión. Navegación con contenido guardado; los cambios se sincronizarán al reconectar.');
        status.appendChild(text);
        status.classList.toggle('offline', !isOnline);
        status.classList.toggle('online', isOnline);
        status.hidden = false;
        if (isOnline && !message) hideTimer = setTimeout(() => { status.hidden = true; }, 5000);
    }

    function mostrarEstadoCola(event) {
        const { pending = 0, offline = !navigator.onLine, requiresLogin = false, message = '' } = event.detail || {};
        if (offline) {
            const asignacion = obtenerMensajeAsignacionOffline();
            const detallePendientes = pending ? ` ${pending} cambio(s) guardado(s) en este dispositivo.` : '';
            showConnectionStatus(false, asignacion
                ? `${asignacion}${detallePendientes}`
                : pending
                    ? `Sin conexión. ${pending} cambio(s) guardado(s) en este dispositivo.`
                    : 'Sin conexión. Puedes navegar con los datos guardados; los cambios se sincronizarán al reconectar.');
            return;
        }
        if (!pending) {
            status.hidden = true;
            return;
        }
        showConnectionStatus(true, message || (requiresLogin
            ? `${pending} cambio(s) pendiente(s). Inicia sesión para sincronizarlos con Supabase.`
            : `Sincronizando ${pending} cambio(s) guardado(s) con Supabase…`));
        if (requiresLogin) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'btn-sync-login';
            button.textContent = 'Iniciar sesión';
            button.addEventListener('click', () => {
                sessionStorage.setItem('zk360_retorno_sincronizacion', 'true');
                window.location.assign('index.html');
            });
            status.appendChild(button);
        }
    }

    window.addEventListener('offline', () => showConnectionStatus(false));
    window.addEventListener('online', () => showConnectionStatus(true));
    window.addEventListener('zk360:offline-sync-status', mostrarEstadoCola);

    if (!navigator.onLine) showConnectionStatus(false);
    if ('serviceWorker' in navigator && window.isSecureContext) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js').catch(error => {
                console.error('No se pudo habilitar la navegación sin conexión:', error);
            });
        }, { once: true });
    }
})();
