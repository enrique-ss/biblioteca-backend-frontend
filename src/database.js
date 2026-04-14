const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

function requireEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Variavel de ambiente obrigatoria ausente: ${name}`);
  }

  return value;
}

const supabaseUrl = requireEnv('SUPABASE_URL');
const serviceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
const anonKey = requireEnv('SUPABASE_ANON_KEY');

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

const supabaseAuth = createClient(supabaseUrl, anonKey, {
  auth: { persistSession: false }
});

if (process.env.NODE_ENV === 'production') {
  console.log('Conectado ao Supabase.');
}

module.exports = supabase;
module.exports.supabaseAuth = supabaseAuth;
