// Central de Notificações e Alertas do Sistema

let dadosNotificacoes = [];

// Carrega e renderiza as notificações na tela cheia
async function carregarNotificacoesCompleto() {
    await buscarNotificacoes();
    renderizarNotificacoesTelaCheia();
}

// Busca as notificações do servidor baseadas no tipo de usuário
async function buscarNotificacoes() {
    if (!currentUser) {
        return;
    }
    
    try {
        const corpoNotificacoes = document.getElementById('notificationsFullScreenBody');
        if (corpoNotificacoes) {
            corpoNotificacoes.innerHTML = '<div style="text-align:center; padding:40px; color:var(--accent);">Carregando alertas...</div>';
        }
        
        const promessas = [];
        
        // Bibliotecários veem alertas do sistema, usuários veem alertas pessoais
        if (currentUser.tipo === 'bibliotecario') {
            promessas.push(carregarNotificacoesAdmin());
        } else {
            promessas.push(carregarNotificacoesUsuario());
        }
        
        const resultados = await Promise.all(promessas);
        dadosNotificacoes = resultados.flat();
        
        renderizarNotificacoesTelaCheia();
        atualizarBadgeNotificacoes();
    } catch (erro) {
        const corpo = document.getElementById('notificationsFullScreenBody');
        if (corpo) {
            corpo.innerHTML = '<div style="text-align:center; padding:40px; color:var(--crimson);">Erro ao carregar notificações</div>';
        }
    }
}

// Lógica de busca para Administradores (Bibliotecários)
async function carregarNotificacoesAdmin() {
    const lista = [];
    
    try {
        // Alerta: Empréstimos com prazo vencido
        const { data: atrasados } = await api('/alugueis/atrasados');
        if (atrasados.total > 0) {
            lista.push({
                type: 'warning',
                title: 'Empréstimos Atrasados',
                message: `${atrasados.total} empréstimo(s) em atraso precisam de atenção da biblioteca.`,
                count: atrasados.total
            });
        }
        
        // Alerta: Usuários que possuem multas não pagas
        const { data: usuarios } = await api('/usuarios?limit=100');
        const usuariosComMulta = usuarios.filter(u => u.multa_pendente);
        if (usuariosComMulta.length > 0) {
            lista.push({
                type: 'danger',
                title: 'Multas Pendentes',
                message: `${usuariosComMulta.length} usuário(s) possuem multas pendentes no sistema.`,
                count: usuariosComMulta.length
            });
        }
        
        // Alerta: Contas que foram bloqueadas manualmente ou por regras
        const usuariosBloqueados = usuarios.filter(u => u.bloqueado);
        if (usuariosBloqueados.length > 0) {
            lista.push({
                type: 'info',
                title: 'Usuários Bloqueados',
                message: `${usuariosBloqueados.length} usuário(s) estão bloqueados atualmente.`,
                count: usuariosBloqueados.length
            });
        }
        
        // Alerta: Pendências do Acervo Digital
        try {
            const pendentesDigital = await api('/acervo-digital/pendentes');
            if (pendentesDigital && pendentesDigital.length > 0) {
                lista.push({
                    type: 'info',
                    title: 'Novos Documentos Digitais',
                    message: `${pendentesDigital.length} documento(s) enviado(s) aguardam sua aprovação no acervo. <br><button class="btn btn-primary btn-sm" style="margin-top:12px; font-size: 0.8rem;" onclick="carregarPendencias()">Gerenciar Pendências</button>`,
                    count: pendentesDigital.length
                });
            }
        } catch (e) {
            console.error('Erro ao verificar pendências digitais:', e);
        }

    } catch (erro) {
        console.error('Erro ao carregar notificações administrativas:', erro);
    }
    
    return lista;
}

// Lógica de busca para Usuários Comuns
async function carregarNotificacoesUsuario() {
    const lista = [];
    
    try {
        // Alerta: Dívidas pendentes do próprio usuário
        const { data: multas } = await api('/alugueis/multas/minhas');
        const multasPendentes = multas.filter(m => m.status === 'pendente');
        
        if (multasPendentes.length > 0) {
            const total = multasPendentes.reduce((soma, m) => soma + Number(m.valor), 0);
            lista.push({
                type: 'danger',
                title: 'Multas Pendentes',
                message: `Você possui ${multasPendentes.length} multa(s) no valor total de R$ ${total.toFixed(2)}.`,
                count: multasPendentes.length
            });
        }
        
        // Alerta: Seus livros que já passaram da data de entrega
        const { data: meusAlugueis } = await api('/alugueis/meus');
        const atrasados = meusAlugueis.filter(a => a.status === 'atrasado');
        
        if (atrasados.length > 0) {
            lista.push({
                type: 'warning',
                title: 'Livros Atrasados',
                message: `Você tem ${atrasados.length} livro(s) com a entrega atrasada. Por favor, devolva-os o quanto antes.`,
                count: atrasados.length
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
    if (!corpo) {
        return;
    }
    
    if (dadosNotificacoes.length === 0) {
        corpo.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-faint); font-style: italic; font-size: var(--fs-md);">
                Nenhum alerta pendente no momento. Tudo tranquilo!
            </div>`;
        return;
    }
    
    corpo.innerHTML = dadosNotificacoes.map(notif => `
        <div class="notification-item" style="padding: 24px; border-bottom: 1px solid var(--border); margin-bottom: 8px; border-radius: var(--r-md); transition: background 0.3s; background: rgba(255,255,255,0.02);" onmouseover="this.style.background='var(--accent-bg)'" onmouseleave="this.style.background='rgba(255,255,255,0.02)'">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <strong style="color: var(--accent); font-family: 'Cinzel', serif; font-size: var(--fs-md); letter-spacing: 0.05em;">
                    <span class="notification-type ${notif.type}" style="font-family: 'Crimson Pro', serif; font-size: 0.7em; margin-right: 8px; vertical-align: middle;">${notif.type.toUpperCase()}</span> 
                    ${notif.title}
                </strong>
                <span style="color: var(--text); font-size: var(--fs-xs); font-style: italic; opacity: 0.6;">Agora</span>
            </div>
            <div style="color: var(--text); font-size: var(--fs-base); line-height: 1.6;">${notif.message}</div>
        </div>`).join('');
}

// Atualiza a bolinha vermelha na navbar com a contagem de alertas
function atualizarBadgeNotificacoes() {
    const badge = document.getElementById('notificationsBadge');
    const total = dadosNotificacoes.length;
    
    if (total > 0) {
        badge.textContent = total > 99 ? '99+' : total;
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
