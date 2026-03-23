import knex from 'knex';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Instância principal do Knex para comunicação com o banco de dados MySQL.
 */
const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'biblioteca',
    // Timeout para conexão inicial (10 segundos)
    connectTimeout: 10000,
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