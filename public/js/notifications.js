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
        // Busca multas e empréstimos em paralelo (leituras independentes — sem deadlock)
        const [resMultas, meusAlugueis] = await Promise.all([
            api('/alugueis/multas/minhas'),
            api('/alugueis/meus')
        ]);

        const multas = resMultas.multas || [];
        const total_pendente = resMultas.total_pendente || 0;
        const listaAlugueis = Array.isArray(meusAlugueis) ? meusAlugueis : [];
        const atrasados = listaAlugueis.filter(a => a.status === 'atrasado');
        const multasPendentes = multas.filter(m => m.status === 'pendente');

        // ── Bloco de Multas (sempre mostra, mesmo se zero) ──
        let multasHtml = '';
        if (multas.length === 0) {
            multasHtml = `<div style="text-align:center; padding:16px; color:var(--success); font-style:italic;">✓ Nenhuma multa registrada. Você está em dia!</div>`;
        } else {
            const linhas = multas.map(m => {
                const isPendente = m.status === 'pendente';
                const cor = isPendente ? '#f85149' : 'var(--success)';
                const statusLabel = isPendente ? 'Pendente' : 'Paga';
                const tipoBadge = m.tipo === 'atraso' ? '⏰ Atraso' : '📦 Perda';
                return `
                    <tr>
                        <td><span style="font-size:0.8em;background:var(--accent-bg);color:var(--accent);padding:3px 8px;border-radius:6px;">${tipoBadge}</span></td>
                        <td><strong>${esc(m.livro || '—')}</strong></td>
                        <td style="color:#f85149;font-weight:700">R$ ${Number(m.valor).toFixed(2)}</td>
                        <td>${m.dias_atraso > 0 ? `${m.dias_atraso} dias` : '—'}</td>
                        <td><span style="color:${cor};font-weight:600">${statusLabel}</span></td>
                    </tr>`;
            }).join('');

            const botaoPagar = total_pendente > 0 
                ? `<button class="btn btn-gold btn-sm" onclick="pagarMinhasMultas()" style="margin-top:16px;">💳 Quitar R$ ${total_pendente.toFixed(2)}</button>` 
                : `<div style="color:var(--success);margin-top:16px;">✓ Todas as multas estão quitadas!</div>`;

            multasHtml = `
                <div style="overflow-x:auto; margin-top:12px;">
                    <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
                        <thead><tr style="color:var(--accent);font-size:0.75rem;text-transform:uppercase;letter-spacing:0.05em;">
                            <th style="padding:8px;text-align:left;">Tipo</th>
                            <th style="padding:8px;text-align:left;">Livro</th>
                            <th style="padding:8px;text-align:left;">Valor</th>
                            <th style="padding:8px;text-align:left;">Atraso</th>
                            <th style="padding:8px;text-align:left;">Status</th>
                        </tr></thead>
                        <tbody>${linhas}</tbody>
                    </table>
                </div>
                <div style="text-align:right;">${botaoPagar}</div>`;
        }

        lista.push({
            type: total_pendente > 0 ? 'danger' : 'info',
            title: `Extrato de Multas${total_pendente > 0 ? ` — R$ ${total_pendente.toFixed(2)} pendente` : ''}`,
            message: multasHtml,
            count: multasPendentes.length
        });

        // ── Alerta: Livros atrasados ──
        if (atrasados.length > 0) {
            const linhasAtraso = atrasados.map(a => `
                <tr>
                    <td style="padding:6px 8px;"><strong>${esc(a.titulo)}</strong></td>
                    <td style="padding:6px 8px;color:#f85149;">${Math.abs(Number(a.dias_atraso))} dias</td>
                    <td style="padding:6px 8px;color:#f85149;">R$ ${Number(a.multa_acumulada || 0).toFixed(2)}</td>
                </tr>`).join('');

            lista.push({
                type: 'warning',
                title: `${atrasados.length} Livro(s) com Entrega Atrasada`,
                message: `
                    <div style="overflow-x:auto;margin-top:12px;">
                        <table style="width:100%;border-collapse:collapse;font-size:0.9rem;">
                            <thead><tr style="color:var(--accent);font-size:0.75rem;text-transform:uppercase;">
                                <th style="padding:6px 8px;text-align:left;">Livro</th>
                                <th style="padding:6px 8px;text-align:left;">Atraso</th>
                                <th style="padding:6px 8px;text-align:left;">Multa</th>
                            </tr></thead>
                            <tbody>${linhasAtraso}</tbody>
                        </table>
                    </div>
                    <div style="margin-top:12px;">
                        <button class="btn btn-ghost btn-sm" onclick="carregarMeusAlugueis(); mostrarTela('alugueisScreen')">Ver Empréstimos</button>
                    </div>`,
                count: atrasados.length
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
                title: 'Devolução Próxima',
                message: `${vencendoEmBreve.length} livro(s) vencem nos próximos 3 dias. Considere renová-los! <br><button class="btn btn-ghost btn-sm" style="margin-top:12px;" onclick="carregarMeusAlugueis(); mostrarTela('alugueisScreen')">Renovar</button>`,
                count: vencendoEmBreve.length
            });
        }

    } catch (erro) {
        console.error('Erro ao carregar notificações do usuário:', erro);
        lista.push({ type: 'danger', title: 'Erro', message: `Não foi possível carregar seus alertas: ${erro.message}`, count: 1 });
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
