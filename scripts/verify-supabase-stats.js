const { getPgClient, getEnvVar } = require('./lib/get-db-client');
const { createClient } = require('@supabase/supabase-js');

async function runFullVerification() {
  console.log("=== VÉRIFICATION DOUBLE (PG DIRECT & SUPABASE REST JS CLIENT) ===");

  const expectedProjectRef = "ryrhopolzmcawscuwcak";
  const supabaseUrl = getEnvVar('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = getEnvVar('SUPABASE_SERVICE_ROLE_KEY');
  const extractedRef = supabaseUrl ? supabaseUrl.replace('https://', '').split('.')[0] : null;

  console.log(`- Project Ref attendu : ${expectedProjectRef}`);
  console.log(`- Project Ref Supabase URL : ${extractedRef}`);
  console.log(`- Supabase JS Match : ${extractedRef === expectedProjectRef ? 'PASS ✅' : 'FAIL ❌'}`);

  // 1. PostgreSQL Direct Client
  const client = await getPgClient();

  // Reload PostgREST schema cache explicitly
  await client.query("NOTIFY pgrst, 'reload schema';");

  // Check migrations history via PG
  const resMig = await client.query("SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;");
  const pgMigrations = resMig.rows.map(r => r.version);

  // Check senegal_locations stats via PG
  const resLocCount = await client.query("SELECT COUNT(*) FROM public.senegal_locations;");
  const locCountPg = parseInt(resLocCount.rows[0].count, 10);

  const resLocRegs = await client.query("SELECT COUNT(DISTINCT region) FROM public.senegal_locations;");
  const locDistinctRegsPg = parseInt(resLocRegs.rows[0].count, 10);

  const resLocCols = await client.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'senegal_locations';
  `);
  const locColsPg = resLocCols.rows.map(r => r.column_name);

  // Check delivery_points stats via PG
  const resDpCount = await client.query("SELECT COUNT(*) FROM public.delivery_points;");
  const dpCountPg = parseInt(resDpCount.rows[0].count, 10);

  const resDpGps = await client.query("SELECT COUNT(*) FROM public.delivery_points WHERE latitude IS NOT NULL AND longitude IS NOT NULL;");
  const dpGpsCountPg = parseInt(resDpGps.rows[0].count, 10);

  const resDpCols = await client.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'delivery_points';
  `);
  const dpColsPg = resDpCols.rows.map(r => r.column_name);

  const resDpDistPg = await client.query(`
    SELECT COALESCE(region, 'Région NULL') as region_name, COUNT(*) as count
    FROM public.delivery_points
    WHERE provider = 'la_poste'
    GROUP BY COALESCE(region, 'Région NULL')
    ORDER BY count DESC;
  `);

  console.log("\n--- [MÉTHODE A] VÉRIFICATION POSTGRESQL DIRECT ---");
  console.log(`- Migrations History :`, pgMigrations);
  console.log(`- senegal_locations Count : ${locCountPg} (Distinct Regions : ${locDistinctRegsPg})`);
  console.log(`- senegal_locations Colonnes 007 :`, [
    'locality_type', 'display_name', 'normalized_name', 
    'coordinate_source', 'coordinate_verified', 'source_name', 'source_url'
  ].every(c => locColsPg.includes(c)) ? "PASS ✅" : "FAIL ❌");
  console.log(`- delivery_points Count : ${dpCountPg} (GPS : ${dpGpsCountPg})`);
  console.log(`- delivery_points Colonnes 007 :`, [
    'postal_code', 'commune', 'opening_hours', 
    'coordinate_source', 'coordinate_verified', 'source_name', 'source_url'
  ].every(c => dpColsPg.includes(c)) ? "PASS ✅" : "FAIL ❌");
  console.log("- Distribution La Poste par Région (PG) :");
  console.table(resDpDistPg.rows);

  // 2. Supabase JS REST Client Method B
  console.log("\n--- [MÉTHODE B] VÉRIFICATION SUPABASE REST / JS CLIENT ---");
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // Check Schema Migrations via Supabase REST JS
  const { data: jsMig, error: jsMigErr } = await supabase.from('schema_migrations').select('version').schema('supabase_migrations');
  const jsMigrations = jsMig ? jsMig.map(m => m.version).sort() : [];
  console.log(`- Migrations History (Supabase JS) :`, jsMigrations);

  // Check senegal_locations columns & count via Supabase REST JS
  const { data: jsLocData, error: jsLocErr } = await supabase.from('senegal_locations').select('*').limit(1);
  const jsLocCols = jsLocData && jsLocData.length > 0 ? Object.keys(jsLocData[0]) : [];
  console.log(`- senegal_locations Colonnes 007 (Supabase JS) :`, [
    'locality_type', 'display_name', 'normalized_name', 
    'coordinate_source', 'coordinate_verified', 'source_name', 'source_url'
  ].every(c => jsLocCols.includes(c)) ? "PASS ✅" : "FAIL ❌");

  // Check delivery_points columns & count via Supabase REST JS
  const { data: jsDpData, error: jsDpErr } = await supabase.from('delivery_points').select('*').limit(1);
  const jsDpCols = jsDpData && jsDpData.length > 0 ? Object.keys(jsDpData[0]) : [];
  console.log(`- delivery_points Colonnes 007 (Supabase JS) :`, [
    'postal_code', 'commune', 'opening_hours', 
    'coordinate_source', 'coordinate_verified', 'source_name', 'source_url'
  ].every(c => jsDpCols.includes(c)) ? "PASS ✅" : "FAIL ❌");

  // 3. Test RPC Functions via Supabase JS Client
  console.log("\n--- VÉRIFICATION FONCTIONNELLE DES RPC VIA SUPABASE JS CLIENT ---");

  // get_senegal_regions
  const { data: rpcRegs, error: rpcRegsErr } = await supabase.rpc('get_senegal_regions');
  const regionsList = rpcRegs ? rpcRegs.map((r) => r.region) : [];
  console.log(`- get_senegal_regions() RPC : ${regionsList.length} régions retournées.`, rpcRegsErr ? `(Error: ${rpcRegsErr.message})` : '(PASS ✅)');

  // get_senegal_departments
  const { data: rpcDepts, error: rpcDeptsErr } = await supabase.rpc('get_senegal_departments', { p_region: 'DAKAR' });
  console.log(`- get_senegal_departments('DAKAR') RPC : ${rpcDepts ? rpcDepts.length : 0} départements.`, rpcDeptsErr ? `(Error: ${rpcDeptsErr.message})` : '(PASS ✅)');

  // get_senegal_communes
  const { data: rpcComms, error: rpcCommsErr } = await supabase.rpc('get_senegal_communes', { p_region: 'DAKAR' });
  console.log(`- get_senegal_communes('DAKAR') RPC : ${rpcComms ? rpcComms.length : 0} communes.`, rpcCommsErr ? `(Error: ${rpcCommsErr.message})` : '(PASS ✅)');

  // search_senegal_localities("Gourel")
  const { data: rpcSearch, error: rpcSearchErr } = await supabase.rpc('search_senegal_localities', { p_query: 'Gourel' });
  console.log(`- search_senegal_localities('Gourel') RPC : ${rpcSearch ? rpcSearch.length : 0} localités trouvées.`, rpcSearchErr ? `(Error: ${rpcSearchErr.message})` : '(PASS ✅)');
  if (rpcSearch && rpcSearch.length > 0) {
    console.table(rpcSearch.slice(0, 5));
  }

  await client.end();
}

runFullVerification().catch(console.error);
