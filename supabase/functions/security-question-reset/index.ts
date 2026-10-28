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
    const permitidos = (deno.env.get('SITE_ORIGIN') || '')
        .split(',')
        .map(valor => normalizarOrigin(valor.trim()))
        .filter(Boolean);
    const recibido = normalizarOrigin(origin);
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

deno.serve(async (request: Request) => {
    const origin = originPermitido(request.headers.get('origin'));
    if (request.method === 'OPTIONS') {
        return origin
            ? new Response('ok', { headers: corsHeaders(origin) })
            : jsonResponse(403, { error: 'Origen no permitido.' });
    }
    if (!origin) return jsonResponse(403, { error: 'Origen no permitido.' });
    if (request.method !== 'POST') return jsonResponse(405, { error: 'Método no permitido.' }, origin);

    const supabaseUrl = deno.env.get('SUPABASE_URL');
    const serviceRoleKey = deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
        console.error('Missing Supabase Edge Function secrets.');
        return jsonResponse(500, { error: 'Servicio de recuperación no configurado.' }, origin);
    }

    try {
        const body = await request.json();
        const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
        const action = body.action;
        if (!/^[^@\s]+@iglesiazoarsv\.org$/.test(email)) {
            return jsonResponse(400, { error: 'Correo no válido.' }, origin);
        }
        if (action !== 'get-question' && action !== 'verify-answer') {
            return jsonResponse(400, { error: 'Solicitud no válida.' }, origin);
        }

        const admin = createClient(supabaseUrl, serviceRoleKey, {
            auth: { persistSession: false, autoRefreshToken: false }
        });
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

        const { data: authUser, error: errorUsuario } = await admin.auth.admin.getUserByEmail(email);
        if (errorUsuario || !authUser.user) {
            console.error('Recovery account lookup failed:', errorUsuario?.message);
            return jsonResponse(400, { error: 'No se pudo iniciar la recuperación.' }, origin);
        }
        const { data: linkData, error: errorEnlace } = await admin.auth.admin.generateLink({
            type: 'recovery',
            email
        });
        if (errorEnlace || !linkData.properties?.hashed_token) {
            console.error('Recovery token generation failed:', errorEnlace?.message);
            return jsonResponse(500, { error: 'No se pudo emitir una sesión de recuperación.' }, origin);
        }
        return jsonResponse(200, { token_hash: linkData.properties.hashed_token }, origin);
    } catch (error) {
        console.error('Security question recovery failed:', error);
        return jsonResponse(500, { error: 'No se pudo procesar la recuperación.' }, origin);
    }
});
