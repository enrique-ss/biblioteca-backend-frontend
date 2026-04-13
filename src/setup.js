const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

async function configurarBanco() {
  console.log('🔧 Setup do banco de dados Supabase (Biblioteca)...\n');
  console.log('⚠️  Para criar/dropar tabelas, execute o SQL manualmente:');
  console.log('   1. Acesse https://supabase.com/dashboard');
  console.log('   2. Vá em SQL Editor');
  console.log('   3. Cole o conteúdo do arquivo setup.sql na raiz do projeto');
  console.log('   4. Clique em Run\n');
  console.log('⚠️  Crie os usuários padrão no Supabase Auth:');
  console.log('   - Admin: admin@admin / admin123 (tipo: bibliotecario)');
  console.log('   - User: user@user / user123 (tipo: usuario)');
  console.log('\n🎉 Setup concluído (SQL deve ser executado manualmente)');
  return true;
}

if (require.main === module) {
  configurarBanco();
}

module.exports = { configurarBanco };
