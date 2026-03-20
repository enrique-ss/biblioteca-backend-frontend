import axios from 'axios';
import * as readline from 'readline';
import dotenv from 'dotenv';
dotenv.config();

const api = axios.create({ baseURL: 'http://127.0.0.1:3000/api' });
let token: string | null = null;
let user: any = null;

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (t: string): Promise<string> => new Promise(r => rl.question(t, r));

api.interceptors.request.use(cfg => {
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

// ── ESTILOS ────────────────────────────────────────────────────────────────────
const c = {
  reset: '\x1b[0m', bold: '\x1b[1m', dim: '\x1b[2m',
  r: '\x1b[31m', g: '\x1b[32m', y: '\x1b[33m',
  b: '\x1b[34m', m: '\x1b[35m', ci: '\x1b[36m', w: '\x1b[37m',
};
const cl = (t: string, cor: string) => `${cor}${t}${c.reset}`;
const ok = (t: string) => console.log(cl(`\n✓ ${t}`, c.g));
const err = (e: any) => console.log(cl(`\n✗ ${e?.response?.data?.error || e?.message || 'Erro'}`, c.r));
const clr = () => console.clear();
const div = () => console.log(cl('─'.repeat(60), c.ci));
const h = (t: string, cor = c.ci) => {
  const l = '═'.repeat(t.length + 4);
  console.log(cl(`\n${l}\n  ${t}  \n${l}`, cor));
};
const op = (n: string, t: string) => console.log(`  ${cl(n, c.y + c.bold)}  ${t}`);
const enter = () => ask(cl('\nPressione Enter...', c.dim));

async function escolha(msg: string, opts: string[]): Promise<string> {
  const v = await ask(msg);
  if (!opts.includes(v)) {
    console.log(cl(`\nOpção inválida. Use: ${opts.join(', ')}`, c.r));
    await enter(); return '';
  }
  return v;
}

function banner() {
  console.log(`
  ${c.m}██╗     ██╗   ██╗██╗███████╗ █████╗ ████████╗███████╗ ██████╗ █████╗ ${c.reset}
  ${c.m}██║     ██║   ██║██║╚══███╔╝██╔══██╗╚══██╔══╝██╔════╝██╔════╝██╔══██╗${c.reset}
  ${c.ci}██║     ██║   ██║██║  ███╔╝ ███████║   ██║   █████╗  ██║     ███████║${c.reset}
  ${c.ci}██║     ██║   ██║██║ ███╔╝  ██╔══██║   ██║   ██╔══╝  ██║     ██╔══██║${c.reset}
  ${c.b}███████╗╚██████╔╝██║███████╗██║  ██║   ██║   ███████╗╚██████╗██║  ██║${c.reset}
  ${c.b}╚══════╝ ╚═════╝ ╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝   ╚══════╝ ╚═════╝╚═╝  ╚═╝${c.reset}`);
  console.log(cl('           Sistema de Gerenciamento de Biblioteca v2.0', c.dim));
}

// ── DASHBOARD ─────────────────────────────────────────────────────────────────
async function dashboard() {
  try {
    const { data } = await api.get('/stats');
    console.log('');
    data.stats.forEach((s: any) => {
      const cor = s.cor === 'red' ? c.r : s.cor === 'green' ? c.g : c.y;
      console.log(`  ${s.label.padEnd(28)} ${cl(String(s.valor).padStart(5), cor + c.bold)}`);
    });
  } catch { /* silencioso */ }
}

// ── ACERVO ────────────────────────────────────────────────────────────────────
async function menuAcervo() {
  while (true) {
    clr(); h('ACERVO DE LIVROS', c.m);
    if (user.tipo === 'bibliotecario') {
      op('1', 'Consultar/buscar');
      op('2', 'Cadastrar livro');
      op('3', 'Editar livro');
      op('4', 'Remover livro');
      op('5', 'Ver exemplares de um livro');
      op('6', 'Alterar condição de exemplar');
    } else {
      op('1', 'Consultar/buscar');
    }
    op('0', 'Voltar'); div();
    const opts = user.tipo === 'bibliotecario' ? ['1', '2', '3', '4', '5', '6', '0'] : ['1', '0'];
    const v = await escolha(cl('Opção: ', c.y + c.bold), opts);
    if (v === '') continue;
    if (v === '0') break;
    if (v === '1') await consultarAcervo();
    if (v === '2') await cadastrarLivro();
    if (v === '3') await editarLivro();
    if (v === '4') await removerLivro();
    if (v === '5') await verExemplares();
    if (v === '6') await alterarCondicaoExemplar();
  }
}

async function consultarAcervo() {
  clr(); h('CONSULTAR ACERVO', c.m);
  const busca = await ask('Buscar (Enter para listar tudo): ');
  try {
    const url = busca.trim() ? `/livros?busca=${encodeURIComponent(busca.trim())}` : '/livros';
    const { data } = await api.get(url);
    const rows = (data.data ?? data);
    if (!rows.length) { console.log('\nNenhum livro encontrado.'); }
    else rows.forEach((l: any) => {
      const cond = l.condicao || {};
      const condStr = Object.entries(cond)
        .filter(([k]) => k !== 'bom')
        .map(([k, v]) => cl(`${k}:${v}`, k === 'danificado' ? c.y : c.r))
        .join(' ') || cl('bom estado', c.g);
      console.log(`  ${cl(String(l.id).padStart(3), c.dim)}  ${cl(l.titulo.padEnd(35), c.w + c.bold)}  ${cl(l.autor.padEnd(20), c.ci)}  disp:${cl(String(l.exemplares_disponiveis) + '/' + l.exemplares, c.y)}  cond:[${condStr}]`);
    });
    console.log(cl(`\n  Total: ${data.total ?? rows.length}`, c.dim));
  } catch (e: any) { err(e); }
  await enter();
}

async function cadastrarLivro() {
  clr(); h('CADASTRAR LIVRO', c.g);
  const body = {
    titulo: await ask('Título: '),
    autor: await ask('Autor: '),
    ano_lancamento: parseInt(await ask('Ano: ')),
    genero: await ask('Gênero: '),
    exemplares: parseInt(await ask('Exemplares [1]: ') || '1'),
  };
  try { const { data } = await api.post('/livros', body); ok(data.message); console.log(cl(`  ${data.info}`, c.dim)); }
  catch (e: any) { err(e); }
  await enter();
}

async function editarLivro() {
  clr(); h('EDITAR LIVRO', c.y);
  const id = await ask('ID do livro: ');
  const titulo = await ask('Novo título (Enter para manter): ');
  const autor = await ask('Novo autor (Enter para manter): ');
  const genero = await ask('Novo gênero (Enter para manter): ');
  const exemplares = await ask('Novo nº de exemplares (Enter para manter): ');
  const body: any = {};
  if (titulo) body.titulo = titulo;
  if (autor) body.autor = autor;
  if (genero) body.genero = genero;
  if (exemplares) body.exemplares = parseInt(exemplares);
  try { const { data } = await api.put(`/livros/${id}`, body); ok(data.message); }
  catch (e: any) { err(e); }
  await enter();
}

async function removerLivro() {
  clr(); h('REMOVER LIVRO', c.r);
  const id = await ask('ID do livro: ');
  const conf = await ask(cl('Confirmar remoção? (s/n): ', c.r));
  if (conf.toLowerCase() !== 's') { console.log(cl('\nCancelado.', c.dim)); await enter(); return; }
  try { const { data } = await api.delete(`/livros/${id}`); ok(data.message); }
  catch (e: any) { err(e); }
  await enter();
}

async function verExemplares() {
  clr(); h('EXEMPLARES DO LIVRO', c.ci);
  const id = await ask('ID do livro: ');
  try {
    const { data } = await api.get(`/livros/${id}/exemplares`);
    console.log(cl(`\n  Livro: ${data.livro.titulo} — ${data.livro.autor}`, c.w + c.bold));
    div();
    data.exemplares.forEach((ex: any) => {
      const dispCor = ex.disponibilidade === 'disponivel' ? c.g : c.y;
      const condCor = ex.condicao === 'bom' ? c.g : ex.condicao === 'danificado' ? c.y : c.r;
      let ult = ex.ultimo_aluguel
        ? `  último: ${cl(ex.ultimo_aluguel.usuario, c.ci)} (${ex.ultimo_aluguel.status_aluguel === 'ativo' ? cl('em mãos', c.y) : 'devolvido'})`
        : '';
      console.log(`  ${cl(String(ex.id).padStart(3), c.dim)}  ${cl(ex.codigo ?? '—', c.ci)}  disp:${cl(ex.disponibilidade, dispCor)}  cond:${cl(ex.condicao, condCor)}${ex.observacao ? cl(`  obs:${ex.observacao}`, c.dim) : ''}${ult}`);
    });
  } catch (e: any) { err(e); }
  await enter();
}

async function alterarCondicaoExemplar() {
  clr(); h('ALTERAR CONDIÇÃO DE EXEMPLAR', c.y);
  console.log(cl('  Condições: bom | danificado | perdido\n', c.dim));
  const livroId = await ask('ID do livro: ');
  const exemplarId = await ask('ID do exemplar: ');
  const condicao = await ask('Nova condição (bom/danificado/perdido): ');
  const observacao = (condicao !== 'bom') ? await ask('Observação (opcional): ') : '';
  try {
    const { data } = await api.patch(`/livros/${livroId}/exemplares/${exemplarId}`, { condicao, observacao });
    ok(data.message);
    console.log(cl(`  Condição: ${data.exemplar.condicao}  |  Disponibilidade: ${data.exemplar.disponibilidade}`, c.dim));
  } catch (e: any) { err(e); }
  await enter();
}

// ── EMPRÉSTIMOS (BIBLIOTECÁRIO) ───────────────────────────────────────────────
async function menuEmprestimos() {
  while (true) {
    clr(); h('EMPRÉSTIMOS', c.b);
    op('1', 'Ver ativos');
    op('2', 'Ver atrasados');
    op('3', 'Histórico de devoluções');
    op('4', 'Novo empréstimo');
    op('5', 'Devolver livro');
    op('6', 'Multas — quitar');
    op('0', 'Voltar'); div();
    const v = await escolha(cl('Opção: ', c.y + c.bold), ['1', '2', '3', '4', '5', '6', '0']);
    if (v === '') continue;
    if (v === '0') break;
    if (v === '1') await listarAtivos();
    if (v === '2') await listarAtrasados();
    if (v === '3') await historicoDevol();
    if (v === '4') await novoEmprestimo();
    if (v === '5') await devolverLivro();
    if (v === '6') await quitarMultas();
  }
}

async function listarAtivos() {
  clr(); h('EMPRÉSTIMOS ATIVOS', c.b);
  try {
    const { data } = await api.get('/alugueis/todos?limit=50');
    const rows = data.data ?? data;
    if (!rows.length) { console.log('\nNenhum empréstimo ativo.'); await enter(); return; }
    rows.forEach((a: any) => {
      const statusCor = a.status === 'atrasado' ? c.r : c.g;
      const multa = Number(a.multa_acumulada) > 0 ? cl(`  multa:R$${Number(a.multa_acumulada).toFixed(2)}`, c.r) : '';
      const condCor = a.exemplar_condicao === 'bom' ? c.g : a.exemplar_condicao === 'danificado' ? c.y : c.r;
      console.log(`  ${cl(String(a.id).padStart(3), c.dim)}  ${cl(a.usuario.padEnd(20), c.w)}  ${a.titulo.substring(0, 30).padEnd(30)}  ${cl(a.exemplar_codigo ?? '—', c.ci)}  cond:${cl(a.exemplar_condicao, condCor)}  prazo:${a.prazo?.toString().substring(0, 10)}  ${cl(a.status, statusCor)}${multa}`);
    });
    console.log(cl(`\n  Total: ${data.total ?? rows.length}`, c.dim));
  } catch (e: any) { err(e); }
  await enter();
}

async function listarAtrasados() {
  clr(); h('EMPRÉSTIMOS ATRASADOS', c.r);
  try {
    const { data } = await api.get('/alugueis/atrasados');
    if (!data.total) { console.log(cl('\nNenhum empréstimo atrasado.', c.g)); await enter(); return; }
    data.data.forEach((a: any) => {
      console.log(`  ${cl(String(a.id).padStart(3), c.dim)}  ${cl(a.usuario.padEnd(20), c.w)}  ${a.titulo.substring(0, 28).padEnd(28)}  ${cl(a.contato, c.ci)}  ${cl(`${a.dias_atraso}d`, c.r + c.bold)}  R$${Number(a.multa_acumulada).toFixed(2)}`);
    });
    console.log(cl(`\n  Total atrasados: ${data.total}`, c.r));
  } catch (e: any) { err(e); }
  await enter();
}

async function historicoDevol() {
  clr(); h('HISTÓRICO DE DEVOLUÇÕES', c.ci);
  const usuarioId = await ask('Filtrar por ID de usuário (Enter para todos): ');
  try {
    const url = usuarioId.trim() ? `/alugueis/historico?usuario_id=${usuarioId}&limit=30` : '/alugueis/historico?limit=30';
    const { data } = await api.get(url);
    const rows = data.data ?? [];
    if (!rows.length) { console.log('\nNenhum registro.'); await enter(); return; }
    rows.forEach((a: any) => {
      const condCor = a.estado_devolucao === 'bom' ? c.g : a.estado_devolucao === 'danificado' ? c.y : c.r;
      console.log(`  ${cl(String(a.id).padStart(3), c.dim)}  ${cl(a.usuario.padEnd(20), c.w)}  ${a.titulo.substring(0, 30).padEnd(30)}  devol:${a.data_devolucao?.toString().substring(0, 10)}  estado:${cl(a.estado_devolucao ?? '—', condCor)}`);
    });
    console.log(cl(`\n  Total: ${data.total}`, c.dim));
  } catch (e: any) { err(e); }
  await enter();
}

async function novoEmprestimo() {
  clr(); h('NOVO EMPRÉSTIMO', c.g);
  const livro_id = await ask('ID do livro: ');
  const usuario_id = await ask('ID do usuário: ');
  try {
    const { data } = await api.post('/alugueis', { livro_id: parseInt(livro_id), usuario_id: parseInt(usuario_id) });
    ok(data.message);
    console.log(cl(`  Prazo: ${data.prazo}`, c.dim));
  } catch (e: any) { err(e); }
  await enter();
}

async function devolverLivro() {
  clr(); h('DEVOLVER LIVRO', c.y);
  const id = await ask('ID do empréstimo: ');
  console.log(cl('\n  Estado do exemplar devolvido:', c.w));
  console.log('    bom        — bom estado, volta ao acervo normalmente');
  console.log('    danificado — dano registrado, continua disponível para empréstimo');
  console.log('    perdido    — removido do acervo + multa R$ 100,00');
  const estado = await ask(cl('\n  Estado (bom/danificado/perdido) [bom]: ', c.y)) || 'bom';
  const observacao = (estado !== 'bom') ? await ask('  Observação (opcional): ') : '';
  try {
    const { data } = await api.put(`/alugueis/${id}/devolver`, { estado_exemplar: estado, observacao });
    ok(data.message);
    if (data.aviso) console.log(cl(`\n  ⚠  ${data.aviso}`, c.r));
    if (data.multas?.length) {
      data.multas.forEach((m: any) => {
        console.log(cl(`     ${m.tipo}: R$ ${m.valor.toFixed(2)}${m.dias ? ` (${m.dias} dias)` : ''}`, c.r));
      });
    }
  } catch (e: any) { err(e); }
  await enter();
}

async function quitarMultas() {
  clr(); h('QUITAR MULTAS', c.y);
  const usuario_id = await ask('ID do usuário: ');
  try {
    const { data: info } = await api.get(`/alugueis/multas/${usuario_id}`);
    if (!info.multas.filter((m: any) => m.status === 'pendente').length) {
      console.log(cl('\nNenhuma multa pendente.', c.g)); await enter(); return;
    }
    console.log(cl(`\n  Multas pendentes: R$ ${info.total_pendente.toFixed(2)}`, c.r));
    info.multas.filter((m: any) => m.status === 'pendente').forEach((m: any) => {
      console.log(cl(`    ${m.tipo.padEnd(10)} R$ ${Number(m.valor).toFixed(2).padStart(7)}  ${m.livro}`, c.dim));
    });
    const conf = await ask(cl('\n  Quitar todas? (s/n): ', c.y));
    if (conf.toLowerCase() !== 's') { console.log(cl('\nCancelado.', c.dim)); await enter(); return; }
    const { data } = await api.put(`/alugueis/multas/${usuario_id}/pagar`);
    ok(data.message);
  } catch (e: any) { err(e); }
  await enter();
}

// ── MEUS EMPRÉSTIMOS (USUÁRIO) ────────────────────────────────────────────────
async function menuMeusEmprestimos() {
  while (true) {
    clr(); h('MEUS EMPRÉSTIMOS', c.b);
    op('1', 'Ver ativos');
    op('2', 'Renovar empréstimo');
    op('3', 'Minhas multas');
    op('0', 'Voltar'); div();
    const v = await escolha(cl('Opção: ', c.y + c.bold), ['1', '2', '3', '0']);
    if (v === '') continue;
    if (v === '0') break;
    if (v === '1') await listarMeusAtivos();
    if (v === '2') await renovarEmprestimo();
    if (v === '3') await minhasMultas();
  }
}

async function listarMeusAtivos() {
  clr(); h('MEUS EMPRÉSTIMOS', c.b);
  try {
    const { data } = await api.get('/alugueis/meus');
    const rows = Array.isArray(data) ? data : [];
    if (!rows.length) { console.log('\nNenhum empréstimo ativo.'); await enter(); return; }
    rows.forEach((a: any) => {
      const statusCor = a.status === 'atrasado' ? c.r : a.status === 'devolvido' ? c.dim : c.g;
      const multa = Number(a.multa_acumulada) > 0 ? cl(`  multa:R$${Number(a.multa_acumulada).toFixed(2)}`, c.r) : '';
      const condCor = a.exemplar_condicao === 'bom' ? c.g : a.exemplar_condicao === 'danificado' ? c.y : c.r;
      console.log(`  ${cl(String(a.id).padStart(3), c.dim)}  ${a.titulo.substring(0, 38).padEnd(38)}  ${cl(a.exemplar_codigo ?? '—', c.ci)}  cond:${cl(a.exemplar_condicao, condCor)}  prazo:${a.prazo?.toString().substring(0, 10)}  ${cl(a.status, statusCor)}${multa}`);
    });
  } catch (e: any) { err(e); }
  await enter();
}

async function renovarEmprestimo() {
  clr(); h('RENOVAR EMPRÉSTIMO', c.y);
  const id = await ask('ID do empréstimo: ');
  try {
    const { data } = await api.put(`/alugueis/${id}/renovar`);
    ok(data.message);
    console.log(cl(`  Novo prazo: ${data.novo_prazo}  |  Renovações usadas: ${data.renovacoes}/2`, c.dim));
  } catch (e: any) { err(e); }
  await enter();
}

async function minhasMultas() {
  clr(); h('MINHAS MULTAS', c.y);
  try {
    const { data } = await api.get('/alugueis/multas/minhas');
    if (!data.multas.length) { console.log(cl('\nNenhuma multa.', c.g)); await enter(); return; }
    data.multas.forEach((m: any) => {
      const cor = m.status === 'pendente' ? c.r : c.dim;
      console.log(cl(`  ${m.tipo.padEnd(10)} R$ ${Number(m.valor).toFixed(2).padStart(7)}  ${m.livro.substring(0, 30).padEnd(30)}  ${m.status}`, cor));
    });
    if (data.total_pendente > 0)
      console.log(cl(`\n  Total pendente: R$ ${data.total_pendente.toFixed(2)}`, c.r + c.bold));
  } catch (e: any) { err(e); }
  await enter();
}

// ── USUÁRIOS (BIBLIOTECÁRIO) ──────────────────────────────────────────────────
async function menuUsuarios() {
  while (true) {
    clr(); h('USUÁRIOS', c.ci);
    op('1', 'Listar');
    op('2', 'Editar');
    op('3', 'Remover');
    op('4', 'Ver multas de usuário');
    op('0', 'Voltar'); div();
    const v = await escolha(cl('Opção: ', c.y + c.bold), ['1', '2', '3', '4', '0']);
    if (v === '') continue;
    if (v === '0') break;
    if (v === '1') await listarUsuarios();
    if (v === '2') await editarUsuario();
    if (v === '3') await removerUsuario();
    if (v === '4') await verMultasUsuario();
  }
}

async function listarUsuarios() {
  clr(); h('LISTA DE USUÁRIOS', c.ci);
  try {
    const { data } = await api.get('/usuarios?limit=50');
    const rows = data.data ?? data;
    if (!rows.length) { console.log('\nNenhum usuário.'); await enter(); return; }
    rows.forEach((u: any) => {
      const tipoCor = u.tipo === 'bibliotecario' ? c.m : c.ci;
      const multaCor = u.multa_pendente ? cl(' [MULTA]', c.r) : '';
      console.log(`  ${cl(String(u.id).padStart(3), c.dim)}  ${cl(u.nome.padEnd(25), c.w)}  ${cl(u.email.padEnd(30), c.dim)}  ${cl(u.tipo, tipoCor)}${multaCor}`);
    });
  } catch (e: any) { err(e); }
  await enter();
}

async function editarUsuario() {
  clr(); h('EDITAR USUÁRIO', c.y);
  const id = await ask('ID: ');
  const nome = await ask('Novo nome  (Enter para manter): ');
  const email = await ask('Novo email (Enter para manter): ');
  const tipo = await ask('Novo tipo [usuario/bibliotecario] (Enter para manter): ');
  const body: any = {};
  if (nome) body.nome = nome;
  if (email) body.email = email;
  if (tipo) body.tipo = tipo;
  try { const { data } = await api.put(`/usuarios/${id}`, body); ok(data.message); }
  catch (e: any) { err(e); }
  await enter();
}

async function removerUsuario() {
  clr(); h('REMOVER USUÁRIO', c.r);
  const id = await ask('ID: ');
  const conf = await ask(cl('Confirmar remoção? (s/n): ', c.r));
  if (conf.toLowerCase() !== 's') { console.log(cl('\nCancelado.', c.dim)); await enter(); return; }
  try { const { data } = await api.delete(`/usuarios/${id}`); ok(data.message); }
  catch (e: any) { err(e); }
  await enter();
}

async function verMultasUsuario() {
  clr(); h('MULTAS DO USUÁRIO', c.y);
  const id = await ask('ID do usuário: ');
  try {
    const { data } = await api.get(`/alugueis/multas/${id}`);
    if (!data.multas.length) { console.log(cl('\nNenhuma multa.', c.g)); await enter(); return; }
    data.multas.forEach((m: any) => {
      const cor = m.status === 'pendente' ? c.r : c.dim;
      console.log(cl(`  ${m.tipo.padEnd(10)} R$ ${Number(m.valor).toFixed(2).padStart(7)}  ${m.livro?.substring(0, 30).padEnd(30)}  ${m.status}${m.pago_em ? `  pago:${m.pago_em?.toString().substring(0, 10)}` : ''}`, cor));
    });
    if (data.total_pendente > 0)
      console.log(cl(`\n  Total pendente: R$ ${data.total_pendente.toFixed(2)}`, c.r + c.bold));
  } catch (e: any) { err(e); }
  await enter();
}

// ── PERFIL ────────────────────────────────────────────────────────────────────
async function menuPerfil() {
  while (true) {
    clr(); h('MEU PERFIL', c.m);
    console.log(`\n  ${cl('Nome:', c.dim)}  ${user.nome}`);
    console.log(`  ${cl('Email:', c.dim)} ${user.email}`);
    console.log(`  ${cl('Tipo:', c.dim)}  ${user.tipo}\n`);
    div(); op('1', 'Editar perfil'); op('0', 'Voltar'); div();
    const v = await escolha(cl('Opção: ', c.y + c.bold), ['1', '0']);
    if (v === '') continue;
    if (v === '0') break;
    if (v === '1') await editarPerfil();
  }
}

async function editarPerfil() {
  clr(); h('EDITAR PERFIL', c.y);
  const nome = await ask(`Nome  (atual: ${user.nome}):  `);
  const email = await ask(`Email (atual: ${user.email}): `);
  const senha = await ask('Nova senha (Enter para manter): ');
  const body: any = {};
  if (nome) body.nome = nome;
  if (email) body.email = email;
  if (senha) body.senha = senha;
  try {
    const { data } = await api.put('/auth/perfil', body);
    if (nome) user.nome = nome;
    if (email) user.email = email;
    ok(data.message);
  } catch (e: any) { err(e); }
  await enter();
}

// ── MENU PRINCIPAL ────────────────────────────────────────────────────────────
async function menu() {
  while (true) {
    clr(); banner();
    const cor = user.tipo === 'bibliotecario' ? c.m : c.ci;
    console.log(cl(`\n  ${user.tipo === 'bibliotecario' ? '👨‍💼' : '👤'}  ${user.nome.toUpperCase()} (${user.tipo})`, cor + c.bold));
    await dashboard(); div();

    if (user.tipo === 'bibliotecario') {
      op('1', 'Acervo');
      op('2', 'Empréstimos');
      op('3', 'Usuários');
      op('4', 'Meu Perfil');
      op('0', 'Sair'); div();
      const v = await escolha(cl('Opção: ', c.y + c.bold), ['1', '2', '3', '4', '0']);
      if (v === '') continue;
      if (v === '0') break;
      if (v === '1') await menuAcervo();
      if (v === '2') await menuEmprestimos();
      if (v === '3') await menuUsuarios();
      if (v === '4') await menuPerfil();
    } else {
      op('1', 'Acervo');
      op('2', 'Meus Empréstimos');
      op('3', 'Meu Perfil');
      op('0', 'Sair'); div();
      const v = await escolha(cl('Opção: ', c.y + c.bold), ['1', '2', '3', '0']);
      if (v === '') continue;
      if (v === '0') break;
      if (v === '1') await menuAcervo();
      if (v === '2') await menuMeusEmprestimos();
      if (v === '3') await menuPerfil();
    }
  }
  token = null; user = null;
  return start();
}

// ── INÍCIO ────────────────────────────────────────────────────────────────────
async function start() {
  clr(); banner(); div();
  op('1', 'Login');
  op('2', 'Criar conta');
  op('0', 'Sair'); div();

  const v = await escolha(cl('\n> ', c.y + c.bold), ['1', '2', '0']);
  if (v === '0') { rl.close(); process.exit(0); }
  if (v === '') return start();

  const email = await ask('Email: ');
  const senha = await ask('Senha: ');

  try {
    let res;
    if (v === '2') {
      const nome = await ask('Nome: ');
      res = await api.post('/auth/registrar', { nome, email, senha, tipo: 'usuario' });
    } else {
      res = await api.post('/auth/login', { email, senha });
    }
    token = res.data.token;
    user = res.data.usuario;
    await menu();
  } catch (e: any) {
    err(e);
    await ask('Enter para voltar...');
    start();
  }
}

start();