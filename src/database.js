const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://apctcgjvrgwkiofshubm.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwY3RjZ2p2cmd3a2lvZnNodWJtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjEyMjg2OCwiZXhwIjoyMDkxNjk4ODY4fQ.vSs3vAun9bHNJmUF7_w_6hfpSym--LcGhZeGTrX8eMw';
const anonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwY3RjZ2p2cmd3a2lvZnNodWJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYxMjI4NjgsImV4cCI6MjA5MTY5ODg2OH0.2VYLGjwPZbNsPGS8OjzwC32ijBBRqrfFYtdo75eNVHc';

// Service role: bypassa RLS, usado para operações de banco
const supabase = createClient(supabaseUrl, serviceRoleKey);

// Anon key: usado para autenticação (signIn, signUp, getUser)
const supabaseAuth = createClient(supabaseUrl, anonKey);

if (process.env.NODE_ENV === 'production') {
  console.log('🔗 Conectado ao Supabase');
}

module.exports = supabase;
module.exports.supabaseAuth = supabaseAuth;
