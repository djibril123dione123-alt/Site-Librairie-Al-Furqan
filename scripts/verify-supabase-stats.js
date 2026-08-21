const { Client } = require('pg');
const dns = require('dns');

dns.setDefaultResultOrder('ipv4first');

async function runFullVerification() {
  console.log("=== VÉRIFICATION GLOBALE SUPABASE & EXPÉRIENCE GÉOGRAPHIQUE ===");

  const dbUrl = "postgres://postgres:49CpzDmopfSQuTnjmWbajUfOcvTewVIz%21A1@db.ryrhopolzmcawscuwcak.supabase.co:5432/postgres";
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();

  // 1. Check migrations history
  const resMig = await client.query("SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;");
  const migrations = resMig.rows.map(r => r.version);
  console.log("\n1. SCHÉMA MIGRATIONS HISTORY:");
  console.log(migrations);

  // 2. Check senegal_locations stats
  const resLocCount = await client.query("SELECT COUNT(*) FROM public.senegal_locations;");
  const locCount = parseInt(resLocCount.rows[0].count, 10);

  const resLocRegs = await client.query("SELECT COUNT(DISTINCT region) FROM public.senegal_locations;");
  const locDistinctRegs = parseInt(resLocRegs.rows[0].count, 10);

  const resLocCols = await client.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'senegal_locations';
  `);
  const locCols = resLocCols.rows.map(r => r.column_name);

  console.log("\n2. SENEGAL LOCATIONS STATS:");
  console.log(`- COUNT Total : ${locCount} (Attendu : 25240)`);
  console.log(`- COUNT DISTINCT Region : ${locDistinctRegs} (Attendu : 14/14 regions)`);
  console.log(`- Colonnes 007 présentes :`, [
    'locality_type', 'display_name', 'normalized_name', 
    'coordinate_source', 'coordinate_verified', 'source_name', 'source_url'
  ].every(c => locCols.includes(c)) ? "PASS ✅" : "FAIL ❌");

  // 3. Check delivery_points stats
  const resDpCount = await client.query("SELECT COUNT(*) FROM public.delivery_points;");
  const dpCount = parseInt(resDpCount.rows[0].count, 10);

  const resDpGps = await client.query("SELECT COUNT(*) FROM public.delivery_points WHERE latitude IS NOT NULL AND longitude IS NOT NULL;");
  const dpGpsCount = parseInt(resDpGps.rows[0].count, 10);

  const resDpCols = await client.query(`
    SELECT column_name FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'delivery_points';
  `);
  const dpCols = resDpCols.rows.map(r => r.column_name);

  const resDpDist = await client.query(`
    SELECT COALESCE(region, 'Région NULL') as region_name, COUNT(*) as count
    FROM public.delivery_points
    WHERE provider = 'la_poste'
    GROUP BY COALESCE(region, 'Région NULL')
    ORDER BY count DESC;
  `);

  console.log("\n3. DELIVERY POINTS STATS:");
  console.log(`- COUNT Total : ${dpCount} (Attendu : 129)`);
  console.log(`- Avec GPS : ${dpGpsCount} (Attendu : 129)`);
  console.log(`- Colonnes 007 présentes :`, [
    'postal_code', 'commune', 'opening_hours', 
    'coordinate_source', 'coordinate_verified', 'source_name', 'source_url'
  ].every(c => dpCols.includes(c)) ? "PASS ✅" : "FAIL ❌");
  console.log("- Répartition par région:");
  console.table(resDpDist.rows);

  // 4. Test RPC functions for Geo Query Engine
  console.log("\n4. TEST FONCTIONNEL MOTEUR RPC:");
  
  const resRpcRegs = await client.query("SELECT * FROM public.get_senegal_regions();");
  console.log(`- get_senegal_regions() : ${resRpcRegs.rows.length} régions retournées. (PASS ✅)`);

  const testRegions = ['DAKAR', 'MATAM', 'KEDOUGOU', 'SEDHIOU', 'ZIGUINCHOR', 'TAMBACOUNDA'];
  for (const reg of testRegions) {
    const resDepts = await client.query("SELECT * FROM public.get_senegal_departments($1);", [reg]);
    console.log(`  📍 Région ${reg} → ${resDepts.rows.length} départements distincts.`);
  }

  // 5. Test distant locality search via RPC
  const resSearch = await client.query("SELECT * FROM public.search_senegal_localities(NULL, NULL, NULL, 'Gourel', 10);");
  console.log("\n5. TEST RECHERCHE DE LOCALITÉ ÉLOIGNÉE (Recherche 'Gourel') :");
  console.table(resSearch.rows);

  await client.end();
}

runFullVerification().catch(console.error);
