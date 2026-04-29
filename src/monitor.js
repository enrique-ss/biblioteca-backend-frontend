/**
 * MONITORAMENTO EM TEMPO REAL
 * Este módulo atua como o "vigilante" da biblioteca. Ele verifica periodicamente:
 * 1. Livros com devolução em atraso.
 * 2. Novos materiais digitais aguardando aprovação.
 * 3. Usuários que foram bloqueados.
 * 
 * Quando detecta mudanças, ele notifica instantaneamente os bibliotecários via Socket.io.
 */

const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

// Verifica se estamos no modo Online ou Offline
const requestedMode = (process.env.APP_MODE || 'offline').trim().toLowerCase();
const hasSupabaseConfig = Boolean(
  process.env.SUPABASE_URL &&
  process.env.SUPABASE_ANON_KEY &&
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const runtimeMode = requestedMode === 'online' && hasSupabaseConfig ? 'online' : 'offline';
const isOfflineMode = runtimeMode !== 'online';

let io = null; // Guardará a ferramenta de comunicação em tempo real
let lastNotificationData = {
  atrasados: 0,
  pendentes: 0,
  bloqueados: 0
};

// Inicializa o monitor
const initMonitor = (socketIO) => {
  io = socketIO;
  
  if (isOfflineMode) {
    console.log('Monitoramento desabilitado no modo offline');
    return;
  }

  console.log('Monitoramento iniciado no modo online');
  
  // Verifica a cada 30 segundos se algo mudou
  setInterval(checkNotifications, 30000);
  
  // Faz uma verificação inicial logo que o servidor liga
  setTimeout(checkNotifications, 5000);
};

// Função que faz a busca por novidades no banco de dados
const checkNotifications = async () => {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );

    const hoje = new Date();

    // 1. Verificar livros que passaram da data de devolução
    const { count: atrasados } = await supabase
      .from('alugueis')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'ativo')
      .lt('data_prevista_devolucao', hoje.toISOString());

    // 2. Verificar materiais digitais que ainda precisam ser aprovados
    const { count: pendentes } = await supabase
      .from('acervo_digital')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pendente');

    // 3. Verificar quantos usuários estão bloqueados no momento
    const { count: bloqueados } = await supabase
      .from('usuarios')
      .select('*', { count: 'exact', head: true })
      .eq('bloqueado', true);

    // 4. Pega números gerais para o painel de estatísticas
    const { count: totalLivros } = await supabase
      .from('livros')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null);

    const { count: emprestimosAtivos } = await supabase
      .from('alugueis')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'ativo');

    const { count: usuariosCadastrados } = await supabase
      .from('usuarios')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null);

    const currentData = {
      atrasados: atrasados || 0,
      pendentes: pendentes || 0,
      bloqueados: bloqueados || 0
    };

    const currentStats = {
      totalLivros: totalLivros || 0,
      emprestimosAtivos: emprestimosAtivos || 0,
      usuariosCadastrados: usuariosCadastrados || 0
    };

    // Só envia a mensagem de notificação se os números mudarem
    if (JSON.stringify(currentData) !== JSON.stringify(lastNotificationData)) {
      lastNotificationData = currentData;
      
      if (io) {
        // Avisa apenas os bibliotecários sobre os novos alertas
        io.to('bibliotecarios').emit('notifications', {
          atrasados: currentData.atrasados,
          pendentes: currentData.pendentes,
          bloqueados: currentData.bloqueados,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Atualiza os números do painel administrativo em tempo real
    if (io) {
      io.to('bibliotecarios').emit('statsUpdate', {
        totalLivros: currentStats.totalLivros,
        emprestimosAtivos: currentStats.emprestimosAtivos,
        usuariosCadastrados: currentStats.usuariosCadastrados,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Erro ao verificar notificações:', error);
  }
};

module.exports = { initMonitor };
