const axios = require('axios');
const readline = require('readline');
const dotenv = require('dotenv');

dotenv.config();

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000/api';
const api = axios.create({ baseURL: BASE_URL });

let tokenAcesso = null;
let usuarioLogado = null;

const interfaceTerminal = readline.createInterface({ 
  input: process.stdin, 
  output: process.stdout 
});

const perguntar = (texto) => 
  new Promise(resolver => interfaceTerminal.question(texto, resolver));

api.interceptors.request.use(config => {
  if (tokenAcesso) {
    config.headers.Authorization = `Bearer ${tokenAcesso}`;
  }
  return config;
});

const cores = {
  reset: '\x1b[0m',
  negrito: '\x1b[1m',
  cinza: '\x1b[2m',
  vermelho: '\x1b[31m',
  verde: '\x1b[32m',
  amarelo: '\x1b[33m',
  azul: '\x1b[34m',
  magenta: '\x1b[35m',
  ciano: '\x1b[36m',
  branco: '\x1b[37m',
};

const colorir = (texto, cor) => `${cor}${texto}${cores.reset}`;
const logSucesso = (msg) => console.log(colorir(`\n✅ ${msg}`, cores.verde));
const logErro = (erro) => {
  const msg = erro?.response?.data?.error || erro?.message || 'Erro desconhecido';
  console.log(colorir(`\n❌ ${msg}`, cores.vermelho));
};
const limparTela = () => console.clear();
const desenharDivisor = () => console.log(colorir('─'.repeat(70), cores.ciano));

const imprimirTitulo = (titulo, cor = cores.ciano) => {
  const borda = '═'.repeat(titulo.length + 4);
  console.log(colorir(`\n${borda}\n  ${titulo}  \n${borda}`, cor));
};

const imprimirOpcao = (numero, descricao) => 
  console.log(`  ${colorir(numero, cores.amarelo + cores.negrito)}  ${descricao}`);

const aguardarEnter = () => perguntar(colorir('\nPressione [Enter] para continuar...', cores.cinza));

async function validarEscolha(mensagem, opcoesValidas) {
  const digitado = await perguntar(mensagem);
  if (!opcoesValidas.includes(digitado)) {
    console.log(colorir(`\nOpção inválida. Escolha entre: ${opcoesValidas.join(', ')}`, cores.vermelho));
    await aguardarEnter();
    return '';
  }
  return digitado;
}

function exibirBanner() {
  console.log(`
  ${cores.magenta} ██████╗ ██╗██████╗ ██╗     ██╗ ██████╗     ██╗   ██╗███████╗██████╗ ███████╗ ██████╗ ${cores.reset}
  ${cores.magenta} ██╔══██╗██║██╔══██╗██║     ██║██╔═══██╗    ██║   ██║██╔════╝██╔══██╗██╔════╝██╔═══██╗${cores.reset}
  ${cores.ciano} ██████╔╝██║██████╔╝██║     ██║██║   ██║    ██║   ██║█████╗  ██████╔╝███████╗██║   ██║${cores.reset}
  ${cores.ciano} ██╔══██╗██║██╔══██╗██║     ██║██║   ██║    ╚██╗ ██╔╝██╔══╝  ██╔══██╗╚════██║██║   ██║${cores.reset}
  ${cores.azul} ██████╔╝██║██████╔╝███████╗██║╚██████╔╝     ╚████╔╝ ███████╗██║  ██║███████║╚██████╔╝${cores.reset}`);
}

async function exibirMiniDashboard() {
  try {
    const { data } = await api.get('/stats');
    console.log('');
    data.stats.forEach((item) => {
      const corValor = item.cor === 'red' ? cores.vermelho : item.cor === 'green' ? cores.verde : cores.amarelo;
      console.log(`  ${item.label.padEnd(28)} ${colorir(String(item.valor).padStart(5), corValor + cores.negrito)}`);
    });
  } catch { }
}

let filtroAtualAcervo = '/livros';

async function menuAcervo() {
  filtroAtualAcervo = '/livros';
  while (true) {
    limparTela();
    imprimirTitulo('ACERVO DE LIVROS', cores.magenta);

    try {
      const { data } = await api.get(filtroAtualAcervo);
      const lista = data.data || [];
      if (lista.length === 0) {
        console.log('\n  Nenhum livro encontrado no acervo ou para esta pesquisa.');
      } else {
        lista.forEach((livro) => {
          console.log(`  ${colorir(String(livro.id).padStart(3), cores.cinza)}  ${colorir(livro.titulo.padEnd(35), cores.branco + cores.negrito)}  ${colorir(livro.autor.padEnd(20), cores.ciano)}  disp:${colorir(String(livro.exemplares_disponiveis) + '/' + livro.exemplares, cores.amarelo)}`);
        });
      }
    } catch (erro) { logErro(erro); }

    desenharDivisor();

    imprimirOpcao('1', 'Pesquisar e Filtrar Catálogo');
    if (usuarioLogado.permissions?.is_admin) {
      imprimirOpcao('2', 'Adicionar Nova Obra');
      imprimirOpcao('3', 'Gerenciar Exemplares (Cópias)');
    }
    imprimirOpcao('0', 'Voltar');
    desenharDivisor();

    const permitidos = usuarioLogado.permissions?.is_admin ? ['1', '2', '3', '0'] : ['1', '0'];
    const opc = await validarEscolha(colorir('Opção: ', cores.amarelo + cores.negrito), permitidos);
    
    if (opc === '0' || opc === '') break;

    switch (opc) {
      case '1': await acaoDefinirFiltrosAcervo(); break;
      case '2': await acaoCadastrarLivro(); filtroAtualAcervo = '/livros'; break;
      case '3': await acaoVerExemplares(); break;
    }
  }
}

async function menuAcervoDigital() {
  while (true) {
    limparTela();
    imprimirTitulo('ACERVO DIGITAL (PDF HUB)', cores.magenta);

    try {
      const { data } = await api.get('/acervo-digital');
      const lista = data.data || data;

      if (lista.length === 0) {
        console.log('\n  Nenhum documento aprovado encontrado no momento.');
      } else {
        lista.forEach((d) => {
          console.log(`  ${colorir(String(d.id).padStart(3), cores.cinza)}  ${colorir(d.titulo.padEnd(35), cores.branco + cores.negrito)}  ${colorir(d.categoria.padEnd(15), cores.ciano)}  ${d.paginas}p | ${d.tamanho_arquivo}`);
        });
        console.log(colorir(`\n  Total: ${lista.length} documentos`, cores.cinza));
      }
    } catch (erro) { logErro(erro); }

    desenharDivisor();

    if (usuarioLogado.tipo === 'bibliotecario') {
      imprimirOpcao('1', 'Ver submissões PENDENTES (Curadoria)');
    } else {
      imprimirOpcao('1', 'Enviar (Upload) novo PDF para aprovação');
    }
    
    imprimirOpcao('0', 'Voltar');
    desenharDivisor();

    const permitidos = ['1', '0'];
    const opc = await validarEscolha(colorir('Opção: ', cores.amarelo + cores.negrito), permitidos);
    
    if (opc === '0') break;
    if (opc === '') continue;

    switch (opc) {
      case '1': 
        if (usuarioLogado.tipo === 'bibliotecario') await acaoCuradoriaDigital();
        else await acaoEnviarDigital();
        break;
    }
  }
}

async function acaoEnviarDigital() {
  limparTela();
  imprimirTitulo('UPLOAD DE CONTEÚDO DIGITAL', cores.verde);
  console.log(colorir('  Atenção: O arquivo será revisado pela equipe antes de ser publicado.\n', cores.cinza));
  
  const d = {
    titulo: await perguntar('Título da obra: '),
    autor: await perguntar('Autor: '),
    categoria: await perguntar('Categoria/Gênero: '),
    ano: parseInt(await perguntar('Ano: ')),
    paginas: parseInt(await perguntar('Número de páginas: ')),
    tamanho_arquivo: '1.2 MB', 
    url_arquivo: 'base64_simulado_via_cli'
  };

  try {
    const { data } = await api.post('/acervo-digital', d);
    logSucesso(data.message);
  } catch (erro) { logErro(erro); }
  await aguardarEnter();
}

async function acaoCuradoriaDigital() {
  limparTela();
  imprimirTitulo('CENTRO DE CURADORIA DIGITAL', cores.amarelo);
  try {
    const { data } = await api.get('/acervo-digital/pendentes');
    if (data.length === 0) {
      console.log('\nNão há documentos pendentes no momento.');
      await aguardarEnter();
      return;
    }

    data.forEach((d) => {
        console.log(`  [PENDENTE] #${d.id} - ${d.titulo} (${d.autor})`);
    });

    const id = await perguntar('\nID para processar (ou Enter para cancelar): ');
    if (!id) return;

    console.log('  1. Aprovar');
    console.log('  2. Rejeitar / Remover');
    const decisao = await perguntar(colorir('Opção: ', cores.amarelo + cores.negrito));

    if (decisao === '1') {
      await api.patch(`/acervo-digital/${id}/aprovar`);
      logSucesso('Documento aprovado e publicado!');
    } else if (decisao === '2') {
      await api.patch(`/acervo-digital/${id}/rejeitar`);
      logSucesso('Documento rejeitado e removido.');
    }
  } catch (erro) { logErro(erro); }
  await aguardarEnter();
}

async function acaoDefinirFiltrosAcervo() {
  console.log(colorir('\n--- Filtros Opcionais (Pressione Enter para pular) ---', cores.cinza));
  const filtroBusca = await perguntar('Pesquisa (título/autor): ');
  const filtroCategoria = await perguntar('Categoria (Ex: Ficção Científica): ');
  const filtroAno = await perguntar('Ano (Ex: 2024): ');
  const filtroStatus = await perguntar('Status (disponivel/alugado): ');
  const filtroCondicao = await perguntar('Condição (bom/danificado/perdido): ');
  
  const params = [];
  if (filtroBusca.trim()) params.push(`busca=${encodeURIComponent(filtroBusca.trim())}`);
  if (filtroCategoria.trim()) params.push(`categoria=${encodeURIComponent(filtroCategoria.trim())}`);
  if (filtroAno.trim()) params.push(`ano=${encodeURIComponent(filtroAno.trim())}`);
  if (filtroStatus.trim()) params.push(`status=${encodeURIComponent(filtroStatus.trim())}`);
  if (filtroCondicao.trim()) params.push(`condicao=${encodeURIComponent(filtroCondicao.trim())}`);
  
  filtroAtualAcervo = params.length > 0 ? `/livros?${params.join('&')}` : '/livros';
}

async function acaoCadastrarLivro() {
  limparTela();
  imprimirTitulo('ADICIONAR NOVA OBRA AO SISTEMA', cores.verde);
  const dados = {
    titulo: await perguntar('Título completo: '),
    autor: await perguntar('Nome do Autor: '),
    ano_lancamento: parseInt(await perguntar('Ano de publicação: ')),
    genero: await perguntar('Gênero literário: '),
    exemplares: parseInt(await perguntar('Quantidade de cópias iniciais [1]: ') || '1'),
  };
  try {
    const { data } = await api.post('/livros', dados);
    logSucesso(data.message);
  } catch (erro) { logErro(erro); }
  await aguardarEnter();
}

async function acaoEditarLivro() {
  limparTela();
  const id = await perguntar('ID do livro que deseja editar: ');
  const titulo = await perguntar('Novo título (Enter para manter): ');
  const corpoEdit = {};
  if (titulo) corpoEdit.titulo = titulo;
  try {
    const { data } = await api.put(`/livros/${id}`, corpoEdit);
    logSucesso(data.message);
  } catch (erro) { logErro(erro); }
  await aguardarEnter();
}

async function acaoVerExemplares() {
  const idLivro = await perguntar('Digite o ID do livro pai: ');
  try {
    const { data } = await api.get(`/livros/${idLivro}/exemplares`);
    data.exemplares.forEach((ex) => {
      console.log(`  ${colorir(String(ex.id).padStart(3), cores.cinza)}  ${colorir(ex.codigo ?? '---', cores.ciano)}  disp:${ex.disponibilidade}  cond:${ex.condicao}`);
    });
  } catch (erro) { logErro(erro); }
  await aguardarEnter();
}

async function acaoAlterarEstadoExemplar() {
  const livroId = await perguntar('ID do Livro: ');
  const exemplarId = await perguntar('ID do Exemplar: ');
  const novoEstado = await perguntar('Nova condição (bom/danificado/perdido): ');
  try {
    const { data } = await api.patch(`/livros/${livroId}/exemplares/${exemplarId}`, { condicao: novoEstado });
    logSucesso(data.message);
  } catch (erro) { logErro(erro); }
  await aguardarEnter();
}

async function menuEmprestimos() {
  while (true) {
    limparTela();
    imprimirTitulo('CONTROLE DE CIRCULAÇÃO', cores.azul);
    imprimirOpcao('1', 'Listar todos os empréstimos ativos');
    imprimirOpcao('2', 'Visualizar itens em atraso');
    imprimirOpcao('3', 'Histórico completo de devoluções');
    imprimirOpcao('4', 'Registrar nova saída (Empréstimo)');
    imprimirOpcao('5', 'Processar devolução de livro');
    imprimirOpcao('6', 'Gestão de Multas (Consulta/Pagamento)');
    imprimirOpcao('0', 'Voltar ao menu');
    desenharDivisor();

    const opc = await validarEscolha(colorir('Opção: ', cores.amarelo + cores.negrito), ['1', '2', '3', '4', '5', '6', '0']);
    if (opc === '' || opc === '0') break;

    switch (opc) {
      case '1': await acaoListarEmprestimosAtivos(); break;
      case '2': await acaoListarAtrasados(); break;
      case '3': await acaoVerHistoricoGlobal(); break;
      case '4': await acaoRegistrarEmprestimo(); break;
      case '5': await acaoProcessarDevolucao(); break;
      case '6': await acaoPainelMultas(); break;
    }
  }
}

async function acaoListarEmprestimosAtivos() {
  try {
    const { data } = await api.get('/alugueis/todos?limit=100&sort=id&order=desc');
    data.data.forEach((item) => {
      console.log(`  ${colorir(String(item.id).padStart(3), cores.cinza)}  ${item.usuario.padEnd(20)}  ${item.titulo.substring(0, 30)}  ${item.prazo.substring(0, 10)}  ${item.status}`);
    });
  } catch (erro) { logErro(erro); }
  await aguardarEnter();
}

async function acaoListarAtrasados() {
  try {
    const { data } = await api.get('/alugueis/todos?limit=100&sort=id&order=desc');
    const atrasados = data.data.filter((i) => i.status === 'atrasado');
    
    if (atrasados.length === 0) {
      console.log('\nNão há livros em atraso no momento.');
    } else {
      atrasados.forEach((item) => {
        console.log(`  ${colorir(String(item.id).padStart(3), cores.cinza)}  ${item.usuario.padEnd(20)}  ${item.titulo.substring(0, 30)}  ${colorir(item.multa_acumulada_formatada, cores.vermelho)}`);
      });
    }
  } catch (erro) { logErro(erro); }
  await aguardarEnter();
}

async function acaoVerHistoricoGlobal() {
  try {
    const { data } = await api.get('/alugueis/historico?sort=id&order=desc');
    data.data.forEach((reg) => {
      console.log(`  ${colorir(String(reg.id).padStart(3), cores.cinza)}  ${reg.usuario.padEnd(20)}  ${reg.titulo.substring(0, 30)}  devolvido:${reg.data_devolucao.substring(0,10)}`);
    });
  } catch (erro) { logErro(erro); }
  await aguardarEnter();
}

async function acaoRegistrarEmprestimo() {
  const livroId = await perguntar('ID do Livro: ');
  const usuarioId = await perguntar('ID do Usuário: ');
  try {
    const { data } = await api.post('/alugueis', { livro_id: livroId, usuario_id: usuarioId });
    logSucesso(data.message);
  } catch (erro) { logErro(erro); }
  await aguardarEnter();
}

async function acaoProcessarDevolucao() {
  const idEmprestimo = await perguntar('ID do Empréstimo: ');
  const statusFisico = await perguntar('Estado (bom/danificado/perdido): ') || 'bom';
  try {
    const { data } = await api.put(`/alugueis/${idEmprestimo}/devolver`, { estado_exemplar: statusFisico });
    logSucesso(data.message);
  } catch (erro) { logErro(erro); }
  await aguardarEnter();
}

async function acaoPainelMultas() {
  const idUser = await perguntar('ID do Usuário: ');
  try {
    const { data: extrato } = await api.get(`/alugueis/multas/${idUser}`);
    console.log(`\n  Total Pendente: R$ ${extrato.total_pendente.toFixed(2)}`);
    if (extrato.total_pendente > 0) {
      const resp = await perguntar('Pagar multas? (s/n): ');
      if (resp.toLowerCase() === 's') {
        const { data } = await api.put(`/alugueis/multas/${idUser}/pagar`);
        logSucesso(data.message);
      }
    }
  } catch (erro) { logErro(erro); }
  await aguardarEnter();
}

async function menuUsuarios() {
  while (true) {
    limparTela();
    imprimirTitulo('ADMINISTRAÇÃO DE USUÁRIOS', cores.ciano);
    imprimirOpcao('1', 'Listar todos');
    imprimirOpcao('0', 'Voltar');
    desenharDivisor();
    const opc = await validarEscolha(colorir('Opção: ', cores.amarelo + cores.negrito), ['1', '0']);
    if (opc === '0' || opc === '') break;
    if (opc === '1') {
      try {
        const { data } = await api.get('/usuarios');
        data.data.forEach((u) => {
          console.log(`  ${colorir(String(u.id).padStart(3), cores.cinza)}  ${u.nome.padEnd(25)}  ${u.tipo}`);
        });
      } catch (erro) { logErro(erro); }
      await aguardarEnter();
    }
  }
}

async function menuMeusDados() {
  while (true) {
    limparTela();
    imprimirTitulo('MINHA ÁREA', cores.azul);
    imprimirOpcao('1', 'Meus empréstimos ativos');
    imprimirOpcao('2', 'Minhas multas');
    imprimirOpcao('3', 'Pagar multas pendentes');
    imprimirOpcao('0', 'Voltar');
    desenharDivisor();
    const opc = await validarEscolha(colorir('Opção: ', cores.amarelo + cores.negrito), ['1', '2', '3', '0']);
    if (opc === '0' || opc === '') break;
    switch (opc) {
      case '1': await acaoListarMeusLivros(); break;
      case '2': await acaoConsultarMinhasMultas(); break;
      case '3': await acaoPagarPropriasMultas(); break;
    }
  }
}

async function acaoListarMeusLivros() {
  try {
    const { data } = await api.get('/alugueis/meus');
    data.forEach((item) => {
      console.log(`  ${item.titulo} - Prazo: ${item.prazo.substring(0,10)}`);
    });
  } catch (erro) { logErro(erro); }
  await aguardarEnter();
}

async function acaoConsultarMinhasMultas() {
  try {
    const { data } = await api.get('/alugueis/multas/minhas');
    console.log(`\n  Total Pendente: R$ ${data.total_pendente.toFixed(2)}`);
  } catch (erro) { logErro(erro); }
  await aguardarEnter();
}

async function acaoPagarPropriasMultas() {
  try {
    const { data } = await api.put('/alugueis/multas/pagar/mim');
    logSucesso(data.message);
  } catch (erro) { logErro(erro); }
  await aguardarEnter();
}

async function menuPrincipal() {
  while (true) {
    limparTela();
    exibirBanner();
    console.log(`\n  Sessão Ativa: ${usuarioLogado.nome.toUpperCase()} [${usuarioLogado.tipo}]`);
    await exibirMiniDashboard();
    desenharDivisor();

    if (usuarioLogado.permissions?.is_admin) {
      imprimirOpcao('1', 'Acervo Físico');
      imprimirOpcao('2', 'Acervo Digital');
      imprimirOpcao('3', 'Empréstimos');
      imprimirOpcao('4', 'Usuários');
      imprimirOpcao('5', 'Estatísticas');
      imprimirOpcao('6', 'Alertas');
      imprimirOpcao('7', 'Meu Perfil');
      imprimirOpcao('0', 'Logout');
      const opc = await validarEscolha(colorir('Opção: ', cores.amarelo + cores.negrito), ['1', '2', '3', '4', '5', '6', '7', '0']);
      if (opc === '0' || opc === '') break;
      switch (opc) {
        case '1': await menuAcervo(); break;
        case '2': await menuAcervoDigital(); break;
        case '3': await menuEmprestimos(); break;
        case '4': await menuUsuarios(); break;
        case '5': await acaoVerEstatisticas(); break;
        case '6': await acaoCentroAlertas(); break;
        case '7': await acaoMeuPerfil(); break;
      }
    } else {
      imprimirOpcao('1', 'Acervo Físico');
      imprimirOpcao('2', 'Acervo Digital');
      imprimirOpcao('3', 'Meus Livros');
      imprimirOpcao('4', 'Alertas');
      imprimirOpcao('5', 'Meu Perfil');
      imprimirOpcao('0', 'Logout');
      const opc = await validarEscolha(colorir('Opção: ', cores.amarelo + cores.negrito), ['1', '2', '3', '4', '5', '0']);
      if (opc === '0' || opc === '') break;
      switch (opc) {
        case '1': await menuAcervo(); break;
        case '2': await menuAcervoDigital(); break;
        case '3': await menuMeusDados(); break;
        case '4': await acaoCentroAlertas(); break;
        case '5': await acaoMeuPerfil(); break;
      }
    }
  }
  tokenAcesso = null;
  usuarioLogado = null;
  return telaInicial();
}

async function acaoMeuPerfil() {
  limparTela();
  imprimirTitulo('MEU PERFIL', cores.azul);
  console.log(`  ${colorir('Nome: ', cores.cinza)} ${usuarioLogado.nome}`);
  console.log(`  ${colorir('E-mail:', cores.cinza)} ${usuarioLogado.email}`);
  console.log(`  ${colorir('Tipo:  ', cores.cinza)} ${usuarioLogado.tipo}`);
  await aguardarEnter();
}

async function acaoVerEstatisticas() {
  limparTela();
  imprimirTitulo('ESTATÍSTICAS DO SISTEMA', cores.magenta);
  await exibirMiniDashboard();
  await aguardarEnter();
}

async function acaoCentroAlertas() {
  limparTela();
  imprimirTitulo('CENTRO DE ALERTAS', cores.amarelo);
  try {
    const lista = [];
    if (usuarioLogado.tipo === 'bibliotecario') {
      const { data: res } = await api.get('/alugueis/todos?limit=1');
      if (res.total_atrasados > 0) lista.push(`Existem ${res.total_atrasados} empréstimos em atraso.`);
      const { data: pen } = await api.get('/acervo-digital/pendentes');
      if (pen.length > 0) lista.push(`Existem ${pen.length} arquivos digitais pendentes.`);
    } else {
      const { data: mul } = await api.get('/alugueis/multas/minhas');
      if (mul.total_pendente > 0) lista.push(`Você possui ${mul.total_pendente_formatado} em multas.`);
    }
    if (lista.length === 0) console.log('\n  Tudo em ordem.');
    else lista.forEach(l => console.log(`  [!] ${l}`));
  } catch (erro) { logErro(erro); }
  await aguardarEnter();
}

async function telaInicial() {
  limparTela();
  exibirBanner();
  imprimirOpcao('1', 'Login');
  imprimirOpcao('2', 'Novo Cadastro');
  imprimirOpcao('0', 'Sair');
  const v = await validarEscolha(colorir('\nOpção: ', cores.amarelo + cores.negrito), ['1', '2', '0']);
  if (v === '0') process.exit(0);
  if (v === '') return telaInicial();

  const email = await perguntar('E-mail: ');
  const senha = await perguntar('Senha: ');

  try {
    if (v === '2') {
      const nome = await perguntar('Nome: ');
      await api.post('/auth/registrar', { nome, email, senha, tipo: 'usuario' });
      logSucesso('Conta criada!');
      await aguardarEnter();
      return telaInicial();
    } else {
      const { data } = await api.post('/auth/login', { email, senha });
      tokenAcesso = data.token;
      usuarioLogado = data.usuario;
      await menuPrincipal();
    }
  } catch (erro) {
    logErro(erro);
    await aguardarEnter();
    telaInicial();
  }
}

telaInicial();
