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
    console.log(`✅ Banco '${dbName}' criado/verificado`);
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
        table.string('email', 100).notNullable().unique();
        table.string('senha', 255).notNullable();
        table.enum('tipo', ['usuario', 'bibliotecario']).notNullable();
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.index(['tipo'], 'idx_usuarios_tipo');
      });
      console.log('✅ Tabela usuarios criada');
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
      console.log(`⭐ Admin criado: ${adminEmail} | senha: admin123`);
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
        // exemplares e exemplares_disponiveis mantidos para compatibilidade
        // e para exibir totais agregados sem precisar contar exemplares toda vez
        table.integer('exemplares').unsigned().notNullable().defaultTo(1);
        table.integer('exemplares_disponiveis').unsigned().notNullable().defaultTo(1);
        table.enum('status', ['disponivel', 'alugado']).defaultTo('disponivel');
        table.timestamp('deleted_at').nullable();
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.index(['status'], 'idx_livros_status');
        table.index(['titulo'], 'idx_livros_titulo');
        table.index(['autor'], 'idx_livros_autor');
        table.index(['deleted_at'], 'idx_livros_deleted_at');
      });
      console.log('✅ Tabela livros criada');
    } else {
      // Migration: exemplares
      const temExemplares = await db.schema.hasColumn('livros', 'exemplares');
      if (!temExemplares) {
        await db.schema.table('livros', (table) => {
          table.integer('exemplares').unsigned().notNullable().defaultTo(1).after('prateleira');
          table.integer('exemplares_disponiveis').unsigned().notNullable().defaultTo(1).after('exemplares');
        });
        console.log('✅ Colunas exemplares adicionadas à tabela livros');
      }
      // Migration: soft delete
      const temDeletedAt = await db.schema.hasColumn('livros', 'deleted_at');
      if (!temDeletedAt) {
        await db.schema.table('livros', (table) => {
          table.timestamp('deleted_at').nullable().after('status');
        });
        console.log('✅ Coluna deleted_at adicionada à tabela livros');
      }
      // Migration: índices
      try {
        await db.schema.table('livros', (table) => {
          table.index(['status'], 'idx_livros_status');
          table.index(['titulo'], 'idx_livros_titulo');
          table.index(['autor'], 'idx_livros_autor');
        });
        console.log('✅ Índices adicionados à tabela livros');
      } catch { /* índices já existem */ }
      try {
        await db.schema.table('livros', (table) => {
          table.index(['deleted_at'], 'idx_livros_deleted_at');
        });
      } catch { /* índice já existe */ }
    }

    // ── EXEMPLARES ───────────────────────────────────────
    // Cada cópia física de um livro tem seu próprio registro e status
    const tabelaExemplares = await db.schema.hasTable('exemplares');
    if (!tabelaExemplares) {
      await db.schema.createTable('exemplares', (table) => {
        table.increments('id').primary();
        table.integer('livro_id').unsigned().notNullable();
        // Código de identificação física (ex: etiqueta na lombada)
        table.string('codigo', 50).nullable();
        table.enum('status', ['disponivel', 'emprestado', 'danificado', 'perdido']).defaultTo('disponivel');
        table.text('observacao').nullable(); // ex: "páginas rasgadas", "capa danificada"
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.foreign('livro_id').references('id').inTable('livros').onDelete('CASCADE');
        table.index(['livro_id', 'status'], 'idx_exemplares_livro_status');
        table.index(['status'], 'idx_exemplares_status');
      });
      console.log('✅ Tabela exemplares criada');

      // Migration de dados: para cada livro existente, cria N registros de exemplares
      // correspondendo à quantidade atual de exemplares cadastrados
      const livrosExistentes = await db('livros').select('id', 'exemplares', 'exemplares_disponiveis');
      for (const livro of livrosExistentes) {
        const emprestados = livro.exemplares - livro.exemplares_disponiveis;
        const inserts = [];
        for (let i = 0; i < livro.exemplares; i++) {
          inserts.push({
            livro_id: livro.id,
            codigo: `EX-${livro.id}-${String(i + 1).padStart(3, '0')}`,
            status: i < emprestados ? 'emprestado' : 'disponivel'
          });
        }
        if (inserts.length > 0) await db('exemplares').insert(inserts);
      }
      console.log('✅ Exemplares migrados dos livros existentes');
    }

    // ── ALUGUÉIS ─────────────────────────────────────────
    const tabelaAlugueis = await db.schema.hasTable('alugueis');
    if (!tabelaAlugueis) {
      await db.schema.createTable('alugueis', (table) => {
        table.increments('id').primary();
        table.integer('livro_id').unsigned().notNullable();
        table.integer('exemplar_id').unsigned().notNullable();
        table.integer('usuario_id').unsigned().notNullable();
        table.timestamp('data_aluguel').defaultTo(db.fn.now());
        table.date('data_prevista_devolucao').notNullable();
        table.timestamp('data_devolucao').nullable();
        table.enum('status', ['ativo', 'devolvido']).defaultTo('ativo');
        table.integer('renovacoes').unsigned().notNullable().defaultTo(0);
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.foreign('livro_id').references('id').inTable('livros').onDelete('CASCADE');
        table.foreign('exemplar_id').references('id').inTable('exemplares').onDelete('CASCADE');
        table.foreign('usuario_id').references('id').inTable('usuarios').onDelete('CASCADE');
        table.index(['status'], 'idx_alugueis_status');
        table.index(['usuario_id', 'status'], 'idx_alugueis_usuario_status');
        table.index(['data_prevista_devolucao'], 'idx_alugueis_prazo');
        table.index(['exemplar_id'], 'idx_alugueis_exemplar');
      });
      console.log('✅ Tabela alugueis criada');
    } else {
      // Migration: adiciona exemplar_id se não existir
      const temExemplarId = await db.schema.hasColumn('alugueis', 'exemplar_id');
      if (!temExemplarId) {
        await db.schema.table('alugueis', (table) => {
          // nullable por enquanto para não quebrar registros existentes
          table.integer('exemplar_id').unsigned().nullable().after('livro_id');
        });

        // Preenche exemplar_id nos alugueis existentes:
        // vincula cada aluguel ativo ao primeiro exemplar emprestado do livro
        // e cada aluguel devolvido ao primeiro exemplar disponível do livro
        const alugueis = await db('alugueis').select('id', 'livro_id', 'status');
        for (const aluguel of alugueis) {
          const exemplar = await db('exemplares')
            .where({ livro_id: aluguel.livro_id })
            .where('status', aluguel.status === 'ativo' ? 'emprestado' : 'disponivel')
            .first();
          if (exemplar) {
            await db('alugueis').where({ id: aluguel.id }).update({ exemplar_id: exemplar.id });
          }
        }

        // Adiciona FK após preencher os dados
        try {
          await db.schema.table('alugueis', (table) => {
            table.foreign('exemplar_id').references('id').inTable('exemplares').onDelete('CASCADE');
            table.index(['exemplar_id'], 'idx_alugueis_exemplar');
          });
        } catch { /* FK já existe */ }

        console.log('✅ Coluna exemplar_id adicionada e migrada em alugueis');
      }
      // Migration: índices
      try {
        await db.schema.table('alugueis', (table) => {
          table.index(['status'], 'idx_alugueis_status');
          table.index(['usuario_id', 'status'], 'idx_alugueis_usuario_status');
          table.index(['data_prevista_devolucao'], 'idx_alugueis_prazo');
        });
        console.log('✅ Índices adicionados à tabela alugueis');
      } catch { /* índices já existem */ }
    }

    console.log('\n🎉 Banco de dados configurado com sucesso!');
    await db.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao configurar banco de dados:', error);
    process.exit(1);
  }
}

setup();