import knex from 'knex';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Instância principal do Knex para comunicação com o banco de dados PostgreSQL (Supabase).
 */
const db = knex({
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'biblioteca',
    // Para Supabase, pode usar connection string direta
    // connectionString: process.env.DATABASE_URL,
  },
  pool: {
    min: 2,
    max: 20,
    // Finaliza conexões ociosas após 30 segundos para otimizar recursos
    idleTimeoutMillis: 30000,
    // Tempo máximo de espera para obter uma conexão livre do pool
    acquireTimeoutMillis: 10000,
  },
  // Habilita logs de depuração apenas se explicitamente configurado em desenvolvimento
  debug: process.env.NODE_ENV === 'development' && process.env.DB_DEBUG === 'true',
});

export default db;