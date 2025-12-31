@echo off
chcp 65001 >nul
color 0A
echo.
echo ╔════════════════════════════════════════════════╗
echo ║   🚀 SETUP AUTOMÁTICO - PROJETO MYSQL + TS    ║
echo ╚════════════════════════════════════════════════╝
echo.

REM Verificar Node.js
node -v >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js não encontrado! Instale em: https://nodejs.org
    pause
    exit /b 1
)
echo ✅ Node.js detectado: 
node -v
echo.

REM Criar estrutura
echo [1/7] 📁 Criando estrutura...
mkdir src 2>nul
echo      ✓ Pastas criadas
echo.

REM Criar index.ts
echo [2/7] 📝 Criando index.ts...
(
echo import knex from 'knex';
echo import dotenv from 'dotenv';
echo import * as readline from 'readline';
echo.
echo dotenv.config^(^);
echo.
echo const dbName = process.env.DB_NAME ^|^| 'bdb';
echo.
echo const rl = readline.createInterface^({
echo   input: process.stdin,
echo   output: process.stdout
echo }^);
echo.
echo function pergunta^(texto: string^): Promise^<string^> {
echo   return new Promise^(^(resolve^) =^> rl.question^(texto, resolve^)^);
echo }
echo.
echo const db = knex^({
echo   client: 'mysql2',
echo   connection: {
echo     host: process.env.DB_HOST ^|^| 'localhost',
echo     port: Number^(process.env.DB_PORT^) ^|^| 3306,
echo     user: process.env.DB_USER ^|^| 'root',
echo     password: process.env.DB_PASSWORD ^|^| '',
echo     database: dbName
echo   }
echo }^);
echo.
echo // ========== USUÁRIOS ==========
echo async function listarUsuarios^(^) {
echo   const usuarios = await db^('usuarios'^).select^('id', 'nome', 'email', 'telefone', 'endereco'^);
echo   if ^(usuarios.length ^> 0^) {
echo     console.log^('\n📋 Usuários cadastrados:'^);
echo     console.table^(usuarios^);
echo   } else {
echo     console.log^('\n📋 Nenhum usuário cadastrado.\n'^);
echo   }
echo }
echo.
echo async function adicionarUsuario^(^) {
echo   console.log^('\n➕ ADICIONAR USUÁRIO\n'^);
echo   const nome = await pergunta^('Nome: '^);
echo   const email = await pergunta^('Email: '^);
echo   const telefone = await pergunta^('Telefone: '^);
echo   const endereco = await pergunta^('Endereço: '^);
echo   const senha = await pergunta^('Senha: '^);
echo   try {
echo     await db^('usuarios'^).insert^({ nome, email, telefone, endereco, senha }^);
echo     console.log^('\n✅ Usuário adicionado!\n'^);
echo   } catch ^(error: any^) {
echo     console.log^('\n❌ Erro:', error.code === 'ER_DUP_ENTRY' ? 'Email já existe!' : error.message^);
echo   }
echo }
echo.
echo async function atualizarUsuario^(^) {
echo   await listarUsuarios^(^);
echo   console.log^('\n✏️  ATUALIZAR USUÁRIO\n'^);
echo   const id = await pergunta^('ID: '^);
echo   const nome = await pergunta^('Nome: '^);
echo   const email = await pergunta^('Email: '^);
echo   const telefone = await pergunta^('Telefone: '^);
echo   const endereco = await pergunta^('Endereço: '^);
echo   try {
echo     const result = await db^('usuarios'^).where^({ id }^).update^({ nome, email, telefone, endereco }^);
echo     console.log^(result ^> 0 ? '\n✅ Atualizado!\n' : '\n❌ Não encontrado!\n'^);
echo   } catch ^(error: any^) {
echo     console.log^('\n❌ Erro:', error.message^);
echo   }
echo }
echo.
echo async function deletarUsuario^(^) {
echo   await listarUsuarios^(^);
echo   console.log^('\n🗑️  DELETAR USUÁRIO\n'^);
echo   const id = await pergunta^('ID: '^);
echo   const conf = await pergunta^('Confirma? ^(s/n^): '^);
echo   if ^(conf.toLowerCase^(^) === 's'^) {
echo     const result = await db^('usuarios'^).where^({ id }^).delete^(^);
echo     console.log^(result ^> 0 ? '\n✅ Deletado!\n' : '\n❌ Não encontrado!\n'^);
echo   } else {
echo     console.log^('\n❌ Cancelado.\n'^);
echo   }
echo }
echo.
echo // ========== LIVROS ==========
echo async function listarLivros^(^) {
echo   const livros = await db^('livros'^).select^('*'^);
echo   if ^(livros.length ^> 0^) {
echo     console.log^('\n📚 Livros cadastrados:'^);
echo     console.table^(livros^);
echo   } else {
echo     console.log^('\n📚 Nenhum livro cadastrado.\n'^);
echo   }
echo }
echo.
echo async function adicionarLivro^(^) {
echo   console.log^('\n➕ ADICIONAR LIVRO\n'^);
echo   const titulo = await pergunta^('Título: '^);
echo   const autor = await pergunta^('Autor: '^);
echo   const ano_lancamento = await pergunta^('Ano de lançamento: '^);
echo   try {
echo     await db^('livros'^).insert^({ titulo, autor, ano_lancamento, status: 'disponivel' }^);
echo     console.log^('\n✅ Livro adicionado!\n'^);
echo   } catch ^(error: any^) {
echo     console.log^('\n❌ Erro:', error.message^);
echo   }
echo }
echo.
echo async function atualizarLivro^(^) {
echo   await listarLivros^(^);
echo   console.log^('\n✏️  ATUALIZAR LIVRO\n'^);
echo   const id = await pergunta^('ID: '^);
echo   const titulo = await pergunta^('Título: '^);
echo   const autor = await pergunta^('Autor: '^);
echo   const ano_lancamento = await pergunta^('Ano: '^);
echo   try {
echo     const result = await db^('livros'^).where^({ id }^).update^({ titulo, autor, ano_lancamento }^);
echo     console.log^(result ^> 0 ? '\n✅ Atualizado!\n' : '\n❌ Não encontrado!\n'^);
echo   } catch ^(error: any^) {
echo     console.log^('\n❌ Erro:', error.message^);
echo   }
echo }
echo.
echo async function deletarLivro^(^) {
echo   await listarLivros^(^);
echo   console.log^('\n🗑️  DELETAR LIVRO\n'^);
echo   const id = await pergunta^('ID: '^);
echo   const conf = await pergunta^('Confirma? ^(s/n^): '^);
echo   if ^(conf.toLowerCase^(^) === 's'^) {
echo     const result = await db^('livros'^).where^({ id }^).delete^(^);
echo     console.log^(result ^> 0 ? '\n✅ Deletado!\n' : '\n❌ Não encontrado!\n'^);
echo   } else {
echo     console.log^('\n❌ Cancelado.\n'^);
echo   }
echo }
echo.
echo // ========== ALUGUEIS ==========
echo async function alugarLivro^(^) {
echo   await listarUsuarios^(^);
echo   await listarLivros^(^);
echo   console.log^('\n📖 ALUGAR LIVRO\n'^);
echo   const usuario_id = await pergunta^('ID do usuário: '^);
echo   const livro_id = await pergunta^('ID do livro: '^);
echo   try {
echo     const livro = await db^('livros'^).where^({ id: livro_id }^).first^(^);
echo     if ^(!livro^) {
echo       console.log^('\n❌ Livro não encontrado!\n'^);
echo       return;
echo     }
echo     if ^(livro.status === 'alugado'^) {
echo       console.log^('\n❌ Livro já está alugado!\n'^);
echo       return;
echo     }
echo     await db^('alugueis'^).insert^({ usuario_id, livro_id }^);
echo     await db^('livros'^).where^({ id: livro_id }^).update^({ status: 'alugado' }^);
echo     console.log^('\n✅ Livro alugado com sucesso!\n'^);
echo   } catch ^(error: any^) {
echo     console.log^('\n❌ Erro:', error.message^);
echo   }
echo }
echo.
echo async function devolverLivro^(^) {
echo   const alugueis = await db^('alugueis'^)
echo     .join^('usuarios', 'alugueis.usuario_id', 'usuarios.id'^)
echo     .join^('livros', 'alugueis.livro_id', 'livros.id'^)
echo     .where^('alugueis.data_devolucao', null^)
echo     .select^('alugueis.id', 'usuarios.nome as usuario', 'livros.titulo', 'alugueis.data_aluguel'^);
echo   if ^(alugueis.length === 0^) {
echo     console.log^('\n📖 Nenhum livro alugado no momento.\n'^);
echo     return;
echo   }
echo   console.log^('\n📖 Livros alugados:'^);
echo   console.table^(alugueis^);
echo   console.log^('\n📥 DEVOLVER LIVRO\n'^);
echo   const id = await pergunta^('ID do aluguel: '^);
echo   try {
echo     const aluguel = await db^('alugueis'^).where^({ id }^).first^(^);
echo     if ^(!aluguel^) {
echo       console.log^('\n❌ Aluguel não encontrado!\n'^);
echo       return;
echo     }
echo     await db^('alugueis'^).where^({ id }^).update^({ data_devolucao: db.fn.now^(^) }^);
echo     await db^('livros'^).where^({ id: aluguel.livro_id }^).update^({ status: 'disponivel' }^);
echo     console.log^('\n✅ Livro devolvido!\n'^);
echo   } catch ^(error: any^) {
echo     console.log^('\n❌ Erro:', error.message^);
echo   }
echo }
echo.
echo async function listarAlugueis^(^) {
echo   const alugueis = await db^('alugueis'^)
echo     .join^('usuarios', 'alugueis.usuario_id', 'usuarios.id'^)
echo     .join^('livros', 'alugueis.livro_id', 'livros.id'^)
echo     .select^('alugueis.id', 'usuarios.nome as usuario', 'livros.titulo', 'alugueis.data_aluguel', 'alugueis.data_devolucao'^);
echo   if ^(alugueis.length ^> 0^) {
echo     console.log^('\n📋 Histórico de alugueis:'^);
echo     console.table^(alugueis^);
echo   } else {
echo     console.log^('\n📋 Nenhum aluguel registrado.\n'^);
echo   }
echo }
echo.
echo // ========== MENUS ==========
echo async function menuUsuarios^(^): Promise^<void^> {
echo   console.log^('\n═══════════════════════════════════\n       GERENCIAR USUÁRIOS\n═══════════════════════════════════\n1 - Listar\n2 - Adicionar\n3 - Atualizar\n4 - Deletar\n5 - Voltar\n═══════════════════════════════════\n'^);
echo   const op = await pergunta^('Opção: '^);
echo   switch ^(op^) {
echo     case '1': await listarUsuarios^(^); await menuUsuarios^(^); break;
echo     case '2': await adicionarUsuario^(^); await menuUsuarios^(^); break;
echo     case '3': await atualizarUsuario^(^); await menuUsuarios^(^); break;
echo     case '4': await deletarUsuario^(^); await menuUsuarios^(^); break;
echo     case '5': await mostrarMenu^(^); break;
echo     default: console.log^('\n❌ Opção inválida!\n'^); await menuUsuarios^(^);
echo   }
echo }
echo.
echo async function menuLivros^(^): Promise^<void^> {
echo   console.log^('\n═══════════════════════════════════\n        GERENCIAR LIVROS\n═══════════════════════════════════\n1 - Listar\n2 - Adicionar\n3 - Atualizar\n4 - Deletar\n5 - Voltar\n═══════════════════════════════════\n'^);
echo   const op = await pergunta^('Opção: '^);
echo   switch ^(op^) {
echo     case '1': await listarLivros^(^); await menuLivros^(^); break;
echo     case '2': await adicionarLivro^(^); await menuLivros^(^); break;
echo     case '3': await atualizarLivro^(^); await menuLivros^(^); break;
echo     case '4': await deletarLivro^(^); await menuLivros^(^); break;
echo     case '5': await mostrarMenu^(^); break;
echo     default: console.log^('\n❌ Opção inválida!\n'^); await menuLivros^(^);
echo   }
echo }
echo.
echo async function menuAlugueis^(^): Promise^<void^> {
echo   console.log^('\n═══════════════════════════════════\n        GERENCIAR ALUGUEIS\n═══════════════════════════════════\n1 - Alugar livro\n2 - Devolver livro\n3 - Listar alugueis\n4 - Voltar\n═══════════════════════════════════\n'^);
echo   const op = await pergunta^('Opção: '^);
echo   switch ^(op^) {
echo     case '1': await alugarLivro^(^); await menuAlugueis^(^); break;
echo     case '2': await devolverLivro^(^); await menuAlugueis^(^); break;
echo     case '3': await listarAlugueis^(^); await menuAlugueis^(^); break;
echo     case '4': await mostrarMenu^(^); break;
echo     default: console.log^('\n❌ Opção inválida!\n'^); await menuAlugueis^(^);
echo   }
echo }
echo.
echo async function mostrarMenu^(^): Promise^<void^> {
echo   console.log^('\n═══════════════════════════════════\n    📚 SISTEMA DE BIBLIOTECA 📚\n═══════════════════════════════════\n1 - Gerenciar Usuários\n2 - Gerenciar Livros\n3 - Gerenciar Alugueis\n4 - Sair\n═══════════════════════════════════\n'^);
echo   const op = await pergunta^('Opção: '^);
echo   switch ^(op^) {
echo     case '1': await menuUsuarios^(^); break;
echo     case '2': await menuLivros^(^); break;
echo     case '3': await menuAlugueis^(^); break;
echo     case '4': console.log^('\n👋 Encerrando...\n'^); rl.close^(^); await db.destroy^(^); process.exit^(0^); break;
echo     default: console.log^('\n❌ Opção inválida!\n'^); await mostrarMenu^(^);
echo   }
echo }
echo.
echo async function main^(^) {
echo   console.log^('🚀 Iniciando sistema...\n'^);
echo   try {
echo     await db.raw^('SELECT 1'^);
echo     console.log^('✅ Conectado ao banco!\n'^);
echo     await mostrarMenu^(^);
echo   } catch ^(error^) {
echo     console.error^('❌ Erro ao conectar:', error^);
echo     console.log^('\n💡 Dica: Execute "npm run bd" primeiro!\n'^);
echo     rl.close^(^); await db.destroy^(^); process.exit^(1^);
echo   }
echo }
echo main^(^);
) > src\index.ts
echo      ✓ index.ts criado
echo.

REM Criar setup.ts
echo [3/7] 🔧 Criando setup.ts...
(
echo import knex from 'knex';
echo import dotenv from 'dotenv';
echo dotenv.config^(^);
echo const dbName = process.env.DB_NAME ^|^| 'bdb';
echo async function setupDatabase^(^) {
echo   const connection = knex^({ client: 'mysql2', connection: { host: process.env.DB_HOST ^|^| 'localhost', port: Number^(process.env.DB_PORT^) ^|^| 3306, user: process.env.DB_USER ^|^| 'root', password: process.env.DB_PASSWORD ^|^| '' } }^);
echo   try {
echo     console.log^('🚀 Iniciando setup...\n'^);
echo     await connection.raw^(`DROP DATABASE IF EXISTS ${dbName}`^);
echo     console.log^(`🗑️  Banco antigo removido`^);
echo     await connection.raw^(`CREATE DATABASE ${dbName}`^);
echo     console.log^(`✅ Banco "${dbName}" criado!`^);
echo     await connection.destroy^(^);
echo     const db = knex^({ client: 'mysql2', connection: { host: process.env.DB_HOST ^|^| 'localhost', port: Number^(process.env.DB_PORT^) ^|^| 3306, user: process.env.DB_USER ^|^| 'root', password: process.env.DB_PASSWORD ^|^| '', database: dbName } }^);
echo     console.log^('\n📋 Criando tabelas...'^);
echo     await db.schema.createTable^('usuarios', ^(table: any^) =^> { table.increments^('id'^).primary^(^); table.string^('nome', 100^).notNullable^(^); table.string^('email', 100^).notNullable^(^).unique^(^); table.string^('telefone', 20^); table.string^('endereco', 200^); table.string^('senha', 255^).notNullable^(^); table.timestamp^('created_at'^).defaultTo^(db.fn.now^(^)^); }^);
echo     await db.schema.createTable^('livros', ^(table: any^) =^> { table.increments^('id'^).primary^(^); table.string^('titulo', 150^).notNullable^(^); table.string^('autor', 100^).notNullable^(^); table.integer^('ano_lancamento'^).notNullable^(^); table.enum^('status', ['disponivel', 'alugado']^).defaultTo^('disponivel'^); table.timestamp^('created_at'^).defaultTo^(db.fn.now^(^)^); }^);
echo     await db.schema.createTable^('alugueis', ^(table: any^) =^> { table.increments^('id'^).primary^(^); table.integer^('usuario_id'^).unsigned^(^).notNullable^(^); table.integer^('livro_id'^).unsigned^(^).notNullable^(^); table.timestamp^('data_aluguel'^).defaultTo^(db.fn.now^(^)^); table.timestamp^('data_devolucao'^).nullable^(^); table.foreign^('usuario_id'^).references^('usuarios.id'^).onDelete^('CASCADE'^); table.foreign^('livro_id'^).references^('livros.id'^).onDelete^('CASCADE'^); }^);
echo     console.log^('✅ Tabelas criadas!\n🎉 Setup concluído!\n'^);
echo     await db.destroy^(^); process.exit^(0^);
echo   } catch ^(error^) {
echo     console.error^('❌ Erro:', error^);
echo     await connection.destroy^(^); process.exit^(1^);
echo   }
echo }
echo setupDatabase^(^);
) > src\setup.ts
echo      ✓ setup.ts criado
echo.

REM Criar arquivos de configuração
echo [4/7] ⚙️  Criando configurações...
(
echo DB_HOST=localhost
echo DB_PORT=3306
echo DB_USER=root
echo DB_PASSWORD=senacrs
echo DB_NAME=bdb
) > .env

(
echo node_modules/
echo dist/
echo .env
echo *.log
) > .gitignore

(
echo { "compilerOptions": { "target": "ES2020", "module": "commonjs", "outDir": "./dist", "rootDir": "./src", "strict": true, "esModuleInterop": true, "skipLibCheck": true }, "include": ["src/**/*"] }
) > tsconfig.json

(
echo { "name": "sistema-biblioteca", "version": "1.0.0", "scripts": { "dev": "nodemon --exec ts-node src/index.ts", "start": "ts-node src/index.ts", "build": "tsc", "bd": "ts-node src/setup.ts" }, "keywords": ["mysql", "typescript"], "license": "ISC" }
) > package.json
echo      ✓ Configurações criadas
echo.

REM Instalar dependências
echo [5/7] 📦 Instalando dependências...
call npm install mysql2 knex dotenv --silent
call npm install -D typescript @types/node ts-node nodemon --silent
echo      ✓ Dependências instaladas
echo.

REM Git
echo [6/7] 🔧 Inicializando Git...
git init >nul 2>&1
echo      ✓ Git inicializado
echo.

REM Finalizar
echo [7/7] ✅ Finalizando...
echo.
echo ╔════════════════════════════════════════════════╗
echo ║              ✅ SETUP CONCLUÍDO!               ║
echo ╚════════════════════════════════════════════════╝
echo.
echo 📋 Próximos passos:
echo    1. Editar o .env com as suas informações
echo    2. npm run bd      - Criar banco e tabelas
echo    3. npm run dev     - Iniciar sistema
echo.
pause