// @ts-ignore Deno resolves this URL import at runtime.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

declare const Deno: {
    env: { get(name: string): string | undefined };
    serve(handler: (request: Request) => Response | Promise<Response>): void;
};

function normalizarOrigin(origin: string) {
    try {
        return new URL(origin).origin;
    } catch {
        return '';
    }
}

function originPermitido(origin: string | null) {
    if (!origin) return '';
    const configuracion = (Deno.env.get('MI_SITE_ORIGIN') || '').trim();
    const recibido = normalizarOrigin(origin);
    if (!recibido) return '';
    if (!configuracion || configuracion === '*') return recibido;
    const permitidos = configuracion
        .split(',')
        .map(valor => normalizarOrigin(valor.trim()))
        .filter(Boolean);
    return permitidos.includes(recibido) ? recibido : '';
}

function corsHeaders(origin: string) {
    return {
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Origin': origin || 'null',
        'Vary': 'Origin'
    };
}

function jsonResponse(status: number, body: Record<string, unknown>, origin = '') {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders(origin), 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });
}

function generarContrasenaTemporal() {
    const caracteres = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    const limite = 256 - (256 % caracteres.length);
    let contrasena = '';
    while (contrasena.length < 6) {
        const bytes = crypto.getRandomValues(new Uint8Array(12));
        for (const byte of bytes) {
            if (byte < limite) contrasena += caracteres[byte % caracteres.length];
            if (contrasena.length === 6) break;
        }
    }
    return contrasena;
}

Deno.serve(async (request: Request) => {
    const origin = originPermitido(request.headers.get('origin'));
    if (request.method === 'OPTIONS') {
        return origin
            ? new Response(null, { status: 204, headers: corsHeaders(origin) })
            : jsonResponse(403, { error: 'Origen no permitido.' });
    }
    if (!origin) return jsonResponse(403, { error: 'Origen no permitido.' });
    if (request.method !== 'POST') return jsonResponse(405, { error: 'Método no permitido.' }, origin);

    const supabaseUrl = Deno.env.get('MI_URL');
    const serviceRoleKey = Deno.env.get('service_role');
    if (!supabaseUrl || !serviceRoleKey) {
        console.error('Missing Supabase Edge Function secrets.');
        return jsonResponse(500, { error: 'Servicio de administración no configurado.' }, origin);
    }

    const accessToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
    if (!accessToken) return jsonResponse(401, { error: 'Debes iniciar sesión como administrador.' }, origin);

    try {
        const body = await request.json();
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        const action = body.action;
        const rolRecibido = typeof body.rol === 'string' ? body.rol.trim().toLowerCase() : '';
        const rolSolicitado = rolRecibido === 'maestra' ? 'maestro' : rolRecibido;
        const aulaRecibida = body.seccion_asignada;
        const seccionAsignada = aulaRecibida === null || aulaRecibida === undefined ||
            (typeof aulaRecibida === 'string' && aulaRecibida.trim() === '')
            ? null
            : typeof aulaRecibida === 'string' ? aulaRecibida.trim().toLowerCase() : aulaRecibida;
        if (!/^[^@\s]+@iglesiazoarsv\.org$/.test(email) ||
            !['approve', 'reject', 'activate', 'deactivate'].includes(action)) {
            return jsonResponse(400, { error: 'Correo o acción no válidos.' }, origin);
        }
        if (action === 'approve' &&
            (!['maestro', 'maestra', 'admin'].includes(rolRecibido) ||
                (seccionAsignada !== null && !['infancia', 'medianos', 'grandes'].includes(seccionAsignada)))) {
            return jsonResponse(400, { error: 'El rol o el aula asignada no son válidos.' }, origin);
        }

        const admin = createClient(supabaseUrl, serviceRoleKey, {
            auth: { persistSession: false, autoRefreshToken: false }
        });
        const { data: authenticated, error: errorSesion } = await admin.auth.getUser(accessToken);
        if (errorSesion || !authenticated.user) {
            return jsonResponse(401, { error: 'La sesión expiró. Inicia sesión nuevamente.' }, origin);
        }

        const { data: perfilAdmin, error: errorPerfilAdmin } = await admin
            .from('usuarios')
            .select('rol,autorizado,activo')
            .eq('auth_user_id', authenticated.user.id)
            .maybeSingle();
        if (errorPerfilAdmin) {
            console.error('Could not verify administrator profile:', errorPerfilAdmin.message);
            return jsonResponse(500, { error: 'No se pudo validar el permiso de administración.' }, origin);
        }
        if (!perfilAdmin || perfilAdmin.rol !== 'admin' ||
            perfilAdmin.autorizado !== true || perfilAdmin.activo !== true ||
            authenticated.user.app_metadata?.role !== 'admin') {
            return jsonResponse(403, { error: 'Solo un administrador activo y autorizado puede gestionar usuarios.' }, origin);
        }

        const { data: perfil, error: errorPerfil } = await admin
            .from('usuarios')
            .select('email,nombre,rol,auth_user_id,autorizado,activo,seccion_asignada')
            .eq('email', email)
            .maybeSingle();
        if (errorPerfil) {
            console.error('Could not load target user profile:', errorPerfil.message);
            return jsonResponse(500, { error: 'No se pudo consultar la cuenta seleccionada.' }, origin);
        }
        if (!perfil || !['maestro', 'maestra'].includes(perfil.rol)) {
            return jsonResponse(404, { error: 'No se encontró una cuenta de maestro para ese correo.' }, origin);
        }

        if (action === 'reject') {
            if (perfil.autorizado === true) {
                return jsonResponse(409, { error: 'La cuenta ya fue autorizada; usa la opción para desactivarla.' }, origin);
            }
            return jsonResponse(200, {
                ok: true,
                autorizado: false,
                activo: perfil.activo === true,
                message: 'La cuenta continúa en espera y no puede acceder.'
            }, origin);
        }

        if ((action === 'approve' && perfil.autorizado === true) ||
            ((action === 'activate' || action === 'deactivate') && perfil.autorizado !== true)) {
            return jsonResponse(409, { error: 'El estado de la cuenta cambió. Actualiza la lista e inténtalo de nuevo.' }, origin);
        }
        if (action === 'activate' && perfil.activo === true) {
            return jsonResponse(409, { error: 'La cuenta ya está activa.' }, origin);
        }
        if (action === 'deactivate' && perfil.activo !== true) {
            return jsonResponse(409, { error: 'La cuenta ya está inactiva.' }, origin);
        }
        const habilitar = action === 'approve' || action === 'activate';
        if (action === 'approve' && !perfil.auth_user_id) {
            const temporaryPassword = generarContrasenaTemporal();
            const { data: usuarioCreado, error: errorCreacion } = await admin.auth.admin.createUser({
                email,
                password: temporaryPassword,
                email_confirm: true,
                app_metadata: { role: rolSolicitado },
                user_metadata: { nombre: perfil.nombre || '' }
            });
            if (errorCreacion || !usuarioCreado.user) {
                const mensaje = errorCreacion?.message || 'Supabase Auth no devolvió el usuario creado.';
                console.error('Could not create Auth user while approving account:', mensaje);
                if (/already registered|already exists|user exists|duplicate/i.test(mensaje)) {
                    return jsonResponse(409, {
                        error: 'Ya existe una cuenta de autenticación para este correo, pero no está vinculada al perfil. Contacta al administrador.'
                    }, origin);
                }
                return jsonResponse(500, { error: 'No se pudo crear la cuenta de autenticación.' }, origin);
            }

            const authUserId = usuarioCreado.user.id;
            const { data: perfilActualizado, error: errorVinculo } = await admin
                .from('usuarios')
                .update({
                    auth_user_id: authUserId,
                    rol: rolSolicitado,
                    seccion_asignada: seccionAsignada,
                    autorizado: true,
                    activo: true,
                    requiere_cambio_clave: true
                })
                .eq('email', email)
                .is('auth_user_id', null)
                .select('email')
                .maybeSingle();
            if (errorVinculo || !perfilActualizado) {
                const { error: errorLimpieza } = await admin.auth.admin.deleteUser(authUserId);
                if (errorLimpieza) {
                    console.error('Could not remove unlinked Auth user after approval failed:', errorLimpieza.message);
                }
                console.error('Could not link Auth user during approval:', errorVinculo?.message || 'Profile changed during approval.');
                return jsonResponse(errorVinculo ? 500 : 409, {
                    error: errorVinculo
                        ? 'No se pudo guardar la autorización del usuario.'
                        : 'El perfil cambió mientras se aprobaba. Actualiza la lista e inténtalo de nuevo.'
                }, origin);
            }

            return jsonResponse(200, {
                ok: true,
                rol: rolSolicitado,
                seccion_asignada: seccionAsignada,
                autorizado: true,
                activo: true,
                temporary_password: temporaryPassword,
                message: 'Cuenta aprobada y autorizada. Comparte la contraseña temporal con el maestro.'
            }, origin);
        }

        if (!perfil.auth_user_id) {
            return jsonResponse(409, { error: 'La cuenta no está vinculada a Supabase Authentication. Contacta al administrador.' }, origin);
        }

        const cambiosAuth = {
            ban_duration: habilitar ? 'none' : '876000h',
            ...(action === 'approve' ? { app_metadata: { role: rolSolicitado } } : {})
        };
        const { data: authActualizado, error: errorAuth } = await admin.auth.admin.updateUserById(
            perfil.auth_user_id,
            cambiosAuth
        );
        if (errorAuth || !authActualizado?.user) {
            console.error('Could not update authentication access:', errorAuth?.message || 'Supabase Auth returned no user.');
            return jsonResponse(500, { error: 'No se pudo actualizar el acceso de la cuenta en Authentication.' }, origin);
        }

        const autorizada = action === 'approve' || perfil.autorizado === true;
        const actualizacionPerfil = action === 'approve'
            ? {
                rol: rolSolicitado,
                seccion_asignada: seccionAsignada,
                autorizado: autorizada,
                activo: habilitar
            }
            : { autorizado: autorizada, activo: habilitar };
        const { error: errorActualizacion } = await admin
            .from('usuarios')
            .update(actualizacionPerfil)
            .eq('email', email);
        if (errorActualizacion) {
            const banReversion = action === 'approve'
                ? (perfil.activo === true ? 'none' : '876000h')
                : habilitar ? '876000h' : 'none';
            const datosReversion = {
                ban_duration: banReversion,
                ...(action === 'approve' ? { app_metadata: { role: perfil.rol } } : {})
            };
            const { error: errorReversion } = await admin.auth.admin.updateUserById(perfil.auth_user_id, {
                ...datosReversion
            });
            if (errorReversion) {
                console.error('Could not roll back authentication access:', errorReversion.message);
            }
            console.error('Could not update account authorization:', errorActualizacion.message);
            return jsonResponse(500, { error: 'No se pudo guardar el nuevo estado de la cuenta.' }, origin);
        }

        return jsonResponse(200, {
            ok: true,
            rol: action === 'approve' ? rolSolicitado : perfil.rol,
            seccion_asignada: action === 'approve' ? seccionAsignada : perfil.seccion_asignada,
            autorizado: autorizada,
            activo: habilitar,
            message: action === 'approve'
                ? 'Cuenta aprobada y autorizada.'
                : habilitar
                    ? 'Cuenta activada.'
                    : 'Cuenta desactivada; ya no puede iniciar sesión.'
        }, origin);
    } catch (error) {
        console.error('Could not update user access:', error);
        return jsonResponse(500, { error: 'No se pudo procesar el cambio de acceso.' }, origin);
    }
});
