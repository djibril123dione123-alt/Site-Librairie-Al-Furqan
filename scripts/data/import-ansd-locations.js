const { getPgClient } = require('../lib/get-db-client');
const fs = require('fs');
const path = require('path');

function removeAccents(str) {
  return str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
}

async function runANSDEnrichment() {
  console.log("=== ENRICHISSEMENT IDEMPOTENT DES DONNÉES ANSD RGPH-5 2023 IN SUPABASE ===");

  const client = await getPgClient();
  console.log("✅ Connexion PostgreSQL IPv4 établie via getPgClient().");

  const csvPath = path.join(process.cwd(), 'ansd_sample.csv');
  if (!fs.existsSync(csvPath)) {
    console.error("❌ Fichier ansd_sample.csv introuvable.");
    await client.end();
    process.exit(1);
  }

  const fileContent = fs.readFileSync(csvPath, 'utf8');
  const lines = fileContent.split('\n');

  console.log(`Lecture du CSV (${lines.length - 1} lignes)...`);

  const rows = [];
  const seenKeys = new Set();

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/).map(v => v.replace(/^"|"$/g, '').trim());

    if (values.length < 5) continue;

    const region = values[0];
    const department = values[1] || null;
    const comArr = values[2];
    const commune = values[3] || comArr || null;
    const locality = values[4];

    if (!region || !locality) continue;

    const key = `${region}|${department||''}|${commune||''}|${locality}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);

    // EXIGENCE STRICTE SECTION 6: AUCUNE HEURISTIQUE OU DEVINNETTE
    // Le CSV officiel RGPH-5 ne possédant pas de colonne 'type', locality_type = NULL par défaut.
    const localityType = null;

    const displayName = `${locality}${commune ? ' (' + commune + ')' : department ? ' (' + department + ')' : ''}`;
    const normalizedName = removeAccents(`${locality} ${commune || ''} ${department || ''} ${region}`);

    rows.push({
      region,
      department,
      commune,
      locality,
      locality_type: localityType,
      display_name: displayName,
      normalized_name: normalizedName,
      source_name: 'ANSD RGPH-5 2023',
      source_url: 'https://www.ansd.sn/donnees-recensements'
    });
  }

  console.log(`Données prêtes pour l'upsert/enrichissement (${rows.length} localités uniques).`);

  const batchSize = 1000;
  let processed = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    
    const valuesString = batch.map((r) => {
      const reg = r.region.replace(/'/g, "''");
      const dept = r.department ? `'${r.department.replace(/'/g, "''")}'` : 'NULL';
      const com = r.commune ? `'${r.commune.replace(/'/g, "''")}'` : 'NULL';
      const loc = r.locality.replace(/'/g, "''");
      const locType = 'NULL';
      const dispName = r.display_name.replace(/'/g, "''");
      const normName = r.normalized_name.replace(/'/g, "''");
      const srcName = r.source_name.replace(/'/g, "''");
      const srcUrl = r.source_url.replace(/'/g, "''");

      return `('${reg}', ${dept}, ${com}, '${loc}', ${locType}, '${dispName}', '${normName}', '${srcName}', '${srcUrl}')`;
    }).join(',');

    const query = `
      UPDATE public.senegal_locations AS l
      SET 
        locality_type = v.locality_type,
        display_name = v.display_name,
        normalized_name = v.normalized_name,
        source_name = v.source_name,
        source_url = v.source_url,
        updated_at = NOW()
      FROM (VALUES ${valuesString}) AS v(region, department, commune, locality, locality_type, display_name, normalized_name, source_name, source_url)
      WHERE l.region = v.region 
        AND (l.locality = v.locality)
        AND (l.department IS NOT DISTINCT FROM v.department)
        AND (l.commune IS NOT DISTINCT FROM v.commune);
    `;

    await client.query(query);
    processed += batch.length;
  }

  // Notifier PostgREST pour recharger son cache de schéma
  await client.query("NOTIFY pgrst, 'reload schema';");
  console.log("\n🎉 Enrichissement ANSD terminé (007 / NULL strict pour locality_type) ! Cache PostgREST notifié.");

  await client.end();
}

runANSDEnrichment().catch(console.error);
