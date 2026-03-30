// Central de Notificações e Alertas do Sistema

let dadosNotificacoes = [];

// Carrega e renderiza as notificações na tela cheia
async function carregarNotificacoesCompleto() {
    await buscarNotificacoes();
    renderizarNotificacoesTelaCheia();
}

// Busca as notificações do servidor baseadas no tipo de usuário
async function buscarNotificacoes() {
    if (!currentUser) return;
    
    try {
        const corpoNotificacoes = document.getElementById('notificationsFullScreenBody');
        if (corpoNotificacoes) {
            corpoNotificacoes.innerHTML = '<div style="text-align:center; padding:40px; color:var(--accent); font-family:\'Cinzel\', serif;">Buscando alertas do sistema...</div>';
        }
        
        const resultados = await (currentUser.tipo === 'bibliotecario' ? carregarNotificacoesAdmin() : carregarNotificacoesUsuario());
        dadosNotificacoes = resultados || [];
        
        renderizarNotificacoesTelaCheia();
        atualizarBadgeNotificacoes();
    } catch (erro) {
        console.error('Erro ao buscar notificações:', erro);
        const corpo = document.getElementById('notificationsFullScreenBody');
        if (corpo) {
            corpo.innerHTML = '<div style="text-align:center; padding:40px; color:var(--danger);">Erro crítico ao carregar alertas</div>';
        }
    }
}

// Lógica de busca para Administradores (Bibliotecários)
async function carregarNotificacoesAdmin() {
    const lista = [];
    
    try {
        const [atrasadosRes, usuariosRes] = await Promise.all([
            api('/alugueis/atrasados'),
            api('/usuarios?limit=100')
        ]);

        const atrasados = atrasadosRes.data;
        const usuarios = usuariosRes.data;

        // Alerta: Empréstimos com prazo vencido
        if (atrasados?.total > 0) {
            lista.push({
                type: 'warning',
                icon: '⏰',
                title: 'Empréstimos Atrasados',
                message: `Existem <strong>${atrasados.total}</strong> empréstimo(s) com entrega pendente no sistema.`,
                count: atrasados.total,
                action: { label: 'Gerenciar Empréstimos', onClick: "mostrarTela('alugueisScreen')" }
            });
        }
        
        // Alerta: Usuários que possuem multas não pagas
        const usuariosComMulta = usuarios.filter(u => u.multa_pendente);
        if (usuariosComMulta.length > 0) {
            lista.push({
                type: 'danger',
                icon: '💰',
                title: 'Multas Pendentes',
                message: `<strong>${usuariosComMulta.length}</strong> usuário(s) possuem débitos pendentes que precisam de regularização.`,
                count: usuariosComMulta.length,
                action: { label: 'Gerenciar Usuários', onClick: "mostrarTela('usuariosScreen')" }
            });
        }
        
        // Alerta: Contas que foram bloqueadas
        const usuariosBloqueados = usuarios.filter(u => u.bloqueado);
        if (usuariosBloqueados.length > 0) {
            lista.push({
                type: 'info',
                icon: '🚫',
                title: 'Contas Suspensas',
                message: `Atualmente, <strong>${usuariosBloqueados.length}</strong> usuários estão com acesso bloqueado ao sistema.`,
                count: usuariosBloqueados.length
            });
        }
        
        // Alerta: Pendências do Acervo Digital
        try {
            const pendentesDigital = await api('/acervo-digital/pendentes');
            if (pendentesDigital?.length > 0) {
                lista.push({
                    type: 'info',
                    icon: '📂',
                    title: 'Novas Submissões',
                    message: `Existem <strong>${pendentesDigital.length}</strong> novos documentos digitais aguardando curadoria.`,
                    count: pendentesDigital.length,
                    action: { label: 'Revisar Agora', onClick: "carregarPendencias()" }
                });
            }
        } catch (e) {}

    } catch (erro) {
        console.error('Erro ao carregar notificações administrativas:', erro);
    }
    
    return lista;
}

// Lógica de busca para Usuários Comuns
async function carregarNotificacoesUsuario() {
    const lista = [];
    
    try {
        const [resMultas, meusAlugueis] = await Promise.all([
            api('/alugueis/multas/minhas'),
            api('/alugueis/meus')
        ]);

        const multas = resMultas.multas || [];
        const total_pendente = resMultas.total_pendente || 0;
        const listaAlugueis = Array.isArray(meusAlugueis) ? meusAlugueis : [];
        const atrasados = listaAlugueis.filter(a => a.status === 'atrasado');

        // ── Bloco de Multas ──
        if (total_pendente > 0) {
            lista.push({
                type: 'danger',
                icon: '💳',
                title: 'Débito Automático',
                message: `Você possui um débito total de <strong>R$ ${total_pendente.toFixed(2)}</strong> referente a multas por atraso ou perda.`,
                count: multas.filter(m => m.status === 'pendente').length,
                action: { label: 'Quitar Débito', onClick: 'pagarMinhasMultas()' }
            });
        } else if (multas.length > 0) {
            lista.push({
                type: 'success',
                icon: '✅',
                title: 'Histórico Financeiro',
                message: 'Parabéns! Todas as suas multas anteriores foram quitadas e não há débitos pendentes.',
                count: 0
            });
        }

        // ── Alerta: Livros atrasados ──
        if (atrasados.length > 0) {
            const multaTotalAtraso = atrasados.reduce((acc, a) => acc + Number(a.multa_acumulada || 0), 0);
            lista.push({
                type: 'warning',
                icon: '⚠️',
                title: 'Entrega Atrasada',
                message: `Você está com <strong>${atrasados.length}</strong> livro(s) fora do prazo. Multa acumulada prevista: <strong>R$ ${multaTotalAtraso.toFixed(2)}</strong>.`,
                count: atrasados.length,
                action: { label: 'Ver Meus Empréstimos', onClick: "mostrarTela('alugueisScreen'); carregarMeusAlugueis();" }
            });
        }

        // ── Alerta: Vencendo em breve ──
        const hoje = new Date();
        const em3dias = new Date();
        em3dias.setDate(hoje.getDate() + 3);
        const vencendoEmBreve = listaAlugueis.filter(a => {
            if (a.status !== 'ativo') return false;
            const prazo = new Date(a.prazo);
            return prazo >= hoje && prazo <= em3dias;
        });

        if (vencendoEmBreve.length > 0) {
            lista.push({
                type: 'info',
                icon: '⏰',
                title: 'Final de Prazo',
                message: `Você tem <strong>${vencendoEmBreve.length}</strong> livro(s) que devem ser devolvidos ou renovados em breve.`,
                count: vencendoEmBreve.length,
                action: { label: 'Renovar Online', onClick: "mostrarTela('alugueisScreen'); carregarMeusAlugueis();" }
            });
        }

    } catch (erro) {
        console.error('Erro ao carregar notificações do usuário:', erro);
    }
    
    return lista;
}

// Renderiza a lista de notificações na interface principal
function renderizarNotificacoesTelaCheia() {
    const corpo = document.getElementById('notificationsFullScreenBody');
    if (!corpo) return;
    
    if (dadosNotificacoes.length === 0) {
        corpo.innerHTML = `
            <div style="text-align: center; padding: 60px; color: var(--text-dim); font-style: italic;">
                Nenhum alerta ou pendência no momento. Tudo tranquilo!
            </div>`;
        return;
    }
    
    corpo.innerHTML = dadosNotificacoes.map(notif => `
        <div class="notification-card ${notif.type}">
            <div class="notification-header">
                <div class="notification-title-wrap">
                    <span class="notification-icon-badge ${notif.type}">${notif.icon || '🔔'}</span>
                    <h3 class="notification-title">${notif.title}</h3>
                </div>
                ${notif.count > 0 ? `<span class="badge badge-${notif.type}">${notif.count}</span>` : ''}
            </div>
            <div class="notification-content">
                <p class="notification-text">${notif.message}</p>
                ${notif.action ? `
                    <div class="notification-footer">
                        <button class="btn btn-ghost btn-sm" onclick="${notif.action.onClick}">
                            ${notif.action.label}
                        </button>
                    </div>
                ` : ''}
            </div>
        </div>`).join('');
}

// Atualiza a bolinha vermelha na navbar com a contagem de alertas
function atualizarBadgeNotificacoes() {
    const badge = document.getElementById('notificationsBadge');
    if (!badge) return;

    // Soma as pendências reais de cada item de alerta
    const totalPendencias = dadosNotificacoes.reduce((acc, item) => acc + (item.count || 0), 0);
    
    if (totalPendencias > 0) {
        badge.textContent = totalPendencias > 99 ? '99+' : totalPendencias;
        badge.classList.add('show');
    } else {
        badge.classList.remove('show');
    }
}

// Controla a visibilidade do ícone na barra de navegação
function gerenciarVisibilidadeNotificacoes() {
    const elementoNav = document.getElementById('navNotifications');
    if (elementoNav) {
        elementoNav.style.display = currentUser ? 'block' : 'none';
    }
}

async function pagarMinhasMultas() {
    exibirConfirmacao({
        icon: '💳',
        title: 'Quitar Débitos',
        msg: 'Deseja processar o pagamento de todas as multas pendentes?',
        okLabel: 'Sim, Pagar Agora',
        async onOk() {
            try {
                const resultado = await api('/alugueis/multas/pagar/mim', { method: 'PUT' });
                exibirAlerta(resultado.message, 'success');
                // Atualiza o estado do usuário
                if (currentUser) {
                    currentUser.multa_pendente = false;
                    salvarSessao();
                    atualizarNavbar();
                }
                // Recarrega os alertas para refletir o pagamento
                await buscarNotificacoes();
            } catch (erro) { 
                exibirAlerta(erro.message, 'danger'); 
            }
        }
    });
}

// Estende a funcionalidade global de atualização da navbar
const atualizarNavbarOriginal = window.updateNavbar;
window.updateNavbar = function() {
    // Chama a lógica original se existir
    if (atualizarNavbarOriginal) {
        atualizarNavbarOriginal();
    }

    gerenciarVisibilidadeNotificacoes();
    
    // Se o usuário estiver logado, busca alertas automaticamente
    if (currentUser) {
        buscarNotificacoes();
    }
};
