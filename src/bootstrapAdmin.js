// Bootstrap do Administrador - Cria usuário admin padrão do sistema
const supabaseAdmin = require('./database');

// Configurações do administrador padrão (podem ser sobrescritas por variáveis de ambiente)
const DEFAULT_ADMIN_EMAIL = (process.env.DEFAULT_ADMIN_EMAIL || 'admin@admin.com').trim().toLowerCase();
const DEFAULT_ADMIN_PASSWORD = (process.env.DEFAULT_ADMIN_PASSWORD || 'admin123').trim();
const DEFAULT_ADMIN_NAME = (process.env.DEFAULT_ADMIN_NAME || 'Bibliotecario').trim();
const DEFAULT_ADMIN_TYPE = 'bibliotecario';

// Garante que existe um usuário administrador no sistema
async function ensureDefaultAdmin() {
  try {
    // Lista todos os usuários existentes no Supabase Auth
    const {
      data: { users },
      error: listError
    } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) throw listError;

    // Procura pelo usuário admin padrão
    let authUser = users.find((user) => user.email?.toLowerCase() === DEFAULT_ADMIN_EMAIL);

    // Se não existe, cria um novo usuário admin
    if (!authUser) {
      const { data, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: DEFAULT_ADMIN_EMAIL,
        password: DEFAULT_ADMIN_PASSWORD,
        email_confirm: true, // Auto-confirma email
        user_metadata: {
          nome: DEFAULT_ADMIN_NAME,
          tipo: DEFAULT_ADMIN_TYPE
        }
      });

      if (createError) throw createError;

      authUser = data.user;
    } else {
      // Se já existe, atualiza metadados se necessário
      const nextMetadata = {
        ...(authUser.user_metadata || {}),
        nome: authUser.user_metadata?.nome || DEFAULT_ADMIN_NAME,
        tipo: DEFAULT_ADMIN_TYPE
      };

      // Verifica se precisa atualizar metadados
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

    // Sincroniza usuário na tabela local 'usuarios' do banco de dados
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
        { onConflict: 'id' } // Se já existir, atualiza os dados
      );

    if (upsertError) throw upsertError;

  } catch (error) {
    console.error('Falha ao garantir o admin padrao:', error.message);
  }
}

module.exports = { ensureDefaultAdmin };
