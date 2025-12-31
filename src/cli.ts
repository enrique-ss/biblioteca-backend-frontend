import axios from 'axios';
import * as readline from 'readline';
import dotenv from 'dotenv'; // Adicione isso

dotenv.config(); // Carregue o .env aqui também!

// Mude para 127.0.0.1 para evitar problemas de DNS interno
const PORT = process.env.PORT || 3000;
const API_URL = `http://127.0.0.1:${PORT}/api`; 

let token: string | null = null;
let usuarioLogado: any = null;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function pergunta(texto: string): Promise<string> {
  return new Promise((resolve) => rl.question(texto, resolve));
}

function limparTela() {
  console.clear();
}

// ========== FUNÇÕES DA API ==========
const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Interceptor para adicionar token
api.interceptors.request.use((config) => {
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ========== AUTENTICAÇÃO ==========
async function login() {
  console.log('\n═══════════════════════════════════');
  console.log('           🔐 LOGIN');
  console.log('═══════════════════════════════════\n');
  
  const email = await pergunta('Email: ');
  const senha = await pergunta('Senha: ');
  
  try {
    const response = await api.post('/auth/login', { email, senha });
    token = response.data.token;
    usuarioLogado = response.data.usuario;
    
    console.log('\n✅ Login realizado com sucesso!');
    console.log(`👋 Bem-vindo(a), ${usuarioLogado.nome}!`);
    
    if (usuarioLogado.tipo === 'bibliotecario') {
      console.log('👨‍💼 Você está logado como BIBLIOTECÁRIO\n');
    } else {
      console.log('👤 Você está logado como USUÁRIO\n');
    }
    
    await pergunta('Pressione ENTER para continuar...');
    limparTela();
    return true;
  } catch (error: any) {
    console.log('\n❌ Erro:', error.response?.data?.error || 'Falha no login');
    await pergunta('\nPressione ENTER para continuar...');
    return false;
  }
}

async function registrar() {
  console.log('\n═══════════════════════════════════');
  console.log('         📝 REGISTRAR-SE');
  console.log('═══════════════════════════════════\n');
  
  const nome = await pergunta('Nome completo: ');
  const email = await pergunta('Email: ');
  const telefone = await pergunta('Telefone (opcional): ');
  const endereco = await pergunta('Endereço (opcional): ');
  const senha = await pergunta('Senha: ');
  
  try {
    const response = await api.post('/auth/register', {
      nome,
      email,
      telefone: telefone || undefined,
      endereco: endereco || undefined,
      senha
    });
    
    token = response.data.token;
    usuarioLogado = response.data.usuario;
    
    console.log('\n✅ Cadastro realizado com sucesso!');
    console.log(`👋 Bem-vindo(a), ${usuarioLogado.nome}!\n`);
    
    await pergunta('Pressione ENTER para continuar...');
    limparTela();
    return true;
  } catch (error: any) {
    console.log('\n❌ Erro:', error.response?.data?.error || 'Falha no cadastro');
    await pergunta('\nPressione ENTER para continuar...');
    return false;
  }
}

// ========== LIVROS ==========
async function listarLivros() {
  try {
    const response = await api.get('/livros');
    const livros = response.data;
    
    if (livros.length === 0) {
      console.log('\n📚 Nenhum livro cadastrado.\n');
    } else {
      console.log('\n📚 LIVROS CADASTRADOS:');
      console.log('═══════════════════════════════════════════════════════════\n');
      console.table(livros.map((l: any) => ({
        ID: l.id,
        Título: l.titulo,
        Autor: l.autor,
        Ano: l.ano_lancamento,
        Status: l.status === 'disponivel' ? '✅ Disponível' : '❌ Alugado'
      })));
    }
  } catch (error: any) {
    console.log('\n❌ Erro ao listar livros:', error.response?.data?.error || error.message);
  }
}

async function buscarLivros() {
  console.log('\n═══════════════════════════════════');
  console.log('         🔍 BUSCAR LIVROS');
  console.log('═══════════════════════════════════\n');
  
  const busca = await pergunta('Digite título, autor ou ISBN: ');
  
  try {
    const response = await api.get('/livros', { params: { busca } });
    const livros = response.data;
    
    if (livros.length === 0) {
      console.log('\n❌ Nenhum livro encontrado.\n');
    } else {
      console.log('\n📚 RESULTADOS DA BUSCA:');
      console.log('═══════════════════════════════════════════════════════════\n');
      console.table(livros.map((l: any) => ({
        ID: l.id,
        Título: l.titulo,
        Autor: l.autor,
        Ano: l.ano_lancamento,
        Status: l.status === 'disponivel' ? '✅ Disponível' : '❌ Alugado'
      })));
    }
  } catch (error: any) {
    console.log('\n❌ Erro:', error.response?.data?.error || error.message);
  }
  
  await pergunta('\nPressione ENTER para continuar...');
}

async function criarLivro() {
  console.log('\n═══════════════════════════════════');
  console.log('        ➕ ADICIONAR LIVRO');
  console.log('═══════════════════════════════════\n');
  
  const titulo = await pergunta('Título: ');
  const autor = await pergunta('Autor: ');
  const ano = await pergunta('Ano de lançamento: ');
  const descricao = await pergunta('Descrição (opcional): ');
  const isbn = await pergunta('ISBN (opcional): ');
  
  try {
    await api.post('/livros', {
      titulo,
      autor,
      ano_lancamento: Number(ano),
      descricao: descricao || undefined,
      isbn: isbn || undefined
    });
    
    console.log('\n✅ Livro adicionado com sucesso!\n');
  } catch (error: any) {
    console.log('\n❌ Erro:', error.response?.data?.error || error.message);
  }
  
  await pergunta('Pressione ENTER para continuar...');
}

async function atualizarLivro() {
  await listarLivros();
  
  console.log('\n═══════════════════════════════════');
  console.log('        ✏️  ATUALIZAR LIVRO');
  console.log('═══════════════════════════════════\n');
  
  const id = await pergunta('ID do livro: ');
  const titulo = await pergunta('Novo título: ');
  const autor = await pergunta('Novo autor: ');
  const ano = await pergunta('Novo ano: ');
  const descricao = await pergunta('Nova descrição (opcional): ');
  const isbn = await pergunta('Novo ISBN (opcional): ');
  
  try {
    await api.put(`/livros/${id}`, {
      titulo,
      autor,
      ano_lancamento: Number(ano),
      descricao: descricao || undefined,
      isbn: isbn || undefined
    });
    
    console.log('\n✅ Livro atualizado com sucesso!\n');
  } catch (error: any) {
    console.log('\n❌ Erro:', error.response?.data?.error || error.message);
  }
  
  await pergunta('Pressione ENTER para continuar...');
}

async function deletarLivro() {
  await listarLivros();
  
  console.log('\n═══════════════════════════════════');
  console.log('        🗑️  DELETAR LIVRO');
  console.log('═══════════════════════════════════\n');
  
  const id = await pergunta('ID do livro: ');
  const conf = await pergunta('Tem certeza? (s/n): ');
  
  if (conf.toLowerCase() !== 's') {
    console.log('\n❌ Operação cancelada.\n');
    await pergunta('Pressione ENTER para continuar...');
    return;
  }
  
  try {
    await api.delete(`/livros/${id}`);
    console.log('\n✅ Livro deletado com sucesso!\n');
  } catch (error: any) {
    console.log('\n❌ Erro:', error.response?.data?.error || error.message);
  }
  
  await pergunta('Pressione ENTER para continuar...');
}

// ========== ALUGUÉIS ==========
async function alugarLivro() {
  const response = await api.get('/livros', { params: { status: 'disponivel' } });
  const livros = response.data;
  
  if (livros.length === 0) {
    console.log('\n❌ Nenhum livro disponível para aluguel.\n');
    await pergunta('Pressione ENTER para continuar...');
    return;
  }
  
  console.log('\n📚 LIVROS DISPONÍVEIS:');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.table(livros.map((l: any) => ({
    ID: l.id,
    Título: l.titulo,
    Autor: l.autor,
    Ano: l.ano_lancamento
  })));
  
  console.log('\n═══════════════════════════════════');
  console.log('        📖 ALUGAR LIVRO');
  console.log('═══════════════════════════════════\n');
  
  const livro_id = await pergunta('ID do livro: ');
  const dias = await pergunta('Por quantos dias? (padrão: 14): ');
  
  const diasNum = Number(dias) || 14;
  const dataPrevista = new Date();
  dataPrevista.setDate(dataPrevista.getDate() + diasNum);
  
  try {
    await api.post('/alugueis', {
      livro_id: Number(livro_id),
      data_prevista_devolucao: dataPrevista.toISOString().split('T')[0]
    });
    
    console.log('\n✅ Livro alugado com sucesso!');
    console.log(`📅 Devolução prevista: ${dataPrevista.toLocaleDateString('pt-BR')}\n`);
  } catch (error: any) {
    console.log('\n❌ Erro:', error.response?.data?.error || error.message);
  }
  
  await pergunta('Pressione ENTER para continuar...');
}

async function meusAlugueis() {
  try {
    const response = await api.get('/alugueis/meus');
    const alugueis = response.data;
    
    if (alugueis.length === 0) {
      console.log('\n📋 Você não possui aluguéis.\n');
    } else {
      console.log('\n📋 MEUS ALUGUÉIS:');
      console.log('═══════════════════════════════════════════════════════════\n');
      console.table(alugueis.map((a: any) => ({
        ID: a.id,
        Livro: a.titulo,
        Autor: a.autor,
        Alugado: new Date(a.data_aluguel).toLocaleDateString('pt-BR'),
        Previsão: new Date(a.data_prevista_devolucao).toLocaleDateString('pt-BR'),
        Devolvido: a.data_devolucao ? new Date(a.data_devolucao).toLocaleDateString('pt-BR') : '❌ Não',
        Status: a.status === 'ativo' ? '📖 Ativo' : '✅ Devolvido'
      })));
    }
  } catch (error: any) {
    console.log('\n❌ Erro:', error.response?.data?.error || error.message);
  }
  
  await pergunta('\nPressione ENTER para continuar...');
}

async function listarTodosAlugueis() {
  try {
    const response = await api.get('/alugueis');
    const alugueis = response.data;
    
    if (alugueis.length === 0) {
      console.log('\n📋 Nenhum aluguel registrado.\n');
    } else {
      console.log('\n📋 TODOS OS ALUGUÉIS:');
      console.log('═══════════════════════════════════════════════════════════\n');
      console.table(alugueis.map((a: any) => ({
        ID: a.id,
        Usuário: a.usuario_nome,
        Livro: a.titulo,
        Alugado: new Date(a.data_aluguel).toLocaleDateString('pt-BR'),
        Previsão: new Date(a.data_prevista_devolucao).toLocaleDateString('pt-BR'),
        Status: a.status === 'ativo' ? '📖 Ativo' : '✅ Devolvido'
      })));
    }
  } catch (error: any) {
    console.log('\n❌ Erro:', error.response?.data?.error || error.message);
  }
  
  await pergunta('\nPressione ENTER para continuar...');
}

async function devolverLivro() {
  try {
    const response = await api.get('/alugueis');
    const alugueisAtivos = response.data.filter((a: any) => a.status === 'ativo');
    
    if (alugueisAtivos.length === 0) {
      console.log('\n❌ Nenhum livro alugado no momento.\n');
      await pergunta('Pressione ENTER para continuar...');
      return;
    }
    
    console.log('\n📖 LIVROS ALUGADOS:');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.table(alugueisAtivos.map((a: any) => ({
      ID: a.id,
      Usuário: a.usuario_nome,
      Livro: a.titulo,
      Alugado: new Date(a.data_aluguel).toLocaleDateString('pt-BR'),
      Previsão: new Date(a.data_prevista_devolucao).toLocaleDateString('pt-BR')
    })));
    
    console.log('\n═══════════════════════════════════');
    console.log('        📥 DEVOLVER LIVRO');
    console.log('═══════════════════════════════════\n');
    
    const id = await pergunta('ID do aluguel: ');
    
    await api.put(`/alugueis/${id}/devolver`);
    console.log('\n✅ Livro devolvido com sucesso!\n');
  } catch (error: any) {
    console.log('\n❌ Erro:', error.response?.data?.error || error.message);
  }
  
  await pergunta('Pressione ENTER para continuar...');
}

async function listarUsuarios() {
  try {
    const response = await api.get('/usuarios');
    const usuarios = response.data;
    
    if (usuarios.length === 0) {
      console.log('\n👥 Nenhum usuário cadastrado.\n');
    } else {
      console.log('\n👥 USUÁRIOS CADASTRADOS:');
      console.log('═══════════════════════════════════════════════════════════\n');
      console.table(usuarios.map((u: any) => ({
        ID: u.id,
        Nome: u.nome,
        Email: u.email,
        Telefone: u.telefone || '-',
        Tipo: u.tipo === 'bibliotecario' ? '👨‍💼 Bibliotecário' : '👤 Usuário'
      })));
    }
  } catch (error: any) {
    console.log('\n❌ Erro:', error.response?.data?.error || error.message);
  }
  
  await pergunta('\nPressione ENTER para continuar...');
}

async function verPerfil() {
  try {
    const response = await api.get('/usuarios/perfil');
    const user = response.data;
    
    console.log('\n═══════════════════════════════════');
    console.log('         👤 MEU PERFIL');
    console.log('═══════════════════════════════════\n');
    console.log(`ID:       ${user.id}`);
    console.log(`Nome:     ${user.nome}`);
    console.log(`Email:    ${user.email}`);
    console.log(`Telefone: ${user.telefone || '-'}`);
    console.log(`Endereço: ${user.endereco || '-'}`);
    console.log(`Tipo:     ${user.tipo === 'bibliotecario' ? '👨‍💼 Bibliotecário' : '👤 Usuário'}`);
    console.log(`Desde:    ${new Date(user.created_at).toLocaleDateString('pt-BR')}\n`);
  } catch (error: any) {
    console.log('\n❌ Erro:', error.response?.data?.error || error.message);
  }
  
  await pergunta('Pressione ENTER para continuar...');
}

// ========== MENUS ==========
async function menuLivros(): Promise<void> {
  limparTela();
  console.log('\n═══════════════════════════════════');
  console.log('        📚 GERENCIAR LIVROS');
  console.log('═══════════════════════════════════');
  console.log('1 - Listar todos os livros');
  console.log('2 - Buscar livros');
  
  if (usuarioLogado?.tipo === 'bibliotecario') {
    console.log('3 - Adicionar livro');
    console.log('4 - Atualizar livro');
    console.log('5 - Deletar livro');
    console.log('0 - Voltar');
  } else {
    console.log('0 - Voltar');
  }
  
  console.log('═══════════════════════════════════\n');
  
  const op = await pergunta('Escolha uma opção: ');
  
  switch (op) {
    case '1': await listarLivros(); await pergunta('\nPressione ENTER...'); await menuLivros(); break;
    case '2': await buscarLivros(); await menuLivros(); break;
    case '3': 
      if (usuarioLogado?.tipo === 'bibliotecario') {
        await criarLivro();
      }
      await menuLivros();
      break;
    case '4':
      if (usuarioLogado?.tipo === 'bibliotecario') {
        await atualizarLivro();
      }
      await menuLivros();
      break;
    case '5':
      if (usuarioLogado?.tipo === 'bibliotecario') {
        await deletarLivro();
      }
      await menuLivros();
      break;
    case '0': await menuPrincipal(); break;
    default: console.log('\n❌ Opção inválida!\n'); await pergunta('Pressione ENTER...'); await menuLivros();
  }
}

async function menuAlugueis(): Promise<void> {
  limparTela();
  console.log('\n═══════════════════════════════════');
  console.log('        📖 GERENCIAR ALUGUÉIS');
  console.log('═══════════════════════════════════');
  console.log('1 - Alugar livro');
  console.log('2 - Meus aluguéis');
  
  if (usuarioLogado?.tipo === 'bibliotecario') {
    console.log('3 - Todos os aluguéis');
    console.log('4 - Devolver livro');
  }
  
  console.log('0 - Voltar');
  console.log('═══════════════════════════════════\n');
  
  const op = await pergunta('Escolha uma opção: ');
  
  switch (op) {
    case '1': await alugarLivro(); await menuAlugueis(); break;
    case '2': await meusAlugueis(); await menuAlugueis(); break;
    case '3':
      if (usuarioLogado?.tipo === 'bibliotecario') {
        await listarTodosAlugueis();
      }
      await menuAlugueis();
      break;
    case '4':
      if (usuarioLogado?.tipo === 'bibliotecario') {
        await devolverLivro();
      }
      await menuAlugueis();
      break;
    case '0': await menuPrincipal(); break;
    default: console.log('\n❌ Opção inválida!\n'); await pergunta('Pressione ENTER...'); await menuAlugueis();
  }
}

async function menuUsuarios(): Promise<void> {
  limparTela();
  console.log('\n═══════════════════════════════════');
  console.log('        👥 GERENCIAR USUÁRIOS');
  console.log('═══════════════════════════════════');
  console.log('1 - Listar todos os usuários');
  console.log('0 - Voltar');
  console.log('═══════════════════════════════════\n');
  
  const op = await pergunta('Escolha uma opção: ');
  
  switch (op) {
    case '1': await listarUsuarios(); await menuUsuarios(); break;
    case '0': await menuPrincipal(); break;
    default: console.log('\n❌ Opção inválida!\n'); await pergunta('Pressione ENTER...'); await menuUsuarios();
  }
}

async function menuPrincipal(): Promise<void> {
  limparTela();
  console.log('\n═══════════════════════════════════');
  console.log('    📚 SISTEMA DE BIBLIOTECA 📚');
  console.log('═══════════════════════════════════');
  console.log(`👤 Logado: ${usuarioLogado.nome}`);
  console.log(`📧 ${usuarioLogado.email}`);
  
  if (usuarioLogado.tipo === 'bibliotecario') {
    console.log('👨‍💼 Tipo: BIBLIOTECÁRIO');
  }
  
  console.log('═══════════════════════════════════');
  console.log('1 - Gerenciar Livros');
  console.log('2 - Gerenciar Aluguéis');
  
  if (usuarioLogado?.tipo === 'bibliotecario') {
    console.log('3 - Gerenciar Usuários');
  }
  
  console.log('4 - Meu Perfil');
  console.log('0 - Sair');
  console.log('═══════════════════════════════════\n');
  
  const op = await pergunta('Escolha uma opção: ');
  
  switch (op) {
    case '1': await menuLivros(); break;
    case '2': await menuAlugueis(); break;
    case '3':
      if (usuarioLogado?.tipo === 'bibliotecario') {
        await menuUsuarios();
      } else {
        await menuPrincipal();
      }
      break;
    case '4': await verPerfil(); await menuPrincipal(); break;
    case '0': 
      console.log('\n👋 Até logo!\n');
      rl.close();
      process.exit(0);
      break;
    default: 
      console.log('\n❌ Opção inválida!\n');
      await pergunta('Pressione ENTER...');
      await menuPrincipal();
  }
}

async function menuInicial(): Promise<void> {
  limparTela();
  console.log('\n╔════════════════════════════════════╗');
  console.log('║  📚 SISTEMA DE BIBLIOTECA 📚       ║');
  console.log('╚════════════════════════════════════╝');
  console.log('\n1 - Login');
  console.log('2 - Registrar-se');
  console.log('0 - Sair\n');
  
  const op = await pergunta('Escolha uma opção: ');
  
  switch (op) {
    case '1':
      const loginOk = await login();
      if (loginOk) await menuPrincipal();
      else await menuInicial();
      break;
    case '2':
      const registerOk = await registrar();
      if (registerOk) await menuPrincipal();
      else await menuInicial();
      break;
    case '0':
      console.log('\n👋 Até logo!\n');
      rl.close();
      process.exit(0);
      break;
    default:
      console.log('\n❌ Opção inválida!\n');
      await pergunta('Pressione ENTER...');
      await menuInicial();
  }
}

// ========== INICIALIZAÇÃO ==========
async function main() {
  limparTela();
  console.log('🚀 Iniciando cliente CLI...\n');
  
  // Verificar se API está rodando
  try {
    await api.get('/health');
    console.log('✅ Conectado à API!\n');
    await pergunta('Pressione ENTER para continuar...');
    await menuInicial();
  } catch (error) {
    console.error('❌ Erro: API não está rodando!');
    console.log('\n💡 Dica: Execute "npm run dev" no servidor primeiro!\n');
    rl.close();
    process.exit(1);
  }
}

main();