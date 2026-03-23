// Gerenciamento de Estatísticas e Gráficos

let instanciasGraficos = {};
let dadosBrutosStats = null;

// Paleta de cores para os gráficos (estilo moderno e harmonioso)
const CORES_GRAFICOS = [
    'rgba(122,162,247, 0.85)', // Azul
    'rgba(63,185,80, 0.85)',   // Verde
    'rgba(210,153,34, 0.85)',  // Âmbar
    'rgba(248,81,73, 0.85)',   // Vermelho
    'rgba(158,112,247, 0.85)', // Roxo
    'rgba(87,199,199, 0.85)',  // Ciano
    'rgba(247,162,122, 0.85)', // Laranja
    'rgba(122,247,162, 0.85)'  // Lima
];

// Bordas com 100% de opacidade baseadas nas cores acima
const BORDAS_GRAFICOS = CORES_GRAFICOS.map(cor => cor.replace('0.85', '1'));

// Recupera cores do tema CSS para manter consistência nos gráficos
function obterCorTexto() {
    const estilo = getComputedStyle(document.documentElement);
    return estilo.getPropertyValue('--text').trim() || '#e6edf3';
}

function obterCorTextoSuave() {
    const estilo = getComputedStyle(document.documentElement);
    return estilo.getPropertyValue('--text-dim').trim() || '#adbac7';
}

// Configurações padrão para o Chart.js
function configurarPadraoGrafico(ehHorizontal = false) {
    const configuracao = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(22,27,34, 0.96)',
                titleColor: '#7aa2f7',
                bodyColor: '#e6edf3',
                borderColor: 'rgba(122,162,247, 0.18)',
                borderWidth: 1,
                padding: 10,
                cornerRadius: 6
            }
        },
        scales: {
            x: {
                ticks: { color: obterCorTextoSuave(), font: { size: 10 } },
                grid: { color: 'rgba(122,162,247, 0.05)' }
            },
            y: {
                ticks: { color: obterCorTextoSuave(), font: { size: 10 } },
                grid: { color: 'rgba(122,162,247, 0.05)' },
                beginAtZero: true
            }
        }
    };

    if (ehHorizontal) {
        configuracao.indexAxis = 'y';
        configuracao.scales.x.ticks.maxTicksLimit = 5;
        delete configuracao.scales.y.beginAtZero;
    }

    return configuracao;
}

// Constrói um gráfico e sua respectiva lista lateral de detalhes
function montarGraficoComLista(id, tipo, rotulos, valores, unidade = '') {
    const elementoCtx = document.getElementById('chart-' + id);
    if (!elementoCtx) {
        return;
    }

    // Limpa instância anterior se existir para evitar bugs de hover
    if (instanciasGraficos[id]) {
        instanciasGraficos[id].destroy();
        delete instanciasGraficos[id];
    }

    const ehPizza = tipo === 'doughnut';
    const ehHorizontal = tipo === 'bar-h';
    const tipoGraficoJS = ehHorizontal ? 'bar' : tipo;
    
    const opcoes = configurarPadraoGrafico(ehHorizontal);
    if (ehPizza) {
        delete opcoes.scales;
    }

    instanciasGraficos[id] = new Chart(elementoCtx, {
        type: tipoGraficoJS,
        data: {
            labels: rotulos,
            datasets: [{
                data: valores,
                backgroundColor: ehPizza ? CORES_GRAFICOS.slice(0, rotulos.length) : CORES_GRAFICOS[0],
                borderColor: ehPizza ? BORDAS_GRAFICOS.slice(0, rotulos.length) : BORDAS_GRAFICOS[0],
                borderWidth: 1.5,
                tension: 0.35,
                fill: tipo === 'line' ? 'origin' : false,
                borderRadius: tipoGraficoJS === 'bar' ? 3 : 0,
                pointRadius: tipo === 'line' ? 3 : 0,
                pointHoverRadius: tipo === 'line' ? 5 : 0
            }]
        },
        options: opcoes
    });

    // Renderiza a lista textual abaixo/ao lado do gráfico
    const elementoLista = document.getElementById('list-' + id);
    if (!elementoLista) {
        return;
    }

    const valorMaximo = Math.max(...valores) || 1;
    
    elementoLista.innerHTML = rotulos.map((texto, i) => {
        const percentual = Math.round((valores[i] / valorMaximo) * 100);
        const cor = CORES_GRAFICOS[i % CORES_GRAFICOS.length];
        
        return `
            <div class="stats-list-item">
                <div class="stats-list-dot" style="background:${cor}"></div>
                <div class="stats-list-label" title="${esc(texto)}">${esc(texto)}</div>
                <div class="stats-list-bar-wrap">
                    <div class="stats-list-bar" style="width:${percentual}%;background:${cor}"></div>
                </div>
                <div class="stats-list-val">${esc(String(valores[i]))}${unidade ? ' ' + unidade : ''}</div>
            </div>`;
    }).join('');
}

// Renderiza todos os gráficos da tela de estatísticas
function renderizarTodosGraficos() {
    if (!dadosBrutosStats) {
        return;
    }

    const d = dadosBrutosStats;
    
    // Função auxiliar para formatar arrays vindos da API
    const formatar = arr => ({
        labels: arr.map(r => r.label),
        values: arr.map(r => Number(r.valor))
    });

    // Montagem dos gráficos principais
    const gGeneros = formatar(d.generosMaisEmprestados);
    montarGraficoComLista('generos', 'bar-h', gGeneros.labels, gGeneros.values);

    const gAutores = formatar(d.autoresMaisEmprestados);
    montarGraficoComLista('autores', 'bar-h', gAutores.labels, gAutores.values);

    const gLivros = formatar(d.livrosMaisEmprestados);
    montarGraficoComLista('livros', 'bar-h', gLivros.labels, gLivros.values);

    const gUsuarios = formatar(d.usuariosMaisAtivos);
    montarGraficoComLista('usuarios', 'bar-h', gUsuarios.labels, gUsuarios.values);

    const gMeses = formatar(d.emprestimosPorMes);
    montarGraficoComLista('meses', 'line', gMeses.labels, gMeses.values);

    const gCadastros = formatar(d.cadastrosPorMes);
    montarGraficoComLista('cadastros', 'line', gCadastros.labels, gCadastros.values);

    const gDecadas = formatar(d.livrosPorAno);
    montarGraficoComLista('decadas', 'bar', gDecadas.labels, gDecadas.values);

    // Gráfico de Pizza para distribuição do acervo
    const rotulosAcervo = d.distribuicaoStatus.map(r => r.label === 'disponivel' ? 'Disponível' : 'Alugado');
    const valoresAcervo = d.distribuicaoStatus.map(r => Number(r.valor));
    montarGraficoComLista('acervo', 'doughnut', rotulosAcervo, valoresAcervo, 'ex.');
}

// Preenche os cartões de indicadores (KPIs)
function renderizarIndicadores(d) {
    const t = d.taxaAtraso || {};
    const dev = d.tempoMedioDevolucao || {};
    
    const total = Number(t.total) || 1;
    const somaAtrasos = Number(t.atrasados) + Number(t.devolvidos_atrasados);
    const taxaPct = Math.round((somaAtrasos / total) * 100);

    const indicadores = [
        { label: 'Total de Empréstimos',   val: t.total ?? 0,                    cls: 'blue'  },
        { label: 'Devolvidos no Prazo',     val: t.devolvidos_prazo ?? 0,         cls: 'green' },
        { label: 'Devolvidos com Atraso',   val: t.devolvidos_atrasados ?? 0,     cls: 'amber' },
        { label: 'Ativos em Atraso',        val: t.atrasados ?? 0,               cls: 'red'   },
        { label: 'Taxa de Atraso',          val: taxaPct + '%',                  cls: taxaPct > 20 ? 'red' : 'green' },
        { label: 'Média de Devolução',      val: (dev.media_dias ?? '—') + (dev.media_dias ? ' d' : ''), cls: 'blue' },
        { label: 'Mais Rápido',            val: (dev.min_dias ?? '—') + (dev.min_dias ? ' d' : ''),     cls: 'green' },
        { label: 'Mais Lento',             val: (dev.max_dias ?? '—') + (dev.max_dias ? ' d' : ''),     cls: 'amber' },
    ];

    document.getElementById('statsKpiGrid').innerHTML = indicadores.map(k => `
        <div class="stats-kpi-card">
            <div class="stats-kpi-label">${esc(k.label)}</div>
            <div class="stats-kpi-val ${k.cls}">${esc(String(k.val))}</div>
        </div>`).join('');
}

// Busca os dados detalhados do servidor
async function carregarEstatisticasDetalhadas() {
    document.getElementById('statsLoading').style.display = 'block';
    document.getElementById('statsContent').style.display = 'none';

    // Garante que o Chart.js está carregado antes de prosseguir
    if (!window.Chart) {
        await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    try {
        const dados = await api('/stats/detalhado');
        dadosBrutosStats = dados;
        
        renderizarIndicadores(dados);
        
        document.getElementById('statsLoading').style.display = 'none';
        document.getElementById('statsContent').style.display = 'block';
        
        renderizarTodosGraficos();
    } catch (erro) {
        document.getElementById('statsLoading').textContent = 'Erro ao carregar estatísticas.';
        exibirAlerta(erro.message, 'danger');
    }
}

// Exporta os dados atuais para um arquivo CSV
function exportarEstatisticasCSV() {
    if (!dadosBrutosStats) {
        exibirAlerta('Carregue as estatísticas primeiro.', 'warning');
        return;
    }

    const d = dadosBrutosStats;
    const t = d.taxaAtraso || {};
    const dev = d.tempoMedioDevolucao || {};
    
    const total = Number(t.total) || 1;
    const somaAtrasos = Number(t.atrasados) + Number(t.devolvidos_atrasados);
    const taxaPct = Math.round((somaAtrasos / total) * 100);

    const formatarAspas = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const formatarLinha = cols => cols.map(formatarAspas).join(',');
    const formatarSecao = (titulo, cabecalho, linhas) => `${titulo}\n${cabecalho}\n${linhas.join('\n')}\n`;

    const csvContent = [
        formatarSecao('KPIs', formatarLinha(['Métrica', 'Valor']), [
            formatarLinha(['Total de Empréstimos', t.total ?? 0]),
            formatarLinha(['Devolvidos no Prazo', t.devolvidos_prazo ?? 0]),
            formatarLinha(['Devolvidos com Atraso', t.devolvidos_atrasados ?? 0]),
            formatarLinha(['Ativos em Atraso', t.atrasados ?? 0]),
            formatarLinha(['Taxa de Atraso (%)', taxaPct]),
            formatarLinha(['Média de Devolução (dias)', dev.media_dias ?? '—']),
            formatarLinha(['Devolução Mais Rápida (dias)', dev.min_dias ?? '—']),
            formatarLinha(['Devolução Mais Lenta (dias)', dev.max_dias ?? '—']),
        ]),
        formatarSecao('Gêneros Mais Emprestados', formatarLinha(['Gênero', 'Empréstimos']), d.generosMaisEmprestados.map(r => formatarLinha([r.label, r.valor]))),
        formatarSecao('Autores Mais Emprestados', formatarLinha(['Autor', 'Empréstimos']), d.autoresMaisEmprestados.map(r => formatarLinha([r.label, r.valor]))),
        formatarSecao('Livros Mais Emprestados', formatarLinha(['Livro', 'Empréstimos']), d.livrosMaisEmprestados.map(r => formatarLinha([r.label, r.valor]))),
        formatarSecao('Usuários Mais Ativos', formatarLinha(['Usuário', 'Empréstimos']), d.usuariosMaisAtivos.map(r => formatarLinha([r.label, r.valor]))),
        formatarSecao('Empréstimos por Mês', formatarLinha(['Mês', 'Empréstimos']), d.emprestimosPorMes.map(r => formatarLinha([r.label, r.valor]))),
        formatarSecao('Cadastros por Mês', formatarLinha(['Mês', 'Usuários']), d.cadastrosPorMes.map(r => formatarLinha([r.label, r.valor]))),
        formatarSecao('Acervo por Década', formatarLinha(['Década', 'Livros']), d.livrosPorAno.map(r => formatarLinha([r.label, r.valor]))),
        formatarSecao('Status do Acervo', formatarLinha(['Status', 'Exemplares']), d.distribuicaoStatus.map(r => formatarLinha([r.label, r.valor]))),
    ].join('\n');

    // Cria o link de download para o usuário
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `luizateca_stats_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    
    exibirAlerta('CSV exportado com sucesso!');
}
