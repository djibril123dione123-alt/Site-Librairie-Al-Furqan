const { getPgClient, getEnvVar } = require('./lib/get-db-client');
const { createClient } = require('@supabase/supabase-js');

async function diagnoseTarget() {
  console.log("=== DIAGNOSTIC CIBLE DE LA BASE DE DONNÉES & SUPABASE JS ===");

  const expectedProjectRef = "ryrhopolzmcawscuwcak";
  const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');

  // Extract project ref from URL
  const extractedRef = supabaseUrl ? supabaseUrl.replace('https://', '').split('.')[0] : null;

  console.log(`- Project Ref attendu : ${expectedProjectRef}`);
  console.log(`- Supabase URL publique : ${supabaseUrl}`);
  console.log(`- Project Ref extrait de l'URL : ${extractedRef}`);

  if (extractedRef !== expectedProjectRef) {
    console.error("❌ ERREUR DE CORRESPONDANCE DE PROJECT REF DANS L'URL SUPABASE !");
  } else {
    console.log("✅ Project Ref Supabase URL correspond parfaitement !");
  }

  // PostgreSQL Direct Inspection
  const client = await getPgClient();
  const resDbInfo = await client.query(`
    SELECT 
      current_database(), 
      current_user,
      inet_server_addr(),
      inet_server_port();
  `);
  
  const dbInfo = resDbInfo.rows[0];
  console.log("\n--- VÉRIFICATION POSTGRESQL DIRECT ---");
  console.log(`- Database Name (current_database()) : ${dbInfo.current_database}`);
  console.log(`- Database User (current_user) : ${dbInfo.current_user}`);
  console.log(`- Server IP (inet_server_addr()) : ${dbInfo.inet_server_addr}`);
  console.log(`- Server Port : ${dbInfo.inet_server_port}`);

  // Supabase JS REST API Inspection
  console.log("\n--- VÉRIFICATION SUPABASE REST API / JS CLIENT ---");
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  
  const { data: locData, error: locErr } = await supabase.from('senegal_locations').select('*').limit(1);
  if (locErr) {
    console.log("Supabase REST senegal_locations err:", locErr.message);
  } else if (locData && locData.length > 0) {
    console.log(`- senegal_locations (Supabase REST) colonnes count : ${Object.keys(locData[0]).length}`);
    console.log(`- senegal_locations (Supabase REST) colonnes :`, Object.keys(locData[0]));
  } else {
    console.log("senegal_locations (Supabase REST) est vide.");
  }

  const { data: dpData, error: dpErr } = await supabase.from('delivery_points').select('*').limit(1);
  if (dpErr) {
    console.log("Supabase REST delivery_points err:", dpErr.message);
  } else if (dpData && dpData.length > 0) {
    console.log(`- delivery_points (Supabase REST) colonnes count : ${Object.keys(dpData[0]).length}`);
    console.log(`- delivery_points (Supabase REST) colonnes :`, Object.keys(dpData[0]));
  } else {
    console.log("delivery_points (Supabase REST) est vide.");
  }

  // Check Schema Migrations via Supabase REST API
  const { data: migData, error: migErr } = await supabase.from('schema_migrations').select('*').schema('supabase_migrations');
  if (migErr) {
    console.log("Supabase REST schema_migrations err:", migErr.message);
  } else {
    console.log("- Schema Migrations (Supabase REST) :", migData ? migData.map(m => m.version) : []);
  }

  await client.end();
}

diagnoseTarget().catch(console.error);
