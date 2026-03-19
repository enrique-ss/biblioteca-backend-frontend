import knex from 'knex';
import dotenv from 'dotenv';

dotenv.config();

const db = knex({
  client: 'mysql2',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'biblioteca',
    // Mantém a conexão viva e evita "connection lost"
    connectTimeout: 10000,
  },
  pool: {
    min: 2,
    max: 20,
    // Mata conexões ociosas após 30s para não acumular
    idleTimeoutMillis: 30000,
    // Timeout para obter conexão do pool
    acquireTimeoutMillis: 10000,
  },
  // Log de queries lentas em desenvolvimento
  debug: process.env.NODE_ENV === 'development' && process.env.DB_DEBUG === 'true',
});

export default db;