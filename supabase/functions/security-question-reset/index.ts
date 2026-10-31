// @ts-ignore Deno resolves remote URL imports at runtime.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const deno = (globalThis as typeof globalThis & {
    Deno: {
        env: { get(name: string): string | undefined };
        serve(handler: (request: Request) => Response | Promise<Response>): void;
    };
}).Deno;

function normalizarOrigin(origin: string) {
    try {
        return new URL(origin).origin;
    } catch {
        return '';
    }
}

function originPermitido(origin: string | null) {
    if (!origin) return '';
    const configuracion = (deno.env.get('MI_SITE_ORIGIN') || '').trim();
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

function constantTimeEqual(left: string, right: string) {
    if (left.length !== right.length) return false;
    let difference = 0;
    for (let index = 0; index < left.length; index++) {
        difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
    }
    return difference === 0;
}

async function hashAnswer(salt: string, answer: string) {
    const digest = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(`${salt}:${answer.trim().toLocaleLowerCase('es')}`)
    );
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

function generarContrasenaTemporal() {
    const bytes = crypto.getRandomValues(new Uint8Array(18));
    const sufijo = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    return `ZK-Temp-${sufijo}`;
}

deno.serve(async (request: Request) => {
    const origin = originPermitido(request.headers.get('origin'));
    if (request.method === 'OPTIONS') {
        return origin
            ? new Response(null, { status: 204, headers: corsHeaders(origin) })
            : jsonResponse(403, { error: 'Origen no permitido.' });
    }
    if (!origin) return jsonResponse(403, { error: 'Origen no permitido.' });
    if (request.method !== 'POST') return jsonResponse(405, { error: 'Método no permitido.' }, origin);

    const supabaseUrl = deno.env.get('MI_URL');
    const serviceRoleKey = deno.env.get('service_role');
    if (!supabaseUrl || !serviceRoleKey) {
        console.error('Missing Supabase Edge Function secrets.');
        return jsonResponse(500, { error: 'Servicio de recuperación no configurado.' }, origin);
    }

    try {
        const body = await request.json();
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        const action = body.action;
        if (action !== 'change-temporary-password' && !/^[^@\s]+@iglesiazoarsv\.org$/.test(email)) {
            return jsonResponse(400, { error: 'Correo no válido.' }, origin);
        }
        if (action !== 'get-question' && action !== 'verify-answer' && action !== 'change-temporary-password') {
            return jsonResponse(400, { error: 'Solicitud no válida.' }, origin);
        }

        const admin = createClient(supabaseUrl, serviceRoleKey, {
            auth: { persistSession: false, autoRefreshToken: false }
        });

        if (action === 'change-temporary-password') {
            const accessToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
            const password = typeof body.password === 'string' ? body.password : '';
            if (!accessToken || password.length < 8 || password.length > 72 ||
                !/[A-Z]/.test(password) || !/[0-9]/.test(password) ||
                !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>/?]/.test(password) || /\s/.test(password)) {
                return jsonResponse(400, { error: 'La nueva contraseña no cumple los requisitos.' }, origin);
            }

            const { data: authenticated, error: errorSesion } = await admin.auth.getUser(accessToken);
            const authUser = authenticated?.user;
            const emailSesion = authUser?.email?.trim().toLowerCase() || '';
            if (errorSesion || !authUser || !/^[^@\s]+@iglesiazoarsv\.org$/.test(emailSesion)) {
                return jsonResponse(401, { error: 'La sesión expiró. Inicia sesión nuevamente con tu contraseña temporal.' }, origin);
            }

            const { data: perfil, error: errorPerfil } = await admin
                .from('usuarios')
                .select('email,requiere_cambio_clave')
                .eq('email', emailSesion)
                .maybeSingle();
            if (errorPerfil) {
                console.error('Required password-change lookup failed:', errorPerfil.message);
                return jsonResponse(500, { error: 'No se pudo validar el perfil para cambiar la contraseña.' }, origin);
            }
            if (!perfil || perfil.requiere_cambio_clave !== true) {
                return jsonResponse(409, { error: 'La cuenta no tiene un cambio obligatorio pendiente.' }, origin);
            }

            const { error: errorActualizacionAuth } = await admin.auth.admin.updateUserById(authUser.id, { password });
            if (errorActualizacionAuth) {
                console.error('Temporary password update failed:', errorActualizacionAuth.message);
                return jsonResponse(400, { error: errorActualizacionAuth.message }, origin);
            }

            const { error: errorActualizacionPerfil } = await admin
                .from('usuarios')
                .update({ requiere_cambio_clave: false })
                .eq('email', emailSesion);
            if (errorActualizacionPerfil) {
                console.error('Required password-change flag update failed:', errorActualizacionPerfil.message);
                return jsonResponse(500, { error: 'La contraseña cambió, pero no se pudo completar el perfil. Intenta guardar la misma contraseña nuevamente.' }, origin);
            }
            return jsonResponse(200, { ok: true }, origin);
        }

        const { data: permitida, error: errorLimite } = await admin.rpc(
            'allow_security_question_attempt',
            { p_email: email }
        );
        if (errorLimite) {
            console.error('Security question rate-limit error:', errorLimite.message);
            return jsonResponse(500, { error: 'No se pudo validar la solicitud.' }, origin);
        }
        if (permitida !== true) {
            return jsonResponse(429, { error: 'Demasiados intentos. Inténtalo más tarde.' }, origin);
        }

        const { data: pregunta, error: errorPregunta } = await admin
            .from('preguntas_seguridad')
            .select('email,pregunta,respuesta_hash')
            .eq('email', email)
            .maybeSingle();
        if (errorPregunta) {
            console.error('Security question lookup error:', errorPregunta.message);
            return jsonResponse(500, { error: 'No se pudo validar la solicitud.' }, origin);
        }
        if (!pregunta) return jsonResponse(404, { error: 'No se encontró una pregunta de seguridad.' }, origin);

        if (action === 'get-question') {
            return jsonResponse(200, { question: pregunta.pregunta }, origin);
        }

        const answer = typeof body.answer === 'string' ? body.answer.trim().toLocaleLowerCase('es') : '';
        if (answer.length < 2 || answer.length > 200) {
            return jsonResponse(400, { error: 'Respuesta incorrecta.' }, origin);
        }
        const storedHash = String(pregunta.respuesta_hash || '');
        const match = /^sha256\$([a-f0-9]{32})\$([a-f0-9]{64})$/.exec(storedHash);
        if (!match) {
            console.error('Invalid or unhashed security answer stored for account.');
            return jsonResponse(500, { error: 'La pregunta de seguridad requiere restablecimiento por un administrador.' }, origin);
        }
        const actualHash = await hashAnswer(match[1], answer);
        if (!constantTimeEqual(actualHash, match[2])) {
            return jsonResponse(400, { error: 'Respuesta incorrecta.' }, origin);
        }

        const perPage = 1000;
        let authUser: { id: string; email?: string } | null = null;
        let page = 1;
        while (!authUser) {
            const { data: usuariosAuth, error: errorUsuariosAuth } = await admin.auth.admin.listUsers({
                page,
                perPage
            });
            if (errorUsuariosAuth) {
                console.error('Recovery account lookup failed:', errorUsuariosAuth.message);
                return jsonResponse(500, { error: 'No se pudo buscar la cuenta de autenticación.' }, origin);
            }
            authUser = usuariosAuth.users.find(
                (usuario: { email?: string }) => usuario.email?.trim().toLowerCase() === email
            ) || null;
            if (authUser || usuariosAuth.users.length < perPage) break;
            page++;
        }
        if (!authUser) {
            return jsonResponse(400, { error: 'No se pudo iniciar la recuperación.' }, origin);
        }
        const { data: perfil, error: errorPerfil } = await admin
            .from('usuarios')
            .select('email,requiere_cambio_clave')
            .eq('email', email)
            .maybeSingle();
        if (errorPerfil) {
            console.error('Recovery profile lookup failed:', errorPerfil.message);
            return jsonResponse(500, { error: 'No se pudo preparar la recuperación.' }, origin);
        }
        if (!perfil) return jsonResponse(404, { error: 'No se encontró el perfil de ZoarKids.' }, origin);

        const { error: errorMarcarCambio } = await admin
            .from('usuarios')
            .update({ requiere_cambio_clave: true })
            .eq('email', email);
        if (errorMarcarCambio) {
            console.error('Required password-change flag update failed:', errorMarcarCambio.message);
            return jsonResponse(500, { error: 'No se pudo marcar el cambio obligatorio de contraseña.' }, origin);
        }

        const temporaryPassword = generarContrasenaTemporal();
        const { error: errorContrasena } = await admin.auth.admin.updateUserById(authUser.id, {
            password: temporaryPassword
        });
        if (errorContrasena) {
            console.error('Temporary password generation failed:', errorContrasena.message);
            if (perfil.requiere_cambio_clave !== true) {
                const { error: errorReversion } = await admin
                    .from('usuarios')
                    .update({ requiere_cambio_clave: false })
                    .eq('email', email);
                if (errorReversion) {
                    console.error('Required password-change rollback failed:', errorReversion.message);
                }
            }
            return jsonResponse(500, { error: 'No se pudo actualizar la contraseña temporal en Supabase Auth.' }, origin);
        }
        return jsonResponse(200, { temporary_password: temporaryPassword }, origin);
    } catch (error) {
        console.error('Security question recovery failed:', error);
        return jsonResponse(500, { error: 'No se pudo procesar la recuperación.' }, origin);
    }
});
