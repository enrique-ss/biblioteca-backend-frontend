/* 
 * --------------------------------------------------------------------------
 * LuizaTeca - Empréstimos e Histórico
 * --------------------------------------------------------------------------
 * Gerencia o registro de novos empréstimos, devoluções, multas e a exportação
 * do histórico de circulação da biblioteca.
 */

// Gerenciamento de Empréstimos e Histórico

const carregarAlugueisDebounced = debounce((busca) => carregarAlugueis(1, busca));

function voltarParaMenu() { 
    mostrarTela('menuScreen'); 
}

async function carregarAlugueis(pagina = 1, busca = '') {
    // Define o título e cabeçalho da tabela de controle geral
    document.getElementById('alugueisTitle').innerHTML = `<span>Controle</span> de Empréstimos`;
    document.getElementById('alugueisHead').innerHTML = `
        <tr>
            <th>#</th>
            <th class="sortable" onclick="sortTable('alugueis','usuario')">Usuário <span class="sort-indicator"></span></th>
            <th class="sortable" onclick="sortTable('alugueis','titulo')">Livro <span class="sort-indicator"></span></th>
            <th>Exemplar</th>
            <th class="sortable" onclick="sortTable('alugueis','data_aluguel')">Empréstimo <span class="sort-indicator"></span></th>
            <th class="sortable" onclick="sortTable('alugueis','prazo')">Prazo <span class="sort-indicator"></span></th>
            <th class="sortable" onclick="sortTable('alugueis','dias_atraso')">Atraso <span class="sort-indicator"></span></th>
            <th>Status</th>
            <th>Ações</th>
        </tr>`;

    definirCarregando('alugueisTbody', 9);

    try {
        const parametros = new URLSearchParams({ 
            page: pagina, 
            limit: 20,
            sort: sortState.alugueis.col,
            order: sortState.alugueis.dir
        });

        if (busca.trim()) {
            parametros.set('busca', busca.trim());
        }

        // Busca dados de empréstimos (O total de atrasados já vem nos metadados da resposta)
        const resposta = await api(`/alugueis/todos?${parametros}`);

        const linhas = Array.isArray(resposta) ? resposta : (resposta.data ?? []);
        const totalPaginas = Array.isArray(resposta) ? 1 : (resposta.pages ?? 1);
        const totalAtrasados = resposta.total_atrasados ?? 0;

        renderizarTabelaAlugueisCompleta(linhas);
        renderizarPaginacao('alugueisPagination', pagina, totalPaginas, (p) => carregarAlugueis(p, busca));

        // Gerencia o banner de aviso de atrasos no topo da tela (Usando metadado do Back)
        const banner = document.getElementById('atrasadosBanner');
        if (totalAtrasados > 0) {
            banner.style.display = 'flex';
            banner.innerHTML = `
                ${totalAtrasados} empréstimo(s) em atraso — 
                <a href="#" style="color:inherit;margin-left:4px;text-decoration:underline" onclick="mostrarTela('historicoScreen');carregarHistorico();">ver detalhes</a>`;
        } else {
            banner.style.display = 'none';
        }
        
        // Atualiza visualmente a ordenação nas colunas
        document.querySelectorAll('#alugueisScreen .sortable').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
        });
        
        const thAtual = document.querySelector(`#alugueisScreen [onclick="sortTable('alugueis','${sortState.alugueis.col}')"]`);
        if (thAtual) {
            const classe = sortState.alugueis.dir === 'asc' ? 'sort-asc' : 'sort-desc';
            thAtual.classList.add(classe);
        }

    } catch (erro) { 
        definirVazio('alugueisTbody', 9, erro.message); 
        exibirAlerta(erro.message, 'danger'); 
    }
}

async function carregarMeusAlugueis() {
    document.getElementById('alugueisTitle').innerHTML = `<span>Meus</span> Livros Alugados`;
    document.getElementById('alugueisHead').innerHTML = `
        <tr>
            <th>#</th>
            <th>Livro</th>
            <th>Exemplar</th>
            <th>Empréstimo</th>
            <th>Prazo Para Entrega</th>
            <th>Atraso / Multa</th>
            <th>Status</th>
            <th>Ações</th>
        </tr>`;

    definirCarregando('alugueisTbody', 8);

    try {
        const dados = await api('/alugueis/meus');
        renderizarTabelaAlugueisUsuario(dados);
    } catch (erro) { 
        definirVazio('alugueisTbody', 8, erro.message); 
        exibirAlerta(erro.message, 'danger'); 
    }
}

function renderizarBadgeMulta(multaFormatada) {
    if (multaFormatada && multaFormatada !== '—') {
        return `<span style="color:#f85149;font-weight:600">${multaFormatada}</span>`;
    }
    return `<span style="color:var(--text-faint)">—</span>`;
}

function renderizarTabelaAlugueisCompleta(lista) {
    const tbody = document.getElementById('alugueisTbody');
    tbody.innerHTML = '';

    if (!lista.length) { 
        definirVazio('alugueisTbody', 9, 'Nenhum empréstimo ativo encontrado.'); 
        return; 
    }

    lista.forEach(item => {
        const diasAtraso = Number(item.dias_atraso ?? 0);
        const multaAcum = Number(item.multa_acumulada ?? 0);
        const tr = document.createElement('tr');
        
        const badgeInadimplente = item.multa_pendente 
            ? ' <span class="badge badge-danger" style="font-size:.55rem;vertical-align:middle">débito pendente</span>' 
            : '';

        tr.innerHTML = `
            <td style="color:var(--text-dim)">${esc(item.id)}</td>
            <td>${esc(item.usuario ?? '—')} ${badgeInadimplente}</td>
            <td><strong>${esc(item.titulo ?? '—')}</strong></td>
            <td><code style="font-size:var(--fs-xs);color:var(--gold)">${esc(item.exemplar_codigo ?? '—')}</code></td>
            <td style="color:var(--text)">${formatarData(item.data_aluguel)}</td>
            <td style="color:var(--text)">${formatarData(item.prazo)}</td>
            <td>${renderizarBadgeMulta(item.multa_acumulada_formatada)}</td>
            <td>${badgeStatus(item.status)}</td>
            <td>
                ${item.pode_devolver ? `<button class="btn btn-success btn-sm" onclick="abrirModalDevolucao(${item.id})">Devolver</button>` : '<span style="color:var(--text-dim)">—</span>'}
            </td>`;
        
        tbody.appendChild(tr);
    });
}

function renderizarTabelaAlugueisUsuario(lista) {
    const tbody = document.getElementById('alugueisTbody');
    tbody.innerHTML = '';
    
    if (!lista.length) { 
        definirVazio('alugueisTbody', 8, 'Você não possui empréstimos ativos.'); 
        return; 
    }
    
    lista.forEach(item => {
        const diasAtraso = Number(item.dias_atraso ?? 0);
        const multaAcum = Number(item.multa_acumulada ?? 0);
        const tr = document.createElement('tr');

        tr.innerHTML = `
            <td style="color:var(--text-dim)">${esc(item.id)}</td>
            <td><strong>${esc(item.titulo ?? '—')}</strong></td>
            <td><code style="font-size:var(--fs-xs);color:var(--gold)">${esc(item.exemplar_codigo ?? '—')}</code></td>
            <td style="color:var(--text)">${formatarData(item.data_aluguel)}</td>
            <td style="color:var(--text)">${formatarData(item.prazo)}</td>
            <td>${renderizarBadgeMulta(item.multa_acumulada_formatada)}</td>
            <td>${badgeStatus(item.status)}</td>
            <td>
                ${item.pode_renovar ? `<button class="btn btn-gold btn-sm" onclick="renovarEmprestimo(${item.id})">+14 dias</button>` : '<span style="color:var(--text-dim)">—</span>'}
            </td>`;
            
        tbody.appendChild(tr);
    });
}

// Prepara o modal para registrar um novo empréstimo manualmente (Bibliotecário)
async function prepararModalNovoAluguel() {
    try {
        const [livros, usuarios] = await Promise.all([
            api('/livros?status=disponivel&limit=1000'),
            api('/usuarios?limit=1000')
        ]);

        const selLivro = document.getElementById('aluguelLivro');
        const selUsuario = document.getElementById('aluguelUsuario');
        const selExemplar = document.getElementById('aluguelExemplar');
        
        selLivro.innerHTML = '<option value="">Selecione um livro…</option>';
        selUsuario.innerHTML = '<option value="">Selecione um usuário…</option>';
        selExemplar.innerHTML = '<option value="">Selecione um livro primeiro…</option>';
        
        const listaLivros = livros.data ?? livros;
        listaLivros.forEach(l => {
            selLivro.innerHTML += `<option value="${l.id}">${esc(l.titulo)} — ${esc(l.autor)} (${esc(l.exemplares_disponiveis)} disponívels)</option>`;
        });

        const listaUsuarios = usuarios.data ?? usuarios;
        listaUsuarios.forEach(u => {
            selUsuario.innerHTML += `<option value="${u.id}">${esc(u.nome)} (${esc(u.email)})</option>`;
        });
        
        // Evento dinâmico para carregar exemplares específicos do livro escolhido
        selLivro.onchange = async () => {
            const livroId = selLivro.value;
            if (!livroId) {
                selExemplar.innerHTML = '<option value="">Selecione um livro primeiro…</option>';
                return;
            }
            
            try {
                const { exemplares } = await api(`/livros/${livroId}/exemplares`);
                const disponiveis = exemplares.filter(ex => ex.disponibilidade === 'disponivel');
                
                selExemplar.innerHTML = '<option value="">Selecione o exemplar físico…</option>';
                disponiveis.forEach(ex => {
                    const textoCondicao = ex.condicao === 'bom' ? 'Bom' : 'Danificado';
                    selExemplar.innerHTML += `<option value="${ex.id}">${esc(ex.codigo || `#${ex.id}`)} [${textoCondicao}]</option>`;
                });
                
                if (disponiveis.length === 0) {
                    selExemplar.innerHTML = '<option value="">Nenhum exemplar disponível para este livro</option>';
                }
            } catch (erro) {
                selExemplar.innerHTML = '<option value="">Erro ao carregar exemplares</option>';
            }
        };
        
        abrirModal('addAluguelModal');
    } catch (erro) { 
        exibirAlerta(erro.message, 'danger'); 
    }
}

function abrirModalDevolucao(aluguelId) {
    document.getElementById('devolucaoAluguelId').value = aluguelId;
    document.getElementById('devolucaoEstado').value = 'bom';
    document.getElementById('devolucaoObs').value = '';
    document.getElementById('devolucaoObsWrap').style.display = 'none';
    abrirModal('devolucaoModal');
}

function setupAlugueisForms() {
    const addAluguelForm = document.getElementById('addAluguelForm');
    if (addAluguelForm) {
        addAluguelForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                const livroId = parseInt(document.getElementById('aluguelLivro').value);
                const usuarioId = parseInt(document.getElementById('aluguelUsuario').value);
                const exemplarIdStr = document.getElementById('aluguelExemplar').value;
                const exemplarId = exemplarIdStr ? parseInt(exemplarIdStr) : null;
                    
                const payload = {
                    livro_id: livroId,
                    usuario_id: usuarioId
                };
                
                if (exemplarId) {
                    payload.exemplar_id = exemplarId;
                }
                
                await api('/alugueis', {
                    method: 'POST',
                    body: JSON.stringify(payload)
                });

                exibirAlerta('Empréstimo registrado com sucesso!');
                fecharModal('addAluguelModal');
                e.target.reset();
                
                carregarAlugueis(); 
                mostrarTela('alugueisScreen');
            } catch (erro) { 
                exibirAlerta(erro.message, 'danger'); 
            }
        });
    }

    const seletorEstado = document.getElementById('devolucaoEstado');
    if (seletorEstado) {
        seletorEstado.addEventListener('change', () => {
            const ehRuim = seletorEstado.value === 'danificado' || seletorEstado.value === 'perdido';
            const obsWrap = document.getElementById('devolucaoObsWrap');
            if (obsWrap) obsWrap.style.display = ehRuim ? 'block' : 'none';
        });
    }

    const devolucaoForm = document.getElementById('devolucaoForm');
    if (devolucaoForm) {
        devolucaoForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('devolucaoAluguelId').value;
            const estado = document.getElementById('devolucaoEstado').value;
            const obs = document.getElementById('devolucaoObs').value;

            try {
                const resultado = await api(`/alugueis/${id}/devolver`, {
                    method: 'PUT',
                    body: JSON.stringify({ 
                        estado_exemplar: estado, 
                        observacao: obs 
                    })
                });

                fecharModal('devolucaoModal');

                if (resultado.aviso) {
                    exibirAlerta(resultado.aviso, 'warning');
                    
                    if (resultado.multas && resultado.multas.length > 0) {
                        const textoMultas = resultado.multas.map(m => {
                            const motivo = m.tipo === 'atraso' ? `Atraso (${m.dias} dias)` : 'Perda do exemplar';
                            return `${motivo}: R$ ${m.valor.toFixed(2)}`;
                        }).join(' | ');

                        setTimeout(() => {
                            exibirAlerta(`Multas: ${textoMultas} | Total: R$ ${resultado.total_multa.toFixed(2)}`, 'info');
                        }, 2000);
                    }
                } else {
                    exibirAlerta(resultado.message || 'Livro devolvido com sucesso!');
                }

                carregarAlugueis();
            } catch (erro) { 
                exibirAlerta(erro.message, 'danger'); 
            }
        });
    }
}

function renovarEmprestimo(id) {
    exibirConfirmacao({
        icon: '🔄',
        title: 'Renovar Empréstimo',
        msg: 'Deseja adicionar mais 14 dias ao prazo de entrega atual?',
        okLabel: 'Renovar (+14 dias)',
        async onOk() {
            try {
                const resposta = await api(`/alugueis/${id}/renovar`, { method: 'PUT' });
                exibirAlerta(resposta.message || 'Empréstimo renovado!');
                carregarMeusAlugueis();
            } catch (erro) { 
                exibirAlerta(erro.message, 'danger'); 
            }
        }
    });
}

// --- Histórico Detalhado ---

async function carregarHistorico(pagina = 1, usuarioId = '') {
    definirCarregando('historicoTbody', 9);
    try {
        const parametros = new URLSearchParams({ 
            page: pagina, 
            limit: 20,
            sort: sortState.historico.col,
            order: sortState.historico.dir
        });

        if (String(usuarioId).trim()) {
            parametros.set('usuario_id', String(usuarioId).trim());
        }

        const { data, pages } = await api(`/alugueis/historico?${parametros}`);
        const tbody = document.getElementById('historicoTbody');
        tbody.innerHTML = '';

        if (!data.length) { 
            definirVazio('historicoTbody', 9, 'Nenhum registro de histórico encontrado.'); 
            return; 
        }

        data.forEach(item => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="color:var(--text-dim)">${esc(item.id)}</td>
                <td>${esc(item.usuario)}</td>
                <td><strong>${esc(item.titulo)}</strong></td>
                <td><code style="font-size:var(--fs-xs);color:var(--gold)">${esc(item.exemplar_codigo ?? '—')}</code></td>
                <td>${badgeExemplar(item.estado_devolucao ?? item.exemplar_status ?? 'disponivel')}</td>
                <td style="color:var(--text)">${formatarData(item.data_aluguel)}</td>
                <td style="color:var(--text)">${formatarData(item.prazo)}</td>
                <td style="color:var(--text)">${formatarData(item.data_devolucao)}</td>
                <td style="text-align:center">${esc(item.renovacoes ?? 0)}x</td>`;
            
            tbody.appendChild(tr);
        });

        renderizarPaginacao('historicoPagination', pagina, pages, (p) => carregarHistorico(p, usuarioId));
        
        // Atualiza indicadores de ordenação no histórico
        document.querySelectorAll('#historicoScreen .sortable').forEach(th => {
            th.classList.remove('sort-asc', 'sort-desc');
        });
        const thAtual = document.querySelector(`#historicoScreen [onclick="sortTable('historico','${sortState.historico.col}')"]`);
        if (thAtual) {
            thAtual.classList.add(sortState.historico.dir === 'asc' ? 'sort-asc' : 'sort-desc');
        }
    } catch (erro) { 
        definirVazio('historicoTbody', 9, erro.message); 
        exibirAlerta(erro.message, 'danger'); 
    }
}

async function exportarHistoricoCSV() {
    try {
        // Busca um volume maior para o CSV (limitado a 10.000 registros para segurança)
        const { data } = await api('/alugueis/historico?page=1&limit=10000');
        
        const colunas = ['id', 'usuario', 'titulo', 'exemplar_codigo', 'estado_devolucao', 'data_aluguel', 'prazo', 'data_devolucao', 'renovacoes'];
        
        // Constrói o conteúdo CSV
        const header = colunas.join(',');
        const linhas = data.map(registro => {
            return colunas.map(col => {
                const valor = (registro[col] ?? '').toString().replace(/"/g, '""');
                return `"${valor}"`;
            }).join(',');
        });

        const csvString = [header, ...linhas].join('\n');
        
        // Cria e dispara o download do arquivo
        const link = document.createElement('a');
        link.href = URL.createObjectURL(new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' }));
        link.download = `historico_biblioteca_${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        
        exibirAlerta('Histórico exportado com sucesso!');
    } catch (erro) { 
        exibirAlerta(erro.message, 'danger'); 
    }
}

// --- Gestão de Multas para o Usuário (Área do Aluno) ---

// As funções de multas do usuário foram movidas para a Central de Notificações em notifications.js
// para uma experiência mais integrada.
