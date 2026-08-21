const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const env = {};
envContent.split('\n').forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[match[1]] = value.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function verifyDb() {
  console.log('=== VERIFYING REMOTE SUPABASE DB ===');

  const { count: productsCount, error: errProd } = await supabase.from('products').select('*', { count: 'exact', head: true });
  console.log('Products total count:', productsCount, 'error:', errProd?.message || 'none');

  const { count: pubCount } = await supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'published');
  console.log('Published products count:', pubCount);

  const { count: catsCount } = await supabase.from('categories').select('*', { count: 'exact', head: true });
  console.log('Categories count:', catsCount);

  const { count: geoCount } = await supabase.from('senegal_locations').select('*', { count: 'exact', head: true });
  console.log('ANSD senegal_locations count:', geoCount);

  const { count: laPosteCount } = await supabase.from('delivery_points').select('*', { count: 'exact', head: true });
  console.log('La Poste delivery_points count:', laPosteCount);

  // Check RPC
  const { data: rpcRes, error: rpcErr } = await supabase.rpc('search_published_products', { query_text: 'test' });
  console.log('RPC search_published_products exists:', !rpcErr, 'error:', rpcErr?.message || 'none');

  // Check catalog_events table
  const { data: eventsData, error: eventsErr } = await supabase.from('catalog_events').select('id').limit(1);
  console.log('catalog_events table exists:', !eventsErr, 'error:', eventsErr?.message || 'none');
}

verifyDb();
