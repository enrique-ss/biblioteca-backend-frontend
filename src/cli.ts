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
  check: '✅', erro: '❌',
  email: '📧', senha: '🔒', usuario: '👤', admin: '👨‍💼',
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

function opcao(numero: string, texto: string): void {
  console.log(`  ${colorir(numero, cores.amarelo + cores.bold)}  ${texto}`);
}

async function obterOpcaoValida(msg: string, opcoes: string[]): Promise<string> {
  const op = await pergunta(msg);
  if (!opcoes.includes(op)) {
    console.log(colorir(`\nOpcao "${op}" invalida! Tente: ${opcoes.join(', ')}`, cores.vermelho + cores.bold));
    await pergunta(colorir(`\nPressione Enter...`, cores.dim));
    return '';
  }
  return op;
}

// ============ 2. CONSULTAR ACERVO ============

async function visualizarAcervo() {
  limpar();
  titulo('ACERVO DE LIVROS', cores.magenta);
  try {
    const res = await api.get('/livros');
    res.data.length === 0 ? console.log('\nNenhum livro cadastrado.') : console.table(res.data);
  } catch (e: any) {
    console.log(colorir(`\n${emoji.erro} ${e.response?.data?.error}`, cores.vermelho));
  }

  if (user.tipo === 'bibliotecario') {
    divisor();
    opcao('1', 'Adicionar Livro');
    opcao('0', 'Voltar');
    divisor();
    const op = await obterOpcaoValida(colorir('\nOpcao: ', cores.amarelo + cores.bold), ['1', '0']);
    if (op === '1') await cadastrarLivro();
  } else {
    await pergunta(colorir(`\nPressione Enter para voltar...`, cores.dim));
  }
}

async function cadastrarLivro() {
  limpar();
  titulo('NOVO LIVRO', cores.verde);
  const body = {
    titulo: await pergunta('Titulo: '),
    autor: await pergunta('Autor: '),
    ano_lancamento: parseInt(await pergunta('Ano: ')),
    genero: await pergunta('Genero: '),
  };
  try {
    const res = await api.post('/livros', body);
    console.log(colorir(`\n${emoji.check} ${res.data.message}`, cores.verde));
  } catch (e: any) {
    console.log(colorir(`\n${emoji.erro} ${e.response?.data?.error}`, cores.vermelho));
  }
  await pergunta(colorir(`\nPressione Enter...`, cores.dim));
}

// ============ 3. EMPRESTIMOS (BIBLIOTECARIO) ============

async function menuEmprestimos() {
  while (true) {
    limpar();
    titulo('EMPRESTIMOS', cores.azul);
    opcao('1', 'Ver todos os emprestimos');
    opcao('2', 'Novo aluguel');
    opcao('3', 'Devolver livro');
    opcao('0', 'Voltar');
    divisor();

    const op = await obterOpcaoValida(colorir('\nOpcao: ', cores.amarelo + cores.bold), ['1', '2', '3', '0']);
    if (op === '') continue;
    if (op === '0') break;
    if (op === '1') await listarTodosAlugueis();
    else if (op === '2') await registrarAluguel();
    else if (op === '3') await devolverLivro();
  }
}

async function listarTodosAlugueis() {
  limpar();
  titulo('TODOS OS EMPRESTIMOS', cores.azul);
  try {
    const res = await api.get('/alugueis/todos');
    res.data.length === 0 ? console.log('\nNenhum emprestimo ativo.') : console.table(res.data);
  } catch (e: any) {
    console.log(colorir(`\n${emoji.erro} ${e.response?.data?.error}`, cores.vermelho));
  }
  await pergunta(colorir(`\nPressione Enter...`, cores.dim));
}

async function registrarAluguel() {
  limpar();
  titulo('NOVO ALUGUEL', cores.verde);
  const dados = {
    livro_id: await pergunta('ID do Livro: '),
    usuario_id: await pergunta('ID do Usuario: '),
  };
  try {
    const res = await api.post('/alugueis', dados);
    console.log(colorir(`\n${emoji.check} ${res.data.message}`, cores.verde));
    console.log(colorir(`   Prazo: ${res.data.prazo}`, cores.dim));
  } catch (e: any) {
    console.log(colorir(`\n${emoji.erro} ${e.response?.data?.error}`, cores.vermelho));
  }
  await pergunta(colorir(`\nPressione Enter...`, cores.dim));
}

async function devolverLivro() {
  limpar();
  titulo('DEVOLVER LIVRO', cores.amarelo);
  const id = await pergunta('ID do Aluguel: ');
  try {
    const res = await api.put(`/alugueis/${id}/devolver`);
    console.log(colorir(`\n${emoji.check} ${res.data.message}`, cores.verde));
  } catch (e: any) {
    console.log(colorir(`\n${emoji.erro} ${e.response?.data?.error}`, cores.vermelho));
  }
  await pergunta(colorir(`\nPressione Enter...`, cores.dim));
}

// ============ 3. MEUS EMPRESTIMOS (USUARIO) ============

async function meusAlugueis() {
  limpar();
  titulo('MEUS EMPRESTIMOS', cores.azul);
  try {
    const res = await api.get('/alugueis/meus');
    res.data.length === 0 ? console.log('\nNenhum emprestimo encontrado.') : console.table(res.data);
  } catch (e: any) {
    console.log(colorir(`\n${emoji.erro} ${e.response?.data?.error}`, cores.vermelho));
  }
  await pergunta(colorir(`\nPressione Enter...`, cores.dim));
}

// ============ 4. USUARIOS (BIBLIOTECARIO) ============

async function menuUsuarios() {
  while (true) {
    limpar();
    titulo('USUARIOS', cores.ciano);
    opcao('1', 'Listar usuarios');
    opcao('2', 'Atualizar usuario');
    opcao('3', 'Deletar usuario');
    opcao('0', 'Voltar');
    divisor();

    const op = await obterOpcaoValida(colorir('\nOpcao: ', cores.amarelo + cores.bold), ['1', '2', '3', '0']);
    if (op === '') continue;
    if (op === '0') break;
    if (op === '1') await listarUsuarios();
    else if (op === '2') await atualizarUsuario();
    else if (op === '3') await deletarUsuario();
  }
}

async function listarUsuarios() {
  limpar();
  titulo('LISTA DE USUARIOS', cores.ciano);
  try {
    const res = await api.get('/usuarios');
    res.data.length === 0 ? console.log('\nNenhum usuario.') : console.table(res.data);
  } catch (e: any) {
    console.log(colorir(`\n${emoji.erro} ${e.response?.data?.error}`, cores.vermelho));
  }
  await pergunta(colorir(`\nPressione Enter...`, cores.dim));
}

async function atualizarUsuario() {
  limpar();
  titulo('ATUALIZAR USUARIO', cores.amarelo);
  const id = await pergunta('ID do usuario: ');
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
  } catch (e: any) {
    console.log(colorir(`\n${emoji.erro} ${e.response?.data?.error}`, cores.vermelho));
  }
  await pergunta(colorir(`\nPressione Enter...`, cores.dim));
}

async function deletarUsuario() {
  limpar();
  titulo('DELETAR USUARIO', cores.vermelho);
  const id = await pergunta('ID do usuario: ');
  try {
    const res = await api.delete(`/usuarios/${id}`);
    console.log(colorir(`\n${emoji.check} ${res.data.message}`, cores.verde));
  } catch (e: any) {
    console.log(colorir(`\n${emoji.erro} ${e.response?.data?.error}`, cores.vermelho));
  }
  await pergunta(colorir(`\nPressione Enter...`, cores.dim));
}

// ============ 5. MEU PERFIL ============

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

    const op = await obterOpcaoValida(colorir('\nOpcao: ', cores.amarelo + cores.bold), ['1', '0']);
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
  } catch (e: any) {
    console.log(colorir(`\n${emoji.erro} ${e.response?.data?.error}`, cores.vermelho));
  }
  await pergunta(colorir(`\nPressione Enter...`, cores.dim));
}

// ============ MENU PRINCIPAL ============

async function menu() {
  while (true) {
    limpar();
    mostrarBanner();
    const cor = user.tipo === 'bibliotecario' ? cores.magenta : cores.ciano;
    console.log(colorir(`\n  ${user.tipo === 'bibliotecario' ? emoji.admin : emoji.usuario}  ${user.nome.toUpperCase()} (${user.tipo})`, cor + cores.bold));
    divisor();

    if (user.tipo === 'bibliotecario') {
      opcao('1', 'Consultar Acervo');
      opcao('2', 'Emprestimos');
      opcao('3', 'Usuarios');
      opcao('4', 'Meu Perfil');
      opcao('0', 'Sair');
      divisor();

      const op = await obterOpcaoValida(colorir('\nOpcao: ', cores.amarelo + cores.bold), ['1', '2', '3', '4', '0']);
      if (op === '') continue;
      if (op === '0') break;
      if (op === '1') await visualizarAcervo();
      else if (op === '2') await menuEmprestimos();
      else if (op === '3') await menuUsuarios();
      else if (op === '4') await menuMeuPerfil();

    } else {
      opcao('1', 'Consultar Acervo');
      opcao('2', 'Meus Emprestimos');
      opcao('3', 'Meu Perfil');
      opcao('0', 'Sair');
      divisor();

      const op = await obterOpcaoValida(colorir('\nOpcao: ', cores.amarelo + cores.bold), ['1', '2', '3', '0']);
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

// ============ 1. MENU INICIAL ============

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