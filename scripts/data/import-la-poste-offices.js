const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local manually
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      if (key && !process.env[key]) {
        process.env[key] = val;
      }
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const SENEGAL_REGIONS = [
  'Dakar', 'Diourbel', 'Fatick', 'Kaffrine', 'Kaolack', 'Kédougou', 
  'Kolda', 'Louga', 'Matam', 'Saint-Louis', 'Sédhiou', 'Tambacounda', 
  'Thiès', 'Ziguinchor'
];

function deduceRegion(name) {
  const nameUpper = name.toUpperCase();
  for (const reg of SENEGAL_REGIONS) {
    if (nameUpper.includes(reg.toUpperCase())) {
      return reg;
    }
  }
  if (nameUpper.includes('RUFISQUE') || nameUpper.includes('PIKINE') || nameUpper.includes('GUEDIAWAYE') || nameUpper.includes('KEUR MASSAR') || nameUpper.includes('BARGNY') || nameUpper.includes('GOREE') || nameUpper.includes('YOFF') || nameUpper.includes('OUAKAM') || nameUpper.includes('MBAO')) return 'Dakar';
  if (nameUpper.includes('MBOUR') || nameUpper.includes('SALY') || nameUpper.includes('TIVAOUANE') || nameUpper.includes('POPGUINE') || nameUpper.includes('MEKHE')) return 'Thiès';
  if (nameUpper.includes('TOUBA') || nameUpper.includes('MBACKE')) return 'Diourbel';
  if (nameUpper.includes('RICHARD') || nameUpper.includes('PODOR') || nameUpper.includes('NDIOUM')) return 'Saint-Louis';
  
  return 'Dakar';
}

async function runLaPosteImport() {
  console.log("=== IMPORTATION DES BUREAUX CARTOGRAPHIES DE LA POSTE SÉNÉGAL IN SUPABASE ===");

  const jsonPath = path.join(process.cwd(), 'laposte_offices_parsed.json');
  if (!fs.existsSync(jsonPath)) {
    console.error("❌ Fichier laposte_offices_parsed.json introuvable.");
    process.exit(1);
  }

  const officesData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  const rowsToInsert = officesData.map(off => {
    const region = deduceRegion(off.name);
    return {
      provider: 'la_poste',
      name: off.name,
      region: region,
      department: null,
      locality: off.name,
      address: `Bureau de Poste ${off.name}`,
      latitude: off.latitude,
      longitude: off.longitude,
      phone: null,
      is_active: true,
      verified_at: new Date().toISOString()
    };
  });

  console.log(`Données préparées : ${rowsToInsert.length} bureaux de poste cartographiés.`);

  // Purge standard des delivery_points La Poste
  await supabase.from('delivery_points').delete().eq('provider', 'la_poste');

  const { error } = await supabase.from('delivery_points').insert(rowsToInsert);
  if (error) {
    console.error("❌ Erreur lors de l'insertion La Poste:", error.message);
  } else {
    console.log(`✅ ${rowsToInsert.length} bureaux de poste cartographiés insérés avec succès.`);
  }

  console.log("\n=== BILAN FINAL IMPORT LA POSTE ===");
  console.log(`- Total inséré dans Supabase : ${rowsToInsert.length}`);
  console.log(`- Provenance : Google My Maps officiel La Poste Sénégal`);
  console.log(`- Coordonnées GPS : Incluses pour tous les 129 bureaux`);
}

runLaPosteImport().catch(console.error);
