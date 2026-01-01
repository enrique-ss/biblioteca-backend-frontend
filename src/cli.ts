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

function mostrarBanner() {
  console.log(`
  ██╗     ██╗   ██╗██╗███████╗ █████╗ ████████╗███████╗ ██████╗ █████╗ 
  ██║     ██║   ██║██║╚══███╔╝██╔══██╗╚══██╔══╝██╔════╝██╔════╝██╔══██╗
  ██║     ██║   ██║██║  ███╔╝ ███████║   ██║   █████╗  ██║     ███████║
  ██║     ██║   ██║██║ ███╔╝  ██╔══██║   ██║   ██╔══╝  ██║     ██╔══██║
  ███████╗╚██████╔╝██║███████╗██║  ██║   ██║   ███████╗╚██████╗██║  ██║
  ╚══════╝ ╚═════╝ ╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝ ╚═════╝╚═╝  ╚═╝
  `);
}

function divisor() {
  console.log('─'.repeat(70));
}

// ============ FUNÇÕES DE LIVROS ============

async function visualizarAcervo() {
  limpar();
  console.log('══════════════════ ACERVO DE LIVROS ══════════════════');
  try {
    const res = await api.get('/livros');
    if (res.data.length === 0) {
      console.log('\n📚 Nenhum livro cadastrado ainda.');
    } else {
      console.table(res.data.map((l: any) => ({
        ID: l.id,
        Título: l.titulo,
        Autor: l.autor,
        Gênero: l.genero || 'N/A',
        Local: `Corredor ${l.corredor} - ${l.prateleira}`,
        Status: l.status.toUpperCase()
      })));
    }
  } catch (e: any) {
    console.log('❌ Erro ao carregar acervo:', e.response?.data?.error || e.message);
  }
  await pergunta('\n↩️  Pressione Enter para voltar...');
}

async function cadastrarLivro() {
  limpar();
  console.log('══════════════════ CADASTRAR NOVO LIVRO ══════════════════');

  try {
    const titulo = await pergunta('📖 Título: ');
    const autor = await pergunta('✍️  Autor: ');
    const ano = await pergunta('📅 Ano de lançamento: ');
    const genero = await pergunta('🎭 Gênero: ');
    const isbn = await pergunta('🔢 ISBN (opcional): ');

    const res = await api.post('/livros', {
      titulo,
      autor,
      ano_lancamento: parseInt(ano),
      genero,
      isbn: isbn || null
    });

    console.log('\n✅ Livro cadastrado com sucesso!');
    console.log(`📍 Localização automática: Corredor ${res.data.corredor} - ${res.data.prateleira}`);
  } catch (e: any) {
    console.log('❌ Erro:', e.response?.data?.error || e.message);
  }

  await pergunta('\n↩️  Pressione Enter para voltar...');
}

// ============ FUNÇÕES DE ALUGUÉIS ============

async function listarEmprestimosAtivos() {
  limpar();
  console.log('══════════════════ EMPRÉSTIMOS ATIVOS ══════════════════');

  try {
    const res = await api.get('/alugueis/todos');
    const ativos = res.data.filter((a: any) => a.status === 'ativo');

    if (ativos.length === 0) {
      console.log('\n📋 Nenhum empréstimo ativo no momento.');
    } else {
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
    console.log('❌ Erro:', e.response?.data?.error || e.message);
  }

  await pergunta('\n↩️  Pressione Enter para voltar...');
}

async function registrarNovoAluguel() {
  limpar();
  console.log('══════════════════ REGISTRAR NOVO ALUGUEL ══════════════════');

  try {
    // Listar livros disponíveis
    const livros = await api.get('/livros?status=disponivel');

    if (livros.data.length === 0) {
      console.log('\n❌ Nenhum livro disponível para aluguel.');
      await pergunta('\n↩️  Pressione Enter para voltar...');
      return;
    }

    console.log('\n📚 LIVROS DISPONÍVEIS:');
    console.table(livros.data.map((l: any) => ({
      ID: l.id,
      Título: l.titulo,
      Autor: l.autor
    })));

    const livro_id = await pergunta('\n📖 ID do livro: ');

    // Listar usuários
    const usuarios = await api.get('/usuarios');
    console.log('\n👥 USUÁRIOS:');
    console.table(usuarios.data.map((u: any) => ({
      ID: u.id,
      Nome: u.nome,
      Tipo: u.tipo
    })));

    const usuario_id = await pergunta('\n👤 ID do usuário: ');

    const res = await api.post('/alugueis', {
      livro_id: parseInt(livro_id),
      usuario_id: parseInt(usuario_id)
    });

    console.log('\n✅', res.data.message);
    console.log(`📅 Prazo de devolução: ${res.data.prazo}`);
  } catch (e: any) {
    console.log('❌ Erro:', e.response?.data?.error || e.message);
  }

  await pergunta('\n↩️  Pressione Enter para voltar...');
}

async function devolverLivro() {
  limpar();
  console.log('══════════════════ DEVOLVER LIVRO ══════════════════');

  try {
    const res = await api.get('/alugueis/todos');
    const ativos = res.data.filter((a: any) => a.status === 'ativo');

    if (ativos.length === 0) {
      console.log('\n📋 Nenhum empréstimo ativo para devolver.');
      await pergunta('\n↩️  Pressione Enter para voltar...');
      return;
    }

    console.table(ativos.map((a: any) => ({
      ID: a.id,
      Usuário: a.usuario,
      Livro: a.titulo,
      'Prazo': new Date(a.data_prevista_devolucao).toLocaleDateString('pt-BR')
    })));

    const id = await pergunta('\n🔢 ID do aluguel para devolver: ');

    await api.put(`/alugueis/${id}/devolver`);
    console.log('\n✅ Livro devolvido com sucesso!');
  } catch (e: any) {
    console.log('❌ Erro:', e.response?.data?.error || e.message);
  }

  await pergunta('\n↩️  Pressione Enter para voltar...');
}

async function meusEmprestimos() {
  limpar();
  console.log('══════════════════ MEUS EMPRÉSTIMOS ══════════════════');

  try {
    const res = await api.get('/alugueis/meus');

    if (res.data.length === 0) {
      console.log('\n📋 Você não tem empréstimos registrados.');
    } else {
      console.table(res.data.map((a: any) => ({
        Livro: a.titulo,
        Autor: a.autor,
        Alugado: new Date(a.data_aluguel).toLocaleDateString('pt-BR'),
        Prazo: new Date(a.data_prevista_devolucao).toLocaleDateString('pt-BR'),
        Status: a.status.toUpperCase(),
        Local: `${a.corredor}-${a.prateleira}`
      })));
    }
  } catch (e: any) {
    console.log('❌ Erro:', e.response?.data?.error || e.message);
  }

  await pergunta('\n↩️  Pressione Enter para voltar...');
}

// ============ FUNÇÕES DE USUÁRIOS ============

async function gerenciarUsuarios() {
  limpar();
  console.log('══════════════════ GERENCIAR USUÁRIOS ══════════════════');

  try {
    const res = await api.get('/usuarios');
    console.table(res.data.map((u: any) => ({
      ID: u.id,
      Nome: u.nome,
      Email: u.email,
      Tipo: u.tipo.toUpperCase()
    })));
  } catch (e: any) {
    console.log('❌ Erro:', e.response?.data?.error || e.message);
  }

  await pergunta('\n↩️  Pressione Enter para voltar...');
}

// ============ MENU PRINCIPAL ============

async function menu() {
  limpar();
  mostrarBanner();
  console.log(`👤 USUÁRIO: ${user.nome} | 🎭 CARGO: ${user.tipo.toUpperCase()}`);
  divisor();

  console.log('1. 📚 Consultar Livros');

  if (user.tipo === 'bibliotecario') {
    console.log('2. 📋 Empréstimos Ativos');
    console.log('3. ➕ Registrar Novo Aluguel');
    console.log('4. ↩️  Devolver Livro');
    console.log('5. 📖 Cadastrar Novo Livro');
    console.log('6. 👥 Gerenciar Usuários');
  } else {
    console.log('2. 📖 Meus Empréstimos');
  }

  console.log('0. 🚪 Sair');
  divisor();

  const op = await pergunta('Opção: ');

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

  console.log('1. 🔐 Login');
  console.log('2. ✍️  Cadastro');
  console.log('0. 🚪 Sair');

  const op = await pergunta('\n> ');

  if (op === '0') process.exit(0);

  const email = await pergunta('📧 Email: ');
  const senha = await pergunta('🔒 Senha: ');

  try {
    if (op === '2') {
      const nome = await pergunta('👤 Nome: ');
      console.log('\nTipo de conta: 1. Leitor | 2. Bibliotecário');
      const tOp = await pergunta('> ');
      const tipo = tOp === '2' ? 'bibliotecario' : 'usuario';

      const res = await api.post('/auth/registrar', { nome, email, senha, tipo });
      token = res.data.token;
      user = res.data.usuario;
      console.log('\n✅ Cadastro realizado com sucesso!');
    } else if (op === '1') {
      const res = await api.post('/auth/login', { email, senha });
      token = res.data.token;
      user = res.data.usuario;
      console.log('\n✅ Login realizado com sucesso!');
    } else {
      console.log('❌ Opção inválida!');
      await pergunta('\nPressione Enter...');
      return start();
    }

    await pergunta('\n↩️  Enter para acessar o sistema...');
    menu();
  } catch (e: any) {
    console.log('\n❌ Erro:', e.response?.data?.error || 'Servidor offline');
    await pergunta('\n↩️  Pressione Enter...');
    start();
  }
}

start();