import knex from 'knex';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

/**
 * Script de inicialização (Setup) do Banco de Dados.
 * Este script recria o banco de dados e as tabelas do zero.
 */
async function configurarBanco() {
  console.log('🔧 Iniciando configuração do banco de dados...\n');

  // Conexão inicial sem banco de dados selecionado para poder criar o schema
  const conexaoRaiz = knex({
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    }
  });

  try {
    const nomeBanco = process.env.DB_NAME || 'biblioteca';
    
    // Deleta e recria o banco de dados principal
    await conexaoRaiz.raw(`DROP DATABASE IF EXISTS \`${nomeBanco}\``);
    await conexaoRaiz.raw(`CREATE DATABASE \`${nomeBanco}\``);
    console.log(`✅ Banco de dados '${nomeBanco}' criado.`);
    await conexaoRaiz.destroy();

    // Nova conexão agora apontando para o banco recém-criado
    const db = knex({
      client: 'mysql2',
      connection: {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: nomeBanco
      }
    });

    // --- Criação da Tabela: USUÁRIOS ---
    await db.schema.createTable('usuarios', (t) => {
      t.increments('id').primary();
      t.string('nome', 100).notNullable();
      t.string('email', 100).notNullable().unique();
      t.string('senha', 255).notNullable();
      t.enum('tipo', ['usuario', 'bibliotecario']).notNullable();
      t.boolean('multa_pendente').notNullable().defaultTo(false);
      t.boolean('bloqueado').notNullable().defaultTo(false);
      t.text('motivo_bloqueio').nullable();
      t.timestamp('created_at').defaultTo(db.fn.now());
      
      t.index(['tipo'], 'idx_usuarios_tipo');
    });
    console.log('✅ Tabela [usuarios] criada.');

    // Criação do usuário Administrador padrão
    const hashSenhaAdmin = await bcrypt.hash('admin123', 10);
    await db('usuarios').insert({
      nome: 'Administrador Master',
      email: 'admin@admin',
      senha: hashSenhaAdmin,
      tipo: 'bibliotecario',
      multa_pendente: false
    });
    console.log('⭐ Usuário admin padrão criado: admin@admin | senha: admin123');

    // --- Criação da Tabela: LIVROS ---
    await db.schema.createTable('livros', (t) => {
      t.increments('id').primary();
      t.string('titulo', 200).notNullable();
      t.string('autor', 150).notNullable();
      t.integer('ano_lancamento').notNullable();
      t.string('genero', 100).nullable();
      t.string('isbn', 20).nullable();
      t.string('corredor', 10).notNullable();
      t.string('prateleira', 10).notNullable();
      t.text('capa_url', 'longtext').nullable();
      t.integer('exemplares').unsigned().notNullable().defaultTo(1);
      t.integer('exemplares_disponiveis').unsigned().notNullable().defaultTo(1);
      t.enum('status', ['disponivel', 'alugado']).defaultTo('disponivel');
      t.timestamp('deleted_at').nullable();
      t.timestamp('created_at').defaultTo(db.fn.now());
      
      t.index(['status'], 'idx_livros_status');
      t.index(['titulo'], 'idx_livros_titulo');
      t.index(['autor'], 'idx_livros_autor');
      t.index(['deleted_at'], 'idx_livros_deleted_at');
    });
    console.log('✅ Tabela [livros] criada.');

    // --- Criação da Tabela: EXEMPLARES ---
    // Representa a cópia física individual de um livro.
    await db.schema.createTable('exemplares', (t) => {
      t.increments('id').primary();
      t.integer('livro_id').unsigned().notNullable();
      t.string('codigo', 50).nullable();
      // Disponibilidade: disponivel / emprestado / indisponivel (manutenção) / perdido
      t.enum('disponibilidade', ['disponivel', 'emprestado', 'indisponivel', 'perdido']).notNullable().defaultTo('disponivel');
      // Condição física: bom / danificado / perdido
      t.enum('condicao', ['bom', 'danificado', 'perdido']).notNullable().defaultTo('bom');
      t.text('observacao').nullable();
      t.timestamp('created_at').defaultTo(db.fn.now());
      
      t.foreign('livro_id').references('id').inTable('livros').onDelete('CASCADE');
      t.index(['livro_id', 'disponibilidade'], 'idx_exemplares_livro_disp');
      t.index(['condicao'], 'idx_exemplares_condicao');
    });
    console.log('✅ Tabela [exemplares] criada.');

    // --- Criação da Tabela: ALUGUÉIS ---
    await db.schema.createTable('alugueis', (t) => {
      t.increments('id').primary();
      t.integer('livro_id').unsigned().notNullable();
      t.integer('exemplar_id').unsigned().notNullable();
      t.integer('usuario_id').unsigned().notNullable();
      t.timestamp('data_aluguel').defaultTo(db.fn.now());
      t.date('data_prevista_devolucao').notNullable();
      t.timestamp('data_devolucao').nullable();
      t.enum('status', ['ativo', 'devolvido']).defaultTo('ativo');
      t.enum('estado_devolucao', ['bom', 'danificado', 'perdido']).nullable();
      t.integer('renovacoes').unsigned().notNullable().defaultTo(0);
      t.timestamp('created_at').defaultTo(db.fn.now());
      
      t.foreign('livro_id').references('id').inTable('livros').onDelete('CASCADE');
      t.foreign('exemplar_id').references('id').inTable('exemplares').onDelete('CASCADE');
      t.foreign('usuario_id').references('id').inTable('usuarios').onDelete('CASCADE');
      
      t.index(['status'], 'idx_alugueis_status');
      t.index(['usuario_id', 'status'], 'idx_alugueis_usuario_status');
      t.index(['data_prevista_devolucao'], 'idx_alugueis_prazo');
      t.index(['exemplar_id'], 'idx_alugueis_exemplar');
    });
    console.log('✅ Tabela [alugueis] criada.');

    // --- Criação da Tabela: MULTAS ---
    await db.schema.createTable('multas', (t) => {
      t.increments('id').primary();
      t.integer('aluguel_id').unsigned().notNullable();
      t.integer('usuario_id').unsigned().notNullable();
      t.enum('tipo', ['atraso', 'perda']).notNullable();
      t.decimal('valor', 10, 2).notNullable();
      t.integer('dias_atraso').unsigned().notNullable().defaultTo(0);
      t.enum('status', ['pendente', 'paga']).notNullable().defaultTo('pendente');
      t.timestamp('pago_em').nullable();
      t.timestamp('created_at').defaultTo(db.fn.now());
      
      t.foreign('aluguel_id').references('id').inTable('alugueis').onDelete('CASCADE');
      t.foreign('usuario_id').references('id').inTable('usuarios').onDelete('CASCADE');
      
      t.index(['usuario_id', 'status'], 'idx_multas_usuario_status');
      t.index(['aluguel_id'], 'idx_multas_aluguel');
    });
    // --- Criação da Tabela: ACERVO DIGITAL ---
    await db.schema.createTable('acervo_digital', (t) => {
      t.increments('id').primary();
      t.string('titulo', 200).notNullable();
      t.string('autor', 150).nullable();
      t.string('categoria', 100).notNullable();
      t.integer('ano').notNullable();
      t.integer('paginas').unsigned().notNullable();
      t.string('tamanho_arquivo', 20).notNullable();
      t.text('url_arquivo', 'longtext').notNullable();
      t.text('capa_url', 'longtext').nullable(); // Base64 da thumb (capa)
      t.enum('status', ['pendente', 'aprovado']).notNullable().defaultTo('aprovado');
      t.integer('usuario_id').unsigned().nullable(); // Quem enviou
      t.timestamp('created_at').defaultTo(db.fn.now());
      
      t.foreign('usuario_id').references('id').inTable('usuarios').onDelete('SET NULL');
      t.index(['categoria'], 'idx_digital_categoria');
      t.index(['status'], 'idx_digital_status');
      t.index(['titulo'], 'idx_digital_titulo');
    });
    console.log('✅ Tabela [acervo_digital] criada.');

    // Acervo Digital inicia vazio

    console.log('\n🎉 Banco de dados configurado com sucesso!');
    await db.destroy();
    process.exit(0);
    
  } catch (erro) {
    console.error('❌ Erro crítico ao configurar banco:', erro);
    process.exit(1);
  }
}

// Executa o script de inicialização
configurarBanco();