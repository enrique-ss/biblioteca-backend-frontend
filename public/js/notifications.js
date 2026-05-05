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

// Armazena a lista atual de notificações e atividades para o feed unificado
let dadosNotificacoes = [];
let dadosFeedNotificacoes = [];

/*
    Carrega as notificações e exibe a tela completa de alertas.
    Chamada quando o usuário clica no ícone de sino da sidebar.
    Aguarda a busca terminar antes de renderizar para evitar tela vazia.
*/
async function carregarNotificacoesCompleto() {
    await buscarNotificacoes();
    renderizarNotificacoesTelaCheia();
}

/**
 * Carrega o feed unificado de notificações (alertas ativos + histórico recente).
 * Segue o padrão estético do feed de atividades do perfil.
 */
async function buscarNotificacoes() {
    if (!currentUser) return;

    try {
        const corpoNotificacoes = document.getElementById('notificationsFullScreenBody');
        if (corpoNotificacoes && corpoNotificacoes.innerHTML === '') {
            corpoNotificacoes.innerHTML = '<div style="text-align:center; padding:40px; color:var(--accent); font-family:\'Cinzel\', serif;"><span class="spinner"></span> Sincronizando Biblio Verso...</div>';
        }

        const ehAdmin = currentUser.tipo === 'bibliotecario';
        
        // Buscamos em paralelo: Alertas do Usuário, Alertas Admin (se for), Atividades (Pessoais ou Sistema)
        const promessas = [
            carregarNotificacoesUsuario(),
            ehAdmin ? carregarNotificacoesAdmin() : Promise.resolve([]),
            ehAdmin ? api('/auth/atividades-sistema') : api('/auth/atividades')
        ];

        const resultados = await Promise.allSettled(promessas);
        
        const alertasUsuario = resultados[0].status === 'fulfilled' ? resultados[0].value : [];
        const alertasAdmin = resultados[1].status === 'fulfilled' ? resultados[1].value : [];
        const atividades = resultados[2].status === 'fulfilled' ? (resultados[2].value.data || resultados[2].value) : [];

        // Marcamos os alertas como 'pendencia' para o estilo visual
        const pendencias = [...alertasUsuario, ...alertasAdmin].map(a => ({ ...a, is_pending: true }));
        
        // Convertemos as atividades para o formato do feed se necessário (já deve estar certo)
        const feedAtividades = (atividades || []).map(a => ({
            ...a,
            title: a.tipo?.toUpperCase() || 'ATIVIDADE',
            message: a.texto,
            type: a.tipo === 'devolucao' ? 'success' : 'info',
            is_activity: true
        }));

        // Unificamos tudo e guardamos
        dadosNotificacoes = [...pendencias]; // Para o badge, contamos apenas pendências
        dadosFeedNotificacoes = [...pendencias, ...feedAtividades];

        renderizarNotificacoesTelaCheia();
        atualizarBadgeNotificacoes();
    } catch (erro) {
        console.error('Erro ao buscar feed de notificações:', erro);
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

        const resultados = await Promise.allSettled([
            api('/alugueis/todos?limit=20'),
            api('/usuarios?limit=100')
        ]);

        const emprestimosRes = resultados[0].status === 'fulfilled' ? resultados[0].value : { total_atrasados: 0 };
        const usuariosRes = resultados[1].status === 'fulfilled' ? resultados[1].value : { data: [] };

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
                action: { label: 'Gerenciar', onClick: "mostrarTela('alugueisScreen')" }
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
                action: { label: 'Gerenciar', onClick: "mostrarTela('usuariosScreen')" }
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
                    action: { label: 'Revisar', onClick: 'carregarPendencias()' }
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
        const [resMultas, meusAlugueis, pendentesAmizade] = await Promise.all([
            api('/alugueis/multas/minhas'),
            api('/alugueis/meus'),
            api('/amizades/pendentes').catch(() => []) // Evita quebrar se a rota não existir em algum momento
        ]);

        const multas = resMultas.multas || [];
        const totalPendente = resMultas.total_pendente || 0;
        const listaAlugueis = Array.isArray(meusAlugueis) ? meusAlugueis : [];
        const atrasados = listaAlugueis.filter((a) => a.status === 'atrasado');

        // Alerta de Pedidos de Amizade Pendentes
        if (pendentesAmizade && pendentesAmizade.length > 0) {
            pendentesAmizade.forEach(pedido => {
                lista.push({
                    type: 'info',
                    icon: '👥',
                    title: 'Novo Pedido de Amizade',
                    message: `<strong>${pedido.remetente_nome || 'Alguém'}</strong> enviou um pedido de amizade para você!`,
                    count: 1,
                    action: { label: 'Aceitar', onClick: `aceitarPedidoAmizade('${pedido.id}', '${pedido.usuario_remetente}')` }
                });
            });
        }

        // Se há débito pendente: alerta vermelho com o valor total
        if (totalPendente > 0) {
            lista.push({
                type: 'danger',
                icon: '💳',
                title: 'Debito Automatico',
                message: `Voce possui um debito total de <strong>R$ ${totalPendente.toFixed(2)}</strong> referente a multas por atraso ou perda.`,
                count: multas.filter((m) => m.status === 'pendente').length,
                action: { label: 'Quitar', onClick: 'pagarMinhasMultas()' }
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
                action: { label: 'Ver', onClick: "mostrarTela('alugueisScreen'); carregarMeusAlugueis();" }
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
                action: { label: 'Renovar', onClick: "mostrarTela('alugueisScreen'); carregarMeusAlugueis();" }
            });
        }
    } catch (erro) {
        console.error('Erro ao carregar notificacoes do usuario:', erro);
    }

    return lista;
}

/**
 * Renderiza o feed unificado de notificações na tela cheia.
 * Combina alertas que exigem ação e um log de atividades recentes.
 */
function renderizarNotificacoesTelaCheia() {
    const corpo = document.getElementById('notificationsFullScreenBody');
    if (!corpo) return;

    if (dadosFeedNotificacoes.length === 0) {
        corpo.innerHTML = `
            <div style="text-align: center; padding: 60px; color: var(--text-dim); font-style: italic;">
                Nenhum alerta ou atividade registrada no momento. Tudo tranquilo!
            </div>`;
        return;
    }

    corpo.innerHTML = `
        <div class="notifications-feed-container" style="display: flex; flex-direction: column; gap: 16px; max-width: 800px; margin: 0 auto;">
            ${dadosFeedNotificacoes.map((item) => {
                const isPending = item.is_pending;
                const hasAction = item.action && item.action.onClick;
                
                return `
                <div class="activity-item notification-feed-item ${item.type || 'info'} ${isPending ? 'pending-item' : ''}" 
                     style="border-left: 4px solid var(--${item.type || 'accent'});">
                    <div class="activity-icon">${item.icon || '🔔'}</div>
                    <div class="activity-details" style="flex: 1;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
                            <h4 style="font-family: 'Cinzel', serif; font-size: 0.75rem; color: var(--accent); letter-spacing: 0.05em; margin: 0;">
                                ${item.title}
                            </h4>
                            <div style="display: flex; gap: 8px; align-items: center;">
                                ${isPending ? '<span class="badge badge-danger" style="font-size: 0.6rem; padding: 2px 6px;">PENDÊNCIA</span>' : ''}
                                ${item.data ? `<span class="activity-time">${formatarDataRelativa(item.data)}</span>` : ''}
                            </div>
                        </div>
                        <p class="activity-text" style="font-size: 0.9rem; line-height: 1.5; color: var(--text); margin: 6px 0;">
                            ${item.message}
                        </p>
                        ${hasAction ? `
                        <div class="notification-actions" style="margin-top: 12px; display: flex; gap: 8px;">
                            <button class="btn btn-primary" style="padding: 6px 12px; font-size: 0.75rem;" onclick="${item.action.onClick}">
                                ${item.action.label}
                            </button>
                        </div>` : ''}
                    </div>
                </div>`;
            }).join('')}
        </div>`;
}

/**
 * Formata uma data para um formato relativo (ex: "há 2 horas", "hoje às 15:00").
 */
function formatarDataRelativa(dataStr) {
    if (!dataStr) return '';
    const data = new Date(dataStr);
    const agora = new Date();
    const diffMs = agora - data;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHoras = Math.floor(diffMin / 60);

    if (diffMin < 1) return 'agora mesmo';
    if (diffMin < 60) return `há ${diffMin} min`;
    if (diffHoras < 24) {
        if (data.getDate() === agora.getDate()) {
            return `hoje às ${data.getHours().toString().padStart(2, '0')}:${data.getMinutes().toString().padStart(2, '0')}`;
        }
        return `há ${diffHoras} horas`;
    }
    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
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
        okLabel: 'Sim',
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
