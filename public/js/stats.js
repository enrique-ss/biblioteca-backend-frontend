// Estatísticas e gráficos do sistema

// Armazena instâncias dos gráficos Chart.js
let instanciasGraficos = {};
let dadosBrutosStats = null;

// Extrai valores RGB de uma cor CSS
function extrairRgb(cor) {
    const temp = document.createElement('div');
    temp.style.color = cor;
    temp.style.display = 'none';
    document.body.appendChild(temp);
    const match = getComputedStyle(temp).color.match(/\d+/g);
    document.body.removeChild(temp);
    return match ? match.slice(0, 3).join(', ') : '212, 175, 55';
}

// Obtém configurações de cores do tema atual
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

// Gera paleta de cores para gráficos baseada no tema
function obterPaletaGrafico(qtd = 5) {
    const conf = obterConfigTema();
    return Array.from({ length: Math.max(qtd, 1) }, (_, i) => `rgba(${conf.accentRgb}, ${0.85 - (i * 0.1)})`);
}

// Configura padrão visual para todos os gráficos
function configurarPadraoGrafico(tipo) {
    const conf = obterConfigTema();
    const horizontal = tipo === 'bar-h';
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
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

    if (horizontal) {
        options.indexAxis = 'y';
    }

    return options;
}

// Cria e renderiza um gráfico Chart.js
function montarGrafico(id, tipo, rotulos, valores) {
    const ctx = document.getElementById(`chart-${id}`);
    if (!ctx) return;

    // Destroi gráfico anterior se existir
    if (instanciasGraficos[id]) {
        instanciasGraficos[id].destroy();
        delete instanciasGraficos[id];
    }

    // Prepara dados e cores
    const labels = (rotulos || []).length ? rotulos : ['Sem dados'];
    const values = (valores || []).length ? valores : [0];
    const palette = obterPaletaGrafico(labels.length);
    const conf = obterConfigTema();
    const chartType = tipo === 'bar-h' ? 'bar' : tipo;

    // Cria nova instância do gráfico
    instanciasGraficos[id] = new Chart(ctx, {
        type: chartType,
        data: {
            labels,
            datasets: [{
                data: values,
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

// Normaliza dados de séries para gráficos
function normalizarSerie(arr) {
    // Converte dados brutos em objetos com labels e valores
    return {
        labels: arr.map((item) => item.label),
        values: arr.map((item) => Number(item.valor || 0))
    };
}

// Renderiza todos os gráficos da página de estatísticas
function renderizarTodosGraficos() {
    // Verifica se há dados disponíveis
    if (!dadosBrutosStats) return;
    const d = dadosBrutosStats;

    // Normaliza dados para cada gráfico
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

    // Renderiza cada gráfico com seu tipo específico
    montarGrafico('generos', 'bar-h', generos.labels, generos.values);
    montarGrafico('autores', 'bar-h', autores.labels, autores.values);
    montarGrafico('livros', 'bar', livros.labels, livros.values);
    montarGrafico('usuarios', 'bar', usuarios.labels, usuarios.values);
    montarGrafico('meses', 'line', meses.labels, meses.values);
    montarGrafico('cadastros', 'line', cadastros.labels, cadastros.values);
    montarGrafico('acervo', 'doughnut', acervo.labels, acervo.values);
    montarGrafico('funcoes', 'doughnut', funcoes.labels, funcoes.values);
}

// Renderiza os KPIs (indicadores chave) na página
function renderizarIndicadores(dados) {
    const kpis = (dados.kpis || []).slice(0, 6);
    document.getElementById('statsKpiGrid').innerHTML = kpis.map((kpi) => `
        <div class="stats-kpi-card">
            <div class="stats-kpi-label">${esc(kpi.label)}</div>
            <div class="stats-kpi-val">${esc(String(kpi.valor))}</div>
        </div>
    `).join('');
}

// Carrega dados estatísticos do backend e renderiza gráficos
async function carregarEstatisticasDetalhadas() {
    // Mostra loading e esconde conteúdo
    document.getElementById('statsLoading').style.display = 'block';
    document.getElementById('statsContent').style.display = 'none';

    // Carrega Chart.js se ainda não estiver disponível
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
        // Busca dados das APIs
        const detalhado = await api('/stats/detalhado');
        const resumo = await api('/stats');

        // Usa resumo como fallback se não houver KPIs
        if ((!detalhado.kpis || !detalhado.kpis.length) && Array.isArray(resumo.stats)) {
            detalhado.kpis = resumo.stats.slice(0, 6);
        }

        // Armazena dados e renderiza interface
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

// Exporta estatísticas para CSV (desabilitado no frontend)
function exportarEstatisticasCSV() {
    exibirAlerta('Exportação CSV desabilitada. Use o endpoint do backend.', 'warning');
}

window.addEventListener('storage', (e) => {
    if (e.key === 'biblioverso_theme') {
        renderizarTodosGraficos();
    }
});

const obTema = new MutationObserver(() => {
    if (document.getElementById('statsScreen').classList.contains('active')) {
        renderizarTodosGraficos();
    }
});

obTema.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
