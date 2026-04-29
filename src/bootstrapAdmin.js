/**
 * bootstrapAdmin: O "Primeiro Cidadão" do sistema.
 * Este arquivo garante que a biblioteca nunca fique sem um administrador.
 * Ele cria automaticamente o usuário 'admin@admin.com' na primeira vez que o servidor liga.
 */
const supabaseAdmin = require('./database');

// Configurações padrão (Podem ser alteradas no arquivo .env)
const DEFAULT_ADMIN_EMAIL = (process.env.DEFAULT_ADMIN_EMAIL || 'admin@admin.com').trim().toLowerCase();
const DEFAULT_ADMIN_PASSWORD = (process.env.DEFAULT_ADMIN_PASSWORD || 'admin123').trim();
const DEFAULT_ADMIN_NAME = (process.env.DEFAULT_ADMIN_NAME || 'Bibliotecario').trim();
const DEFAULT_ADMIN_TYPE = 'bibliotecario';

/**
 * ensureDefaultAdmin: Verifica se o admin existe e o cria se necessário.
 * Roda sempre que o servidor é iniciado.
 */
async function ensureDefaultAdmin() {
  try {
    // 1. Verifica na lista de autenticação (Supabase Auth) se o e-mail do admin já está cadastrado
    const {
      data: { users },
      error: listError
    } = await supabaseAdmin.auth.admin.listUsers();

    if (listError) throw listError;

    let authUser = users.find((user) => user.email?.toLowerCase() === DEFAULT_ADMIN_EMAIL);

    // 2. Se o admin não existir no sistema de login, nós o criamos agora
    if (!authUser) {
      const { data, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: DEFAULT_ADMIN_EMAIL,
        password: DEFAULT_ADMIN_PASSWORD,
        email_confirm: true, // Já nasce com e-mail confirmado para facilitar o acesso inicial
        user_metadata: {
          nome: DEFAULT_ADMIN_NAME,
          tipo: DEFAULT_ADMIN_TYPE
        }
      });

      if (createError) throw createError;

      authUser = data.user;
    } else {
      /**
       * 3. Se o admin já existir, garantimos que ele tenha os privilégios corretos.
       * Isso é importante caso alguém tenha alterado o cargo dele acidentalmente.
       */
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

    /**
     * 4. Sincronização com a tabela 'usuarios' do Banco de Dados.
     * Além do login, o admin precisa estar na nossa tabela de usuários para aparecer nos relatórios.
     */
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
        { onConflict: 'id' } // Se já existir o ID, ele apenas atualiza as informações
      );

    if (upsertError) throw upsertError;

  } catch (error) {
    console.error('❌ Alerta Crítico: Falha ao garantir o acesso do administrador:', error.message);
  }
}

module.exports = { ensureDefaultAdmin };

