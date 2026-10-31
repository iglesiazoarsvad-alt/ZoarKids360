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
        return jsonResponse(500, { error: 'Servicio de registro no configurado.' }, origin);
    }

    try {
        const body = await request.json();
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        const authUserId = typeof body.auth_user_id === 'string' ? body.auth_user_id : '';
        const answerHash = typeof body.respuesta_hash === 'string' ? body.respuesta_hash : '';
        if (!/^[^@\s]+@iglesiazoarsv\.org$/.test(email) ||
            !/^[0-9a-f-]{36}$/i.test(authUserId) ||
            !/^sha256\$[a-f0-9]{32}\$[a-f0-9]{64}$/.test(answerHash) ||
            typeof body.codigo !== 'string' ||
            typeof body.pregunta !== 'string') {
            return jsonResponse(400, { error: 'Datos de registro no válidos.' }, origin);
        }

        const admin = createClient(supabaseUrl, serviceRoleKey, {
            auth: { persistSession: false, autoRefreshToken: false }
        });
        const { data: userResult, error: errorUsuario } = await admin.auth.admin.getUserById(authUserId);
        if (errorUsuario || !userResult.user || userResult.user.email?.toLowerCase() !== email) {
            return jsonResponse(403, { error: 'La cuenta de autenticación no coincide con el correo.' }, origin);
        }

        const { data: nombre, error: errorPerfil } = await admin.rpc('register_teacher_profile', {
            p_auth_user_id: authUserId,
            p_email: email,
            p_nombre: typeof body.nombre === 'string' ? body.nombre.trim() : '',
            p_codigo: body.codigo.trim().toUpperCase(),
            p_pregunta: body.pregunta.trim(),
            p_respuesta_hash: answerHash
        });
        if (errorPerfil) {
            console.error('Teacher profile registration failed:', errorPerfil.message);
            const mensaje = errorPerfil.message.toLocaleLowerCase();
            if (mensaje.includes('código es inválido') || mensaje.includes('codigo es invalido')) {
                return jsonResponse(400, { error: 'El código de invitación venció, ya fue usado o no es correcto. Solicita uno nuevo.' }, origin);
            }
            if (mensaje.includes('correo ya está registrado') || mensaje.includes('correo ya esta registrado')) {
                return jsonResponse(409, { error: 'Ese correo ya tiene un perfil de ZoarKids. Inicia sesión o usa recuperación de contraseña.' }, origin);
            }
            return jsonResponse(400, { error: 'No se pudo completar el registro. Verifica el código y vuelve a intentarlo.' }, origin);
        }

        const { error: errorRol } = await admin.auth.admin.updateUserById(authUserId, {
            app_metadata: { role: 'maestro' }
        });
        if (errorRol) {
            console.error('Teacher role claim update failed:', errorRol.message);
            return jsonResponse(500, { error: 'Perfil creado; un administrador debe habilitar el acceso.' }, origin);
        }
        return jsonResponse(200, { ok: true, nombre }, origin);
    } catch (error) {
        console.error('Teacher profile registration failed:', error);
        return jsonResponse(500, { error: 'No se pudo completar el registro.' }, origin);
    }
});
