const supabaseAdmin = require('./database');

const DEFAULT_ADMIN_EMAIL = (process.env.DEFAULT_ADMIN_EMAIL || 'admin@admin.com').trim().toLowerCase();
const DEFAULT_ADMIN_PASSWORD = (process.env.DEFAULT_ADMIN_PASSWORD || 'admin123').trim();
const DEFAULT_ADMIN_NAME = (process.env.DEFAULT_ADMIN_NAME || 'Bibliotecario').trim();
const DEFAULT_ADMIN_TYPE = 'bibliotecario';

async function ensureDefaultAdmin() {
  try {
    const {
      data: { users },
      error: listError
    } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) throw listError;

    let authUser = users.find((user) => user.email?.toLowerCase() === DEFAULT_ADMIN_EMAIL);

    if (!authUser) {
      const { data, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: DEFAULT_ADMIN_EMAIL,
        password: DEFAULT_ADMIN_PASSWORD,
        email_confirm: true,
        user_metadata: {
          nome: DEFAULT_ADMIN_NAME,
          tipo: DEFAULT_ADMIN_TYPE
        }
      });

      if (createError) throw createError;

      authUser = data.user;
    } else {
      const nextMetadata = {
        ...(authUser.user_metadata || {}),
        nome: authUser.user_metadata?.nome || DEFAULT_ADMIN_NAME,
        tipo: DEFAULT_ADMIN_TYPE
      };

      const shouldUpdateMetadata =
        authUser.user_metadata?.tipo !== DEFAULT_ADMIN_TYPE ||
        !authUser.user_metadata?.nome;

      if (shouldUpdateMetadata) {
        const { data, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(authUser.id, {
          user_metadata: nextMetadata
        });

        if (updateError) throw updateError;
        authUser = data.user;
      }
    }

    const { error: upsertError } = await supabaseAdmin
      .from('usuarios')
      .upsert(
        {
          id: authUser.id,
          nome: authUser.user_metadata?.nome || DEFAULT_ADMIN_NAME,
          email: DEFAULT_ADMIN_EMAIL,
          tipo: DEFAULT_ADMIN_TYPE,
          multa_pendente: false,
          bloqueado: false,
          motivo_bloqueio: null,
          infantil_xp: 0,
          infantil_level: 1,
          infantil_hearts: 5,
          deleted_at: null
        },
        { onConflict: 'id' }
      );

    if (upsertError) throw upsertError;

  } catch (error) {
    console.error('Falha ao garantir o admin padrao:', error.message);
  }
}

module.exports = { ensureDefaultAdmin };
