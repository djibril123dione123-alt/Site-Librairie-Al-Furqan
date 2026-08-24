const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const envPath = path.join(__dirname, '..', '.env.local');
let databaseUrl = process.env.DATABASE_URL;
let supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

if ((!databaseUrl || !supabaseUrl) && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (!match) return;
    let val = match[2] || '';
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    val = val.trim();
    if (match[1] === 'DATABASE_URL' && !databaseUrl) databaseUrl = val;
    if (match[1] === 'NEXT_PUBLIC_SUPABASE_URL' && !supabaseUrl) supabaseUrl = val;
  });
}

if (!databaseUrl) {
  console.error('ERROR: DATABASE_URL not set in environment or .env.local');
  process.exit(1);
}

function extractProjectRef(rawDbUrl, rawSupabaseUrl) {
  let dbHost = null;
  let dbUser = null;
  try {
    const u = new URL(rawDbUrl);
    dbHost = u.hostname;
    dbUser = u.username;
  } catch {
    return { ok: false, reason: 'DATABASE_URL is not a parseable URL' };
  }

  let targetRef = null;
  if (rawSupabaseUrl) {
    try {
      const su = new URL(rawSupabaseUrl);
      targetRef = su.hostname.split('.')[0] || null;
    } catch {
      // leave targetRef null — mismatch check becomes inconclusive, not fatal
    }
  }

  const directMatch = dbHost && dbHost.match(/^db\.([a-z0-9]+)\.supabase\.co$/i);
  const poolerUserMatch = dbUser && dbUser.match(/^[^.]+\.([a-z0-9]+)$/i);

  const dbRef = (directMatch && directMatch[1]) || (poolerUserMatch && poolerUserMatch[1]) || null;

  return { ok: true, dbHost, dbRef, targetRef };
}

const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '012_normalize_commune_search.sql');
const sqlContent = fs.readFileSync(sqlPath, 'utf8');

async function deploy012() {
  console.log('Resolving target database (hostname only — no credentials logged)...');

  const refCheck = extractProjectRef(databaseUrl, supabaseUrl);
  if (!refCheck.ok) {
    console.error(`ERROR: ${refCheck.reason}`);
    process.exit(1);
  }

  console.log(`  DATABASE_URL host: ${refCheck.dbHost}`);
  console.log(`  DATABASE_URL project ref: ${refCheck.dbRef || '(could not be determined from host/user)'}`);
  console.log(`  NEXT_PUBLIC_SUPABASE_URL project ref: ${refCheck.targetRef || '(NEXT_PUBLIC_SUPABASE_URL not set)'}`);

  if (refCheck.dbRef && refCheck.targetRef && refCheck.dbRef !== refCheck.targetRef) {
    console.error(
      `ABORTING: DATABASE_URL targets project "${refCheck.dbRef}" but NEXT_PUBLIC_SUPABASE_URL points to project "${refCheck.targetRef}". Refusing to run a migration against a different project than the app is configured for.`
    );
    process.exit(1);
  }
  if (!refCheck.dbRef || !refCheck.targetRef) {
    console.warn('  WARNING: could not fully verify the project ref match — proceeding, but double-check DATABASE_URL manually if unsure.');
  } else {
    console.log('  Project ref match confirmed.');
  }

  console.log('Connecting to database via DATABASE_URL to deploy 012_normalize_commune_search.sql...');

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    console.log('Database connection successful. Executing migration SQL...');
    await client.query(sqlContent);
    console.log('SUCCESSFULLY DEPLOYED 012_normalize_commune_search.sql!');

    const testRes = await client.query(`select * from public.search_senegal_communes('Patte doie', NULL, 5)`);
    console.log(`  Smoke test search_senegal_communes('Patte doie') [no apostrophe] returned ${testRes.rows.length} row(s):`, JSON.stringify(testRes.rows));
    console.log('\nVerification passed.');
  } catch (err) {
    console.error('Migration execution failed:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

deploy012();
