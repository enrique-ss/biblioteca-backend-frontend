const knex = require('knex');
const dotenv = require('dotenv');

dotenv.config();

/**
 * Instância principal do Knex para comunicação com o banco de dados PostgreSQL (Supabase).
 */
const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL || {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'biblioteca',
  },
  pool: {
    min: 2,
    max: 20,
    idleTimeoutMillis: 30000,
    acquireTimeoutMillis: 10000,
  },
  debug: process.env.NODE_ENV === 'development' && process.env.DB_DEBUG === 'true',
});

// Log de configuração para debug
if (process.env.NODE_ENV === 'production') {
  console.log('🔗 Configuração do banco de dados:');
  console.log('  Host:', process.env.DB_HOST || process.env.DATABASE_URL ? 'CONFIGURADO' : 'NÃO CONFIGURADO');
  console.log('  Database:', process.env.DB_NAME || 'NÃO CONFIGURADO');
}

module.exports = db;
