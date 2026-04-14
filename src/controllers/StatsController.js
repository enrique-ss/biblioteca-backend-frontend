const supabase = require('../database');

class StatsController {
  agruparTop = (items, getKey, limit = 6) => {
    const mapa = new Map();

    for (const item of items) {
      const chave = getKey(item);
      if (!chave) continue;
      mapa.set(chave, (mapa.get(chave) || 0) + 1);
    }

    return [...mapa.entries()]
      .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0]), 'pt-BR'))
      .slice(0, limit)
      .map(([label, valor]) => ({ label, valor }));
  };

  agruparPorMes = (items, getDate, limit = 6) => {
    const mapa = new Map();

    for (const item of items) {
      const data = new Date(getDate(item));
      if (Number.isNaN(data.getTime())) continue;

      const chave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
      mapa.set(chave, (mapa.get(chave) || 0) + 1);
    }

    return [...mapa.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-limit)
      .map(([chave, valor]) => {
        const [ano, mes] = chave.split('-');
        const data = new Date(Number(ano), Number(mes) - 1, 1);
        return {
          label: data.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
          valor
        };
      });
  };

  agruparPorDecada = (livros) => {
    const mapa = new Map();

    for (const livro of livros) {
      const ano = Number(livro.ano_lancamento);
      if (!Number.isFinite(ano)) continue;
      const chave = `${Math.floor(ano / 10) * 10}s`;
      mapa.set(chave, (mapa.get(chave) || 0) + 1);
    }

    return [...mapa.entries()]
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([label, valor]) => ({ label, valor }));
  };

  resumo = async (req, res) => {
    try {
      const ehBibliotecario = req.usuario.tipo === 'bibliotecario';
      const usuarioId = req.usuario.id;

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      if (ehBibliotecario) {
        const [{ data: livrosFisicos = [], count: totalLivros }, { count: ativos }, { count: totalUsuarios }, { count: totalDigitais }] = await Promise.all([
          supabase.from('livros').select('*', { count: 'exact', head: true }).is('deleted_at', null),
          supabase.from('alugueis').select('*', { count: 'exact', head: true }).eq('status', 'ativo'),
          supabase.from('usuarios').select('*', { count: 'exact', head: true }).is('deleted_at', null),
          supabase.from('acervo_digital').select('*', { count: 'exact', head: true }).eq('status', 'aprovado').is('deleted_at', null)
        ]);

        const totalExemplares = (livrosFisicos || []).reduce((total, item) => total + Number(item.exemplares || 0), 0);

        const { count: atrasados } = await supabase
          .from('alugueis')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'ativo')
          .lt('data_prevista_devolucao', hoje.toISOString());

        return res.json({
          perfil: 'bibliotecario',
          stats: [
            { label: 'Acervo Fisico', valor: totalLivros || 0, cor: 'gold' },
            { label: 'Acervo Digital', valor: totalDigitais || 0, cor: 'gold' },
            { label: 'Emprestimos Ativos', valor: ativos || 0, cor: 'gold' },
            { label: 'Usuarios Cadastrados', valor: totalUsuarios || 0, cor: '' },
            { label: 'Livros em Atraso', valor: atrasados || 0, cor: 'red' },
            { label: 'Exemplares Totais', valor: totalExemplares, cor: 'green' }
          ]
        });
      }

      const [{ count: ativos }, { count: totalHistorico }] = await Promise.all([
        supabase.from('alugueis').select('*', { count: 'exact', head: true }).eq('usuario_id', usuarioId).eq('status', 'ativo'),
        supabase.from('alugueis').select('*', { count: 'exact', head: true }).eq('usuario_id', usuarioId)
      ]);

      const { count: atrasados } = await supabase
        .from('alugueis')
        .select('*', { count: 'exact', head: true })
        .eq('usuario_id', usuarioId)
        .eq('status', 'ativo')
        .lt('data_prevista_devolucao', hoje.toISOString());

      return res.json({
        perfil: 'usuario',
        stats: [
          { label: 'Livros com Voce', valor: ativos || 0, cor: 'gold' },
          { label: 'Itens em Atraso', valor: atrasados || 0, cor: 'red' },
          { label: 'Total ja Alugado', valor: totalHistorico || 0, cor: '' }
        ]
      });
    } catch (erro) {
      console.error('Erro ao processar resumo estatistico:', erro);
      return res.status(500).json({ error: 'Falha ao carregar indicadores do dashboard.' });
    }
  };

  detalhado = async (req, res) => {
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const [
        { data: livros = [] },
        { data: alugueis = [] },
        { data: usuarios = [] },
        { data: digitais = [] },
        { data: multas = [] }
      ] = await Promise.all([
        supabase.from('livros').select('*').is('deleted_at', null),
        supabase.from('alugueis').select('*, livros(*), usuarios(*)'),
        supabase.from('usuarios').select('*').is('deleted_at', null),
        supabase.from('acervo_digital').select('*').is('deleted_at', null),
        supabase.from('multas').select('*')
      ]);

      const leitores = usuarios.filter((item) => item.tipo === 'usuario');
      const emprestimosAtivos = alugueis.filter((item) => item.status === 'ativo');
      const emprestimosDevolvidos = alugueis.filter((item) => item.status === 'devolvido');
      const atrasados = emprestimosAtivos.filter((item) => new Date(item.data_prevista_devolucao) < hoje);
      const pdfsAprovados = digitais.filter((item) => item.status === 'aprovado');
      const multasPendentes = multas.filter((item) => item.status === 'pendente');

      const totalDiasDevolucao = emprestimosDevolvidos.reduce((total, item) => {
        const inicio = new Date(item.data_aluguel);
        const fim = new Date(item.data_devolucao);
        if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) return total;
        return total + Math.max(0, Math.round((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)));
      }, 0);

      const mediaDevolucao = emprestimosDevolvidos.length
        ? (totalDiasDevolucao / emprestimosDevolvidos.length).toFixed(1)
        : '0.0';

      return res.json({
        generosMaisEmprestados: this.agruparTop(alugueis, (item) => item.livros?.genero),
        autoresMaisEmprestados: this.agruparTop(alugueis, (item) => item.livros?.autor),
        livrosMaisEmprestados: this.agruparTop(alugueis, (item) => item.livros?.titulo),
        usuariosMaisAtivos: this.agruparTop(alugueis, (item) => item.usuarios?.nome),
        emprestimosPorMes: this.agruparPorMes(alugueis, (item) => item.data_aluguel),
        cadastrosPorMes: this.agruparPorMes(leitores, (item) => item.created_at),
        distribuicaoStatus: [
          { label: 'disponivel', valor: livros.filter((item) => Number(item.exemplares_disponiveis || 0) > 0).length },
          { label: 'alugado', valor: livros.filter((item) => Number(item.exemplares_disponiveis || 0) <= 0).length }
        ],
        distribuicaoUsuarios: [
          { label: 'Leitores', valor: usuarios.filter((item) => item.tipo === 'usuario').length },
          { label: 'Bibliotecarios', valor: usuarios.filter((item) => item.tipo === 'bibliotecario').length }
        ],
        tempoMedioDevolucao: {
          label: 'Tempo medio de devolucao',
          valor: `${mediaDevolucao} dias`
        },
        kpis: [
          { label: 'Acervo Fisico', valor: livros.length },
          { label: 'Acervo Digital', valor: pdfsAprovados.length },
          { label: 'Emprestimos Ativos', valor: emprestimosAtivos.length },
          { label: 'Usuarios Cadastrados', valor: usuarios.length },
          { label: 'Livros em Atraso', valor: atrasados.length },
          { label: 'Exemplares Totais', valor: livros.reduce((total, item) => total + Number(item.exemplares || 0), 0) }
        ],
        extras: {
          multasPendentes: multasPendentes.length,
          mediaDevolucao
        }
      });
    } catch (erro) {
      console.error('Erro ao gerar relatorio detalhado:', erro);
      return res.status(500).json({ error: 'Erro ao processar estatisticas avancadas.' });
    }
  };
}

module.exports = new StatsController();
