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

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ========== FUNCIONALIDADES DE USUÁRIO ==========

async function registrar() {
  limparTela();
  console.log('\n📝 CRIAR NOVO PERFIL\n');
  const nome = await pergunta('👤 Nome Completo: ');
  const email = await pergunta('📧 Email: ');
  const senha = await pergunta('🔑 Senha: ');
  const telefone = await pergunta('📞 Telefone: ');

  try {
    const response = await api.post('/auth/registrar', { nome, email, senha, telefone });
    token = response.data.token;
    usuarioLogado = response.data.usuario;
    console.log('\n✅ Perfil criado com sucesso!');
    await pergunta('Pressione ENTER para entrar no sistema...');
    return true;
  } catch (error: any) {
    console.log('\n❌ Erro ao registrar: ' + (error.response?.data?.error || 'Erro desconhecido'));
    await pergunta('ENTER para voltar...');
    return false;
  }
}

async function login() {
  limparTela();
  console.log('\n🔐 ACESSO AO SISTEMA\n');
  const email = await pergunta('📧 Email: ');
  const senha = await pergunta('🔑 Senha: ');
  try {
    const response = await api.post('/auth/login', { email, senha });
    token = response.data.token;
    usuarioLogado = response.data.usuario;
    return true;
  } catch {
    console.log('\n❌ Login falhou! Verifique suas credenciais.');
    await pergunta('ENTER...');
    return false;
  }
}

// ========== GERENCIAMENTO DE LIVROS ==========

async function listarLivros(filtro: string = '') {
  try {
    const response = await api.get('/livros', { params: { busca: filtro } });
    const livros = response.data;
    
    if (livros.length === 0) {
      console.log('\n📚 Nenhum livro encontrado.\n');
    } else {
      console.log(`\n🏛️  CATÁLOGO DA BIBLIOTECA:`);
      
      // Criamos um novo array formatado para a tabela ficar bonita
      const tabelaFormatada = livros.map((l: any) => ({
        ID: l.id,
        Título: l.titulo,
        Gênero: l.genero || 'N/A',
        Local: `${l.corredor}/${l.prateleira}`,
        Status: l.status === 'disponivel' ? '✅ Livre' : '❌ Alugado'
      }));

      // O console.table desenha a tabela perfeitamente independente do tamanho do texto
      console.table(tabelaFormatada);
    }
  } catch (error: any) {
    console.log('\n❌ Erro na consulta ao servidor.');
  }
}

async function criarLivro() {
  limparTela();
  console.log('\n➕ CATALOGAR NOVO TÍTULO\n');
  const titulo = await pergunta('📕 Título: ');
  const autor = await pergunta('👤 Autor: ');
  const ano = await pergunta('📅 Ano: ');
  const genero = await pergunta('🔖 Gênero: ');
  
  try {
    const response = await api.post('/livros', { 
      titulo, autor, ano_lancamento: Number(ano), genero 
    });
    console.log('\n✅ Livro catalogado!');
    console.log(`📍 LOCALIZAÇÃO: Corredor ${response.data.corredor}, Prateleira ${response.data.prateleira}.`);
  } catch (e) {
    console.log('❌ Erro ao salvar.');
  }
  await pergunta('\nENTER para continuar...');
}

// ========== MENUS ==========

async function menuPrincipal(): Promise<void> {
  limparTela();
  console.log('\n═══════════════════════════════════');
  console.log(`👤 Operador: ${usuarioLogado.nome}`);
  console.log(`🔑 Acesso:   ${usuarioLogado.tipo.toUpperCase()}`);
  console.log('═══════════════════════════════════');
  console.log('\n1. 📘 Consultar Acervo');
  if (usuarioLogado.tipo === 'bibliotecario') console.log('2. ➕ Catalogar Livro');
  console.log('0. 🚪 Sair (Logout)');
  
  const op = await pergunta('\n➤ Escolha: ');
  if (op === '1') { 
    await listarLivros(); 
    await pergunta('\nENTER...'); 
    await menuPrincipal(); 
  } else if (op === '2' && usuarioLogado.tipo === 'bibliotecario') {
    await criarLivro();
    await menuPrincipal();
  } else if (op === '0') {
    token = null;
    usuarioLogado = null;
    await menuInicial();
  } else {
    await menuPrincipal();
  }
}

async function menuInicial(): Promise<void> {
  limparTela();
  console.log('\n🏛️  SISTEMA DE BIBLIOTECA');
  console.log('\n1. 🔐 Entrar');
  console.log('2. 📝 Criar Perfil');
  console.log('0. ❌ Fechar Programa');
  const op = await pergunta('\n➤ Opção: ');
  
  if (op === '1') { 
    if (await login()) await menuPrincipal(); 
    else await menuInicial(); 
  } else if (op === '2') {
    if (await registrar()) await menuPrincipal();
    else await menuInicial();
  } else if (op === '0') {
    process.exit(0);
  } else {
    await menuInicial();
  }
}

async function main() {
  try {
    await api.get('/livros'); // Teste de conexão simples
    await menuInicial();
  } catch {
    console.log('❌ API offline. Ligue o servidor primeiro.');
    process.exit(1);
  }
}

main();