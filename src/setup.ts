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

    // IMPORTANTE: Deletar na ordem correta (tabelas dependentes primeiro)
    // 1. Deletar tabela de alugueis primeiro (tem foreign keys)
    if (await db.schema.hasTable('alugueis')) {
      await db.schema.dropTable('alugueis');
      console.log('🗑️  Tabela alugueis removida');
    }

    // 2. Deletar tabela de livros
    if (await db.schema.hasTable('livros')) {
      await db.schema.dropTable('livros');
      console.log('🗑️  Tabela livros removida');
    }

    // 3. Deletar tabela de usuarios por último
    if (await db.schema.hasTable('usuarios')) {
      await db.schema.dropTable('usuarios');
      console.log('🗑️  Tabela usuarios removida');
    }

    console.log('');

    // Criar tabelas na ordem correta (independentes primeiro)
    // 1. Criar tabela de Usuários (sem dependências)
    await db.schema.createTable('usuarios', (table: any) => { 
      table.increments('id').primary(); 
      table.string('nome', 100).notNullable(); 
      table.string('email', 100).notNullable().unique(); 
      table.string('telefone', 20); 
      table.string('endereco', 200); 
      table.string('senha', 255).notNullable(); 
      table.enum('tipo', ['usuario', 'bibliotecario']).defaultTo('usuario');
      table.timestamp('created_at').defaultTo(db.fn.now()); 
    });
    console.log('✅ Tabela usuarios criada');

    // 2. Criar tabela de Livros (sem dependências)
    await db.schema.createTable('livros', (table: any) => { 
      table.increments('id').primary(); 
      table.string('titulo', 150).notNullable(); 
      table.string('autor', 100).notNullable(); 
      table.integer('ano_lancamento').notNullable(); 
      table.text('descricao');
      table.string('isbn', 20);
      table.enum('status', ['disponivel', 'alugado']).defaultTo('disponivel'); 
      table.timestamp('created_at').defaultTo(db.fn.now()); 
    });
    console.log('✅ Tabela livros criada');

    // 3. Criar tabela de Alugueis (com foreign keys)
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
    console.log('   Email: admin@biblioteca.com');
    console.log('   Senha: admin123');

    // Inserir alguns livros de exemplo
    console.log('\n📚 Inserindo livros de exemplo...');
    await db('livros').insert([
      {
        titulo: '1984',
        autor: 'George Orwell',
        ano_lancamento: 1949,
        descricao: 'Um clássico da ficção distópica',
        isbn: '978-0451524935',
        status: 'disponivel'
      },
      {
        titulo: 'Dom Casmurro',
        autor: 'Machado de Assis',
        ano_lancamento: 1899,
        descricao: 'Romance da literatura brasileira',
        isbn: '978-8535911664',
        status: 'disponivel'
      },
      {
        titulo: 'O Senhor dos Anéis',
        autor: 'J.R.R. Tolkien',
        ano_lancamento: 1954,
        descricao: 'Épico de fantasia',
        isbn: '978-0544003415',
        status: 'disponivel'
      }
    ]);
    console.log('✅ Livros de exemplo inseridos');

    console.log('\n🎉 Setup concluído com sucesso!\n');
    console.log('📝 Próximo passo: npm run dev\n');
    
    await db.destroy(); 
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro:', error);
    await connection.destroy(); 
    process.exit(1);
  }
}

setupDatabase();