const supabaseUrl = 'https://bpekotrgdtlusbsdtmor.supabase.co';
const supabaseKey = 'sb_publishable_wIMViIRiaSo-d0jgnjeAtg_kyfrvB7z';

// Create a global Supabase client so other scripts can access it
// This is the ONLY place where the Supabase client should be created
window.supabaseClient = window.supabase.createClient(
  supabaseUrl,
  supabaseKey
);
