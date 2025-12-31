import knex from 'knex';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

dotenv.config();

const dbName = process.env.DB_NAME || 'bdb';

async function setupDatabase() {
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
    console.log('🚀 Iniciando setup do banco de dados...\n');
    
    // Criar banco
    await connection.raw(`CREATE DATABASE IF NOT EXISTS ${dbName}`);
    console.log(`✅ Banco "${dbName}" criado/verificado!`);
    await connection.destroy();

    // Conectar ao banco
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

    console.log('\n📋 Criando tabelas...\n');

    // IMPORTANTE: Deletar na ordem correta
    if (await db.schema.hasTable('alugueis')) {
      await db.schema.dropTable('alugueis');
      console.log('🗑️  Tabela alugueis removida');
    }

    if (await db.schema.hasTable('livros')) {
      await db.schema.dropTable('livros');
      console.log('🗑️  Tabela livros removida');
    }

    if (await db.schema.hasTable('usuarios')) {
      await db.schema.dropTable('usuarios');
      console.log('🗑️  Tabela usuarios removida');
    }

    console.log('');

    // 1. Criar tabela de Usuários
    await db.schema.createTable('usuarios', (table: any) => { 
      table.increments('id').primary(); 
      table.string('nome', 100).notNullable(); 
      table.string('email', 100).notNullable().unique(); 
      table.string('telefone', 20); 
      table.string('endereco', 200); 
      table.string('senha', 255).notNullable(); 
      // Alterado para bater com seu código de permissão (bibliotecario/usuario)
      table.enum('tipo', ['usuario', 'bibliotecario']).defaultTo('usuario');
      table.timestamp('created_at').defaultTo(db.fn.now()); 
    });
    console.log('✅ Tabela usuarios criada');

    // 2. Criar tabela de Livros (COM AS NOVAS COLUNAS)
    await db.schema.createTable('livros', (table: any) => { 
      table.increments('id').primary(); 
      table.string('titulo', 150).notNullable(); 
      table.string('autor', 100).notNullable(); 
      table.integer('ano_lancamento').notNullable(); 
      table.string('genero', 100);    // <-- Adicionado
      table.string('corredor', 10);   // <-- Adicionado
      table.string('prateleira', 10); // <-- Adicionado
      table.text('descricao');
      table.string('isbn', 20);
      table.enum('status', ['disponivel', 'alugado']).defaultTo('disponivel'); 
      table.timestamp('created_at').defaultTo(db.fn.now()); 
    });
    console.log('✅ Tabela livros criada');

    // 3. Criar tabela de Alugueis
    await db.schema.createTable('alugueis', (table: any) => { 
      table.increments('id').primary(); 
      table.integer('usuario_id').unsigned().notNullable(); 
      table.integer('livro_id').unsigned().notNullable(); 
      table.timestamp('data_aluguel').defaultTo(db.fn.now()); 
      table.timestamp('data_devolucao').nullable(); 
      table.date('data_prevista_devolucao').notNullable();
      table.enum('status', ['ativo', 'devolvido', 'atrasado']).defaultTo('ativo');
      table.foreign('usuario_id').references('usuarios.id').onDelete('CASCADE'); 
      table.foreign('livro_id').references('livros.id').onDelete('CASCADE'); 
    });
    console.log('✅ Tabela alugueis criada');

    // Criar usuário bibliotecário padrão
    console.log('\n👤 Criando usuário bibliotecário padrão...');
    const senhaHash = await bcrypt.hash('admin123', 10);
    await db('usuarios').insert({
      nome: 'Bibliotecário Admin',
      email: 'admin@biblioteca.com',
      telefone: '(51) 99999-9999',
      endereco: 'Biblioteca Central',
      senha: senhaHash,
      tipo: 'bibliotecario'
    });
    console.log('✅ Bibliotecário criado!');

    // Inserir alguns livros de exemplo com localizações
    console.log('\n📚 Inserindo livros de exemplo...');
    await db('livros').insert([
  {
    titulo: 'Vade Mecum 2024',
    autor: 'Saraiva',
    ano_lancamento: 2024,
    genero: 'Direito',
    corredor: '03',
    prateleira: 'S-2',
    status: 'disponivel'
  },
  {
    titulo: 'O Código da Vinci',
    autor: 'Dan Brown',
    ano_lancamento: 2003,
    genero: 'Suspense Policial',
    corredor: '09',
    prateleira: 'LT-4',
    status: 'disponivel'
  },
  {
    titulo: 'Breves Respostas para Grandes Questões',
    autor: 'Stephen Hawking',
    ano_lancamento: 2018,
    genero: 'Física / Ciência',
    corredor: '05',
    prateleira: 'C-1',
    status: 'disponivel'
  }
]);
    console.log('✅ Livros de exemplo inseridos');

    console.log('\n🎉 Setup concluído com sucesso!\n');
    
    await db.destroy(); 
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  }
}

setupDatabase();