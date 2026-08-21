const { getPgClient } = require('../lib/get-db-client');
const fs = require('fs');
const path = require('path');

const SENEGAL_REGIONS = [
  'Dakar', 'Diourbel', 'Fatick', 'Kaffrine', 'Kaolack', 'Kédougou', 
  'Kolda', 'Louga', 'Matam', 'Saint-Louis', 'Sédhiou', 'Tambacounda', 
  'Thiès', 'Ziguinchor'
];

function deduceRegionStrict(name) {
  const nameUpper = name.toUpperCase();
  
  for (const reg of SENEGAL_REGIONS) {
    if (nameUpper.includes(reg.toUpperCase())) {
      return reg;
    }
  }
  
  if (nameUpper.includes('RUFISQUE') || nameUpper.includes('PIKINE') || nameUpper.includes('GUEDIAWAYE') || nameUpper.includes('KEUR MASSAR') || nameUpper.includes('BARGNY') || nameUpper.includes('GOREE') || nameUpper.includes('YOFF') || nameUpper.includes('OUAKAM') || nameUpper.includes('MBAO') || nameUpper.includes('YENNE') || nameUpper.includes('HLM') || nameUpper.includes('VDN')) {
    return 'Dakar';
  }
  if (nameUpper.includes('MBOUR') || nameUpper.includes('SALY') || nameUpper.includes('TIVAOUANE') || nameUpper.includes('POPENGUINE') || nameUpper.includes('MEKHE') || nameUpper.includes('KHOMBOLE') || nameUpper.includes('BAMBEY') || nameUpper.includes('DIOFIOR') || nameUpper.includes('THIADIAYE') || nameUpper.includes('SINDIA')) {
    return 'Thiès';
  }
  if (nameUpper.includes('TOUBA') || nameUpper.includes('MBACKE') || nameUpper.includes('DAROU MOUSTY')) {
    return 'Diourbel';
  }
  if (nameUpper.includes('RICHARD') || nameUpper.includes('PODOR') || nameUpper.includes('NDIOUM') || nameUpper.includes('ROSS BETHIO') || nameUpper.includes('ROSSO') || nameUpper.includes('MPAL')) {
    return 'Saint-Louis';
  }
  if (nameUpper.includes('FOUNDIOUGNE') || nameUpper.includes('GANDIAYE') || nameUpper.includes('SINE') || nameUpper.includes('PASSY') || nameUpper.includes('SOKONE') || nameUpper.includes('KARANG')) {
    return 'Fatick';
  }
  if (nameUpper.includes('BIRKELANE') || nameUpper.includes('KOUNGHEUL') || nameUpper.includes('MALEM')) {
    return 'Kaffrine';
  }
  if (nameUpper.includes('NIORO') || nameUpper.includes('NDOFFANE') || nameUpper.includes('GUINGUINEO')) {
    return 'Kaolack';
  }
  if (nameUpper.includes('BIGNONA') || nameUpper.includes('OUSSOUYE') || nameUpper.includes('CABROUSSE') || nameUpper.includes('DIOULOULOU') || nameUpper.includes('THIONK') || nameUpper.includes('ELINKINE') || nameUpper.includes('ADEANE')) {
    return 'Ziguinchor';
  }
  if (nameUpper.includes('VELINGARA') || nameUpper.includes('MEDINA YORO') || nameUpper.includes('DIAOBE')) {
    return 'Kolda';
  }
  if (nameUpper.includes('BOUNKILING') || nameUpper.includes('MARSASSOUM') || nameUpper.includes('TANAFF')) {
    return 'Sédhiou';
  }
  if (nameUpper.includes('KEBEMER') || nameUpper.includes('LINGUERE') || nameUpper.includes('GUEOUL') || nameUpper.includes('NDANDE') || nameUpper.includes('SAGATTA')) {
    return 'Louga';
  }
  if (nameUpper.includes('RANEROU') || nameUpper.includes('THILOGNE') || nameUpper.includes('OREFONDE') || nameUpper.includes('AGNAM') || nameUpper.includes('KANEL') || nameUpper.includes('WAOUNDE') || nameUpper.includes('SEMME') || nameUpper.includes('BOKILADJI') || nameUpper.includes('DEMBANKANE') || nameUpper.includes('DONDOU') || nameUpper.includes('NDOULOUMADJI')) {
    return 'Matam';
  }
  if (nameUpper.includes('KIDIRA') || nameUpper.includes('GOUDIRY') || nameUpper.includes('KOUMPENTOUM') || nameUpper.includes('KOUSSANAR') || nameUpper.includes('BAKEL') || nameUpper.includes('MOUDERY') || nameUpper.includes('YAFERA') || nameUpper.includes('AROUNDOU') || nameUpper.includes('MISSIRAH') || nameUpper.includes('GABOU')) {
    return 'Tambacounda';
  }
  if (nameUpper.includes('SALEMATA') || nameUpper.includes('SARAYA')) {
    return 'Kédougou';
  }

  // EXIGENCE STRICTE: PAS DE FALLBACK DAKAR! Retourne NULL si inconnu.
  return null;
}

async function runLaPosteImport() {
  console.log("=== IMPORTATION STRICTE DES BUREAUX CARTOGRAPHIÉS DE LA POSTE SÉNÉGAL ===");

  const client = await getPgClient();
  console.log("✅ Connexion PostgreSQL IPv4 établie via getPgClient().");

  const jsonPath = path.join(process.cwd(), 'laposte_offices_parsed.json');
  if (!fs.existsSync(jsonPath)) {
    console.error("❌ Fichier laposte_offices_parsed.json introuvable.");
    await client.end();
    process.exit(1);
  }

  const officesData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  await client.query("DELETE FROM public.delivery_points WHERE provider = 'la_poste';");

  let regionKnownCount = 0;
  let regionNullCount = 0;

  for (const off of officesData) {
    const region = deduceRegionStrict(off.name);
    if (region) regionKnownCount++;
    else regionNullCount++;

    const realAddress = off.address && off.address !== off.name ? off.address : null;

    const query = `
      INSERT INTO public.delivery_points (
        provider, name, region, locality, address, latitude, longitude,
        coordinate_source, coordinate_verified, source_name, source_id, source_url, is_active, verified_at
      ) VALUES (
        'la_poste',
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        'official_google_mymaps',
        true,
        'La Poste Sénégal',
        $7,
        'https://www.google.com/maps/d/viewer?mid=11FgBObnRyCpT006ykvUBXRvNtIX-G4qT',
        true,
        NOW()
      );
    `;

    await client.query(query, [
      off.name,
      region,
      off.name,
      realAddress,
      off.latitude,
      off.longitude,
      off.id || null
    ]);
  }

  // Notifier PostgREST pour recharger son cache de schéma
  await client.query("NOTIFY pgrst, 'reload schema';");

  console.log(`✅ ${officesData.length} bureaux de poste cartographiés insérés avec succès dans Supabase.`);
  console.log(`- Bureaux avec Région déduite avec certitude : ${regionKnownCount}`);
  console.log(`- Bureaux avec Région NULL (sans fausse attribution) : ${regionNullCount}`);

  const resDist = await client.query(`
    SELECT COALESCE(region, 'Région NULL') as region_name, COUNT(*) as count
    FROM public.delivery_points
    WHERE provider = 'la_poste'
    GROUP BY COALESCE(region, 'Région NULL')
    ORDER BY count DESC;
  `);

  console.log("\n--- DISTRIBUTION DES BUREAUX DE POSTE PAR RÉGION ---");
  console.table(resDist.rows);

  await client.end();
}

runLaPosteImport().catch(console.error);
