/*
    ESTATÍSTICAS E GRÁFICOS DO SISTEMA.
    Este arquivo gera a tela de análise da biblioteca com indicadores e gráficos visuais.
    Usa a biblioteca Chart.js (carregada dinamicamente quando necessário) para criar:
    - Gráficos de barras horizontais: gêneros e autores mais emprestados
    - Gráficos de barras verticais: livros mais populares e usuários mais ativos
    - Gráficos de linha: empréstimos e cadastros por mês
    - Gráficos de rosca (doughnut): distribuição do acervo e tipos de usuário

    O sistema adapta automaticamente as cores dos gráficos ao tema (escuro/claro).
*/

// Armazena as instâncias ativas dos gráficos para poder destruí-las antes de recriar
let instanciasGraficos = {};
// Guarda os dados brutos retornados pelo servidor para uso nas funções de renderização
let dadosBrutosStats = null;

/*
    Extrai os valores RGB de uma cor CSS calculada.
    Necessário porque Chart.js precisa dos valores RGB separados para criar
    gradientes de opacidade (ex: rgba(212, 175, 55, 0.85)).
    Cria um elemento invisível, aplica a cor, lê o computedStyle e extrai os números.
*/
function extrairRgb(cor) {
    const temp = document.createElement('div');
    temp.style.color = cor;
    temp.style.display = 'none';
    document.body.appendChild(temp);
    const match = getComputedStyle(temp).color.match(/\d+/g);
    document.body.removeChild(temp);
    // Retorna o dourado padrão (D4AF37) como fallback se a cor não puder ser lida
    return match ? match.slice(0, 3).join(', ') : '212, 175, 55';
}

/*
    Lê as variáveis CSS do tema atual (escuro ou claro) e retorna um objeto
    com as cores prontas para uso nos gráficos.
    Assim, quando o tema muda, os gráficos se adaptam automaticamente.
*/
function obterConfigTema() {
    const estilo = getComputedStyle(document.documentElement);
    const accent = estilo.getPropertyValue('--accent').trim();
    const text = estilo.getPropertyValue('--text').trim();
    const textDim = estilo.getPropertyValue('--text-dim').trim();
    const bg = estilo.getPropertyValue('--bg').trim();

    return {
        accent,
        accentRgb: extrairRgb(accent),
        text,
        textDim,
        bg
    };
}

/*
    Gera uma paleta de cores para os gráficos com base na cor de destaque (--accent).
    Cada cor subsequente tem opacidade levemente menor, criando um degradê visual.
    O parâmetro qtd define quantas cores gerar (uma por barra/fatia do gráfico).
*/
function obterPaletaGrafico(qtd = 5) {
    const conf = obterConfigTema();
    return Array.from({ length: Math.max(qtd, 1) }, (_, i) => `rgba(${conf.accentRgb}, ${0.85 - (i * 0.1)})`);
}

/*
    Retorna as opções padrão de configuração visual do Chart.js para o tema atual.
    Define: fonte, cor do texto dos eixos, cor de fundo do tooltip, grid e legenda.
    Para gráficos de barras horizontais (bar-h), inverte os eixos com indexAxis: 'y'.
    Para gráficos de rosca (doughnut), omite os eixos (não fazem sentido nesse tipo).
*/
function configurarPadraoGrafico(tipo) {
    const conf = obterConfigTema();
    const horizontal = tipo === 'bar-h';
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                // Legenda só aparece no gráfico de rosca (doughnut)
                display: tipo === 'doughnut',
                position: 'bottom',
                labels: {
                    color: conf.text,
                    boxWidth: 10,
                    boxHeight: 10,
                    padding: 14,
                    font: { family: 'Crimson Pro', size: 12, weight: '600' }
                }
            },
            tooltip: {
                // Tooltip escuro com borda dourada semitransparente
                backgroundColor: 'rgba(12, 14, 13, 0.96)',
                titleColor: '#ffffff',
                bodyColor: '#ffffff',
                footerColor: '#ffffff',
                borderColor: `rgba(${conf.accentRgb}, 0.25)`,
                borderWidth: 1,
                padding: 12,
                cornerRadius: 10
            }
        },
        scales: tipo === 'doughnut' ? {} : {
            x: {
                ticks: { color: conf.textDim || conf.text, font: { family: 'Crimson Pro', size: 11, weight: '600' } },
                grid: { display: false }
            },
            y: {
                ticks: { color: conf.textDim || conf.text, font: { family: 'Crimson Pro', size: 11, weight: '600' } },
                grid: { color: `rgba(${conf.accentRgb}, 0.08)`, drawBorder: false },
                beginAtZero: true
            }
        }
    };

    // Inverte os eixos para barras horizontais
    if (horizontal) {
        options.indexAxis = 'y';
    }

    return options;
}

/*
    Cria ou recria um gráfico Chart.js dentro do elemento <canvas> com o id dado.
    Se já existir um gráfico nesse espaço, ele é destruído antes de criar o novo,
    evitando sobreposição de instâncias e vazamentos de memória.
    tipo pode ser: 'bar', 'bar-h', 'line' ou 'doughnut'.
*/
function montarGrafico(id, tipo, rotulos, valores) {
    const ctx = document.getElementById(`chart-${id}`);
    if (!ctx) return;

    // Destroi o gráfico anterior se já existir para liberar memória
    if (instanciasGraficos[id]) {
        instanciasGraficos[id].destroy();
        delete instanciasGraficos[id];
    }

    // Fallback para arrays vazios: exibe "Sem dados" com valor zero
    const labels = (rotulos || []).length ? rotulos : ['Sem dados'];
    const values = (valores || []).length ? valores : [0];
    const palette = obterPaletaGrafico(labels.length);
    const conf = obterConfigTema();
    // Chart.js não conhece 'bar-h'; traduz para 'bar' e usa indexAxis para inverter
    const chartType = tipo === 'bar-h' ? 'bar' : tipo;

    instanciasGraficos[id] = new Chart(ctx, {
        type: chartType,
        data: {
            labels,
            datasets: [{
                data: values,
                // Rosca usa paleta completa (cada fatia tem uma cor); barras usam a cor principal
                backgroundColor: tipo === 'doughnut' ? palette : palette[0],
                borderColor: tipo === 'doughnut' ? conf.bg : `rgba(${conf.accentRgb}, 0.15)`,
                borderWidth: tipo === 'doughnut' ? 2 : 1,
                tension: 0.3,
                borderRadius: chartType === 'bar' ? 8 : 0,
                fill: chartType === 'line' ? true : false
            }]
        },
        options: configurarPadraoGrafico(tipo)
    });
}

/*
    Converte um array de objetos { label, valor } em dois arrays separados
    (labels e values), que é o formato que o Chart.js espera para os dados.
*/
function normalizarSerie(arr) {
    return {
        labels: arr.map((item) => item.label),
        values: arr.map((item) => Number(item.valor || 0))
    };
}

/*
    Renderiza todos os 8 gráficos da tela de estatísticas de uma vez.
    Usa os dados já armazenados em dadosBrutosStats para não fazer novas requisições.
    Os rótulos de status do acervo ("disponivel") são traduzidos para português legível.
*/
function renderizarTodosGraficos() {
    if (!dadosBrutosStats) return;
    const d = dadosBrutosStats;

    const generos = normalizarSerie(d.generosMaisEmprestados);
    const autores = normalizarSerie(d.autoresMaisEmprestados);
    const livros = normalizarSerie(d.livrosMaisEmprestados);
    const usuarios = normalizarSerie(d.usuariosMaisAtivos);
    const meses = normalizarSerie(d.emprestimosPorMes);
    const cadastros = normalizarSerie(d.cadastrosPorMes);
    const acervo = normalizarSerie((d.distribuicaoStatus || []).map((item) => ({
        label: item.label === 'disponivel' ? 'Disponível' : 'Indisponível',
        valor: item.valor
    })));
    const funcoes = normalizarSerie(d.distribuicaoUsuarios || []);

    montarGrafico('generos', 'bar-h', generos.labels, generos.values);
    montarGrafico('autores', 'bar-h', autores.labels, autores.values);
    montarGrafico('livros', 'bar', livros.labels, livros.values);
    montarGrafico('usuarios', 'bar', usuarios.labels, usuarios.values);
    montarGrafico('meses', 'line', meses.labels, meses.values);
    montarGrafico('cadastros', 'line', cadastros.labels, cadastros.values);
    montarGrafico('acervo', 'doughnut', acervo.labels, acervo.values);
    montarGrafico('funcoes', 'doughnut', funcoes.labels, funcoes.values);
}

/*
    Renderiza os cartões de KPI (Key Performance Indicators) no topo da tela.
    KPIs são os números mais importantes do sistema: total de livros, empréstimos ativos,
    usuários cadastrados, multas pendentes, etc.
    Exibe no máximo 6 KPIs para não poluir a interface.
*/
function renderizarIndicadores(dados) {
    const kpis = (dados.kpis || []).slice(0, 6);
    document.getElementById('statsKpiGrid').innerHTML = kpis.map((kpi) => `
        <div class="stats-kpi-card">
            <div class="stats-kpi-label">${esc(kpi.label)}</div>
            <div class="stats-kpi-val">${esc(String(kpi.valor))}</div>
        </div>
    `).join('');
}

/*
    Carrega os dados estatísticos do servidor e inicializa toda a tela de análise.
    A biblioteca Chart.js é carregada sob demanda (lazy loading) para não atrasar
    o carregamento inicial do sistema — ela só é baixada quando o usuário acessa esta tela.
    Busca dados de dois endpoints:
    - /stats/detalhado: séries para gráficos
    - /stats: KPIs resumidos (usado como fallback se /stats/detalhado não trouxer KPIs)
*/
async function carregarEstatisticasDetalhadas() {
    document.getElementById('statsLoading').style.display = 'block';
    document.getElementById('statsContent').style.display = 'none';

    // Carrega Chart.js apenas se ainda não estiver disponível na página
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
        const detalhado = await api('/stats/detalhado');
        const resumo = await api('/stats');

        // Se o endpoint detalhado não retornou KPIs, usa os do endpoint resumido
        if ((!detalhado.kpis || !detalhado.kpis.length) && Array.isArray(resumo.stats)) {
            detalhado.kpis = resumo.stats.slice(0, 6);
        }

        dadosBrutosStats = detalhado;
        renderizarIndicadores(detalhado);
        document.getElementById('statsLoading').style.display = 'none';
        document.getElementById('statsContent').style.display = 'block';
        renderizarTodosGraficos();
    } catch (erro) {
        document.getElementById('statsLoading').textContent = 'Erro ao carregar estatísticas.';
        exibirAlerta(erro.message, 'danger');
    }
}

/*
    Exportação CSV desabilitada no frontend.
    Esta função existe como placeholder para quando a funcionalidade
    for implementada diretamente no backend com autenticação.
*/
function exportarEstatisticasCSV() {
    exibirAlerta('Exportação CSV desabilitada. Use o endpoint do backend.', 'warning');
}

/*
    Ouve mudanças no localStorage relacionadas ao tema.
    Quando o usuário alterna entre escuro/claro em outra aba, os gráficos
    também são atualizados nesta aba para manter a consistência visual.
*/
window.addEventListener('storage', (e) => {
    if (e.key === 'biblioverso_theme') {
        renderizarTodosGraficos();
    }
});

/*
    Observa mudanças no atributo data-theme do elemento raiz (<html>).
    Quando o tema muda na mesma aba (clique no botão sol/lua), re-renderiza
    os gráficos somente se a tela de estatísticas estiver ativa no momento.
*/
const obTema = new MutationObserver(() => {
    if (document.getElementById('statsScreen').classList.contains('active')) {
        renderizarTodosGraficos();
    }
});

obTema.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
