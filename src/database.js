const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://wnsjluwxqkgjttpsrrtp.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Induc2psdXd4cWtnanR0cHNycnRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3NDQyNTQsImV4cCI6MjA5MTMyMDI1NH0.1KGGvHBDA0wmNQXXvhywdJYyoXeRXrzylBTD8tsbHAI';

const supabase = createClient(supabaseUrl, supabaseKey);

if (process.env.NODE_ENV === 'production') {
  console.log('🔗 Conectado ao Supabase');
}

module.exports = supabase;
