import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bpekotrgdtlusbsdtmor.supabase.co';
const supabaseKey = 'sb_publishable_wIMViIRiaSo-d0jgnjeAtg_kyfrvB7z';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .limit(1);

  if (error) {
    console.error('❌ Supabase connection failed:', error.message);
  } else {
    console.log('✅ Supabase connected successfully!');
    console.log(data);
  }
}

testConnection();
