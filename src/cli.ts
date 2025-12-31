import axios from 'axios';
import * as readline from 'readline';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3000;
const API_URL = `http://127.0.0.1:${PORT}/api`;

let token: string | null = null;
let usuarioLogado: any = null;

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const pergunta = (t: string): Promise<string> => new Promise((r) => rl.question(t, r));
const limparTela = () => console.clear();

const api = axios.create({ baseURL: API_URL, headers: { 'Content-Type': 'application/json' } });
api.interceptors.request.use((config) => {
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ========== AUXILIARES VISUAIS ==========
function exibirCabecalho(titulo: string) {
  console.log('\n' + '═'.repeat(50));
  console.log(`  ${titulo}`);
  console.log('═'.repeat(50));
}

// ========== FUNÇÕES DO SISTEMA ==========

async function registrar() {
  limparTela();
  exibirCabecalho('📝 CADASTRO LUIZATECA');
  const nome = await pergunta('👤 Nome: ');
  const email = await pergunta('📧 Email: ');
  const senha = await pergunta('🔑 Senha: ');
  const tipo = await pergunta('🎭 Tipo (leitor/bibliotecario): ');

  try {
    const res = await api.post('/auth/registrar', { nome, email, senha, tipo, telefone: '000' });
    token = res.data.token;
    usuarioLogado = res.data.usuario;
    console.log('\n✅ Perfil criado com sucesso na LuizaTeca!');
    return true;
  } catch (err: any) {
    console.log('\n❌ Erro: ' + (err.response?.data?.error || 'Falha no registro'));
    await pergunta('\nPressione ENTER...');
    return false;
  }
}

async function login() {
  limparTela();
  exibirCabecalho('🔐 ACESSO LUIZATECA');
  const email = await pergunta('📧 Email: ');
  const senha = await pergunta('🔑 Senha: ');
  try {
    const res = await api.post('/auth/login', { email, senha });
    token = res.data.token;
    usuarioLogado = res.data.usuario;
    return true;
  } catch {
    console.log('\n❌ Credenciais inválidas.');
    await pergunta('\nPressione ENTER...');
    return false;
  }
}

async function listarLivros() {
  try {
    const res = await api.get('/livros');
    exibirCabecalho('📘 ACERVO DISPONÍVEL');
    console.table(res.data.map((l: any) => ({
      ID: l.id,
      Título: l.titulo,
      Gênero: l.genero || 'Geral',
      Status: l.status === 'disponivel' ? 'DISPONÍVEL' : 'ALUGADO'
    })));
  } catch (e) { console.log('Erro ao conectar com a API.'); }
}

async function realizarAluguel() {
  limparTela();
  await listarLivros();
  exibirCabecalho('🤝 NOVO EMPRÉSTIMO');
  const livro_id = await pergunta('🆔 ID do Livro: ');
  const data = await pergunta('📅 Data para Devolução (AAAA-MM-DD): ');

  try {
    await api.post('/alugueis', { livro_id: Number(livro_id), data_prevista_devolucao: data });
    console.log('\n✅ Aluguel registrado!');
  } catch (err: any) {
    console.log('\n❌ Falha: ' + (err.response?.data?.error || 'Erro'));
  }
  await pergunta('\nENTER para continuar...');
}

// Visualização para o LEITOR
async function meusAlugueis() {
  limparTela();
  exibirCabecalho('📖 MEUS LIVROS ALUGADOS');
  try {
    const res = await api.get('/alugueis/meus');
    if (res.data.length === 0) console.log('Você não tem livros alugados no momento.');
    else {
      console.table(res.data.map((a: any) => ({
        Livro: a.titulo,
        Prazo: new Date(a.data_prevista_devolucao).toLocaleDateString(),
        Situação: a.status.toUpperCase()
      })));
    }
  } catch (e) { console.log('Erro ao buscar seus dados.'); }
  await pergunta('\nENTER para voltar...');
}

// Visualização para o BIBLIOTECÁRIO
async function gerenciarAlugueisGeral() {
  limparTela();
  exibirCabecalho('📊 PAINEL ADMINISTRATIVO - GERAL');
  try {
    const res = await api.get('/alugueis/todos');
    if (res.data.length === 0) console.log('Sem registros de empréstimo.');
    else {
      console.table(res.data.map((a: any) => ({
        ID: a.id,
        Livro: a.livro,
        Cliente: a.cliente,
        Prazo: new Date(a.data_prevista_devolucao).toLocaleDateString(),
        Status: a.status.toUpperCase()
      })));

      const idDev = await pergunta('\n➤ Digite ID para Devolução (ou ENTER para sair): ');
      if (idDev) {
        await api.put(`/alugueis/${idDev}/devolver`);
        console.log('✅ Devolução processada com sucesso!');
      }
    }
  } catch (e) { console.log('❌ Acesso negado.'); }
  await pergunta('\nENTER para voltar...');
}

// ========== MENUS ==========

async function menuPrincipal(): Promise<void> {
  limparTela();
  console.log('╔' + '═'.repeat(48) + '╗');
  console.log(`║ USUÁRIO: ${usuarioLogado.nome.padEnd(35)} ║`);
  console.log(`║ CARGO:   ${usuarioLogado.tipo.toUpperCase().padEnd(35)} ║`);
  console.log('╚' + '═'.repeat(48) + '╝');

  console.log('\n  1. 📘 Consultar Acervo');
  console.log('  2. 🤝 Alugar um Livro');

  // Opção muda conforme o cargo
  if (usuarioLogado.tipo === 'bibliotecario') {
    console.log('  3. 📊 Gerenciar Todos os Aluguéis (Admin)');
  } else {
    console.log('  3. 📖 Meus Aluguéis');
  }

  console.log('  0. 🚪 Sair');

  const op = await pergunta('\n➤ Escolha: ');

  if (op === '1') { await listarLivros(); await pergunta('\nENTER...'); }
  else if (op === '2') await realizarAluguel();
  else if (op === '3') {
    if (usuarioLogado.tipo === 'bibliotecario') await gerenciarAlugueisGeral();
    else await meusAlugueis();
  }
  else if (op === '0') { token = null; return menuInicial(); }

  await menuPrincipal();
}

async function menuInicial(): Promise<void> {
  limparTela();
  // Logo LuizaTeca
  console.log('  _     _    _ _____ ______       _______ ______ _____          ');
  console.log(' | |   | |  | |_   _|___  /   /\\ |__   __|  ____/ ____|   /\\    ');
  console.log(' | |   | |  | | | |    / /   /  \\   | |  | |__ | |       /  \\   ');
  console.log(' | |   | |  | | | |   / /   / /\\ \\  | |  |  __|| |      / /\\ \\  ');
  console.log(' | |___| |__| |_| |_ / /__ / ____ \\ | |  | |___| |____ / ____ \\ ');
  console.log(' |______\\____/|_____/_____/_/    \\_\\|_|  |______\\_____/_/    \\_\\');
  console.log('\n               --- BEM-VINDO À LUIZATECA ---');
  console.log('\n' + '─'.repeat(70));
  console.log('  [1] ENTRAR    [2] NOVO PERFIL    [0] SAIR');
  console.log('─'.repeat(70));

  const op = await pergunta('\n➤ Opção: ');
  if (op === '1') { if (await login()) await menuPrincipal(); else await menuInicial(); }
  else if (op === '2') { if (await registrar()) await menuPrincipal(); else await menuInicial(); }
  else if (op === '0') process.exit(0);
  else await menuInicial();
}

menuInicial();