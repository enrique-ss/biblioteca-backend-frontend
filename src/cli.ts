import axios from 'axios';
import * as readline from 'readline';
import dotenv from 'dotenv';

dotenv.config();
const api = axios.create({ baseURL: 'http://127.0.0.1:3000/api' });
let token: string | null = null;
let user: any = null;

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const pergunta = (t: string): Promise<string> => new Promise((r) => rl.question(t, r));

api.interceptors.request.use((config) => {
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const limpar = () => console.clear();

// ── ESTILO ────────────────────────────────────────────────────────────────────

const cores = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  vermelho: '\x1b[31m', verde: '\x1b[32m', amarelo: '\x1b[33m',
  azul: '\x1b[34m', magenta: '\x1b[35m', ciano: '\x1b[36m', branco: '\x1b[37m',
};

const emoji = { check: '✅', erro: '❌', email: '📧', senha: '🔒', usuario: '👤', admin: '👨‍💼' };

function colorir(texto: string, cor: string): string { return `${cor}${texto}${cores.reset}`; }

function titulo(texto: string, cor: string = cores.ciano): void {
  const linha = '═'.repeat(texto.length + 4);
  console.log(colorir('\n' + linha, cor));
  console.log(colorir(`  ${texto}  `, cor));
  console.log(colorir(linha, cor));
}

function mostrarBanner() {
  console.log(`
  ${cores.magenta}██╗     ██╗   ██╗██╗███████╗ █████╗ ████████╗███████╗ ██████╗ █████╗ ${cores.reset}
  ${cores.magenta}██║     ██║   ██║██║╚══███╔╝██╔══██╗╚══██╔══╝██╔════╝██╔════╝██╔══██╗${cores.reset}
  ${cores.ciano}██║     ██║   ██║██║  ███╔╝ ███████║   ██║   █████╗  ██║     ███████║${cores.reset}
  ${cores.ciano}██║     ██║   ██║██║ ███╔╝  ██╔══██║   ██║   ██╔══╝  ██║     ██╔══██║${cores.reset}
  ${cores.azul}███████╗╚██████╔╝██║███████╗██║  ██║   ██║   ███████╗╚██████╗██║  ██║${cores.reset}
  ${cores.azul}╚══════╝ ╚═════╝ ╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝ ╚═════╝╚═╝  ╚═╝${cores.reset}
  `);
  console.log(colorir('           Sistema de Gerenciamento de Biblioteca v2.0.0', cores.dim));
}

function divisor(cor: string = cores.ciano): void { console.log(colorir('─'.repeat(70), cor)); }
function opcao(numero: string, texto: string): void { console.log(`  ${colorir(numero, cores.amarelo + cores.bold)}  ${texto}`); }

async function obterOpcaoValida(msg: string, opcoes: string[]): Promise<string> {
  const op = await pergunta(msg);
  if (!opcoes.includes(op)) {
    console.log(colorir(`\nOpção "${op}" inválida! Tente: ${opcoes.join(', ')}`, cores.vermelho + cores.bold));
    await pergunta(colorir('\nPressione Enter...', cores.dim));
    return '';
  }
  return op;
}

function badgeExemplarCLI(status: string): string {
  const map: Record<string, string> = {
    disponivel: colorir('● Disponível', cores.verde),
    emprestado: colorir('● Emprestado', cores.amarelo),
    danificado: colorir('● Danificado', cores.vermelho),
    perdido: colorir('● Perdido', cores.dim),
  };
  return map[status] ?? status;
}

// ── ACERVO ────────────────────────────────────────────────────────────────────

async function visualizarAcervo() {
  limpar();
  titulo('ACERVO DE LIVROS', cores.magenta);
  const busca = await pergunta('Buscar (Enter para listar tudo): ');
  try {
    const endpoint = busca.trim() ? `/livros?busca=${encodeURIComponent(busca.trim())}` : '/livros';
    const res = await api.get(endpoint);
    const livros = res.data.data ?? res.data;
    if (!livros.length) {
      console.log('\nNenhum livro encontrado.');
    } else {
      console.log('');
      livros.forEach((l: any) => {
        const disp = colorir(`${l.exemplares_disponiveis}/${l.exemplares}`, l.exemplares_disponiveis > 0 ? cores.verde : cores.vermelho);
        console.log(`  [${colorir(String(l.id), cores.dim)}] ${colorir(l.titulo, cores.branco + cores.bold)} — ${l.autor} | ${l.genero} | ${disp} exemplares`);
      });
    }
  } catch (e: any) {
    console.log(colorir(`\n${emoji.erro} ${e.response?.data?.error}`, cores.vermelho));
  }

  if (user.tipo === 'bibliotecario') {
    divisor();
    opcao('1', 'Adicionar Livro');
    opcao('2', 'Ver exemplares de um livro');
    opcao('0', 'Voltar');
    divisor();
    const op = await obterOpcaoValida(colorir('\nOpção: ', cores.amarelo + cores.bold), ['1', '2', '0']);
    if (op === '1') await cadastrarLivro();
    else if (op === '2') await menuExemplares();
  } else {
    await pergunta(colorir('\nPressione Enter para voltar...', cores.dim));
  }
}

async function cadastrarLivro() {
  limpar();
  titulo('NOVO LIVRO', cores.verde);
  const body = {
    titulo: await pergunta('Título: '),
    autor: await pergunta('Autor: '),
    ano_lancamento: parseInt(await pergunta('Ano: ')),
    genero: await pergunta('Gênero: '),
    exemplares: parseInt((await pergunta('Exemplares [1]: ')) || '1'),
  };
  try {
    const res = await api.post('/livros', body);
    console.log(colorir(`\n${emoji.check} ${res.data.message}`, cores.verde));
    if (res.data.info) console.log(colorir(`   ${res.data.info}`, cores.dim));
  } catch (e: any) {
    console.log(colorir(`\n${emoji.erro} ${e.response?.data?.error}`, cores.vermelho));
  }
  await pergunta(colorir('\nPressione Enter...', cores.dim));
}

// ── EXEMPLARES INDIVIDUAIS ────────────────────────────────────────────────────

async function menuExemplares() {
  limpar();
  titulo('EXEMPLARES DE UM LIVRO', cores.ciano);
  const livroId = await pergunta('ID do livro: ');
  if (!livroId.trim()) return;

  try {
    const res = await api.get(`/livros/${livroId}/exemplares`);
    const { livro, exemplares } = res.data;

    limpar();
    titulo(`EXEMPLARES — ${livro.titulo}`, cores.ciano);
    console.log(colorir(`  Autor: ${livro.autor}\n`, cores.dim));

    if (!exemplares.length) {
      console.log('  Nenhum exemplar cadastrado.');
    } else {
      exemplares.forEach((ex: any) => {
        const ult = ex.ultimo_aluguel;
        const emMaos = ult && ult.status_aluguel === 'ativo'
          ? colorir(` → Em mãos de: ${ult.usuario}`, cores.amarelo)
          : '';
        console.log(
          `  [${colorir(String(ex.id), cores.dim)}] ${colorir(ex.codigo ?? '—', cores.ciano)}  ${badgeExemplarCLI(ex.status)}${emMaos}`
        );
        if (ex.observacao) console.log(colorir(`       Obs: ${ex.observacao}`, cores.dim));
        if (ult && ult.status_aluguel !== 'ativo') {
          console.log(colorir(`       Último aluguel: ${ult.usuario} em ${new Date(ult.data_aluguel).toLocaleDateString('pt-BR')}`, cores.dim));
        }
      });
    }

    divisor();
    opcao('1', 'Alterar estado de um exemplar');
    opcao('0', 'Voltar');
    divisor();

    const op = await obterOpcaoValida(colorir('\nOpção: ', cores.amarelo + cores.bold), ['1', '0']);
    if (op === '1') await alterarExemplar(Number(livroId), exemplares);
  } catch (e: any) {
    console.log(colorir(`\n${emoji.erro} ${e.response?.data?.error || 'Erro ao buscar exemplares'}`, cores.vermelho));
    await pergunta(colorir('\nPressione Enter...', cores.dim));
  }
}

async function alterarExemplar(livroId: number, exemplares: any[]) {
  const exemplarId = await pergunta('ID do exemplar: ');
  const exemplar = exemplares.find(e => String(e.id) === exemplarId.trim());
  if (!exemplar) {
    console.log(colorir('\nExemplar não encontrado na lista.', cores.vermelho));
    await pergunta(colorir('\nPressione Enter...', cores.dim));
    return;
  }

  console.log(`\n  Estado atual: ${badgeExemplarCLI(exemplar.status)}`);
  console.log(colorir('\n  Novos estados disponíveis:', cores.dim));
  opcao('1', 'disponivel');
  opcao('2', 'danificado');
  opcao('3', 'perdido');
  opcao('0', 'Cancelar');
  divisor();

  const op = await obterOpcaoValida(colorir('\nOpção: ', cores.amarelo + cores.bold), ['1', '2', '3', '0']);
  if (op === '0') return;

  const statusMap: Record<string, string> = { '1': 'disponivel', '2': 'danificado', '3': 'perdido' };
  const novoStatus = statusMap[op];

  let observacao = '';
  if (novoStatus === 'danificado' || novoStatus === 'perdido') {
    observacao = await pergunta('Observação (opcional): ');
  }

  try {
    await api.patch(`/livros/${livroId}/exemplares/${exemplarId}`, { status: novoStatus, observacao });
    console.log(colorir(`\n${emoji.check} Exemplar atualizado para: ${novoStatus}`, cores.verde));
  } catch (e: any) {
    console.log(colorir(`\n${emoji.erro} ${e.response?.data?.error}`, cores.vermelho));
  }
  await pergunta(colorir('\nPressione Enter...', cores.dim));
}

// ── EMPRÉSTIMOS ───────────────────────────────────────────────────────────────

async function menuEmprestimos() {
  while (true) {
    limpar();
    titulo('EMPRÉSTIMOS', cores.azul);
    opcao('1', 'Ver todos os empréstimos');
    opcao('2', 'Novo aluguel');
    opcao('3', 'Devolver livro');
    opcao('4', 'Ver histórico (devolvidos)');
    opcao('0', 'Voltar');
    divisor();

    const op = await obterOpcaoValida(colorir('\nOpção: ', cores.amarelo + cores.bold), ['1', '2', '3', '4', '0']);
    if (op === '') continue;
    if (op === '0') break;
    if (op === '1') await listarTodosAlugueis();
    else if (op === '2') await registrarAluguel();
    else if (op === '3') await devolverLivro();
    else if (op === '4') await verHistorico();
  }
}

async function listarTodosAlugueis() {
  limpar();
  titulo('TODOS OS EMPRÉSTIMOS ATIVOS', cores.azul);
  try {
    const res = await api.get('/alugueis/todos');
    const rows = res.data.data ?? res.data;
    if (!rows.length) {
      console.log('\nNenhum empréstimo ativo.');
    } else {
      console.log('');
      rows.forEach((a: any) => {
        const status = a.status === 'atrasado'
          ? colorir('ATRASADO', cores.vermelho + cores.bold)
          : colorir('ativo', cores.verde);
        console.log(
          `  [${colorir(String(a.id), cores.dim)}] ${colorir(a.titulo, cores.branco + cores.bold)} ` +
          `| ${colorir(a.exemplar_codigo ?? '—', cores.ciano)} ` +
          `| Leitor: ${a.usuario} ` +
          `| Prazo: ${new Date(a.prazo).toLocaleDateString('pt-BR')} ` +
          `| ${status}`
        );
      });
    }
  } catch (e: any) {
    console.log(colorir(`\n${emoji.erro} ${e.response?.data?.error}`, cores.vermelho));
  }
  await pergunta(colorir('\nPressione Enter...', cores.dim));
}

async function registrarAluguel() {
  limpar();
  titulo('NOVO ALUGUEL', cores.verde);
  // O backend seleciona o exemplar automaticamente — frontend só envia livro_id e usuario_id
  const dados = {
    livro_id: await pergunta('ID do Livro: '),
    usuario_id: await pergunta('ID do Usuário: '),
  };
  try {
    const res = await api.post('/alugueis', dados);
    console.log(colorir(`\n${emoji.check} ${res.data.message}`, cores.verde));
    console.log(colorir(`   Prazo: ${res.data.prazo}`, cores.dim));
  } catch (e: any) {
    console.log(colorir(`\n${emoji.erro} ${e.response?.data?.error}`, cores.vermelho));
  }
  await pergunta(colorir('\nPressione Enter...', cores.dim));
}

async function devolverLivro() {
  limpar();
  titulo('DEVOLVER LIVRO', cores.amarelo);
  const id = await pergunta('ID do Aluguel: ');
  try {
    const res = await api.put(`/alugueis/${id}/devolver`);
    console.log(colorir(`\n${emoji.check} ${res.data.message}`, cores.verde));
    console.log(colorir('   Para marcar o exemplar como danificado ou perdido, use a opção "Ver exemplares" no Acervo.', cores.dim));
  } catch (e: any) {
    console.log(colorir(`\n${emoji.erro} ${e.response?.data?.error}`, cores.vermelho));
  }
  await pergunta(colorir('\nPressione Enter...', cores.dim));
}

async function verHistorico() {
  limpar();
  titulo('HISTÓRICO DE EMPRÉSTIMOS', cores.azul);
  const usuarioId = await pergunta('Filtrar por ID de usuário (Enter para todos): ');
  try {
    const params: any = { page: 1, limit: 30 };
    if (usuarioId.trim()) params.usuario_id = usuarioId.trim();
    const res = await api.get('/alugueis/historico', { params });
    const rows = res.data.data ?? [];
    if (!rows.length) {
      console.log('\nNenhum registro encontrado.');
    } else {
      console.log('');
      rows.forEach((a: any) => {
        // exemplar_status mostra o estado atual do exemplar — permite ver se voltou danificado
        const estadoExemplar = a.exemplar_status !== 'disponivel'
          ? colorir(` [exemplar: ${a.exemplar_status}]`, cores.vermelho)
          : '';
        console.log(
          `  [${colorir(String(a.id), cores.dim)}] ${colorir(a.titulo, cores.branco + cores.bold)} ` +
          `| ${colorir(a.exemplar_codigo ?? '—', cores.ciano)}${estadoExemplar} ` +
          `| ${a.usuario} ` +
          `| Dev: ${a.data_devolucao ? new Date(a.data_devolucao).toLocaleDateString('pt-BR') : '—'}`
        );
      });
    }
  } catch (e: any) {
    console.log(colorir(`\n${emoji.erro} ${e.response?.data?.error}`, cores.vermelho));
  }
  await pergunta(colorir('\nPressione Enter...', cores.dim));
}

// ── MEUS EMPRÉSTIMOS ──────────────────────────────────────────────────────────

async function meusAlugueis() {
  limpar();
  titulo('MEUS EMPRÉSTIMOS', cores.azul);
  try {
    const res = await api.get('/alugueis/meus');
    const rows = res.data;
    if (!rows.length) {
      console.log('\nNenhum empréstimo encontrado.');
    } else {
      console.log('');
      rows.forEach((a: any) => {
        const renovar = a.pode_renovar ? colorir(' [pode renovar]', cores.verde) : '';
        console.log(
          `  [${colorir(String(a.id), cores.dim)}] ${colorir(a.titulo, cores.branco + cores.bold)} ` +
          `| ${colorir(a.exemplar_codigo ?? '—', cores.ciano)} ` +
          `| Prazo: ${new Date(a.prazo).toLocaleDateString('pt-BR')} ` +
          `| ${a.status}${renovar}`
        );
      });
    }
  } catch (e: any) {
    console.log(colorir(`\n${emoji.erro} ${e.response?.data?.error}`, cores.vermelho));
  }
  await pergunta(colorir('\nPressione Enter...', cores.dim));
}

// ── USUÁRIOS ──────────────────────────────────────────────────────────────────

async function menuUsuarios() {
  while (true) {
    limpar();
    titulo('USUÁRIOS', cores.ciano);
    opcao('1', 'Listar usuários');
    opcao('2', 'Atualizar usuário');
    opcao('3', 'Deletar usuário');
    opcao('0', 'Voltar');
    divisor();

    const op = await obterOpcaoValida(colorir('\nOpção: ', cores.amarelo + cores.bold), ['1', '2', '3', '0']);
    if (op === '') continue;
    if (op === '0') break;
    if (op === '1') await listarUsuarios();
    else if (op === '2') await atualizarUsuario();
    else if (op === '3') await deletarUsuario();
  }
}

async function listarUsuarios() {
  limpar();
  titulo('LISTA DE USUÁRIOS', cores.ciano);
  try {
    const res = await api.get('/usuarios');
    const rows = res.data.data ?? res.data;
    if (!rows.length) { console.log('\nNenhum usuário.'); }
    else { console.log(''); rows.forEach((u: any) => console.log(`  [${colorir(String(u.id), cores.dim)}] ${colorir(u.nome, cores.branco + cores.bold)} | ${u.email} | ${u.tipo}`)); }
  } catch (e: any) { console.log(colorir(`\n${emoji.erro} ${e.response?.data?.error}`, cores.vermelho)); }
  await pergunta(colorir('\nPressione Enter...', cores.dim));
}

async function atualizarUsuario() {
  limpar();
  titulo('ATUALIZAR USUÁRIO', cores.amarelo);
  const id = await pergunta('ID do usuário: ');
  const nome = await pergunta('Novo nome  (Enter para manter): ');
  const email = await pergunta('Novo email (Enter para manter): ');
  const tipo = await pergunta('Novo tipo [usuario/bibliotecario] (Enter para manter): ');
  const body: any = {};
  if (nome) body.nome = nome;
  if (email) body.email = email;
  if (tipo) body.tipo = tipo;
  try {
    const res = await api.put(`/usuarios/${id}`, body);
    console.log(colorir(`\n${emoji.check} ${res.data.message}`, cores.verde));
  } catch (e: any) { console.log(colorir(`\n${emoji.erro} ${e.response?.data?.error}`, cores.vermelho)); }
  await pergunta(colorir('\nPressione Enter...', cores.dim));
}

async function deletarUsuario() {
  limpar();
  titulo('DELETAR USUÁRIO', cores.vermelho);
  const id = await pergunta('ID do usuário: ');
  try {
    const res = await api.delete(`/usuarios/${id}`);
    console.log(colorir(`\n${emoji.check} ${res.data.message}`, cores.verde));
  } catch (e: any) { console.log(colorir(`\n${emoji.erro} ${e.response?.data?.error}`, cores.vermelho)); }
  await pergunta(colorir('\nPressione Enter...', cores.dim));
}

// ── PERFIL ────────────────────────────────────────────────────────────────────

async function menuMeuPerfil() {
  while (true) {
    limpar();
    titulo('MEU PERFIL', cores.magenta);
    console.log(colorir(`\n  Nome:  ${user.nome}`, cores.branco));
    console.log(colorir(`  Email: ${user.email}`, cores.branco));
    console.log(colorir(`  Tipo:  ${user.tipo}\n`, cores.branco));
    divisor();
    opcao('1', 'Editar perfil');
    opcao('0', 'Voltar');
    divisor();

    const op = await obterOpcaoValida(colorir('\nOpção: ', cores.amarelo + cores.bold), ['1', '0']);
    if (op === '') continue;
    if (op === '0') break;
    if (op === '1') await editarPerfil();
  }
}

async function editarPerfil() {
  limpar();
  titulo('EDITAR PERFIL', cores.amarelo);
  const nome = await pergunta(`Novo nome  (atual: ${user.nome}):  `);
  const email = await pergunta(`Novo email (atual: ${user.email}): `);
  const senha = await pergunta('Nova senha (Enter para manter):    ');
  const body: any = {};
  if (nome) body.nome = nome;
  if (email) body.email = email;
  if (senha) body.senha = senha;
  try {
    const res = await api.put('/auth/perfil', body);
    if (nome) user.nome = nome;
    if (email) user.email = email;
    console.log(colorir(`\n${emoji.check} ${res.data.message}`, cores.verde));
  } catch (e: any) { console.log(colorir(`\n${emoji.erro} ${e.response?.data?.error}`, cores.vermelho)); }
  await pergunta(colorir('\nPressione Enter...', cores.dim));
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────

async function mostrarDashboard() {
  try {
    const res = await api.get('/stats');
    const stats = res.data.stats;
    console.log('');
    stats.forEach((s: any) => {
      console.log(`  ${s.label.padEnd(26)} ${colorir(String(s.valor).padStart(5), cores.amarelo + cores.bold)}`);
    });
  } catch { /* silencioso */ }
}

// ── MENU PRINCIPAL ────────────────────────────────────────────────────────────

async function menu() {
  while (true) {
    limpar();
    mostrarBanner();
    const cor = user.tipo === 'bibliotecario' ? cores.magenta : cores.ciano;
    console.log(colorir(`\n  ${user.tipo === 'bibliotecario' ? emoji.admin : emoji.usuario}  ${user.nome.toUpperCase()} (${user.tipo})`, cor + cores.bold));
    await mostrarDashboard();
    divisor();

    if (user.tipo === 'bibliotecario') {
      opcao('1', 'Consultar Acervo');
      opcao('2', 'Empréstimos');
      opcao('3', 'Usuários');
      opcao('4', 'Meu Perfil');
      opcao('0', 'Sair');
      divisor();

      const op = await obterOpcaoValida(colorir('\nOpção: ', cores.amarelo + cores.bold), ['1', '2', '3', '4', '0']);
      if (op === '') continue;
      if (op === '0') break;
      if (op === '1') await visualizarAcervo();
      else if (op === '2') await menuEmprestimos();
      else if (op === '3') await menuUsuarios();
      else if (op === '4') await menuMeuPerfil();
    } else {
      opcao('1', 'Consultar Acervo');
      opcao('2', 'Meus Empréstimos');
      opcao('3', 'Meu Perfil');
      opcao('0', 'Sair');
      divisor();

      const op = await obterOpcaoValida(colorir('\nOpção: ', cores.amarelo + cores.bold), ['1', '2', '3', '0']);
      if (op === '') continue;
      if (op === '0') break;
      if (op === '1') await visualizarAcervo();
      else if (op === '2') await meusAlugueis();
      else if (op === '3') await menuMeuPerfil();
    }
  }
  token = null; user = null;
  return start();
}

// ── INÍCIO ────────────────────────────────────────────────────────────────────

async function start() {
  limpar(); mostrarBanner(); divisor();
  opcao('1', 'Login');
  opcao('2', 'Criar conta');
  opcao('0', 'Sair');
  divisor();

  const op = await obterOpcaoValida(colorir('\n> ', cores.amarelo + cores.bold), ['1', '2', '0']);
  if (op === '0') process.exit(0);
  if (op === '') return start();

  const email = await pergunta(`${emoji.email} Email: `);
  const senha = await pergunta(`${emoji.senha} Senha: `);

  try {
    let res;
    if (op === '2') {
      const nome = await pergunta(`${emoji.usuario} Nome: `);
      res = await api.post('/auth/registrar', { nome, email, senha, tipo: 'usuario' });
    } else {
      res = await api.post('/auth/login', { email, senha });
    }
    token = res.data.token;
    user = res.data.usuario;
    await menu();
  } catch (e: any) {
    console.log(colorir(`\n${emoji.erro} ${e.response?.data?.error || 'Erro'}`, cores.vermelho));
    await pergunta('Enter para voltar...');
    start();
  }
}

start();