// ── ESTATÍSTICAS ──────────────────────────────────────────────────────────────

let chartInstances = {};
let statsRawData   = null;

const CHART_COLORS  = ['rgba(122,162,247,.85)','rgba(63,185,80,.85)','rgba(210,153,34,.85)','rgba(248,81,73,.85)','rgba(158,112,247,.85)','rgba(87,199,199,.85)','rgba(247,162,122,.85)','rgba(122,247,162,.85)'];
const CHART_BORDERS = CHART_COLORS.map(c => c.replace('.85','1'));

function statsTextColor() { return getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#e6edf3'; }
function statsDimColor()  { return getComputedStyle(document.documentElement).getPropertyValue('--text-dim').trim() || '#adbac7'; }

function chartDefaults(isHorizontal = false) {
    const base = {
        responsive: true, maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: { backgroundColor:'rgba(22,27,34,.96)', titleColor:'#7aa2f7', bodyColor:'#e6edf3', borderColor:'rgba(122,162,247,.18)', borderWidth:1, padding:10, cornerRadius:6 }
        },
        scales: {
            x: { ticks:{ color:statsDimColor(), font:{size:10} }, grid:{ color:'rgba(122,162,247,.05)' } },
            y: { ticks:{ color:statsDimColor(), font:{size:10} }, grid:{ color:'rgba(122,162,247,.05)' }, beginAtZero:true }
        }
    };
    if (isHorizontal) { base.indexAxis = 'y'; base.scales.x.ticks.maxTicksLimit = 5; delete base.scales.y.beginAtZero; }
    return base;
}

function buildChartWithList(id, type, labels, values, unit = '') {
    const ctx = document.getElementById('chart-' + id);
    if (!ctx) return;
    if (chartInstances[id]) { chartInstances[id].destroy(); delete chartInstances[id]; }

    const isPie        = type === 'doughnut';
    const isHorizontal = type === 'bar-h';
    const chartType    = isHorizontal ? 'bar' : type;
    const cfg          = chartDefaults(isHorizontal);
    if (isPie) { delete cfg.scales; }

    chartInstances[id] = new Chart(ctx, {
        type: chartType,
        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: isPie ? CHART_COLORS.slice(0, labels.length) : CHART_COLORS[0],
                borderColor:     isPie ? CHART_BORDERS.slice(0, labels.length) : CHART_BORDERS[0],
                borderWidth: 1.5, tension: .35,
                fill: type === 'line' ? 'origin' : false,
                borderRadius: chartType === 'bar' ? 3 : 0,
                pointRadius: type === 'line' ? 3 : 0,
                pointHoverRadius: type === 'line' ? 5 : 0,
            }]
        },
        options: cfg
    });

    const listEl = document.getElementById('list-' + id);
    if (!listEl) return;
    const max = Math.max(...values) || 1;
    listEl.innerHTML = labels.map((lbl, i) => {
        const pct   = Math.round((values[i] / max) * 100);
        const color = CHART_COLORS[i % CHART_COLORS.length];
        return `<div class="stats-list-item">
            <div class="stats-list-dot" style="background:${color}"></div>
            <div class="stats-list-label" title="${esc(lbl)}">${esc(lbl)}</div>
            <div class="stats-list-bar-wrap"><div class="stats-list-bar" style="width:${pct}%;background:${color}"></div></div>
            <div class="stats-list-val">${esc(String(values[i]))}${unit ? ' '+unit : ''}</div>
        </div>`;
    }).join('');
}

function renderAllCharts() {
    if (!statsRawData) return;
    const d   = statsRawData;
    const fmt = arr => ({ labels: arr.map(r => r.label), values: arr.map(r => Number(r.valor)) });

    buildChartWithList('generos',  'bar-h',    ...Object.values(fmt(d.generosMaisEmprestados)));
    buildChartWithList('autores',  'bar-h',    ...Object.values(fmt(d.autoresMaisEmprestados)));
    buildChartWithList('livros',   'bar-h',    ...Object.values(fmt(d.livrosMaisEmprestados)));
    buildChartWithList('usuarios', 'bar-h',    ...Object.values(fmt(d.usuariosMaisAtivos)));
    buildChartWithList('meses',    'line',     ...Object.values(fmt(d.emprestimosPorMes)));
    buildChartWithList('cadastros','line',     ...Object.values(fmt(d.cadastrosPorMes)));
    buildChartWithList('decadas',  'bar',      ...Object.values(fmt(d.livrosPorAno)));
    buildChartWithList('acervo',   'doughnut',
        d.distribuicaoStatus.map(r => r.label === 'disponivel' ? 'Disponível' : 'Alugado'),
        d.distribuicaoStatus.map(r => Number(r.valor)),
        'ex.'
    );
}

function renderKpis(d) {
    const t   = d.taxaAtraso || {};
    const dev = d.tempoMedioDevolucao || {};
    const total  = Number(t.total) || 1;
    const taxaPct = Math.round(((Number(t.atrasados) + Number(t.devolvidos_atrasados)) / total) * 100);
    const kpis = [
        { label:'Total de Empréstimos',   val: t.total ?? 0,                    cls:'blue'  },
        { label:'Devolvidos no Prazo',     val: t.devolvidos_prazo ?? 0,         cls:'green' },
        { label:'Devolvidos com Atraso',   val: t.devolvidos_atrasados ?? 0,     cls:'amber' },
        { label:'Ativos em Atraso',        val: t.atrasados ?? 0,               cls:'red'   },
        { label:'Taxa de Atraso',          val: taxaPct+'%',                     cls: taxaPct > 20 ? 'red' : 'green' },
        { label:'Média de Devolução',      val: (dev.media_dias??'—')+(dev.media_dias?' d':''), cls:'blue'  },
        { label:'Mais Rápido',            val: (dev.min_dias??'—')+(dev.min_dias?' d':''),     cls:'green' },
        { label:'Mais Lento',             val: (dev.max_dias??'—')+(dev.max_dias?' d':''),     cls:'amber' },
    ];
    document.getElementById('statsKpiGrid').innerHTML = kpis.map(k => `
        <div class="stats-kpi-card">
            <div class="stats-kpi-label">${esc(k.label)}</div>
            <div class="stats-kpi-val ${k.cls}">${esc(String(k.val))}</div>
        </div>`).join('');
}

async function loadStatsDetalhado() {
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
        const data = await api('/stats/detalhado');
        statsRawData = data;
        renderKpis(data);
        document.getElementById('statsLoading').style.display = 'none';
        document.getElementById('statsContent').style.display = 'block';
        renderAllCharts();
    } catch (err) {
        document.getElementById('statsLoading').textContent = 'Erro ao carregar estatísticas.';
        showAlert(err.message, 'danger');
    }
}

function exportStatsCSV() {
    if (!statsRawData) { showAlert('Carregue as estatísticas primeiro.', 'warning'); return; }
    const d   = statsRawData;
    const t   = d.taxaAtraso || {};
    const dev = d.tempoMedioDevolucao || {};
    const total   = Number(t.total) || 1;
    const taxaPct = Math.round(((Number(t.atrasados) + Number(t.devolvidos_atrasados)) / total) * 100);
    const q   = v  => `"${String(v??'').replace(/"/g,'""')}"`;
    const row = cols => cols.map(q).join(',');
    const sec = (title, header, rows) => `${title}\n${header}\n${rows.join('\n')}\n`;

    const csv = [
        sec('KPIs', row(['Métrica','Valor']), [
            row(['Total de Empréstimos',         t.total??0]),
            row(['Devolvidos no Prazo',           t.devolvidos_prazo??0]),
            row(['Devolvidos com Atraso',         t.devolvidos_atrasados??0]),
            row(['Ativos em Atraso',              t.atrasados??0]),
            row(['Taxa de Atraso (%)',            taxaPct]),
            row(['Média de Devolução (dias)',      dev.media_dias??'—']),
            row(['Devolução Mais Rápida (dias)',   dev.min_dias??'—']),
            row(['Devolução Mais Lenta (dias)',    dev.max_dias??'—']),
        ]),
        sec('Gêneros Mais Emprestados',  row(['Gênero','Empréstimos']),   d.generosMaisEmprestados.map(r=>row([r.label,r.valor]))),
        sec('Autores Mais Emprestados',  row(['Autor','Empréstimos']),    d.autoresMaisEmprestados.map(r=>row([r.label,r.valor]))),
        sec('Livros Mais Emprestados',   row(['Livro','Empréstimos']),    d.livrosMaisEmprestados.map(r=>row([r.label,r.valor]))),
        sec('Usuários Mais Ativos',      row(['Usuário','Empréstimos']),  d.usuariosMaisAtivos.map(r=>row([r.label,r.valor]))),
        sec('Empréstimos por Mês',       row(['Mês','Empréstimos']),      d.emprestimosPorMes.map(r=>row([r.label,r.valor]))),
        sec('Cadastros por Mês',         row(['Mês','Usuários']),         d.cadastrosPorMes.map(r=>row([r.label,r.valor]))),
        sec('Acervo por Década',         row(['Década','Livros']),        d.livrosPorAno.map(r=>row([r.label,r.valor]))),
        sec('Status do Acervo',          row(['Status','Exemplares']),    d.distribuicaoStatus.map(r=>row([r.label,r.valor]))),
    ].join('\n');

    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\uFEFF'+csv], { type:'text/csv;charset=utf-8;' }));
    a.download = `luizateca_stats_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    showAlert('CSV exportado!');
}
