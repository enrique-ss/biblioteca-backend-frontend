const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const requestedMode = (process.env.APP_MODE || 'offline').trim().toLowerCase();
const hasSupabaseConfig = Boolean(
  process.env.SUPABASE_URL &&
  process.env.SUPABASE_ANON_KEY &&
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
const runtimeMode = requestedMode === 'online' && hasSupabaseConfig ? 'online' : 'offline';
const isOfflineMode = runtimeMode !== 'online';

let io = null;
let lastNotificationData = {
  atrasados: 0,
  pendentes: 0,
  bloqueados: 0
};

const initMonitor = (socketIO) => {
  io = socketIO;
  
  if (isOfflineMode) {
    console.log('Monitoramento desabilitado no modo offline');
    return;
  }

  console.log('Monitoramento iniciado no modo online');
  
  // Verifica a cada 30 segundos
  setInterval(checkNotifications, 30000);
  
  // Verificação inicial
  setTimeout(checkNotifications, 5000);
};

const checkNotifications = async () => {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false } }
    );

    const hoje = new Date();

    // Verificar livros atrasados
    const { count: atrasados } = await supabase
      .from('alugueis')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'ativo')
      .lt('data_prevista_devolucao', hoje.toISOString());

    // Verificar materiais pendentes de aprovação
    const { count: pendentes } = await supabase
      .from('acervo_digital')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pendente');

    // Verificar usuários bloqueados
    const { count: bloqueados } = await supabase
      .from('usuarios')
      .select('*', { count: 'exact', head: true })
      .eq('bloqueado', true);

    // Verificar estatísticas para atualização em tempo real
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

    // Enviar notificação se houver mudança
    if (JSON.stringify(currentData) !== JSON.stringify(lastNotificationData)) {
      lastNotificationData = currentData;
      
      if (io) {
        io.to('bibliotecarios').emit('notifications', {
          atrasados: currentData.atrasados,
          pendentes: currentData.pendentes,
          bloqueados: currentData.bloqueados,
          timestamp: new Date().toISOString()
        });
      }
    }

    // Enviar estatísticas atualizadas via WebSocket
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
