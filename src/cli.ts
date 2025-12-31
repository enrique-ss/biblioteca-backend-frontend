import axios from 'axios';
import * as readline from 'readline';
import dotenv from 'dotenv';

dotenv.config();

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

// ========== FUNÇÃO PARA TABELAS LINDAS (SEM BIBLIOTECAS) ==========
function exibirTabela(dados: any[]) {
  if (!dados || dados.length === 0) return;

  const colunas = Object.keys(dados[0]);
  // Calcula a largura máxima de cada coluna
  const larguras = colunas.map(col => {
    const maiorValor = Math.max(...dados.map(item => String(item[col]).length));
    return Math.max(col.length, maiorValor);
  });

  const criarLinha = (inicio: string, meio: string, cruz: string, fim: string) => 
    inicio + larguras.map(w => meio.repeat(w + 2)).join(cruz) + fim;

  // Topo
  console.log(criarLinha('┌', '─', '┬', '┐'));
  // Cabeçalho
  console.log('│ ' + colunas.map((col, i) => col.padEnd(larguras[i])).join(' │ ') + ' │');
  // Divisor
  console.log(criarLinha('├', '─', '┼', '┤'));
  // Linhas
  dados.forEach(item => {
    console.log('│ ' + colunas.map((col, i) => String(item[col]).padEnd(larguras[i])).join(' │ ') + ' │');
  });
  // Base
  console.log(criarLinha('└', '─', '┴', '┘'));
}

// ========== CONFIGURAÇÃO API ==========
const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ========== AUTENTICAÇÃO ==========
async function login() {
  console.log('\n═══════════════════════════════════');
  console.log('        🔐 LOGIN NO SISTEMA');
  console.log('═══════════════════════════════════\n');
  
  const email = await pergunta('📧 Email: ');
  const senha = await pergunta('🔑 Senha: ');
  
  try {
    const response = await api.post('/auth/login', { email, senha });
    token = response.data.token;
    usuarioLogado = response.data.usuario;
    
    console.log('\n✅ Login realizado com sucesso!');
    console.log(`👋 Bem-vindo(a), ${usuarioLogado.nome}!\n`);
    
    await pergunta('Pressione ENTER para continuar...');
    return true;
  } catch (error: any) {
    console.log('\n❌ Erro:', error.response?.data?.error || 'Falha no login');
    await pergunta('\nPressione ENTER para tentar novamente...');
    return false;
  }
}

async function registrar() {
  console.log('\n═══════════════════════════════════');
  console.log('        📝 REGISTRAR-SE');
  console.log('═══════════════════════════════════\n');
  
  const nome = await pergunta('Nome: ');
  const email = await pergunta('Email: ');
  const senha = await pergunta('Senha: ');
  
  try {
    const response = await api.post('/auth/register', { nome, email, senha });
    token = response.data.token;
    usuarioLogado = response.data.usuario;
    console.log('\n✅ Conta criada com sucesso!');
    await pergunta('Pressione ENTER para entrar...');
    return true;
  } catch (error: any) {
    console.log('\n❌ Erro no cadastro:', error.response?.data?.error);
    await pergunta('Pressione ENTER...');
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
      console.log('\n📚 LIVROS DISPONÍVEIS:');
      exibirTabela(livros.map((l: any) => ({
        ID: l.id,
        Titulo: l.titulo,
        Autor: l.autor,
        Ano: l.ano_lancamento,
        Status: l.status === 'disponivel' ? 'Disponivel' : 'Alugado'
      })));
    }
  } catch (error: any) {
    console.log('\n❌ Erro ao listar:', error.message);
  }
}

async function buscarLivros() {
  const busca = await pergunta('\n🔍 Digite o termo de busca: ');
  try {
    const response = await api.get('/livros', { params: { busca } });
    exibirTabela(response.data.map((l: any) => ({
      ID: l.id,
      Titulo: l.titulo,
      Autor: l.autor,
      Status: l.status
    })));
  } catch (e) { console.log('Erro na busca'); }
  await pergunta('\nENTER para voltar...');
}

async function criarLivro() {
  console.log('\n➕ NOVO LIVRO');
  const titulo = await pergunta('Título: ');
  const autor = await pergunta('Autor: ');
  const ano = await pergunta('Ano: ');
  try {
    await api.post('/livros', { titulo, autor, ano_lancamento: Number(ano) });
    console.log('✅ Adicionado!');
  } catch (e) { console.log('❌ Erro ao salvar'); }
  await pergunta('ENTER...');
}

// ========== ALUGUÉIS ==========
async function alugarLivro() {
  await listarLivros();
  const id = await pergunta('\n📖 ID do livro para alugar: ');
  try {
    const dataPrevista = new Date();
    dataPrevista.setDate(dataPrevista.getDate() + 14);
    await api.post('/alugueis', { 
      livro_id: Number(id), 
      data_prevista_devolucao: dataPrevista.toISOString().split('T')[0] 
    });
    console.log('✅ Aluguel realizado!');
  } catch (error: any) {
    console.log('\n❌ Erro:', error.response?.data?.error);
  }
  await pergunta('ENTER...');
}

async function meusAlugueis() {
  try {
    const response = await api.get('/alugueis/meus');
    console.log('\n📋 MEUS ALUGUÉIS:');
    exibirTabela(response.data.map((a: any) => ({
      ID: a.id,
      Livro: a.titulo,
      Previsao: new Date(a.data_prevista_devolucao).toLocaleDateString('pt-BR'),
      Status: a.status
    })));
  } catch (e) { console.log('Erro ao buscar aluguéis'); }
  await pergunta('\nENTER para continuar...');
}

// ========== MENUS ==========
async function menuLivros(): Promise<void> {
  limparTela();
  console.log('\n═══════════════════════════════════');
  console.log('        📚 GERENCIAR LIVROS');
  console.log('═══════════════════════════════════');
  console.log('1. Listar Tudo');
  console.log('2. Pesquisar');
  if (usuarioLogado?.tipo === 'bibliotecario') console.log('3. Adicionar Livro');
  console.log('0. Voltar');
  
  const op = await pergunta('\nEscolha: ');
  if (op === '1') { await listarLivros(); await pergunta('\nENTER...'); await menuLivros(); }
  else if (op === '2') { await buscarLivros(); await menuLivros(); }
  else if (op === '3' && usuarioLogado.tipo === 'bibliotecario') { await criarLivro(); await menuLivros(); }
  else if (op === '0') await menuPrincipal();
  else await menuLivros();
}

async function menuPrincipal(): Promise<void> {
  limparTela();
  console.log('\n═══════════════════════════════════');
  console.log('     📚 SISTEMA BIBLIOTECA 📚');
  console.log('═══════════════════════════════════');
  console.log(`👤 Usuário: ${usuarioLogado.nome}`);
  console.log(`🔑 Perfil:  ${usuarioLogado.tipo.toUpperCase()}`);
  console.log('═══════════════════════════════════');
  console.log('1. 📘 Livros');
  console.log('2. 📖 Aluguéis');
  console.log('3. 👤 Meu Perfil');
  console.log('0. 🚪 Sair');
  
  const op = await pergunta('\nEscolha uma opção: ');
  switch (op) {
    case '1': await menuLivros(); break;
    case '2': 
      const alugOp = await pergunta('\n1. Alugar  2. Meus Aluguéis  0. Voltar: ');
      if (alugOp === '1') await alugarLivro();
      if (alugOp === '2') await meusAlugueis();
      await menuPrincipal();
      break;
    case '3': 
        console.log(`\nNome: ${usuarioLogado.nome}\nEmail: ${usuarioLogado.email}`);
        await pergunta('\nENTER...'); await menuPrincipal(); break;
    case '0': process.exit(0);
    default: await menuPrincipal();
  }
}

async function menuInicial(): Promise<void> {
  limparTela();
  console.log('\n╔══════════════════════════════════╗');
  console.log('║    📚 SISTEMA DE BIBLIOTECA      ║');
  console.log('╚══════════════════════════════════╝');
  console.log('\n1. 🔐 Login');
  console.log('2. 📝 Criar Conta');
  console.log('0. ❌ Sair');
  
  const op = await pergunta('\n➤ Opção: ');
  if (op === '1') { if (await login()) await menuPrincipal(); else await menuInicial(); }
  else if (op === '2') { if (await registrar()) await menuPrincipal(); else await menuInicial(); }
  else if (op === '0') process.exit(0);
  else await menuInicial();
}

async function main() {
  limparTela();
  console.log('🚀 Conectando ao servidor...');
  try {
    await api.get('/health');
    await menuInicial();
  } catch {
    console.log('❌ Servidor offline. Ligue a API primeiro!');
    process.exit(1);
  }
}

main();