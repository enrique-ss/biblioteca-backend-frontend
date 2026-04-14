// Central de notificacoes e alertas do sistema

let dadosNotificacoes = [];

async function carregarNotificacoesCompleto() {
    await buscarNotificacoes();
    renderizarNotificacoesTelaCheia();
}

async function buscarNotificacoes() {
    if (!currentUser) return;

    try {
        const corpoNotificacoes = document.getElementById('notificationsFullScreenBody');
        if (corpoNotificacoes) {
            corpoNotificacoes.innerHTML = '<div style="text-align:center; padding:40px; color:var(--accent); font-family:\'Cinzel\', serif;">Buscando alertas do sistema...</div>';
        }

        const resultados = await (currentUser.tipo === 'bibliotecario'
            ? carregarNotificacoesAdmin()
            : carregarNotificacoesUsuario());

        dadosNotificacoes = resultados || [];

        renderizarNotificacoesTelaCheia();
        atualizarBadgeNotificacoes();
    } catch (erro) {
        console.error('Erro ao buscar notificacoes:', erro);
        const corpo = document.getElementById('notificationsFullScreenBody');
        if (corpo) {
            corpo.innerHTML = '<div style="text-align:center; padding:40px; color:var(--danger);">Erro critico ao carregar alertas.</div>';
        }
    }
}

async function carregarNotificacoesAdmin() {
    const lista = [];

    try {
        const [emprestimosRes, usuariosRes] = await Promise.all([
            api('/alugueis/todos?limit=20'),
            api('/usuarios?limit=100')
        ]);

        const atrasadosTotal = emprestimosRes.total_atrasados || 0;
        const usuarios = usuariosRes.data || [];

        if (atrasadosTotal > 0) {
            lista.push({
                type: 'warning',
                icon: '⏰',
                title: 'Emprestimos Atrasados',
                message: `Existem <strong>${atrasadosTotal}</strong> emprestimo(s) com entrega pendente no sistema.`,
                count: atrasadosTotal,
                action: { label: 'Gerenciar Emprestimos', onClick: "mostrarTela('alugueisScreen')" }
            });
        }

        const usuariosComMulta = usuarios.filter((u) => u.multa_pendente);
        if (usuariosComMulta.length > 0) {
            lista.push({
                type: 'danger',
                icon: '💰',
                title: 'Multas Pendentes',
                message: `<strong>${usuariosComMulta.length}</strong> usuario(s) possuem debitos pendentes que precisam de regularizacao.`,
                count: usuariosComMulta.length,
                action: { label: 'Gerenciar Usuarios', onClick: "mostrarTela('usuariosScreen')" }
            });
        }

        const usuariosBloqueados = usuarios.filter((u) => u.bloqueado);
        if (usuariosBloqueados.length > 0) {
            lista.push({
                type: 'info',
                icon: '🚫',
                title: 'Contas Suspensas',
                message: `Atualmente, <strong>${usuariosBloqueados.length}</strong> usuario(s) estao com acesso bloqueado no sistema.`,
                count: usuariosBloqueados.length
            });
        }

        try {
            const pendentesDigital = await api('/acervo-digital/pendentes');
            if (pendentesDigital?.length > 0) {
                lista.push({
                    type: 'info',
                    icon: '📂',
                    title: 'Novas Submissoes',
                    message: `Existem <strong>${pendentesDigital.length}</strong> novos documentos digitais aguardando curadoria.`,
                    count: pendentesDigital.length,
                    action: { label: 'Revisar Agora', onClick: 'carregarPendencias()' }
                });
            }
        } catch (erroPendencias) {
            console.warn('Nao foi possivel carregar pendencias do acervo digital.', erroPendencias);
        }
    } catch (erro) {
        console.error('Erro ao carregar notificacoes administrativas:', erro);
    }

    return lista;
}

async function carregarNotificacoesUsuario() {
    const lista = [];

    try {
        const [resMultas, meusAlugueis] = await Promise.all([
            api('/alugueis/multas/minhas'),
            api('/alugueis/meus')
        ]);

        const multas = resMultas.multas || [];
        const totalPendente = resMultas.total_pendente || 0;
        const listaAlugueis = Array.isArray(meusAlugueis) ? meusAlugueis : [];
        const atrasados = listaAlugueis.filter((a) => a.status === 'atrasado');

        if (totalPendente > 0) {
            lista.push({
                type: 'danger',
                icon: '💳',
                title: 'Debito Automatico',
                message: `Voce possui um debito total de <strong>R$ ${totalPendente.toFixed(2)}</strong> referente a multas por atraso ou perda.`,
                count: multas.filter((m) => m.status === 'pendente').length,
                action: { label: 'Quitar Debito', onClick: 'pagarMinhasMultas()' }
            });
        } else if (multas.length > 0) {
            lista.push({
                type: 'success',
                icon: '✅',
                title: 'Historico Financeiro',
                message: 'Parabens! Todas as suas multas anteriores foram quitadas e nao ha debitos pendentes.',
                count: 0
            });
        }

        if (atrasados.length > 0) {
            const multaTotalAtraso = atrasados.reduce((acc, a) => acc + Number(a.multa_acumulada || 0), 0);
            lista.push({
                type: 'warning',
                icon: '⚠️',
                title: 'Entrega Atrasada',
                message: `Voce esta com <strong>${atrasados.length}</strong> livro(s) fora do prazo. Multa acumulada prevista: <strong>R$ ${multaTotalAtraso.toFixed(2)}</strong>.`,
                count: atrasados.length,
                action: { label: 'Ver Meus Emprestimos', onClick: "mostrarTela('alugueisScreen'); carregarMeusAlugueis();" }
            });
        }

        const hoje = new Date();
        const em3dias = new Date();
        em3dias.setDate(hoje.getDate() + 3);
        const vencendoEmBreve = listaAlugueis.filter((a) => {
            if (a.status !== 'ativo') return false;
            const prazo = new Date(a.prazo);
            return prazo >= hoje && prazo <= em3dias;
        });

        if (vencendoEmBreve.length > 0) {
            lista.push({
                type: 'info',
                icon: '⏰',
                title: 'Final de Prazo',
                message: `Voce tem <strong>${vencendoEmBreve.length}</strong> livro(s) que devem ser devolvidos ou renovados em breve.`,
                count: vencendoEmBreve.length,
                action: { label: 'Renovar Online', onClick: "mostrarTela('alugueisScreen'); carregarMeusAlugueis();" }
            });
        }
    } catch (erro) {
        console.error('Erro ao carregar notificacoes do usuario:', erro);
    }

    return lista;
}

function renderizarNotificacoesTelaCheia() {
    const corpo = document.getElementById('notificationsFullScreenBody');
    if (!corpo) return;

    if (dadosNotificacoes.length === 0) {
        corpo.innerHTML = `
            <div style="text-align: center; padding: 60px; color: var(--text-dim); font-style: italic;">
                Nenhum alerta ou pendencia no momento. Tudo tranquilo!
            </div>`;
        return;
    }

    corpo.innerHTML = dadosNotificacoes.map((notif) => `
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

function atualizarBadgeNotificacoes() {
    const badge = document.getElementById('notificationsBadge');
    if (!badge) return;

    const totalPendencias = dadosNotificacoes.reduce((acc, item) => acc + (item.count || 0), 0);

    if (totalPendencias > 0) {
        badge.textContent = totalPendencias > 99 ? '99+' : totalPendencias;
        badge.classList.add('show');
    } else {
        badge.classList.remove('show');
    }
}

function gerenciarVisibilidadeNotificacoes() {
    const elementoNav = document.getElementById('navNotifications');
    if (elementoNav) {
        elementoNav.style.display = currentUser ? 'block' : 'none';
    }
}

async function pagarMinhasMultas() {
    exibirConfirmacao({
        icon: '💳',
        title: 'Quitar Debitos',
        msg: 'Deseja processar o pagamento de todas as multas pendentes?',
        okLabel: 'Sim, Pagar Agora',
        async onOk() {
            try {
                const resultado = await api('/alugueis/multas/pagar/mim', { method: 'PUT' });
                exibirAlerta(resultado.message, 'success');
                if (currentUser) {
                    currentUser.multa_pendente = false;
                    salvarSessao();
                    atualizarNavbar();
                }
                await buscarNotificacoes();
            } catch (erro) {
                exibirAlerta(erro.message, 'danger');
            }
        }
    });
}

const atualizarNavbarOriginal = window.updateNavbar;
window.updateNavbar = function() {
    if (atualizarNavbarOriginal) {
        atualizarNavbarOriginal();
    }

    gerenciarVisibilidadeNotificacoes();

    if (currentUser) {
        buscarNotificacoes();
    }
};
