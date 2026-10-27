// @ts-ignore Deno resolves this URL import at runtime.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

declare const Deno: {
    env: { get(name: string): string | undefined };
    serve(handler: (request: Request) => Response | Promise<Response>): void;
};

const corsHeaders = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Origin': Deno.env.get('SITE_ORIGIN') || 'null',
    'Vary': 'Origin'
};

function jsonResponse(status: number, body: Record<string, unknown>) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
    });
}

Deno.serve(async (request: Request) => {
    if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    if (request.method !== 'POST') return jsonResponse(405, { error: 'Método no permitido.' });

    const origin = request.headers.get('origin');
    const allowedOrigin = Deno.env.get('SITE_ORIGIN');
    if (!allowedOrigin || origin !== allowedOrigin) return jsonResponse(403, { error: 'Origen no permitido.' });

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
        console.error('Missing Supabase Edge Function secrets.');
        return jsonResponse(500, { error: 'Servicio de registro no configurado.' });
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
            return jsonResponse(400, { error: 'Datos de registro no válidos.' });
        }

        const admin = createClient(supabaseUrl, serviceRoleKey, {
            auth: { persistSession: false, autoRefreshToken: false }
        });
        const { data: userResult, error: errorUsuario } = await admin.auth.admin.getUserById(authUserId);
        if (errorUsuario || !userResult.user || userResult.user.email?.toLowerCase() !== email) {
            return jsonResponse(403, { error: 'La cuenta de autenticación no coincide con el correo.' });
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
            return jsonResponse(400, { error: 'No se pudo completar el registro. Verifica el código y vuelve a intentarlo.' });
        }

        const { error: errorRol } = await admin.auth.admin.updateUserById(authUserId, {
            app_metadata: { role: 'maestro' }
        });
        if (errorRol) {
            console.error('Teacher role claim update failed:', errorRol.message);
            return jsonResponse(500, { error: 'Perfil creado; un administrador debe habilitar el acceso.' });
        }
        return jsonResponse(200, { ok: true, nombre });
    } catch (error) {
        console.error('Teacher profile registration failed:', error);
        return jsonResponse(500, { error: 'No se pudo completar el registro.' });
    }
});
