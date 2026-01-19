import knex from 'knex';
import dotenv from 'dotenv';

dotenv.config();

async function setup() {
  console.log('🔧 Iniciando configuração do banco de dados...\n');

  // Conexão sem database para criar o banco
  const connection = knex({
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    }
  });

  try {
    // Criar banco de dados
    const dbName = process.env.DB_NAME || 'biblioteca';
    await connection.raw(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    console.log(`✅ Banco de dados '${dbName}' criado/verificado`);

    await connection.destroy();

    // Conectar ao banco criado
    const db = knex({
      client: 'mysql2',
      connection: {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: dbName
      }
    });

    // Criar tabela de usuários
    const tabelaUsuarios = await db.schema.hasTable('usuarios');
    if (!tabelaUsuarios) {
      await db.schema.createTable('usuarios', (table) => {
        table.increments('id').primary();
        table.string('nome', 100).notNullable();
        table.string('email', 100).notNullable().unique();
        table.string('senha', 255).notNullable();
        table.enum('tipo', ['usuario', 'bibliotecario']).notNullable();
        table.timestamp('created_at').defaultTo(db.fn.now());
      });
      console.log('✅ Tabela "usuarios" criada');
    } else {
      console.log('ℹ️  Tabela "usuarios" já existe');
    }

    // Criar tabela de livros
    const tabelaLivros = await db.schema.hasTable('livros');
    if (!tabelaLivros) {
      await db.schema.createTable('livros', (table) => {
        table.increments('id').primary();
        table.string('titulo', 200).notNullable();
        table.string('autor', 150).notNullable();
        table.integer('ano_lancamento').notNullable();
        table.string('genero', 100).nullable();
        table.string('isbn', 20).nullable();
        table.string('corredor', 10).notNullable();
        table.string('prateleira', 10).notNullable();
        table.enum('status', ['disponivel', 'alugado']).defaultTo('disponivel');
        table.timestamp('created_at').defaultTo(db.fn.now());
      });
      console.log('✅ Tabela "livros" criada');
    } else {
      console.log('ℹ️  Tabela "livros" já existe');
    }

    // Criar tabela de aluguéis
    const tabelaAlugueis = await db.schema.hasTable('alugueis');
    if (!tabelaAlugueis) {
      await db.schema.createTable('alugueis', (table) => {
        table.increments('id').primary();
        table.integer('livro_id').unsigned().notNullable();
        table.integer('usuario_id').unsigned().notNullable();
        table.timestamp('data_aluguel').defaultTo(db.fn.now());
        table.date('data_prevista_devolucao').notNullable();
        table.timestamp('data_devolucao').nullable();
        table.enum('status', ['ativo', 'devolvido']).defaultTo('ativo');
        table.timestamp('created_at').defaultTo(db.fn.now());

        table.foreign('livro_id').references('id').inTable('livros').onDelete('CASCADE');
        table.foreign('usuario_id').references('id').inTable('usuarios').onDelete('CASCADE');
      });
      console.log('✅ Tabela "alugueis" criada');
    } else {
      console.log('ℹ️  Tabela "alugueis" já existe');
    }

    console.log('\n🎉 Configuração concluída com sucesso!');
    console.log('📝 Execute "npm run dev" para iniciar o servidor');
    console.log('💻 Execute "npm run cli" para usar a interface CLI\n');

    await db.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro durante setup:', error);
    process.exit(1);
  }
}

setup();