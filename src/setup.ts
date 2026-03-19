import knex from 'knex';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

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

    // ── USUÁRIOS ─────────────────────────────────────────
    const tabelaUsuarios = await db.schema.hasTable('usuarios');
    if (!tabelaUsuarios) {
      await db.schema.createTable('usuarios', (table) => {
        table.increments('id').primary();
        table.string('nome', 100).notNullable();
        table.string('email', 100).notNullable().unique(); // unique já cria índice
        table.string('senha', 255).notNullable();
        table.enum('tipo', ['usuario', 'bibliotecario']).notNullable();
        table.timestamp('created_at').defaultTo(db.fn.now());
        // Índice em tipo: filtro frequente (listar só usuários, só bibliotecários)
        table.index(['tipo'], 'idx_usuarios_tipo');
      });
      console.log('✅ Tabela "usuarios" criada');
    }

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

    // ── LIVROS ───────────────────────────────────────────
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
        table.integer('exemplares').unsigned().notNullable().defaultTo(1);
        table.integer('exemplares_disponiveis').unsigned().notNullable().defaultTo(1);
        table.enum('status', ['disponivel', 'alugado']).defaultTo('disponivel');
        table.timestamp('created_at').defaultTo(db.fn.now());
        // Índices: status é filtrado em todo acervo; busca textual em título/autor
        table.index(['status'], 'idx_livros_status');
        table.index(['titulo'], 'idx_livros_titulo');
        table.index(['autor'], 'idx_livros_autor');
      });
      console.log('✅ Tabela "livros" criada');
    } else {
      // Migração segura: exemplares
      const temExemplares = await db.schema.hasColumn('livros', 'exemplares');
      if (!temExemplares) {
        await db.schema.table('livros', (table) => {
          table.integer('exemplares').unsigned().notNullable().defaultTo(1).after('prateleira');
          table.integer('exemplares_disponiveis').unsigned().notNullable().defaultTo(1).after('exemplares');
        });
        console.log('✅ Colunas "exemplares" adicionadas à tabela "livros"');
      }
      // Migração segura: índices (ignora se já existir)
      try {
        await db.schema.table('livros', (table) => {
          table.index(['status'], 'idx_livros_status');
          table.index(['titulo'], 'idx_livros_titulo');
          table.index(['autor'], 'idx_livros_autor');
        });
        console.log('✅ Índices adicionados à tabela "livros"');
      } catch { /* índices já existem */ }
    }

    // ── ALUGUÉIS ─────────────────────────────────────────
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
        table.integer('renovacoes').unsigned().notNullable().defaultTo(0);
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.foreign('livro_id').references('id').inTable('livros').onDelete('CASCADE');
        table.foreign('usuario_id').references('id').inTable('usuarios').onDelete('CASCADE');
        // Índices: as 3 colunas mais consultadas em conjunto
        table.index(['status'], 'idx_alugueis_status');
        table.index(['usuario_id', 'status'], 'idx_alugueis_usuario_status');
        table.index(['data_prevista_devolucao'], 'idx_alugueis_prazo');
      });
      console.log('✅ Tabela "alugueis" criada');
    } else {
      // Migração segura: índices
      try {
        await db.schema.table('alugueis', (table) => {
          table.index(['status'], 'idx_alugueis_status');
          table.index(['usuario_id', 'status'], 'idx_alugueis_usuario_status');
          table.index(['data_prevista_devolucao'], 'idx_alugueis_prazo');
        });
        console.log('✅ Índices adicionados à tabela "alugueis"');
      } catch { /* índices já existem */ }
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