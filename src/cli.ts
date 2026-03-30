import axios from 'axios';
import * as readline from 'readline';
import dotenv from 'dotenv';

// Carrega as variáveis de ambiente do arquivo .env
dotenv.config();

// Configuração base da API (Comunica com o servidor Express)
const api = axios.create({ baseURL: 'http://127.0.0.1:3000/api' });

let tokenAcesso: string | null = null;
let usuarioLogado: any = null;

// Interface para entrada e saída de texto no terminal
const interfaceTerminal = readline.createInterface({ 
  input: process.stdin, 
  output: process.stdout 
});

/**
 * Função utilitária para fazer perguntas ao usuário no terminal.
 */
const perguntar = (texto: string): Promise<string> => 
  new Promise(resolver => interfaceTerminal.question(texto, resolver));

// Interceptor: Adiciona automaticamente o Token JWT em todas as requisições para a API
api.interceptors.request.use(config => {
  if (tokenAcesso) {
    config.headers.Authorization = `Bearer ${tokenAcesso}`;
  }
  return config;
});

// Cores e Estilos para o Terminal (ANSI Escape Codes)
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

/**
 * Funções Auxiliares de Formatação Visual
 */
const colorir = (texto: string, cor: string) => `${cor}${texto}${cores.reset}`;
const logSucesso = (msg: string) => console.log(colorir(`\n✅ ${msg}`, cores.verde));
const logErro = (erro: any) => {
  const msg = erro?.response?.data?.error || erro?.message || 'Erro desconhecido';
  console.log(colorir(`\n❌ ${msg}`, cores.vermelho));
};
const limparTela = () => console.clear();
const desenharDivisor = () => console.log(colorir('─'.repeat(70), cores.ciano));

const imprimirTitulo = (titulo: string, cor = cores.ciano) => {
  const borda = '═'.repeat(titulo.length + 4);
  console.log(colorir(`\n${borda}\n  ${titulo}  \n${borda}`, cor));
};

const imprimirOpcao = (numero: string, descricao: string) => 
  console.log(`  ${colorir(numero, cores.amarelo + cores.negrito)}  ${descricao}`);

const aguardarEnter = () => perguntar(colorir('\nPressione [Enter] para continuar...', cores.cinza));

/**
 * Valida se a opção digitada está na lista de opções permitidas.
 */
async function validarEscolha(mensagem: string, opcoesValidas: string[]): Promise<string> {
  const digitado = await perguntar(mensagem);
  if (!opcoesValidas.includes(digitado)) {
    console.log(colorir(`\nOpção inválida. Escolha entre: ${opcoesValidas.join(', ')}`, cores.vermelho));
    await aguardarEnter();
    return '';
  }
  return digitado;
}

/**
 * Exibe o Banner artístico do sistema.
 */
function exibirBanner() {
  console.log(`
  ${cores.magenta}██╗     ██╗   ██╗██╗███████╗ █████╗ ████████╗███████╗ ██████╗ █████╗ ${cores.reset}
  ${cores.magenta}██║     ██║   ██║██║╚══███╔╝██╔══██╗╚══██╔══╝██╔════╝██╔════╝██╔══██╗${cores.reset}
  ${cores.ciano}██║     ██║   ██║██║  ███╔╝ ███████║   ██║   █████╗  ██║     ███████║${cores.reset}
  ${cores.ciano}██║     ██║   ██║██║ ███╔╝  ██╔══██║   ██║   ██╔══╝  ██║     ██╔══██║${cores.reset}
  ${cores.azul}███████╗╚██████╔╝██║███████╗██║  ██║   ██║   ███████╗╚██████╗██║  ██║${cores.reset}
  ${cores.azul}╚══════╝ ╚═════╝ ╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝ ╚═════╝╚═╝  ╚═╝${cores.reset}`);
  console.log(colorir('           Controle de Acervo e Gamificação v2.0 - Backend Shell', cores.cinza));
}

async function exibirMiniDashboard() {
  try {
    const { data } = await api.get('/stats');
    console.log('');
    data.stats.forEach((item: any) => {
      const corValor = item.cor === 'red' ? cores.vermelho : item.cor === 'green' ? cores.verde : cores.amarelo;
      console.log(`  ${item.label.padEnd(28)} ${colorir(String(item.valor).padStart(5), corValor + cores.negrito)}`);
    });
  } catch { }
}

// ==============================================================================
// GESTÃO DE ACERVO (HÍBRIDO: FÍSICO E DIGITAL)
// ==============================================================================

async function menuAcervo() {
  while (true) {
    limparTela();
    imprimirTitulo('ACERVO DE LIVROS', cores.magenta);

    if (usuarioLogado.tipo === 'bibliotecario') {
      imprimirOpcao('1', 'Consultar catálogo (Físico)');
      imprimirOpcao('2', 'Cadastrar nova obra');
      imprimirOpcao('3', 'Editar informações de livro');
      imprimirOpcao('4', 'Remover do acervo (Soft Delete)');
      imprimirOpcao('5', 'Gerenciar cópias físicas (Exemplares)');
      imprimirOpcao('6', 'Vistoria: Alterar estado de conservação');
      imprimirOpcao('7', 'Acervo Digital (PDFs/Curadoria)');
    } else {
      imprimirOpcao('1', 'Pesquisar livros físicos');
      imprimirOpcao('7', 'Explorar Acervo Digital');
    }
    
    imprimirOpcao('0', 'Voltar ao menu inicial');
    desenharDivisor();

    const permitidos = usuarioLogado.tipo === 'bibliotecario' ? ['1', '2', '3', '4', '5', '6', '7', '0'] : ['1', '7', '0'];
    const opc = await validarEscolha(colorir('Selecione uma ação: ', cores.amarelo + cores.negrito), permitidos);
    
    if (opc === '0' || opc === '') break;

    switch (opc) {
      case '1': await acaoConsultarAcervo(); break;
      case '2': await acaoCadastrarLivro(); break;
      case '3': await acaoEditarLivro(); break;
      case '4': await acaoRemoverLivro(); break;
      case '5': await acaoVerExemplares(); break;
      case '6': await acaoAlterarEstadoExemplar(); break;
      case '7': await menuAcervoDigital(); break;
    }
  }
}

async function menuAcervoDigital() {
  while (true) {
    limparTela();
    imprimirTitulo('ACERVO DIGITAL (PDF HUB)', cores.magenta);

    if (usuarioLogado.tipo === 'bibliotecario') {
      imprimirOpcao('1', 'Consultar acervo digital aprovado');
      imprimirOpcao('2', 'Ver submissões PENDENTES (Curadoria)');
      imprimirOpcao('3', 'Remover arquivo digital');
    } else {
      imprimirOpcao('1', 'Explorar biblioteca digital');
      imprimirOpcao('2', 'Enviar (Upload) novo PDF para aprovação');
    }
    
    imprimirOpcao('0', 'Voltar');
    desenharDivisor();

    const permitidos = usuarioLogado.tipo === 'bibliotecario' ? ['1', '2', '3', '0'] : ['1', '2', '0'];
    const opc = await validarEscolha(colorir('Ação Digital: ', cores.amarelo + cores.negrito), permitidos);
    
    if (opc === '0') break;
    if (opc === '') continue;

    switch (opc) {
      case '1': await acaoListarDigital(false); break;
      case '2': 
        if (usuarioLogado.tipo === 'bibliotecario') await acaoCuradoriaDigital();
        else await acaoEnviarDigital();
        break;
      case '3': await acaoRemoverDigital(); break;
    }
  }
}

async function acaoListarDigital(pendentes = false) {
  limparTela();
  imprimirTitulo(pendentes ? 'PENDÊNCIAS DE APROVAÇÃO' : 'BIBLIOTECA DIGITAL', cores.magenta);
  try {
    const url = pendentes ? '/acervo-digital/pendentes' : '/acervo-digital';
    const { data } = await api.get(url);
    const lista = data.data || data;

    if (lista.length === 0) {
      console.log('\nNenhum documento encontrado.');
    } else {
      lista.forEach((d: any) => {
        console.log(`  ${colorir(String(d.id).padStart(3), cores.cinza)}  ${colorir(d.titulo.padEnd(35), cores.branco + cores.negrito)}  ${colorir(d.categoria.padEnd(15), cores.ciano)}  ${d.paginas}p | ${d.tamanho_arquivo}`);
      });
      console.log(colorir(`\n  Total: ${lista.length} documentos`, cores.cinza));
    }
  } catch (erro: any) { logErro(erro); }
  await aguardarEnter();
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
  } catch (erro: any) { logErro(erro); }
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

    data.forEach((d: any) => {
        console.log(`  [PENDENTE] #${d.id} - ${d.titulo} (${d.autor})`);
    });

    const id = await perguntar('\nID para processar (ou Enter para cancelar): ');
    if (!id) return;

    console.log('  1. Aprovar');
    console.log('  2. Rejeitar / Remover');
    const decisao = await perguntar('Ação: ');

    if (decisao === '1') {
      await api.patch(`/acervo-digital/${id}/aprovar`);
      logSucesso('Documento aprovado e publicado!');
    } else if (decisao === '2') {
      await api.patch(`/acervo-digital/${id}/rejeitar`);
      logSucesso('Documento rejeitado e removido.');
    }
  } catch (erro: any) { logErro(erro); }
  await aguardarEnter();
}

async function acaoRemoverDigital() {
  const id = await perguntar('ID do documento digital para remover: ');
  try {
    await api.delete(`/acervo-digital/${id}`);
    logSucesso('Documento removido do servidor.');
  } catch (erro: any) { logErro(erro); }
  await aguardarEnter();
}

async function acaoConsultarAcervo() {
  limparTela();
  imprimirTitulo('CONSULTA AO ACERVO', cores.magenta);
  const filtro = await perguntar('Digite termo de busca (Enter para todos): ');
  try {
    const url = filtro.trim() ? `/livros?busca=${encodeURIComponent(filtro.trim())}` : '/livros';
    const { data } = await api.get(url);
    const lista = data.data || [];
    if (lista.length === 0) {
      console.log('\nNenhum livro corresponde à sua pesquisa.');
    } else {
      lista.forEach((livro: any) => {
        console.log(`  ${colorir(String(livro.id).padStart(3), cores.cinza)}  ${colorir(livro.titulo.padEnd(35), cores.branco + cores.negrito)}  ${colorir(livro.autor.padEnd(20), cores.ciano)}  disp:${colorir(String(livro.exemplares_disponiveis) + '/' + livro.exemplares, cores.amarelo)}`);
      });
    }
  } catch (erro: any) { logErro(erro); }
  await aguardarEnter();
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
  } catch (erro: any) { logErro(erro); }
  await aguardarEnter();
}

async function acaoEditarLivro() {
  limparTela();
  const id = await perguntar('ID do livro que deseja editar: ');
  const titulo = await perguntar('Novo título (Enter para manter): ');
  const corpoEdit: any = {};
  if (titulo) corpoEdit.titulo = titulo;
  try {
    const { data } = await api.put(`/livros/${id}`, corpoEdit);
    logSucesso(data.message);
  } catch (erro: any) { logErro(erro); }
  await aguardarEnter();
}

async function acaoRemoverLivro() {
  const id = await perguntar('ID do livro para exclusão: ');
  try {
    const { data } = await api.delete(`/livros/${id}`);
    logSucesso(data.message);
  } catch (erro: any) { logErro(erro); }
  await aguardarEnter();
}

async function acaoVerExemplares() {
  const idLivro = await perguntar('Digite o ID do livro pai: ');
  try {
    const { data } = await api.get(`/livros/${idLivro}/exemplares`);
    data.exemplares.forEach((ex: any) => {
      console.log(`  ${colorir(String(ex.id).padStart(3), cores.cinza)}  ${colorir(ex.codigo ?? '---', cores.ciano)}  disp:${ex.disponibilidade}  cond:${ex.condicao}`);
    });
  } catch (erro: any) { logErro(erro); }
  await aguardarEnter();
}

async function acaoAlterarEstadoExemplar() {
  const livroId = await perguntar('ID do Livro: ');
  const exemplarId = await perguntar('ID do Exemplar: ');
  const novoEstado = await perguntar('Nova condição (bom/danificado/perdido): ');
  try {
    const { data } = await api.patch(`/livros/${livroId}/exemplares/${exemplarId}`, { condicao: novoEstado });
    logSucesso(data.message);
  } catch (erro: any) { logErro(erro); }
  await aguardarEnter();
}

// ==============================================================================
// GESTÃO DE EMPRÉSTIMOS E MULTAS
// ==============================================================================

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

    const opc = await validarEscolha(colorir('Ação: ', cores.amarelo + cores.negrito), ['1', '2', '3', '4', '5', '6', '0']);
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
    const { data } = await api.get('/alugueis/todos?limit=100');
    data.data.forEach((item: any) => {
      console.log(`  ${colorir(String(item.id).padStart(3), cores.cinza)}  ${item.usuario.padEnd(20)}  ${item.titulo.substring(0, 30)}  ${item.prazo.substring(0, 10)}  ${item.status}`);
    });
  } catch (erro: any) { logErro(erro); }
  await aguardarEnter();
}

async function acaoListarAtrasados() {
  try {
    const { data } = await api.get('/alugueis/atrasados');
    data.data.forEach((item: any) => {
      console.log(`  ${colorir(String(item.id).padStart(3), cores.cinza)}  ${item.usuario.padEnd(20)}  ${item.titulo.substring(0, 30)}  ${item.dias_atraso} dias de atraso`);
    });
  } catch (erro: any) { logErro(erro); }
  await aguardarEnter();
}

async function acaoVerHistoricoGlobal() {
  try {
    const { data } = await api.get('/alugueis/historico');
    data.data.forEach((reg: any) => {
      console.log(`  ${colorir(String(reg.id).padStart(3), cores.cinza)}  ${reg.usuario.padEnd(20)}  ${reg.titulo.substring(0, 30)}  devolvido:${reg.data_devolucao.substring(0,10)}`);
    });
  } catch (erro: any) { logErro(erro); }
  await aguardarEnter();
}

async function acaoRegistrarEmprestimo() {
  const livroId = await perguntar('ID do Livro: ');
  const usuarioId = await perguntar('ID do Usuário: ');
  try {
    const { data } = await api.post('/alugueis', { livro_id: livroId, usuario_id: usuarioId });
    logSucesso(data.message);
  } catch (erro: any) { logErro(erro); }
  await aguardarEnter();
}

async function acaoProcessarDevolucao() {
  const idEmprestimo = await perguntar('ID do Empréstimo: ');
  const statusFisico = await perguntar('Estado (bom/danificado/perdido): ') || 'bom';
  try {
    const { data } = await api.put(`/alugueis/${idEmprestimo}/devolver`, { estado_exemplar: statusFisico });
    logSucesso(data.message);
  } catch (erro: any) { logErro(erro); }
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
  } catch (erro: any) { logErro(erro); }
  await aguardarEnter();
}

// ==============================================================================
// GESTÃO DE USUÁRIOS
// ==============================================================================

async function menuUsuarios() {
  while (true) {
    limparTela();
    imprimirTitulo('ADMINISTRAÇÃO DE USUÁRIOS', cores.ciano);
    imprimirOpcao('1', 'Listar todos');
    imprimirOpcao('0', 'Voltar');
    desenharDivisor();
    const opc = await validarEscolha(colorir('Escolha: ', cores.amarelo + cores.negrito), ['1', '0']);
    if (opc === '0' || opc === '') break;
    if (opc === '1') {
      try {
        const { data } = await api.get('/usuarios');
        data.data.forEach((u: any) => {
          console.log(`  ${colorir(String(u.id).padStart(3), cores.cinza)}  ${u.nome.padEnd(25)}  ${u.tipo}`);
        });
      } catch (erro: any) { logErro(erro); }
      await aguardarEnter();
    }
  }
}

// ==============================================================================
// ÁREA DO ALUNO
// ==============================================================================

async function menuMeusDados() {
  while (true) {
    limparTela();
    imprimirTitulo('MINHA ÁREA', cores.azul);
    imprimirOpcao('1', 'Meus empréstimos ativos');
    imprimirOpcao('2', 'Minhas multas');
    imprimirOpcao('3', 'Pagar multas pendentes');
    imprimirOpcao('0', 'Voltar');
    desenharDivisor();
    const opc = await validarEscolha(colorir('Escolha: ', cores.amarelo + cores.negrito), ['1', '2', '3', '0']);
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
    data.forEach((item: any) => {
      console.log(`  ${item.titulo} - Prazo: ${item.prazo.substring(0,10)}`);
    });
  } catch (erro: any) { logErro(erro); }
  await aguardarEnter();
}

async function acaoConsultarMinhasMultas() {
  try {
    const { data } = await api.get('/alugueis/multas/minhas');
    console.log(`\n  Total Pendente: R$ ${data.total_pendente.toFixed(2)}`);
  } catch (erro: any) { logErro(erro); }
  await aguardarEnter();
}

async function acaoPagarPropriasMultas() {
  try {
    const { data } = await api.put('/alugueis/multas/pagar/mim');
    logSucesso(data.message);
  } catch (erro: any) { logErro(erro); }
  await aguardarEnter();
}

// ==============================================================================
// NAVEGAÇÃO PRINCIPAL
// ==============================================================================

async function menuPrincipal() {
  while (true) {
    limparTela();
    exibirBanner();
    console.log(`\n  Sessão Ativa: ${usuarioLogado.nome.toUpperCase()} [${usuarioLogado.tipo}]`);
    await exibirMiniDashboard();
    desenharDivisor();

    if (usuarioLogado.tipo === 'bibliotecario') {
      imprimirOpcao('1', 'Gestão do Acervo');
      imprimirOpcao('2', 'Empréstimos');
      imprimirOpcao('3', 'Usuários');
      imprimirOpcao('4', 'ALERTAS');
      imprimirOpcao('0', 'Logout');
      const opc = await validarEscolha('Escolha: ', ['1', '2', '3', '4', '0']);
      if (opc === '0' || opc === '') break;
      switch (opc) {
        case '1': await menuAcervo(); break;
        case '2': await menuEmprestimos(); break;
        case '3': await menuUsuarios(); break;
        case '4': await acaoCentroAlertas(); break;
      }
    } else {
      imprimirOpcao('1', 'Consultar Acervo');
      imprimirOpcao('2', 'Minha Área');
      imprimirOpcao('3', 'ALERTAS');
      imprimirOpcao('0', 'Logout');
      const opc = await validarEscolha('Escolha: ', ['1', '2', '3', '0']);
      if (opc === '0' || opc === '') break;
      switch (opc) {
        case '1': await menuAcervo(); break;
        case '2': await menuMeusDados(); break;
        case '3': await acaoCentroAlertas(); break;
      }
    }
  }
  tokenAcesso = null;
  usuarioLogado = null;
  return telaInicial();
}

async function acaoCentroAlertas() {
  limparTela();
  imprimirTitulo('CENTRO DE ALERTAS', cores.amarelo);
  try {
    const lista: any[] = [];
    if (usuarioLogado.tipo === 'bibliotecario') {
      const { data: atr } = await api.get('/alugueis/atrasados');
      if (atr.total > 0) lista.push(`Existem ${atr.total} empréstimos em atraso.`);
      const { data: pen } = await api.get('/acervo-digital/pendentes');
      if (pen.length > 0) lista.push(`Existem ${pen.length} arquivos digitais pendentes.`);
    } else {
      const { data: mul } = await api.get('/alugueis/multas/minhas');
      if (mul.total_pendente > 0) lista.push(`Você possui R$ ${mul.total_pendente.toFixed(2)} em multas.`);
    }
    if (lista.length === 0) console.log('\n  Tudo em ordem.');
    else lista.forEach(l => console.log(`  [!] ${l}`));
  } catch (erro: any) { logErro(erro); }
  await aguardarEnter();
}

async function telaInicial() {
  limparTela();
  exibirBanner();
  imprimirOpcao('1', 'Login');
  imprimirOpcao('2', 'Novo Cadastro');
  imprimirOpcao('0', 'Sair');
  const v = await validarEscolha('\nOpção: ', ['1', '2', '0']);
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
  } catch (erro: any) {
    logErro(erro);
    await aguardarEnter();
    telaInicial();
  }
}

telaInicial();