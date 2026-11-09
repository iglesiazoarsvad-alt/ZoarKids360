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
        if (!/^[^@\s]+@iglesiazoarsv\.org$/.test(email) ||
            !['approve', 'reject', 'activate', 'deactivate'].includes(action)) {
            return jsonResponse(400, { error: 'Correo o acción no válidos.' }, origin);
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
            .select('email,nombre,rol,auth_user_id,autorizado,activo')
            .eq('email', email)
            .maybeSingle();
        if (errorPerfil) {
            console.error('Could not load target user profile:', errorPerfil.message);
            return jsonResponse(500, { error: 'No se pudo consultar la cuenta seleccionada.' }, origin);
        }
        if (!perfil || perfil.rol !== 'maestro') {
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
        if (!perfil.auth_user_id) {
            return jsonResponse(409, { error: 'La cuenta no está vinculada a Supabase Authentication. Contacta al administrador.' }, origin);
        }

        const habilitar = action === 'approve' || action === 'activate';
        const { error: errorAuth } = await admin.auth.admin.updateUserById(perfil.auth_user_id, {
            ban_duration: habilitar ? 'none' : '876000h'
        });
        if (errorAuth) {
            console.error('Could not update authentication access:', errorAuth.message);
            return jsonResponse(500, { error: 'No se pudo actualizar el acceso de la cuenta en Authentication.' }, origin);
        }

        const autorizada = action === 'approve' || perfil.autorizado === true;
        const { error: errorActualizacion } = await admin
            .from('usuarios')
            .update({ autorizado: autorizada, activo: habilitar })
            .eq('email', email);
        if (errorActualizacion) {
            const { error: errorReversion } = await admin.auth.admin.updateUserById(perfil.auth_user_id, {
                ban_duration: habilitar ? '876000h' : 'none'
            });
            if (errorReversion) {
                console.error('Could not roll back authentication access:', errorReversion.message);
            }
            console.error('Could not update account authorization:', errorActualizacion.message);
            return jsonResponse(500, { error: 'No se pudo guardar el nuevo estado de la cuenta.' }, origin);
        }

        return jsonResponse(200, {
            ok: true,
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
