import knex from 'knex';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

/**
 * Script de inicialização (Setup) do Banco de Dados.
 * Este script cria as tabelas se não existirem (modo seguro para produção).
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
    
    // Em produção, não deleta o banco, apenas cria se não existir
    if (process.env.NODE_ENV === 'production') {
      await conexaoRaiz.raw(`CREATE DATABASE IF NOT EXISTS \`${nomeBanco}\``);
      console.log(`✅ Banco de dados '${nomeBanco}' verificado/criado.`);
    } else {
      // Em desenvolvimento, deleta e recria
      await conexaoRaiz.raw(`DROP DATABASE IF EXISTS \`${nomeBanco}\``);
      await conexaoRaiz.raw(`CREATE DATABASE \`${nomeBanco}\``);
      console.log(`✅ Banco de dados '${nomeBanco}' criado (modo desenvolvimento).`);
    }
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
    await db.schema.createTableIfNotExists('usuarios', (t) => {
      t.increments('id').primary();
      t.string('nome', 100).notNullable();
      t.string('email', 100).notNullable().unique();
      t.string('senha', 255).notNullable();
      t.enum('tipo', ['usuario', 'bibliotecario']).notNullable();
      t.boolean('multa_pendente').notNullable().defaultTo(false);
      t.boolean('bloqueado').notNullable().defaultTo(false);
      t.text('motivo_bloqueio').nullable();
      t.timestamp('deleted_at').nullable();
      t.timestamp('created_at').defaultTo(db.fn.now());
      
      t.index(['tipo'], 'idx_usuarios_tipo');
      t.index(['deleted_at'], 'idx_usuarios_deleted_at');

      // --- ESPAÇO INFANTIL: PROGRESSÃO ---
      t.integer('infantil_xp').notNullable().defaultTo(0);
      t.integer('infantil_level').notNullable().defaultTo(1);
      t.integer('infantil_hearts').notNullable().defaultTo(5);
    });
    console.log('✅ Tabela [usuarios] criada.');

    // --- Criação da Tabela: USUÁRIOS_LEICOES_INFANTIS ---
    await db.schema.createTableIfNotExists('usuarios_leicoes_infantis', (t) => {
      t.integer('usuario_id').unsigned().notNullable();
      t.string('leicao_id', 50).notNullable();
      
      t.foreign('usuario_id').references('usuarios.id').onDelete('CASCADE');
      t.primary(['usuario_id', 'leicao_id']);
    });
    console.log('✅ Tabela [usuarios_leicoes_infantis] criada.');

    // Criação do usuário Administrador padrão (apenas se não existir)
    const adminExistente = await db('usuarios').where('email', 'admin@admin').first();
    if (!adminExistente) {
      const hashSenhaAdmin = await bcrypt.hash('admin123', 10);
      await db('usuarios').insert({
        nome: 'Administrador Master',
        email: 'admin@admin',
        senha: hashSenhaAdmin,
        tipo: 'bibliotecario',
        multa_pendente: false
      });
      console.log('⭐ Usuário admin padrão criado: admin@admin | senha: admin123');
    } else {
      console.log('⭐ Usuário admin já existe, pulando criação.');
    }

    // Criação do usuário comum padrão (apenas se não existir)
    const userExistente = await db('usuarios').where('email', 'user@user').first();
    if (!userExistente) {
      const hashSenhaUser = await bcrypt.hash('user123', 10);
      await db('usuarios').insert({
        nome: 'Usuário Teste',
        email: 'user@user',
        senha: hashSenhaUser,
        tipo: 'usuario',
        multa_pendente: false
      });
      console.log('👤 Usuário comum padrão criado: user@user | senha: user123');
    } else {
      console.log('👤 Usuário comum já existe, pulando criação.');
    }

    // --- Criação da Tabela: LIVROS ---
    await db.schema.createTableIfNotExists('livros', (t) => {
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
    await db.schema.createTableIfNotExists('exemplares', (t) => {
      t.increments('id').primary();
      t.integer('livro_id').unsigned().notNullable();
      t.string('codigo', 50).nullable();
      // Disponibilidade: disponivel / emprestado / indisponivel (manutenção) / perdido
      t.enum('disponibilidade', ['disponivel', 'emprestado', 'indisponivel', 'perdido']).notNullable().defaultTo('disponivel');
      // Condição física: bom / danificado / perdido
      t.enum('condicao', ['bom', 'danificado', 'perdido']).notNullable().defaultTo('bom');
      t.text('observacao').nullable();
      t.timestamp('deleted_at').nullable();
      t.timestamp('created_at').defaultTo(db.fn.now());
      
      t.foreign('livro_id').references('id').inTable('livros').onDelete('CASCADE');
      t.index(['livro_id', 'disponibilidade'], 'idx_exemplares_livro_disp');
      t.index(['condicao'], 'idx_exemplares_condicao');
      t.index(['deleted_at'], 'idx_exemplares_deleted_at');
    });
    console.log('✅ Tabela [exemplares] criada.');

    // --- Criação da Tabela: ALUGUÉIS ---
    await db.schema.createTableIfNotExists('alugueis', (t) => {
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
    await db.schema.createTableIfNotExists('multas', (t) => {
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
    await db.schema.createTableIfNotExists('acervo_digital', (t) => {
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
      t.timestamp('deleted_at').nullable();
      t.timestamp('created_at').defaultTo(db.fn.now());
      
      t.foreign('usuario_id').references('id').inTable('usuarios').onDelete('SET NULL');
      t.index(['categoria'], 'idx_digital_categoria');
      t.index(['status'], 'idx_digital_status');
      t.index(['titulo'], 'idx_digital_titulo');
      t.index(['deleted_at'], 'idx_digital_deleted_at');
    });
    console.log('✅ Tabela [acervo_digital] criada.');

    // Acervo Digital inicia vazio

    console.log('\n🎉 Banco de dados configurado com sucesso!');
    await db.destroy();
    return true;
    
  } catch (erro) {
    console.error('❌ Erro crítico ao configurar banco:', erro);
    return false;
  }
}

// Executa o script de inicialização apenas se chamado diretamente
if (require.main === module) {
  configurarBanco();
}

// Exporta a função para ser chamada por outros módulos
export { configurarBanco };