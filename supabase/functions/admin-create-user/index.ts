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
            .select('auth_user_id,rol,autorizado')
            .eq('auth_user_id', authData.user.id)
            .eq('rol', 'admin')
            .eq('autorizado', true)
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
            .select('email,nombre,rol,auth_user_id,autorizado')
            .eq('email', email)
            .maybeSingle();
        if (errorExistente) {
            console.error('Could not check for existing user profile:', errorExistente.message);
            return jsonResponse(500, { error: 'No se pudo verificar el correo.' }, origin);
        }
        let authUser: { id: string; email?: string } | null = null;
        if (perfilExistente?.auth_user_id) {
            const { data: existenteAuth, error: errorAuthExistente } =
                await admin.auth.admin.getUserById(perfilExistente.auth_user_id);
            if (!errorAuthExistente && existenteAuth.user?.email?.toLowerCase() === email) {
                authUser = existenteAuth.user;
            } else if (errorAuthExistente) {
                console.warn('Could not load linked Auth user; searching by email:', errorAuthExistente.message);
            }
        }

        if (!authUser) {
            const perPage = 100;
            for (let page = 1; page <= 50; page++) {
                const { data: usersPage, error: errorListaAuth } = await admin.auth.admin.listUsers({
                    page,
                    perPage
                });
                if (errorListaAuth) {
                    console.error('Could not search Auth users:', errorListaAuth.message);
                    return jsonResponse(500, { error: 'No se pudo buscar la cuenta de autenticación.' }, origin);
                }
                authUser = usersPage.users.find(user => user.email?.trim().toLowerCase() === email) || null;
                if (authUser || usersPage.users.length < perPage) break;
            }
        }

        let authUserCreated = false;
        if (!authUser) {
            const { data: invitation, error: errorInvitacion } = await admin.auth.admin.inviteUserByEmail(email, {
                data: { nombre }
            });
            if (errorInvitacion || !invitation.user) {
                const mensaje = errorInvitacion?.message || 'Supabase Auth no devolvió el usuario invitado.';
                console.error('Could not invite new user:', mensaje);
                if (/already registered|already exists|user exists|duplicate/i.test(mensaje)) {
                    return jsonResponse(409, { error: 'Ese correo ya existe en Auth, pero no se pudo localizar para vincularlo.' }, origin);
                }
                return jsonResponse(502, { error: 'No se pudo enviar la invitación. Verifica la configuración de correo de Auth.' }, origin);
            }
            authUser = invitation.user;
            authUserCreated = true;
        }
        if (!authUser) {
            return jsonResponse(500, { error: 'No se pudo crear ni localizar la cuenta de autenticación.' }, origin);
        }

        const { data: authUserData, error: errorActualizacionAuth } = await admin.auth.admin.updateUserById(authUser.id, {
            app_metadata: { role: rol },
            user_metadata: { nombre }
        });
        if (errorActualizacionAuth || !authUserData.user) {
            if (authUserCreated) {
                const { error: errorLimpieza } = await admin.auth.admin.deleteUser(authUser.id);
                if (errorLimpieza) console.error('Could not remove user after role assignment failed:', errorLimpieza.message);
            }
            console.error('Could not assign user role:', errorActualizacionAuth?.message || 'Auth returned no user.');
            return jsonResponse(500, { error: 'No se pudo preparar la cuenta del usuario.' }, origin);
        }

        const perfilDatos = {
            auth_user_id: authUser.id,
            email,
            nombre,
            rol,
            autorizado: true
        };
        const resultadoPerfil = perfilExistente
            ? await admin.from('usuarios').update(perfilDatos).eq('email', email).select('email').maybeSingle()
            : await admin.from('usuarios').insert({
                ...perfilDatos,
                politicas_aceptadas: false,
                politicas_fecha: null,
                onboarding_completado: false
            }).select('email').maybeSingle();
        if (resultadoPerfil.error || !resultadoPerfil.data) {
            if (authUserCreated) {
                const { error: errorLimpieza } = await admin.auth.admin.deleteUser(authUser.id);
                if (errorLimpieza) console.error('Could not remove invited user after profile creation failed:', errorLimpieza.message);
            }
            const errorPerfil = resultadoPerfil.error;
            console.error('Could not save authorized user profile:', errorPerfil?.message || 'No profile was returned.');
            if (errorPerfil?.code === '23505') {
                return jsonResponse(409, { error: 'El perfil cambió mientras se procesaba la autorización. Recarga la lista e inténtalo de nuevo.' }, origin);
            }
            return jsonResponse(500, { error: 'No se pudo guardar la autorización del usuario.' }, origin);
        }

        return jsonResponse(perfilExistente ? 200 : 201, {
            ok: true,
            email,
            nombre,
            rol,
            autorizado: true,
            actualizado: Boolean(perfilExistente),
            auth_user_id: authUser.id
        }, origin);
    } catch (error) {
        console.error('Could not create administrator user:', error);
        return jsonResponse(500, { error: 'No se pudo completar la invitación.' }, origin);
    }
});
