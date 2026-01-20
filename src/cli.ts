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

// ============ ESTILIZAÇÃO ============
const cores = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  vermelho: '\x1b[31m', verde: '\x1b[32m', amarelo: '\x1b[33m',
  azul: '\x1b[34m', magenta: '\x1b[35m', ciano: '\x1b[36m', branco: '\x1b[37m',
};

const emoji = {
  livro: '📚', usuario: '👤', admin: '👨‍💼', aluguel: '📋', check: '✅',
  erro: '❌', info: 'ℹ️', voltar: '↩️', sair: '🚪', adicionar: '➕',
  calendario: '📅', local: '📍', email: '📧', senha: '🔒'
};

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
  console.log(colorir('           Sistema de Gerenciamento de Biblioteca v1.0.0', cores.dim));
}

function divisor(cor: string = cores.ciano): void { console.log(colorir('─'.repeat(70), cor)); }

function caixaOpcao(numero: string, texto: string, icone: string): void {
  console.log(`  ${colorir(numero, cores.amarelo + cores.bold)} ${icone}  ${texto}`);
}

// ============ UTILITÁRIOS DE INTERFACE ============

async function obterOpcaoValida(msg: string, opcoes: string[]): Promise<string> {
  const op = await pergunta(msg);
  if (!opcoes.includes(op)) {
    console.log(colorir(`\n${emoji.erro} Opção "${op}" inválida! Tente: ${opcoes.join(', ')}`, cores.vermelho + cores.bold));
    await pergunta(colorir(`\n${emoji.voltar} Pressione Enter...`, cores.dim));
    return "";
  }
  return op;
}

// ============ SUB-MENUS (AÇÕES) ============

async function visualizarAcervo() {
  limpar();
  titulo('📚 ACERVO DE LIVROS 📚', cores.magenta);
  try {
    const res = await api.get('/livros');
    res.data.length === 0 ? console.log('\nNenhum livro.') : console.table(res.data);
  } catch (e: any) { console.log(colorir(`\n${emoji.erro} ${e.response?.data?.error}`, cores.vermelho)); }
  await pergunta(colorir(`\n${emoji.voltar} Pressione Enter...`, cores.dim));
}

async function cadastrarLivro() {
  limpar();
  titulo('➕ NOVO LIVRO', cores.verde);
  const body = {
    titulo: await pergunta('Título: '),
    autor: await pergunta('Autor: '),
    ano_lancamento: parseInt(await pergunta('Ano: ')),
    genero: await pergunta('Gênero: ')
  };
  try {
    const res = await api.post('/livros', body);
    console.log(colorir(`\n${emoji.check} ${res.data.message}`, cores.verde));
  } catch (e: any) { console.log(colorir(`\n${emoji.erro} ${e.response?.data?.error}`, cores.vermelho)); }
  await pergunta(colorir(`\n${emoji.voltar} Pressione Enter...`, cores.dim));
}

async function gerenciarAlugueis(modo: 'todos' | 'meus') {
  limpar();
  titulo(modo === 'todos' ? '📋 TODOS EMPRÉSTIMOS' : '📖 MEUS EMPRÉSTIMOS', cores.azul);
  try {
    const res = await api.get(`/alugueis/${modo}`);
    res.data.length === 0 ? console.log('\nNada encontrado.') : console.table(res.data);
  } catch (e: any) { console.log(colorir(`\n${emoji.erro} ${e.response?.data?.error}`, cores.vermelho)); }
  await pergunta(colorir(`\n${emoji.voltar} Pressione Enter...`, cores.dim));
}

async function registrarAluguel() {
  limpar();
  titulo('➕ NOVO ALUGUEL', cores.verde);
  const dados = { livro_id: await pergunta('ID Livro: '), usuario_id: await pergunta('ID Usuário: ') };
  try {
    const res = await api.post('/alugueis', dados);
    console.log(colorir(`\n${emoji.check} ${res.data.message}`, cores.verde));
  } catch (e: any) { console.log(colorir(`\n${emoji.erro} ${e.response?.data?.error}`, cores.vermelho)); }
  await pergunta(colorir(`\n${emoji.voltar} Pressione Enter...`, cores.dim));
}

async function devolverLivro() {
  limpar();
  titulo('↩️ DEVOLVER', cores.amarelo);
  const id = await pergunta('ID Aluguel: ');
  try {
    const res = await api.put(`/alugueis/${id}/devolver`);
    console.log(colorir(`\n${emoji.check} ${res.data.message}`, cores.verde));
  } catch (e: any) { console.log(colorir(`\n${emoji.erro} ${e.response?.data?.error}`, cores.vermelho)); }
  await pergunta(colorir(`\n${emoji.voltar} Pressione Enter...`, cores.dim));
}

// ============ FLUXO PRINCIPAL ============

async function menu() {
  while (true) {
    limpar();
    mostrarBanner();
    const cor = user.tipo === 'bibliotecario' ? cores.magenta : cores.ciano;
    console.log(colorir(`\n  ${user.tipo === 'bibliotecario' ? emoji.admin : emoji.usuario} ${user.nome.toUpperCase()} (${user.tipo})`, cor + cores.bold));
    divisor();

    const opcoes = user.tipo === 'bibliotecario' ? ['1', '2', '3', '4', '5', '0'] : ['1', '2', '0'];

    caixaOpcao('1', 'Consultar Acervo', emoji.livro);
    if (user.tipo === 'bibliotecario') {
      caixaOpcao('2', 'Empréstimos Ativos', emoji.aluguel);
      caixaOpcao('3', 'Novo Aluguel', emoji.adicionar);
      caixaOpcao('4', 'Devolver Livro', emoji.voltar);
      caixaOpcao('5', 'Cadastrar Livro', emoji.adicionar);
    } else {
      caixaOpcao('2', 'Meus Empréstimos', emoji.aluguel);
    }
    caixaOpcao('0', 'Sair', emoji.sair);
    divisor();

    const op = await obterOpcaoValida(colorir('\nOpção: ', cores.amarelo + cores.bold), opcoes);
    if (op === "") continue;
    if (op === '0') break;

    if (op === '1') await visualizarAcervo();
    else if (op === '2') await gerenciarAlugueis(user.tipo === 'bibliotecario' ? 'todos' : 'meus');
    else if (op === '3') await registrarAluguel();
    else if (op === '4') await devolverLivro();
    else if (op === '5') await cadastrarLivro();
  }
  token = null; user = null;
  return start();
}

async function start() {
  limpar(); mostrarBanner(); divisor();
  caixaOpcao('1', 'Login', '🔐');
  caixaOpcao('2', 'Cadastro', '✍️');
  caixaOpcao('0', 'Sair', emoji.sair);
  divisor();

  const op = await obterOpcaoValida(colorir('\n> ', cores.amarelo + cores.bold), ['1', '2', '0', 'admin']);
  if (op === '0') process.exit(0);
  if (op === "") return start();

  const email = await pergunta(`${emoji.email} Email: `);
  const senha = await pergunta(`${emoji.senha} Senha: `);

  try {
    let res;
    if (op === '2' || op === 'admin') {
      const nome = await pergunta(`${emoji.usuario} Nome: `);
      res = await api.post('/auth/registrar', { nome, email, senha, tipo: op === 'admin' ? 'bibliotecario' : 'usuario' });
    } else {
      res = await api.post('/auth/login', { email, senha });
    }
    token = res.data.token; user = res.data.usuario;
    await menu();
  } catch (e: any) {
    console.log(colorir(`\n${emoji.erro} ${e.response?.data?.error || 'Erro'}`, cores.vermelho));
    await pergunta('Enter para voltar...');
    start();
  }
}

start();