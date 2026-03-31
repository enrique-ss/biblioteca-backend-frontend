// Gerenciamento de Estatísticas e Gráficos
let instanciasGraficos = {};
let dadosBrutosStats = null;

// Helper para converter qualquer cor CSS para RGB (r, g, b)
function extrairRgb(cor) {
    const temp = document.createElement('div');
    temp.style.color = cor;
    temp.style.display = 'none';
    document.body.appendChild(temp);
    const rgb = getComputedStyle(temp).color.match(/\d+/g).slice(0, 3).join(', ');
    document.body.removeChild(temp);
    return rgb || '212, 175, 55';
}

function obterConfigTema() {
    const estilo = getComputedStyle(document.documentElement);
    const accent = estilo.getPropertyValue('--accent').trim();
    const text = estilo.getPropertyValue('--text').trim();
    const bg = estilo.getPropertyValue('--bg').trim();
    
    return {
        accent: accent,
        accentRgb: extrairRgb(accent),
        text: text,
        bg: bg
    };
}

function obterPaletaGrafico(qtd = 5) {
    const conf = obterConfigTema();
    return Array.from({length: qtd}, (_, i) => `rgba(${conf.accentRgb}, ${0.9 - (i * 0.15)})`);
}

function configurarPadraoGrafico(ehHorizontal = false) {
    const conf = obterConfigTema();
    const config = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: conf.bg === '#0A0C0B' || conf.bg.includes('0, 0, 0') ? 'rgba(5,6,5,0.95)' : 'rgba(255,255,255,0.95)',
                titleColor: conf.accent,
                bodyColor: conf.text,
                borderColor: conf.accent,
                borderWidth: 1,
                padding: 12,
                cornerRadius: 8,
                titleFont: { family: 'Cinzel', size: 13, weight: '700' }
            }
        },
        scales: {
            x: {
                ticks: { color: `rgba(${conf.accentRgb}, 0.65)`, font: { family: 'Cinzel', size: 9, weight: '700' } },
                grid: { display: false }
            },
            y: {
                ticks: { color: `rgba(${conf.accentRgb}, 0.65)`, font: { family: 'Cinzel', size: 9, weight: '700' } },
                grid: { color: `rgba(${conf.accentRgb}, 0.1)`, drawBorder: false },
                beginAtZero: true
            }
        }
    };
    if (ehHorizontal) {
        config.indexAxis = 'y';
    }
    return config;
}

function montarGraficoComLista(id, tipo, rotulos, valores, unidade = '') {
    const ctx = document.getElementById('chart-' + id);
    if (!ctx) return;

    if (instanciasGraficos[id]) {
        instanciasGraficos[id].destroy();
        delete instanciasGraficos[id];
    }

    const ehPizza = tipo === 'doughnut';
    const paleta = obterPaletaGrafico(rotulos.length);
    const conf = obterConfigTema();

    instanciasGraficos[id] = new Chart(ctx, {
        type: tipo === 'bar-h' ? 'bar' : tipo,
        data: {
            labels: rotulos,
            datasets: [{
                data: valores,
                backgroundColor: ehPizza ? paleta : paleta[0],
                borderColor: conf.bg,
                borderWidth: 2,
                tension: 0.3,
                borderRadius: tipo === 'bar' || tipo === 'bar-h' ? 4 : 0
            }]
        },
        options: configurarPadraoGrafico(tipo === 'bar-h')
    });

    const listEl = document.getElementById('list-' + id);
    if (!listEl) return;

    const max = Math.max(...valores) || 1;
    listEl.innerHTML = rotulos.map((r, i) => {
        const pct = Math.round((valores[i] / max) * 100);
        const cor = paleta[i % paleta.length];
        return `
            <div class="stats-list-item">
                <div class="stats-list-dot" style="background:${cor}"></div>
                <div class="stats-list-label" title="${esc(r)}">${esc(r)}</div>
                <div class="stats-list-bar-wrap">
                    <div class="stats-list-bar" style="width:${pct}%;background:${cor}"></div>
                </div>
                <div class="stats-list-val">${esc(String(valores[i]))}${unidade ? ' ' + unidade : ''}</div>
            </div>`;
    }).join('');
}

function renderizarTodosGraficos() {
    if (!dadosBrutosStats) return;
    const d = dadosBrutosStats;
    const fmt = arr => ({ labels: arr.map(x => x.label), values: arr.map(x => Number(x.valor)) });

    const gG = fmt(d.generosMaisEmprestados); montarGraficoComLista('generos', 'bar-h', gG.labels, gG.values);
    const gA = fmt(d.autoresMaisEmprestados); montarGraficoComLista('autores', 'bar-h', gA.labels, gA.values);
    const gL = fmt(d.livrosMaisEmprestados); montarGraficoComLista('livros', 'bar-h', gL.labels, gL.values);
    const gU = fmt(d.usuariosMaisAtivos);    montarGraficoComLista('usuarios', 'bar-h', gU.labels, gU.values);
    const gM = fmt(d.emprestimosPorMes);    montarGraficoComLista('meses', 'line', gM.labels, gM.values);
    const gC = fmt(d.cadastrosPorMes);      montarGraficoComLista('cadastros', 'line', gC.labels, gC.values);
    const gD = fmt(d.livrosPorAno);         montarGraficoComLista('decadas', 'bar', gD.labels, gD.values);

    const acLabels = d.distribuicaoStatus.map(x => x.label === 'disponivel' ? 'Disponível' : 'Alugado');
    const acVals = d.distribuicaoStatus.map(x => Number(x.valor));
    montarGraficoComLista('acervo', 'doughnut', acLabels, acVals, 'ex.');
}

function renderizarIndicadores(d) {
    const kpis = d.kpis || [];

    document.getElementById('statsKpiGrid').innerHTML = kpis.map(k => `
        <div class="stats-kpi-card">
            <div class="stats-kpi-label">${esc(k.label)}</div>
            <div class="stats-kpi-val">${esc(String(k.valor))}</div>
        </div>`).join('');
}

async function carregarEstatisticasDetalhadas() {
    document.getElementById('statsLoading').style.display = 'block';
    document.getElementById('statsContent').style.display = 'none';

    if (!window.Chart) {
        await new Promise((res, rej) => {
            const s = document.createElement('script');
            s.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js';
            s.onload = res; s.onerror = rej;
            document.head.appendChild(s);
        });
    }

    try {
        const dados = await api('/stats/detalhado');
        dadosBrutosStats = dados;
        renderizarIndicadores(dados);
        document.getElementById('statsLoading').style.display = 'none';
        document.getElementById('statsContent').style.display = 'block';
        renderizarTodosGraficos();
    } catch (e) {
        document.getElementById('statsLoading').textContent = 'Erro ao carregar estatísticas.';
        exibirAlerta(e.message, 'danger');
    }
}

function exportarEstatisticasCSV() {
    if (!dadosBrutosStats) return exibirAlerta('Carregue as estatísticas primeiro.', 'warning');
    const d = dadosBrutosStats;
    const fA = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const fL = c => c.map(fA).join(',');
    const fS = (t, c, l) => `${t}\n${c}\n${l.join('\n')}\n`;

    const csv = [
        fS('KPIS', fL(['Métrica', 'Valor']), [fL(['Total', d.taxaAtraso?.total])]),
        fS('Gêneros', fL(['Gênero', 'Val']), d.generosMaisEmprestados.map(r => fL([r.label, r.valor])))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `stats_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
}

// Atualizar ao trocar o tema
window.addEventListener('storage', (e) => {
    if (e.key === 'cristalario_theme') renderizarTodosGraficos();
});
// Redesenhar ao clicar no botão de tema (via MutationObserver simplificado)
const obTema = new MutationObserver(() => {
    if (document.getElementById('statsScreen').classList.contains('active')) renderizarTodosGraficos();
});
obTema.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
