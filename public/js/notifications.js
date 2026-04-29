/*
    CENTRAL DE NOTIFICAÇÕES: alertas para bibliotecários e leitores.
    Este arquivo gera e exibe os alertas do sistema de forma personalizada por tipo de usuário.

    Para BIBLIOTECÁRIOS, os alertas cobrem:
    - Empréstimos atrasados que precisam de ação
    - Usuários com multas pendentes
    - Contas suspensas (usuários bloqueados)
    - Documentos digitais enviados por leitores aguardando curadoria

    Para LEITORES, os alertas cobrem:
    - Débitos de multa pendentes (com valor total)
    - Livros com entrega atrasada
    - Livros com prazo de devolução nos próximos 3 dias

    O badge (bolinha numérica) no ícone de sino da sidebar mostra o total de pendências.
*/

// Armazena a lista atual de notificações para uso nas funções de renderização
let dadosNotificacoes = [];

/*
    Carrega as notificações e exibe a tela completa de alertas.
    Chamada quando o usuário clica no ícone de sino da sidebar.
    Aguarda a busca terminar antes de renderizar para evitar tela vazia.
*/
async function carregarNotificacoesCompleto() {
    await buscarNotificacoes();
    renderizarNotificacoesTelaCheia();
}

/*
    Busca as notificações do servidor e atualiza o badge do sino.
    Decide automaticamente qual conjunto de alertas buscar:
    - Bibliotecário: alertas administrativos do sistema
    - Leitor: alertas pessoais relacionados aos seus livros e multas
    Se o usuário não estiver logado, sai sem fazer nada.
*/
async function buscarNotificacoes() {
    if (!currentUser) return;

    try {
        const corpoNotificacoes = document.getElementById('notificationsFullScreenBody');
        if (corpoNotificacoes) {
            corpoNotificacoes.innerHTML = '<div style="text-align:center; padding:40px; color:var(--accent); font-family:\'Cinzel\', serif;">Buscando alertas do sistema...</div>';
        }

        // Redireciona para a função correta conforme o tipo de usuário
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

/*
    Gera a lista de alertas para o bibliotecário.
    Faz duas requisições em paralelo (empréstimos e usuários) para ser mais rápido.
    Cada alerta tem: tipo (warning/danger/info), ícone, título, mensagem, contagem e ação.
    Alertas só são adicionados se há itens relevantes (ex: só mostra "atrasados" se houver).
    Submissões de documentos digitais pendentes são verificadas separadamente
    (em try/catch próprio pois podem falhar sem comprometer os outros alertas).
*/
async function carregarNotificacoesAdmin() {
    const lista = [];

    try {
        const [emprestimosRes, usuariosRes] = await Promise.all([
            api('/alugueis/todos?limit=20'),
            api('/usuarios?limit=100')
        ]);

        const atrasadosTotal = emprestimosRes.total_atrasados || 0;
        const usuarios = usuariosRes.data || [];

        // Alerta de empréstimos atrasados: adverte que há devoluções pendentes
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

        // Alerta de multas: lista usuários com débitos não quitados
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

        // Alerta informativo: mostra quantas contas estão bloqueadas no sistema
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

        // Submissões de documentos: verificado separadamente pois pode falhar
        // sem impedir os outros alertas (ex: se o endpoint estiver indisponível)
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

/*
    Gera a lista de alertas personalizados para o leitor.
    Faz duas requisições em paralelo: multas pessoais e lista de empréstimos ativos.
    Verifica três situações:
    1. Débitos pendentes: mostra o valor total e oferece botão para pagar
    2. Livros atrasados: lista os empréstimos com status "atrasado"
    3. Prazos próximos: empréstimos ativos com devolução nos próximos 3 dias
*/
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

        // Se há débito pendente: alerta vermelho com o valor total
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
            // Se teve multas mas todas foram pagas: alerta verde de parabenização
            lista.push({
                type: 'success',
                icon: '✅',
                title: 'Historico Financeiro',
                message: 'Parabens! Todas as suas multas anteriores foram quitadas e nao ha debitos pendentes.',
                count: 0
            });
        }

        // Livros atrasados: empréstimos que passaram do prazo de devolução
        if (atrasados.length > 0) {
            lista.push({
                type: 'warning',
                icon: '⚠️',
                title: 'Livros Atrasados',
                message: `Voce esta com <strong>${atrasados.length}</strong> livro(s) fora do prazo.`,
                count: atrasados.length,
                action: { label: 'Ver Meus Emprestimos', onClick: "mostrarTela('alugueisScreen'); carregarMeusAlugueis();" }
            });
        }

        // Prazos próximos: empréstimos ativos com devolução nos próximos 3 dias
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

/*
    Renderiza os cartões de notificação na tela de alertas completa.
    Se não houver alertas, exibe uma mensagem tranquilizadora.
    Cada card tem: ícone colorido, título, mensagem e, opcionalmente, um botão de ação.
    O badge de contagem (número vermelho) só aparece se count > 0.
*/
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

/*
    Atualiza o número exibido no badge do ícone de sino na sidebar.
    Soma todas as contagens individuais de cada alerta.
    Se o total ultrapassar 99, exibe "99+" para não quebrar o layout.
    Se não houver pendências, remove o badge (fica invisível).
*/
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

/*
    Controla a visibilidade do botão de notificações na sidebar.
    Quando o usuário está logado, o sino aparece; quando não está, fica oculto.
*/
function gerenciarVisibilidadeNotificacoes() {
    const elementoNav = document.getElementById('navNotifications');
    if (elementoNav) {
        elementoNav.style.display = currentUser ? 'block' : 'none';
    }
}

/*
    Processa o pagamento de todas as multas pendentes do leitor logado.
    Exibe diálogo de confirmação antes de executar.
    Após o pagamento, atualiza o estado do usuário em memória,
    salva a sessão e recarrega as notificações para remover o alerta de débito.
*/
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

/*
    Estende a função global updateNavbar (se existir) para incluir
    a atualização do badge de notificações sempre que o estado de autenticação mudar.
    Usa o padrão de "decorador": guarda a função original e a chama dentro da nova.
*/
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
