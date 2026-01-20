import knex from 'knex';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt'; // Adicionado para a senha do admin

dotenv.config();

async function setup() {
  console.log('🔧 Iniciando configuração do banco de dados...\n');

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
    const dbName = process.env.DB_NAME || 'biblioteca';
    await connection.raw(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    console.log(`✅ Banco de dados '${dbName}' criado/verificado`);
    await connection.destroy();

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

    // --- CRIAÇÃO DAS TABELAS (USUÁRIOS) ---
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
    }

    // --- INSERÇÃO DO ADMIN (LOGICA NOVA) ---
    const adminEmail = 'admin@admin';
    const adminExiste = await db('usuarios').where({ email: adminEmail }).first();

    if (!adminExiste) {
      const senhaHash = await bcrypt.hash('admin123', 10);
      await db('usuarios').insert({
        nome: 'Administrador Master',
        email: adminEmail,
        senha: senhaHash,
        tipo: 'bibliotecario'
      });
      console.log(`⭐ Usuário ADMIN criado: ${adminEmail} | senha: admin123`);
    }

    // --- CRIAÇÃO DAS TABELAS (LIVROS) ---
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
    }

    // --- CRIAÇÃO DAS TABELAS (ALUGUÉIS) ---
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
    }

    console.log('\n🎉 Configuração concluída com sucesso!');
    await db.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro durante setup:', error);
    process.exit(1);
  }
}

setup();