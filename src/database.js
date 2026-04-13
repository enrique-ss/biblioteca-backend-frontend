const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://db.mtjrxenjffwjytjfkock.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10anJ4ZW5qZmZ3anl0amZrb2NrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjI0NzU2NzQsImV4cCI6MjAzODA1MTY3NH0.5V2yFjK3H8X7mZ9L2k4Y5Q6R1P8N7K9J2L4M5X8Y3Z';

const supabase = createClient(supabaseUrl, supabaseKey);

if (process.env.NODE_ENV === 'production') {
  console.log('🔗 Conectado ao Supabase');
}

module.exports = supabase;
