const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

async function runANSDImport() {
  console.log("=== IMPORTATION DES DONNÉES ANSD RGPH-5 2023 IN SUPABASE ===");

  const csvPath = path.join(process.cwd(), 'ansd_sample.csv');
  if (!fs.existsSync(csvPath)) {
    console.error("❌ Fichier ansd_sample.csv introuvable.");
    process.exit(1);
  }

  const fileContent = fs.readFileSync(csvPath, 'utf8');
  const lines = fileContent.split('\n');

  const rowsToInsert = [];
  const seenKeys = new Set();
  let rejectedCount = 0;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/).map(v => v.replace(/^"|"$/g, '').trim());

    if (values.length < 5) {
      rejectedCount++;
      continue;
    }

    const region = values[0];
    const department = values[1];
    const comArr = values[2];
    const commune = values[3] || comArr;
    const locality = values[4];

    if (!region || !locality) {
      rejectedCount++;
      continue;
    }

    const uniqueKey = `${region.toUpperCase()}|${(department||'').toUpperCase()}|${(commune||'').toUpperCase()}|${locality.toUpperCase()}`;
    if (seenKeys.has(uniqueKey)) {
      continue;
    }
    seenKeys.add(uniqueKey);

    rowsToInsert.push({
      region: region,
      department: department || null,
      commune: commune || null,
      locality: locality,
      is_active: true
    });
  }

  console.log(`Données préparées : ${rowsToInsert.length} localités uniques.`);

  // Purge standard
  await supabase.from('senegal_locations').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  const batchSize = 1000;
  let insertedCount = 0;

  for (let i = 0; i < rowsToInsert.length; i += batchSize) {
    const batch = rowsToInsert.slice(i, i + batchSize);
    const { error } = await supabase.from('senegal_locations').insert(batch);
    if (error) {
      console.error(`❌ Erreur insertion lot ${Math.floor(i / batchSize) + 1}:`, error.message);
    } else {
      insertedCount += batch.length;
      console.log(`✅ Lot ${Math.floor(i / batchSize) + 1} inséré (${insertedCount}/${rowsToInsert.length} localités).`);
    }
  }

  console.log("\n=== BILAN FINAL IMPORT ANSD ===");
  console.log(`- Total inséré dans Supabase : ${insertedCount}`);
  console.log(`- Lignes CSV rejetées : ${rejectedCount}`);
}

runANSDImport().catch(console.error);
