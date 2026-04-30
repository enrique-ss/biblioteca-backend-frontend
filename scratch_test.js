const supabaseAdmin = require('./src/database');

async function test() {
  const { data, error } = await supabaseAdmin
    .from('usuarios')
    .select('id, nome, email, bio, avatar_url, infantil_level, created_at')
    .order('nome', { ascending: true })
    .limit(40);

  if (error) {
    console.error('Supabase Error:', error);
  } else {
    console.log('Success, found:', data?.length);
  }
}

test();
