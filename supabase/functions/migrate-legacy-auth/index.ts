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
        return jsonResponse(500, { error: 'Servicio de migración de cuentas no configurado.' }, origin);
    }

    try {
        const body = await request.json();
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        const password = typeof body.password === 'string' ? body.password : '';
        if (!/^[^@\s]+@iglesiazoarsv\.org$/.test(email) || password.length < 1 || password.length > 72) {
            return jsonResponse(400, { error: 'Credenciales no válidas.' }, origin);
        }

        const admin = createClient(supabaseUrl, serviceRoleKey, {
            auth: { persistSession: false, autoRefreshToken: false }
        });
        const { data: permitida, error: errorLimite } = await admin.rpc(
            'allow_legacy_auth_migration_attempt',
            { p_email: email }
        );
        if (errorLimite) {
            console.error('Legacy account migration rate-limit error:', errorLimite.message);
            return jsonResponse(500, { error: 'No se pudo validar la solicitud.' }, origin);
        }
        if (permitida !== true) {
            return jsonResponse(429, { error: 'Demasiados intentos. Inténtalo más tarde.' }, origin);
        }

        const { data: perfil, error: errorPerfil } = await admin
            .from('usuarios')
            .select('auth_user_id,clave_hash,nombre,rol')
            .eq('email', email)
            .maybeSingle();
        if (errorPerfil) {
            console.error('Legacy account profile lookup failed:', errorPerfil.message);
            return jsonResponse(500, { error: 'No se pudo validar el perfil de la cuenta.' }, origin);
        }
        if (!perfil || typeof perfil.clave_hash !== 'string' || perfil.clave_hash !== password) {
            return jsonResponse(401, { error: 'Correo o contraseña incorrectos.' }, origin);
        }
        if (perfil.auth_user_id) {
            return jsonResponse(409, { error: 'La cuenta ya está vinculada con Auth. Usa recuperación de contraseña o contacta al administrador.' }, origin);
        }

        const rol = ['admin', 'pastor', 'maestro'].includes(perfil.rol) ? perfil.rol : 'maestro';
        const { data: nuevoUsuario, error: errorCreacion } = await admin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { nombre: perfil.nombre || '' }
        });
        if (errorCreacion || !nuevoUsuario.user) {
            const mensaje = errorCreacion?.message || 'Supabase Auth no devolvió el usuario creado.';
            console.error('Legacy account Auth user creation failed:', mensaje);
            if (/already registered|already exists|user exists|duplicate/i.test(mensaje)) {
                return jsonResponse(409, { error: 'Ya existe una cuenta Auth para este correo. Contacta al administrador para vincularla.' }, origin);
            }
            return jsonResponse(500, { error: 'No se pudo crear la cuenta de autenticación.' }, origin);
        }

        const { error: errorRol } = await admin.auth.admin.updateUserById(nuevoUsuario.user.id, {
            app_metadata: { role: rol }
        });
        if (errorRol) {
            const { error: errorLimpieza } = await admin.auth.admin.deleteUser(nuevoUsuario.user.id);
            if (errorLimpieza) {
                console.error('Could not remove Auth user after role assignment failed:', errorLimpieza.message);
            }
            console.error('Legacy account Auth role assignment failed:', errorRol.message);
            return jsonResponse(500, { error: 'No se pudo preparar la cuenta de autenticación.' }, origin);
        }

        const { data: perfilActualizado, error: errorVinculo } = await admin
            .from('usuarios')
            .update({ auth_user_id: nuevoUsuario.user.id, clave_hash: null })
            .eq('email', email)
            .is('auth_user_id', null)
            .eq('clave_hash', password)
            .select('email')
            .maybeSingle();
        if (errorVinculo || !perfilActualizado) {
            const { error: errorLimpieza } = await admin.auth.admin.deleteUser(nuevoUsuario.user.id);
            if (errorLimpieza) {
                console.error('Could not remove unlinked Auth user after migration failure:', errorLimpieza.message);
            }
            console.error('Legacy account Auth link failed:', errorVinculo?.message || 'Profile changed during migration.');
            return jsonResponse(500, { error: 'No se pudo vincular la cuenta. Contacta al administrador.' }, origin);
        }

        return jsonResponse(200, { ok: true }, origin);
    } catch (error) {
        console.error('Legacy account migration failed:', error);
        return jsonResponse(500, { error: 'No se pudo completar la migración de la cuenta.' }, origin);
    }
});
