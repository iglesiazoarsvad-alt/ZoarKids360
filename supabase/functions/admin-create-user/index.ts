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
        headers: {
            ...corsHeaders(origin),
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store'
        }
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

    const token = request.headers.get('authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return jsonResponse(401, { error: 'Debes iniciar sesión como administrador.' }, origin);

    try {
        const body = await request.json();
        const nombre = typeof body.nombre === 'string' ? body.nombre.trim() : '';
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        const rol = body.rol;
        if (nombre.length < 2 || nombre.length > 100 ||
            !/^[^@\s]+@iglesiazoarsv\.org$/.test(email) ||
            !['admin', 'maestro'].includes(rol)) {
            return jsonResponse(400, { error: 'Nombre, correo o rol no válidos.' }, origin);
        }

        const admin = createClient(supabaseUrl, serviceRoleKey, {
            auth: { persistSession: false, autoRefreshToken: false }
        });
        const { data: authData, error: authError } = await admin.auth.getUser(token);
        if (authError || !authData.user) {
            return jsonResponse(401, { error: 'La sesión expiró. Inicia sesión nuevamente.' }, origin);
        }

        const { data: adminPerfil, error: errorAdminPerfil } = await admin
            .from('usuarios')
            .select('auth_user_id,rol')
            .eq('auth_user_id', authData.user.id)
            .eq('rol', 'admin')
            .maybeSingle();
        if (errorAdminPerfil) {
            console.error('Could not verify administrator profile:', errorAdminPerfil.message);
            return jsonResponse(500, { error: 'No se pudo validar el permiso de administración.' }, origin);
        }
        if (!adminPerfil || authData.user.app_metadata?.role !== 'admin') {
            return jsonResponse(403, { error: 'Solo un administrador autorizado puede agregar usuarios.' }, origin);
        }

        const { data: perfilExistente, error: errorExistente } = await admin
            .from('usuarios')
            .select('email')
            .eq('email', email)
            .maybeSingle();
        if (errorExistente) {
            console.error('Could not check for existing user profile:', errorExistente.message);
            return jsonResponse(500, { error: 'No se pudo verificar el correo.' }, origin);
        }
        if (perfilExistente) {
            return jsonResponse(409, { error: 'Ese correo ya tiene un perfil de usuario.' }, origin);
        }

        const { data: invitation, error: errorInvitacion } = await admin.auth.admin.inviteUserByEmail(email, {
            data: { nombre }
        });
        if (errorInvitacion || !invitation.user) {
            const mensaje = errorInvitacion?.message || 'Supabase Auth no devolvió el usuario invitado.';
            console.error('Could not invite new user:', mensaje);
            if (/already registered|already exists|user exists|duplicate/i.test(mensaje)) {
                return jsonResponse(409, { error: 'Ese correo ya existe en Supabase Auth. Contacta al administrador para vincularlo.' }, origin);
            }
            return jsonResponse(502, { error: 'No se pudo enviar la invitación. Verifica la configuración de correo de Auth.' }, origin);
        }

        const { error: errorRol } = await admin.auth.admin.updateUserById(invitation.user.id, {
            app_metadata: { role: rol },
            user_metadata: { nombre }
        });
        if (errorRol) {
            const { error: errorLimpieza } = await admin.auth.admin.deleteUser(invitation.user.id);
            if (errorLimpieza) console.error('Could not remove user after role assignment failed:', errorLimpieza.message);
            console.error('Could not assign invited user role:', errorRol.message);
            return jsonResponse(500, { error: 'No se pudo preparar la cuenta del usuario.' }, origin);
        }

        const { error: errorPerfil } = await admin.from('usuarios').insert({
            auth_user_id: invitation.user.id,
            email,
            nombre,
            rol,
            politicas_aceptadas: false,
            politicas_fecha: null,
            onboarding_completado: false
        });
        if (errorPerfil) {
            const { error: errorLimpieza } = await admin.auth.admin.deleteUser(invitation.user.id);
            if (errorLimpieza) console.error('Could not remove invited user after profile creation failed:', errorLimpieza.message);
            console.error('Could not create invited user profile:', errorPerfil.message);
            if (errorPerfil.code === '23505') {
                return jsonResponse(409, { error: 'Ese correo ya tiene un perfil de usuario.' }, origin);
            }
            return jsonResponse(500, { error: 'No se pudo guardar el perfil del usuario.' }, origin);
        }

        return jsonResponse(201, { ok: true, email, nombre, rol }, origin);
    } catch (error) {
        console.error('Could not create administrator user:', error);
        return jsonResponse(500, { error: 'No se pudo completar la invitación.' }, origin);
    }
});
