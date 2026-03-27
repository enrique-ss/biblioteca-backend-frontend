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

/**
 * Mini-Dashboard exibido no menu principal.
 */
async function exibirMiniDashboard() {
  try {
    const { data } = await api.get('/stats');
    console.log('');
    data.stats.forEach((item: any) => {
      const corValor = item.cor === 'red' ? cores.vermelho : item.cor === 'green' ? cores.verde : cores.amarelo;
      console.log(`  ${item.label.padEnd(28)} ${colorir(String(item.valor).padStart(5), corValor + cores.negrito)}`);
    });
  } catch {
    // Se falhar ao carregar stats, apenas pula a exibição do dashboard
  }
}

// ==============================================================================
// GESTÃO DE ACERVO (LIVROS E CÓPIAS)
// ==============================================================================

async function menuAcervo() {
  while (true) {
    limparTela();
    imprimirTitulo('ACERVO DE LIVROS', cores.magenta);

    if (usuarioLogado.tipo === 'bibliotecario') {
      imprimirOpcao('1', 'Consultar catálogo (busca)');
      imprimirOpcao('2', 'Cadastrar nova obra');
      imprimirOpcao('3', 'Editar informações de livro');
      imprimirOpcao('4', 'Remover do acervo');
      imprimirOpcao('5', 'Gerenciar cópias físicas (Exemplares)');
      imprimirOpcao('6', 'Vistoria: Alterar estado de conservação');
    } else {
      imprimirOpcao('1', 'Pesquisar livros no catálogo');
    }
    
    imprimirOpcao('0', 'Voltar ao menu inicial');
    desenharDivisor();

    const permitidos = usuarioLogado.tipo === 'bibliotecario' ? ['1', '2', '3', '4', '5', '6', '0'] : ['1', '0'];
    const opc = await validarEscolha(colorir('Selecione uma ação: ', cores.amarelo + cores.negrito), permitidos);
    
    if (opc === '') continue;
    if (opc === '0') break;

    switch (opc) {
      case '1': await acaoConsultarAcervo(); break;
      case '2': await acaoCadastrarLivro(); break;
      case '3': await acaoEditarLivro(); break;
      case '4': await acaoRemoverLivro(); break;
      case '5': await acaoVerExemplares(); break;
      case '6': await acaoAlterarEstadoExemplar(); break;
    }
  }
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
        const resumoCond = livro.resumo_condicao || {};
        const condInfo = Object.entries(resumoCond)
          .filter(([tipo]) => tipo !== 'bom')
          .map(([tipo, qtd]) => colorir(`${tipo}:${qtd}`, tipo === 'danificado' ? cores.amarelo : cores.vermelho))
          .join(' ') || colorir('perfeito estado', cores.verde);

        console.log(`  ${colorir(String(livro.id).padStart(3), cores.cinza)}  ${colorir(livro.titulo.padEnd(35), cores.branco + cores.negrito)}  ${colorir(livro.autor.padEnd(20), cores.ciano)}  disp:${colorir(String(livro.exemplares_disponiveis) + '/' + livro.exemplares, cores.amarelo)}  [${condInfo}]`);
      });
      console.log(colorir(`\n  Total encontrado: ${data.total || lista.length} livros`, cores.cinza));
    }
  } catch (erro: any) {
    logErro(erro);
  }
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
    console.log(colorir(`  Localização Sugerida: ${data.localizacao}`, cores.cinza));
  } catch (erro: any) {
    logErro(erro);
  }
  await aguardarEnter();
}

async function acaoEditarLivro() {
  limparTela();
  imprimirTitulo('EDITAR INFORMAÇÕES DO LIVRO', cores.amarelo);

  const id = await perguntar('ID do livro que deseja editar: ');
  const titulo = await perguntar('Novo título (Enter para não alterar): ');
  const autor = await perguntar('Novo autor (Enter para não alterar): ');
  const genero = await perguntar('Novo gênero (Enter para não alterar): ');
  const exemplares = await perguntar('Nova quantidade de cópias (Enter para não alterar): ');

  const corpoEdit: any = {};
  if (titulo) corpoEdit.titulo = titulo;
  if (autor) corpoEdit.autor = autor;
  if (genero) corpoEdit.genero = genero;
  if (exemplares) corpoEdit.exemplares = parseInt(exemplares);

  try {
    const { data } = await api.put(`/livros/${id}`, corpoEdit);
    logSucesso(data.message);
  } catch (erro: any) {
    logErro(erro);
  }
  await aguardarEnter();
}

async function acaoRemoverLivro() {
  limparTela();
  imprimirTitulo('REMOVER LIVRO DO ACERVO', cores.vermelho);

  const id = await perguntar('ID do livro para exclusão: ');
  const confirma = await perguntar(colorir(`Você tem certeza que deseja remover o livro #${id}? (S/N): `, cores.vermelho));
  
  if (confirma.toLowerCase() !== 's') {
    console.log(colorir('\nOperação cancelada.', cores.cinza));
    await aguardarEnter();
    return;
  }

  try {
    const { data } = await api.delete(`/livros/${id}`);
    logSucesso(data.message);
  } catch (erro: any) {
    logErro(erro);
  }
  await aguardarEnter();
}

async function acaoVerExemplares() {
  limparTela();
  imprimirTitulo('GESTÃO DE CÓPIAS FÍSICAS', cores.ciano);

  const idLivro = await perguntar('Digite o ID do livro pai: ');

  try {
    const { data } = await api.get(`/livros/${idLivro}/exemplares`);
    console.log(colorir(`\n  Obra: ${data.livro.titulo} — ${data.livro.autor}`, cores.branco + cores.negrito));
    desenharDivisor();

    data.exemplares.forEach((ex: any) => {
      const corDisp = ex.disponibilidade === 'disponivel' ? cores.verde : cores.amarelo;
      const corCond = ex.condicao === 'bom' ? cores.verde : ex.condicao === 'danificado' ? cores.amarelo : cores.vermelho;
      
      let infoHistorico = '';
      if (ex.ultimo_aluguel) {
        const statusH = ex.ultimo_aluguel.status_aluguel === 'ativo' ? colorir('EM MÃOS', cores.amarelo) : 'DEVOLVIDO';
        infoHistorico = `  último: ${colorir(ex.ultimo_aluguel.usuario, cores.ciano)} (${statusH})`;
      }

      console.log(`  ${colorir(String(ex.id).padStart(3), cores.cinza)}  ${colorir(ex.codigo ?? '---', cores.ciano)}  disp:${colorir(ex.disponibilidade, corDisp)}  cond:${colorir(ex.condicao, corCond)}${ex.observacao ? colorir(` (obs:${ex.observacao})`, cores.cinza) : ''}${infoHistorico}`);
    });
  } catch (erro: any) {
    logErro(erro);
  }
  await aguardarEnter();
}

async function acaoAlterarEstadoExemplar() {
  limparTela();
  imprimirTitulo('VISTORIA TÉCNICA DE EXEMPLAR', cores.amarelo);
  
  console.log(colorir('  Estados possíveis: bom | danificado | perdido\n', cores.cinza));
  
  const livroId = await perguntar('ID do Livro: ');
  const exemplarId = await perguntar('ID da Cópia Física (Exemplar): ');
  const novoEstado = await perguntar('Nova condição física: ');
  const obs = await perguntar('Observações da vistoria: ');

  try {
    const { data } = await api.patch(`/livros/${livroId}/exemplares/${exemplarId}`, { 
      condicao: novoEstado.trim().toLowerCase(), 
      observacao: obs 
    });
    logSucesso(data.message);
    console.log(colorir(`  Inventário Atualizado: ${data.exemplar.condicao} (${data.exemplar.disponibilidade})`, cores.cinza));
  } catch (erro: any) {
    logErro(erro);
  }
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
  limparTela();
  imprimirTitulo('LIVROS FORA DA BIBLIOTECA', cores.azul);
  try {
    const { data } = await api.get('/alugueis/todos?limit=100');
    const logs = data.data || [];
    
    if (logs.length === 0) {
      console.log('\nNenhum empréstimo ativo no momento.');
    } else {
      logs.forEach((item: any) => {
        const corStatus = item.status === 'atrasado' ? cores.vermelho : cores.verde;
        const msgMulta = Number(item.multa_acumulada) > 0 ? colorir(` (R$ ${Number(item.multa_acumulada).toFixed(2)})`, cores.vermelho) : '';
        console.log(`  ${colorir(String(item.id).padStart(3), cores.cinza)}  ${colorir(item.usuario.padEnd(20), cores.branco)}  ${item.titulo.substring(0, 30).padEnd(30)}  ${item.prazo.substring(0, 10)}  ${colorir(item.status, corStatus)}${msgMulta}`);
      });
    }
  } catch (erro: any) { logErro(erro); }
  await aguardarEnter();
}

async function acaoListarAtrasados() {
  limparTela();
  imprimirTitulo('ALERTAS DE ATRASO', cores.vermelho);
  try {
    const { data } = await api.get('/alugueis/atrasados');
    if (data.total === 0) {
      console.log(colorir('\nNão há livros com prazo vencido. Parabéns!', cores.verde));
    } else {
      data.data.forEach((item: any) => {
        console.log(`  ${colorir(String(item.id).padStart(3), cores.cinza)}  ${colorir(item.usuario.padEnd(20), cores.branco)}  ${item.titulo.substring(0, 30).padEnd(30)}  ${colorir(`${item.dias_atraso} dias`, cores.vermelho + cores.negrito)}  R$ ${Number(item.multa_acumulada).toFixed(2)}`);
      });
      console.log(colorir(`\n  Faturamento de multas pendentes: R$ ${Number(data.total_faturamento_pendente || 0).toFixed(2)}`, cores.vermelho));
    }
  } catch (erro: any) { logErro(erro); }
  await aguardarEnter();
}

async function acaoVerHistoricoGlobal() {
  limparTela();
  imprimirTitulo('HISTÓRICO DE CIRCULAÇÃO', cores.cinza);
  const userFiltro = await perguntar('Filtrar por ID de usuário (Enter para todos): ');
  try {
    const url = userFiltro.trim() ? `/alugueis/historico?usuario_id=${userFiltro}` : '/alugueis/historico';
    const { data } = await api.get(url);
    const historico = data.data || [];
    
    if (historico.length === 0) {
      console.log('\nNenhum registro de devolução encontrado.');
    } else {
      historico.forEach((reg: any) => {
        const corEstado = reg.estado_devolucao === 'bom' ? cores.verde : reg.estado_devolucao === 'danificado' ? cores.amarelo : cores.vermelho;
        console.log(`  ${colorir(String(reg.id).padStart(3), cores.cinza)}  ${colorir(reg.usuario.padEnd(20), cores.branco)}  ${reg.titulo.substring(0, 30).padEnd(30)}  devolvido:${reg.data_devolucao.substring(0,10)}  cond:${colorir(reg.estado_devolucao, corEstado)}`);
      });
    }
  } catch (erro: any) { logErro(erro); }
  await aguardarEnter();
}

async function acaoRegistrarEmprestimo() {
  limparTela();
  imprimirTitulo('ABERTURA DE EMPRÉSTIMO', cores.verde);
  
  const livroId = await perguntar('ID do Livro: ');
  const usuarioId = await perguntar('ID do Usuário: ');

  try {
    // Busca os exemplares físicos para escolha
    const { data: infoLivro } = await api.get(`/livros/${livroId}/exemplares`);
    const disponiveis = infoLivro.exemplares.filter((ex: any) => ex.disponibilidade === 'disponivel');

    if (disponiveis.length === 0) {
      console.log(colorir('\nInfelizmente não há exemplares disponíveis deste livro.', cores.vermelho));
      await aguardarEnter();
      return;
    }

    console.log(colorir('\n  Exemplares disponíveis na estante:', cores.branco));
    disponiveis.forEach((ex: any) => {
      console.log(`    ID #${ex.id} | Código: ${ex.codigo} | Estado: ${ex.condicao}`);
    });

    const escolhaId = await perguntar('\nSelecione o ID do exemplar (Enter para pegar qualquer um): ');
    
    const payload: any = { 
      livro_id: parseInt(livroId), 
      usuario_id: parseInt(usuarioId) 
    };
    if (escolhaId.trim()) payload.exemplar_id = parseInt(escolhaId);

    const { data: resFinal } = await api.post('/alugueis', payload);
    logSucesso(resFinal.message);
    console.log(colorir(`  Prazos de Devolução: ${resFinal.prazo_devolucao}`, cores.cinza));
  } catch (erro: any) { logErro(erro); }
  await aguardarEnter();
}

async function acaoProcessarDevolucao() {
  limparTela();
  imprimirTitulo('RECEBIMENTO E BAIXA DE LIVRO', cores.amarelo);

  const idEmprestimo = await perguntar('Número do Empréstimo: ');
  console.log(colorir('\n  Condição física do livro no ato da entrega:', cores.branco));
  console.log('    bom        -> Retorna direto para a prateleira');
  console.log('    danificado -> Baixa com avarias (Gera multa se necessário)');
  console.log('    perdido    -> Retirado do acervo + Multa fixa de R$ 100,00');

  const statusFisico = (await perguntar('\n  Estado (bom/danificado/perdido) [padrão: bom]: ')) || 'bom';
  const obsDevolucao = await perguntar('  Observações técnicas adicionais: ');

  try {
    const { data } = await api.put(`/alugueis/${idEmprestimo}/devolver`, { 
      estado_exemplar: statusFisico, 
      observacao: obsDevolucao 
    });
    
    logSucesso(data.message);
    if (data.total_de_multa > 0) {
      console.log(colorir(`\n  🚨 MULTA GERADA: R$ ${data.total_de_multa.toFixed(2)}`, cores.vermelho + cores.negrito));
      data.multas_detalhadas.forEach((m: any) => {
        console.log(colorir(`     > ${m.tipo}: ${m.valor.toFixed(2)}${m.dias ? ` (${m.dias} dias)` : ''}`, cores.vermelho));
      });
    }
  } catch (erro: any) { logErro(erro); }
  await aguardarEnter();
}

async function acaoPainelMultas() {
  limparTela();
  imprimirTitulo('CENTRO FINANCEIRO DE MULTAS', cores.amarelo);
  
  const idUser = await perguntar('ID do Aluno para consulta: ');

  try {
    const { data: extrato } = await api.get(`/alugueis/multas/${idUser}`);
    
    if (extrato.multas.length === 0) {
      console.log(colorir('\nEste usuário não possui histórico de multas.', cores.verde));
    } else {
      console.log(colorir(`\n  Saldo Pendente Atual: R$ ${extrato.total_pendente.toFixed(2)}`, cores.vermelho + cores.negrito));
      desenharDivisor();
      
      extrato.multas.forEach((multa: any) => {
        const corM = multa.status === 'pendente' ? cores.vermelho : cores.cinza;
        console.log(colorir(`  ${multa.tipo.padEnd(10)} | R$ ${Number(multa.valor).toFixed(2).padStart(8)} | ${multa.status.padEnd(10)} | ${multa.livro}`, corM));
      });

      if (extrato.total_pendente > 0) {
        const quitar = await perguntar('\nDeseja processar a quitação total dos débitos agora? (S/N): ');
        if (quitar.toLowerCase() === 's') {
          const { data: resPgto } = await api.put(`/alugueis/multas/${idUser}/pagar`);
          logSucesso(resPgto.message);
        }
      }
    }
  } catch (erro: any) { logErro(erro); }
  await aguardarEnter();
}

// ==============================================================================
// GESTÃO DE USUÁRIOS (SISTEMA)
// ==============================================================================

async function menuUsuarios() {
  while (true) {
    limparTela();
    imprimirTitulo('ADMINISTRAÇÃO DE USUÁRIOS', cores.ciano);

    imprimirOpcao('1', 'Listar todos os cadastrados');
    imprimirOpcao('2', 'Alterar dados de cadastro');
    imprimirOpcao('3', 'Excluir conta permanentemente');
    imprimirOpcao('4', 'Bloquear/Desbloquear acesso manual');
    imprimirOpcao('0', 'Voltar');
    desenharDivisor();

    const opc = await validarEscolha(colorir('Escolha: ', cores.amarelo + cores.negrito), ['1', '2', '3', '4', '0']);
    if (opc === '' || opc === '0') break;

    switch (opc) {
      case '1': await acaoListarUsuarios(); break;
      case '2': await acaoEditarOutroUsuario(); break;
      case '3': await acaoExcluirUsuario(); break;
      case '4': await acaoControleBloqueio(); break;
    }
  }
}

async function acaoListarUsuarios() {
  limparTela();
  imprimirTitulo('BANCO DE DADOS DE USUÁRIOS', cores.ciano);
  try {
    const { data } = await api.get('/usuarios?limit=100');
    data.data.forEach((u: any) => {
      const corTipo = u.tipo === 'bibliotecario' ? cores.magenta : cores.ciano;
      const avisoBloq = u.bloqueado ? colorir(' [BLOQUEADO]', cores.vermelho) : '';
      const avisoMulta = u.multa_pendente ? colorir(' [DÉBITO]', cores.amarelo) : '';
      console.log(`  ${colorir(String(u.id).padStart(3), cores.cinza)}  ${colorir(u.nome.padEnd(25), cores.branco)}  ${u.email.padEnd(30)}  ${colorir(u.tipo, corTipo)}${avisoBloq}${avisoMulta}`);
    });
  } catch (erro: any) { logErro(erro); }
  await aguardarEnter();
}

async function acaoEditarOutroUsuario() {
  limparTela();
  imprimirTitulo('ATUALIZAÇÃO ADMINISTRATIVA', cores.amarelo);
  const targetId = await perguntar('ID do usuário: ');
  const nome = await perguntar('Novo Nome (Enter para manter): ');
  const tipo = await perguntar('Novo Cargo (usuario/bibliotecario): ');
  
  const b: any = {};
  if (nome) b.nome = nome;
  if (tipo) b.tipo = tipo;

  try {
    const { data } = await api.put(`/usuarios/${targetId}`, b);
    logSucesso(data.message);
  } catch (erro: any) { logErro(erro); }
  await aguardarEnter();
}

async function acaoExcluirUsuario() {
  limparTela();
  imprimirTitulo('EXCLUSÃO DE CONTA', cores.vermelho);
  const idExc = await perguntar('ID do infeliz que deseja remover: ');
  const finalConf = await perguntar(colorir(`Tem certeza ABSOLUTA? Esta ação não pode ser desfeita. (S/N): `, cores.vermelho));
  
  if (finalConf.toLowerCase() === 's') {
    try {
      const { data } = await api.delete(`/usuarios/${idExc}`);
      logSucesso(data.message);
    } catch (erro: any) { logErro(erro); }
  }
  await aguardarEnter();
}

async function acaoControleBloqueio() {
  limparTela();
  imprimirTitulo('MODERAÇÃO DE ACESSO', cores.amarelo);
  const target = await perguntar('ID do usuário: ');
  const acao = await perguntar('Ação: (B)loquear ou (D)esbloquear: ');
  
  try {
    if (acao.toLowerCase() === 'b') {
      const mot = await perguntar('Motivo do bloqueio administratrivo: ');
      const { data } = await api.post(`/usuarios/${target}/bloquear`, { motivo: mot });
      logSucesso(data.message);
    } else {
      const { data } = await api.post(`/usuarios/${target}/desbloquear`);
      logSucesso(data.message);
    }
  } catch (erro: any) { logErro(erro); }
  await aguardarEnter();
}

// ==============================================================================
// ÁREA DO ALUNO (FUNCIONALIDADES PRÓPRIAS)
// ==============================================================================

async function menuMeusDados() {
  while (true) {
    limparTela();
    imprimirTitulo('MINHA ÁREA', cores.azul);
    
    imprimirOpcao('1', 'Visualizar meus livros emprestados');
    imprimirOpcao('2', 'Solicitar renovação de prazo');
    imprimirOpcao('3', 'Consultar minhas multas e débitos');
    imprimirOpcao('0', 'Voltar');
    desenharDivisor();

    const opc = await validarEscolha(colorir('Ação: ', cores.amarelo + cores.negrito), ['1', '2', '3', '0']);
    if (opc === '' || opc === '0') break;

    switch (opc) {
      case '1': await acaoListarMeusLivros(); break;
      case '2': await acaoRenovarProprio(); break;
      case '3': await acaoConsultarMinhasMultas(); break;
    }
  }
}

async function acaoListarMeusLivros() {
  limparTela();
  imprimirTitulo('LIVROS ATUALMENTE COM VOCÊ', cores.azul);
  try {
    const { data } = await api.get('/alugueis/meus');
    if (data.length === 0) {
      console.log('\nVocê não possui nenhum livro emprestado no momento.');
    } else {
      data.forEach((item: any) => {
        const corS = item.status === 'atrasado' ? cores.vermelho : cores.verde;
        console.log(`  ${colorir(String(item.id).padStart(3), cores.cinza)}  ${item.titulo.substring(0, 40).padEnd(40)}  Prazo: ${item.prazo.substring(0,10)}  Status: ${colorir(item.status, corS)}`);
      });
    }
  } catch (erro: any) { logErro(erro); }
  await aguardarEnter();
}

async function acaoRenovarProprio() {
  limparTela();
  imprimirTitulo('SOLICITAR RENOVAÇÃO', cores.amarelo);
  const idAl = await perguntar('Qual o ID do empréstimo (visto na lista)? ');
  try {
    const { data } = await api.put(`/alugueis/${idAl}/renovar`);
    logSucesso(data.message);
    console.log(colorir(`  Novo prazo extendido para: ${data.novo_prazo}`, cores.verde));
  } catch (erro: any) { logErro(erro); }
  await aguardarEnter();
}

async function acaoConsultarMinhasMultas() {
  limparTela();
  imprimirTitulo('EXTRATO DE DÉBITOS', cores.amarelo);
  try {
    const { data } = await api.get('/alugueis/multas/minhas');
    if (data.multas.length === 0) {
      console.log(colorir('\nVocê está em dia com a biblioteca. Sem multas!', cores.verde));
    } else {
      console.log(colorir(`  Total a pagar: R$ ${data.total_pendente.toFixed(2)}`, cores.vermelho + cores.negrito));
      desenharDivisor();
      data.multas.forEach((m: any) => {
        const corMulta = m.status === 'pendente' ? cores.vermelho : cores.cinza;
        console.log(colorir(`  ${m.tipo.padEnd(10)} | R$ ${Number(m.valor).toFixed(2).padStart(8)} | ${m.livro}`, corMulta));
      });
    }
  } catch (erro: any) { logErro(erro); }
  await aguardarEnter();
}

// ==============================================================================
// NAVEGAÇÃO PRINCIPAL E LOGIN
// ==============================================================================

async function menuPrincipal() {
  while (true) {
    limparTela();
    exibirBanner();
    
    const corPerfil = usuarioLogado.tipo === 'bibliotecario' ? cores.magenta : cores.ciano;
    console.log(colorir(`\n  Sessão Ativa: ${usuarioLogado.nome.toUpperCase()} [${usuarioLogado.tipo}]`, corPerfil + cores.negrito));
    
    await exibirMiniDashboard();
    desenharDivisor();

    if (usuarioLogado.tipo === 'bibliotecario') {
      imprimirOpcao('1', 'Gestão do Acervo (Livros)');
      imprimirOpcao('2', 'Controle de Empréstimos e Multas');
      imprimirOpcao('3', 'Administração de Usuários');
      imprimirOpcao('0', 'Encerrar Sessão (Logout)');
      desenharDivisor();
      
      const opc = await validarEscolha(colorir('Escolha: ', cores.amarelo + cores.negrito), ['1', '2', '3', '0']);
      if (opc === '0' || opc === '') break;

      switch (opc) {
        case '1': await menuAcervo(); break;
        case '2': await menuEmprestimos(); break;
        case '3': await menuUsuarios(); break;
      }
    } else {
      imprimirOpcao('1', 'Consultar Catálogo de Livros');
      imprimirOpcao('2', 'Minha Área (Empréstimos e Multas)');
      imprimirOpcao('0', 'Sair');
      desenharDivisor();

      const opc = await validarEscolha(colorir('Escolha: ', cores.amarelo + cores.negrito), ['1', '2', '0']);
      if (opc === '0' || opc === '') break;

      switch (opc) {
        case '1': await menuAcervo(); break;
        case '2': await menuMeusDados(); break;
      }
    }
  }
  
  // Limpa sessão ao sair
  tokenAcesso = null; 
  usuarioLogado = null;
  return telaInicial();
}

async function telaInicial() {
  limparTela();
  exibirBanner();
  desenharDivisor();
  
  imprimirOpcao('1', 'Entrar no Sistema (Login)');
  imprimirOpcao('2', 'Criar Nova Conta');
  imprimirOpcao('0', 'Sair do Shell');
  desenharDivisor();

  const v = await validarEscolha(colorir('\nDigite para começar: ', cores.amarelo + cores.negrito), ['1', '2', '0']);
  
  if (v === '0') {
    interfaceTerminal.close();
    process.exit(0);
  }
  if (v === '') return telaInicial();

  console.log(colorir('\n--- AUTENTICAÇÃO ---', cores.cinza));
  const emailVal = await perguntar('E-mail: ');
  const senhaVal = await perguntar('Senha: ');

  try {
    let resposta;
    if (v === '2') {
      const nomeVal = await perguntar('Seu Nome Completo: ');
      resposta = await api.post('/auth/registrar', { nome: nomeVal, email: emailVal, senha: senhaVal, tipo: 'usuario' });
      logSucesso('Conta criada com sucesso! Faça login agora.');
      await aguardarEnter();
      return telaInicial();
    } else {
      resposta = await api.post('/auth/login', { email: emailVal, senha: senhaVal });
      tokenAcesso = resposta.data.token;
      usuarioLogado = resposta.data.usuario;
      await menuPrincipal();
    }
  } catch (erro: any) {
    logErro(erro);
    await aguardarEnter();
    telaInicial();
  }
}

// Inicializa o CLI
telaInicial();