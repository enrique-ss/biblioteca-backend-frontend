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

// ============ CORES E ESTILOS ============
const cores = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  
  // Cores do texto
  preto: '\x1b[30m',
  vermelho: '\x1b[31m',
  verde: '\x1b[32m',
  amarelo: '\x1b[33m',
  azul: '\x1b[34m',
  magenta: '\x1b[35m',
  ciano: '\x1b[36m',
  branco: '\x1b[37m',
  
  // Cores de fundo
  bgPreto: '\x1b[40m',
  bgVermelho: '\x1b[41m',
  bgVerde: '\x1b[42m',
  bgAmarelo: '\x1b[43m',
  bgAzul: '\x1b[44m',
  bgMagenta: '\x1b[45m',
  bgCiano: '\x1b[46m',
  bgBranco: '\x1b[47m',
};

const emoji = {
  livro: '📚',
  usuario: '👤',
  admin: '👨‍💼',
  aluguel: '📋',
  check: '✅',
  erro: '❌',
  info: 'ℹ️',
  voltar: '↩️',
  sair: '🚪',
  adicionar: '➕',
  editar: '✏️',
  deletar: '🗑️',
  lupa: '🔍',
  calendario: '📅',
  local: '📍',
  email: '📧',
  senha: '🔒',
  telefone: '📞',
  endereco: '🏠',
};

function colorir(texto: string, cor: string): string {
  return `${cor}${texto}${cores.reset}`;
}

function titulo(texto: string, cor: string = cores.ciano): void {
  const linha = '═'.repeat(texto.length + 4);
  console.log(colorir(linha, cor));
  console.log(colorir(`  ${texto}  `, cor));
  console.log(colorir(linha, cor));
}

function subtitulo(texto: string): void {
  console.log(colorir(`\n${texto}`, cores.amarelo + cores.bold));
  console.log(colorir('─'.repeat(texto.length), cores.amarelo));
}

function sucesso(texto: string): void {
  console.log(colorir(`\n${emoji.check} ${texto}`, cores.verde + cores.bold));
}

function erro(texto: string): void {
  console.log(colorir(`\n${emoji.erro} ${texto}`, cores.vermelho + cores.bold));
}

function info(texto: string): void {
  console.log(colorir(`${emoji.info} ${texto}`, cores.ciano));
}

function mostrarBanner() {
  const banner = `
  ${cores.magenta}██╗     ██╗   ██╗██╗███████╗ █████╗ ████████╗███████╗ ██████╗ █████╗ ${cores.reset}
  ${cores.magenta}██║     ██║   ██║██║╚══███╔╝██╔══██╗╚══██╔══╝██╔════╝██╔════╝██╔══██╗${cores.reset}
  ${cores.ciano}██║     ██║   ██║██║  ███╔╝ ███████║   ██║   █████╗  ██║     ███████║${cores.reset}
  ${cores.ciano}██║     ██║   ██║██║ ███╔╝  ██╔══██║   ██║   ██╔══╝  ██║     ██╔══██║${cores.reset}
  ${cores.azul}███████╗╚██████╔╝██║███████╗██║  ██║   ██║   ███████╗╚██████╗██║  ██║${cores.reset}
  ${cores.azul}╚══════╝ ╚═════╝ ╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝ ╚═════╝╚═╝  ╚═╝${cores.reset}
  `;
  console.log(banner);
  console.log(colorir('           Sistema de Gerenciamento de Biblioteca', cores.dim));
  console.log(colorir('                      v1.0.0', cores.dim));
}

function divisor(cor: string = cores.ciano): void {
  console.log(colorir('─'.repeat(70), cor));
}

function caixaOpcao(numero: string, texto: string, icone: string): void {
  console.log(`  ${colorir(numero, cores.amarelo + cores.bold)} ${icone}  ${texto}`);
}

// ============ FUNÇÕES DE LIVROS ============

async function visualizarAcervo() {
  limpar();
  titulo('📚 ACERVO DE LIVROS 📚', cores.magenta);
  
  try {
    const res = await api.get('/livros');
    if (res.data.length === 0) {
      info('Nenhum livro cadastrado ainda.');
    } else {
      console.log('');
      console.table(res.data.map((l: any) => ({
        ID: l.id,
        Título: l.titulo,
        Autor: l.autor,
        Gênero: l.genero || 'N/A',
        Local: `${l.corredor}-${l.prateleira}`,
        Status: l.status === 'disponivel' ? '🟢 DISPONÍVEL' : '🔴 ALUGADO'
      })));
    }
  } catch (e: any) {
    erro(`Erro ao carregar acervo: ${e.response?.data?.error || e.message}`);
  }
  
  await pergunta(colorir(`\n${emoji.voltar} Pressione Enter para voltar...`, cores.dim));
}

async function cadastrarLivro() {
  limpar();
  titulo('➕ CADASTRAR NOVO LIVRO', cores.verde);
  
  try {
    console.log('');
    const titulo = await pergunta(colorir(`${emoji.livro} Título: `, cores.ciano));
    const autor = await pergunta(colorir(`✍️  Autor: `, cores.ciano));
    const ano = await pergunta(colorir(`${emoji.calendario} Ano de lançamento: `, cores.ciano));
    const genero = await pergunta(colorir(`🎭 Gênero: `, cores.ciano));
    const isbn = await pergunta(colorir(`🔢 ISBN (opcional): `, cores.ciano));

    const res = await api.post('/livros', {
      titulo,
      autor,
      ano_lancamento: parseInt(ano),
      genero,
      isbn: isbn || null
    });

    sucesso('Livro cadastrado com sucesso!');
    console.log(colorir(`${emoji.local} Localização automática: Corredor ${res.data.corredor} - ${res.data.prateleira}`, cores.verde));
  } catch (e: any) {
    erro(`Erro: ${e.response?.data?.error || e.message}`);
  }
  
  await pergunta(colorir(`\n${emoji.voltar} Pressione Enter para voltar...`, cores.dim));
}

// ============ FUNÇÕES DE ALUGUÉIS ============

async function listarEmprestimosAtivos() {
  limpar();
  titulo('📋 EMPRÉSTIMOS ATIVOS', cores.azul);
  
  try {
    const res = await api.get('/alugueis/todos');
    const ativos = res.data.filter((a: any) => a.status === 'ativo');
    
    if (ativos.length === 0) {
      info('Nenhum empréstimo ativo no momento.');
    } else {
      console.log('');
      console.table(ativos.map((a: any) => ({
        ID: a.id,
        Usuário: a.usuario,
        Livro: a.titulo,
        Alugado: new Date(a.data_aluguel).toLocaleDateString('pt-BR'),
        'Prazo Devolução': new Date(a.data_prevista_devolucao).toLocaleDateString('pt-BR'),
        Local: `${a.corredor}-${a.prateleira}`
      })));
    }
  } catch (e: any) {
    erro(`Erro: ${e.response?.data?.error || e.message}`);
  }
  
  await pergunta(colorir(`\n${emoji.voltar} Pressione Enter para voltar...`, cores.dim));
}

async function registrarNovoAluguel() {
  limpar();
  titulo('➕ REGISTRAR NOVO ALUGUEL', cores.verde);
  
  try {
    // Listar livros disponíveis
    const livros = await api.get('/livros?status=disponivel');
    
    if (livros.data.length === 0) {
      erro('Nenhum livro disponível para aluguel.');
      await pergunta(colorir(`\n${emoji.voltar} Pressione Enter para voltar...`, cores.dim));
      return;
    }
    
    subtitulo('📚 LIVROS DISPONÍVEIS');
    console.table(livros.data.map((l: any) => ({
      ID: l.id,
      Título: l.titulo,
      Autor: l.autor,
      Local: `${l.corredor}-${l.prateleira}`
    })));
    
    const livro_id = await pergunta(colorir(`\n${emoji.livro} ID do livro: `, cores.ciano));
    
    // Listar usuários
    const usuarios = await api.get('/usuarios');
    subtitulo('👥 USUÁRIOS CADASTRADOS');
    console.table(usuarios.data.map((u: any) => ({
      ID: u.id,
      Nome: u.nome,
      Email: u.email,
      Tipo: u.tipo === 'bibliotecario' ? '👨‍💼 Bibliotecário' : '👤 Usuário'
    })));
    
    const usuario_id = await pergunta(colorir(`\n${emoji.usuario} ID do usuário: `, cores.ciano));
    
    const res = await api.post('/alugueis', {
      livro_id: parseInt(livro_id),
      usuario_id: parseInt(usuario_id)
    });
    
    sucesso(res.data.message);
    console.log(colorir(`${emoji.calendario} Prazo de devolução: ${res.data.prazo}`, cores.verde));
  } catch (e: any) {
    erro(`Erro: ${e.response?.data?.error || e.message}`);
  }
  
  await pergunta(colorir(`\n${emoji.voltar} Pressione Enter para voltar...`, cores.dim));
}

async function devolverLivro() {
  limpar();
  titulo('↩️  DEVOLVER LIVRO', cores.amarelo);
  
  try {
    const res = await api.get('/alugueis/todos');
    const ativos = res.data.filter((a: any) => a.status === 'ativo');
    
    if (ativos.length === 0) {
      info('Nenhum empréstimo ativo para devolver.');
      await pergunta(colorir(`\n${emoji.voltar} Pressione Enter para voltar...`, cores.dim));
      return;
    }
    
    console.log('');
    console.table(ativos.map((a: any) => ({
      ID: a.id,
      Usuário: a.usuario,
      Livro: a.titulo,
      'Prazo': new Date(a.data_prevista_devolucao).toLocaleDateString('pt-BR'),
      Local: `${a.corredor}-${a.prateleira}`
    })));
    
    const id = await pergunta(colorir(`\n🔢 ID do aluguel para devolver: `, cores.ciano));
    
    await api.put(`/alugueis/${id}/devolver`);
    sucesso('Livro devolvido com sucesso!');
  } catch (e: any) {
    erro(`Erro: ${e.response?.data?.error || e.message}`);
  }
  
  await pergunta(colorir(`\n${emoji.voltar} Pressione Enter para voltar...`, cores.dim));
}

async function meusEmprestimos() {
  limpar();
  titulo('📖 MEUS EMPRÉSTIMOS', cores.magenta);
  
  try {
    const res = await api.get('/alugueis/meus');
    
    if (res.data.length === 0) {
      info('Você não tem empréstimos registrados.');
    } else {
      console.log('');
      console.table(res.data.map((a: any) => ({
        Livro: a.titulo,
        Autor: a.autor,
        Alugado: new Date(a.data_aluguel).toLocaleDateString('pt-BR'),
        Prazo: new Date(a.data_prevista_devolucao).toLocaleDateString('pt-BR'),
        Status: a.status === 'ativo' ? '🟡 ATIVO' : '🟢 DEVOLVIDO',
        Local: `${a.corredor}-${a.prateleira}`
      })));
    }
  } catch (e: any) {
    erro(`Erro: ${e.response?.data?.error || e.message}`);
  }
  
  await pergunta(colorir(`\n${emoji.voltar} Pressione Enter para voltar...`, cores.dim));
}

// ============ FUNÇÕES DE USUÁRIOS ============

async function gerenciarUsuarios() {
  while (true) {
    limpar();
    titulo('👥 GERENCIAR USUÁRIOS', cores.ciano);
    
    try {
      const res = await api.get('/usuarios');
      console.log('');
      console.table(res.data.map((u: any) => ({
        ID: u.id,
        Nome: u.nome,
        Email: u.email,
        Tipo: u.tipo === 'bibliotecario' ? '👨‍💼 Bibliotecário' : '👤 Usuário'
      })));
    } catch (e: any) {
      erro(`Erro ao carregar usuários: ${e.response?.data?.error || e.message}`);
    }
    
    console.log('');
    divisor(cores.amarelo);
    caixaOpcao('1', 'Editar Usuário', emoji.editar);
    caixaOpcao('2', 'Excluir Usuário', emoji.deletar);
    caixaOpcao('0', 'Voltar', emoji.voltar);
    divisor(cores.amarelo);
    
    const op = await pergunta(colorir('\nOpção: ', cores.amarelo + cores.bold));
    
    if (op === '1') await editarUsuario();
    else if (op === '2') await excluirUsuario();
    else if (op === '0') break;
  }
}

async function editarUsuario() {
  limpar();
  titulo('✏️  EDITAR USUÁRIO', cores.amarelo);
  
  try {
    const id = await pergunta(colorir(`\n🔢 ID do usuário para editar: `, cores.ciano));
    
    // Buscar dados atuais
    const usuarios = await api.get('/usuarios');
    const usuarioAtual = usuarios.data.find((u: any) => u.id === parseInt(id));
    
    if (!usuarioAtual) {
      erro('Usuário não encontrado!');
      await pergunta(colorir(`\n${emoji.voltar} Pressione Enter para voltar...`, cores.dim));
      return;
    }
    
    subtitulo('📋 DADOS ATUAIS');
    console.log(colorir(`Nome: ${usuarioAtual.nome}`, cores.dim));
    console.log(colorir(`Email: ${usuarioAtual.email}`, cores.dim));
    console.log(colorir(`Tipo: ${usuarioAtual.tipo}\n`, cores.dim));
    
    info('Deixe em branco para manter o valor atual');
    
    const nome = await pergunta(colorir(`\n${emoji.usuario} Novo nome: `, cores.ciano));
    const email = await pergunta(colorir(`${emoji.email} Novo email: `, cores.ciano));
    
    console.log(colorir('\nTipo: 1. Usuário | 2. Bibliotecário | 0. Manter atual', cores.amarelo));
    const tipoOp = await pergunta(colorir('Novo tipo: ', cores.ciano));
    
    let tipo = usuarioAtual.tipo;
    if (tipoOp === '1') tipo = 'usuario';
    else if (tipoOp === '2') tipo = 'bibliotecario';
    
    const dados: any = {};
    if (nome) dados.nome = nome;
    if (email) dados.email = email;
    if (tipoOp === '1' || tipoOp === '2') dados.tipo = tipo;
    
    if (Object.keys(dados).length === 0) {
      info('Nenhuma alteração realizada.');
    } else {
      await api.put(`/usuarios/${id}`, dados);
      sucesso('Usuário atualizado com sucesso!');
    }
  } catch (e: any) {
    erro(`Erro: ${e.response?.data?.error || e.message}`);
  }
  
  await pergunta(colorir(`\n${emoji.voltar} Pressione Enter para voltar...`, cores.dim));
}

async function excluirUsuario() {
  limpar();
  titulo('🗑️  EXCLUIR USUÁRIO', cores.vermelho);
  
  try {
    const usuarios = await api.get('/usuarios');
    console.log('');
    console.table(usuarios.data.map((u: any) => ({
      ID: u.id,
      Nome: u.nome,
      Email: u.email,
      Tipo: u.tipo
    })));
    
    const id = await pergunta(colorir(`\n🔢 ID do usuário para excluir: `, cores.ciano));
    
    const confirma = await pergunta(colorir(`\n⚠️  Tem certeza? Esta ação não pode ser desfeita! (s/N): `, cores.vermelho + cores.bold));
    
    if (confirma.toLowerCase() === 's' || confirma.toLowerCase() === 'sim') {
      await api.delete(`/usuarios/${id}`);
      sucesso('Usuário excluído com sucesso!');
    } else {
      info('Operação cancelada.');
    }
  } catch (e: any) {
    erro(`Erro: ${e.response?.data?.error || e.message}`);
  }
  
  await pergunta(colorir(`\n${emoji.voltar} Pressione Enter para voltar...`, cores.dim));
}

// ============ MENU PRINCIPAL ============

async function menu() {
  limpar();
  mostrarBanner();
  
  const tipoIcon = user.tipo === 'bibliotecario' ? emoji.admin : emoji.usuario;
  const tipoCor = user.tipo === 'bibliotecario' ? cores.magenta : cores.ciano;
  
  console.log(colorir(`\n  ${tipoIcon} USUÁRIO: ${user.nome}`, tipoCor + cores.bold));
  console.log(colorir(`  🎭 CARGO: ${user.tipo.toUpperCase()}`, tipoCor + cores.bold));
  
  console.log('');
  divisor();
  
  caixaOpcao('1', 'Consultar Livros', emoji.livro);

  if (user.tipo === 'bibliotecario') {
    caixaOpcao('2', 'Empréstimos Ativos', emoji.aluguel);
    caixaOpcao('3', 'Registrar Novo Aluguel', emoji.adicionar);
    caixaOpcao('4', 'Devolver Livro', emoji.voltar);
    caixaOpcao('5', 'Cadastrar Novo Livro', emoji.adicionar);
    caixaOpcao('6', 'Gerenciar Usuários', emoji.usuario);
  } else {
    caixaOpcao('2', 'Meus Empréstimos', emoji.aluguel);
  }

  caixaOpcao('0', 'Sair', emoji.sair);
  divisor();

  const op = await pergunta(colorir('\nOpção: ', cores.amarelo + cores.bold));

  if (op === '1') await visualizarAcervo();
  else if (op === '2' && user.tipo === 'bibliotecario') await listarEmprestimosAtivos();
  else if (op === '2' && user.tipo === 'usuario') await meusEmprestimos();
  else if (op === '3' && user.tipo === 'bibliotecario') await registrarNovoAluguel();
  else if (op === '4' && user.tipo === 'bibliotecario') await devolverLivro();
  else if (op === '5' && user.tipo === 'bibliotecario') await cadastrarLivro();
  else if (op === '6' && user.tipo === 'bibliotecario') await gerenciarUsuarios();
  else if (op === '0') {
    token = null;
    user = null;
    return start();
  }

  menu();
}

// ============ LOGIN/REGISTRO ============

async function start() {
  limpar();
  mostrarBanner();

  console.log('');
  divisor();
  caixaOpcao('1', 'Login', '🔐');
  caixaOpcao('2', 'Cadastro', '✍️');
  caixaOpcao('0', 'Sair', emoji.sair);
  divisor();

  const op = await pergunta(colorir('\n> ', cores.amarelo + cores.bold));

  if (op === '0') {
    console.log(colorir('\n👋 Até logo!\n', cores.ciano));
    process.exit(0);
  }

  console.log('');
  const email = await pergunta(colorir(`${emoji.email} Email: `, cores.ciano));
  const senha = await pergunta(colorir(`${emoji.senha} Senha: `, cores.ciano));

  try {
    if (op === '2') {
      const nome = await pergunta(colorir(`${emoji.usuario} Nome: `, cores.ciano));
      console.log(colorir('\nTipo de conta: 1. Leitor | 2. Bibliotecário', cores.amarelo));
      const tOp = await pergunta(colorir('> ', cores.amarelo));
      const tipo = tOp === '2' ? 'bibliotecario' : 'usuario';

      const res = await api.post('/auth/registrar', { nome, email, senha, tipo });
      token = res.data.token;
      user = res.data.usuario;
      sucesso('Cadastro realizado com sucesso!');
    } else if (op === '1') {
      const res = await api.post('/auth/login', { email, senha });
      token = res.data.token;
      user = res.data.usuario;
      sucesso('Login realizado com sucesso!');
    } else {
      erro('Opção inválida!');
      await pergunta(colorir(`\n${emoji.voltar} Pressione Enter...`, cores.dim));
      return start();
    }

    await pergunta(colorir(`\n${emoji.voltar} Enter para acessar o sistema...`, cores.verde));
    menu();
  } catch (e: any) {
    erro(`Erro: ${e.response?.data?.error || 'Servidor offline'}`);
    await pergunta(colorir(`\n${emoji.voltar} Pressione Enter...`, cores.dim));
    start();
  }
}

start();