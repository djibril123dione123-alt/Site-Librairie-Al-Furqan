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

// IMPORTANT: never decodeURIComponent() the whole connection string. A
// percent-encoded password is meant to stay encoded in a connection URI —
// decoding the full URL can turn escaped reserved characters (%40 -> @,
// %23 -> #, %2F -> /, %3A -> :) into real delimiters, which silently
// reshapes host/user/password parsing and produces a false authentication
// or host-resolution failure. Pass databaseUrl to pg exactly as stored.

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
      // https://<ref>.supabase.co
      targetRef = su.hostname.split('.')[0] || null;
    } catch {
      // leave targetRef null — mismatch check becomes inconclusive, not fatal
    }
  }

  // Direct connection host: db.<ref>.supabase.co
  const directMatch = dbHost && dbHost.match(/^db\.([a-z0-9]+)\.supabase\.co$/i);
  // Pooler connection: host is a shared pooler, ref lives in the username
  // as "postgres.<ref>" instead.
  const poolerUserMatch = dbUser && dbUser.match(/^[^.]+\.([a-z0-9]+)$/i);

  const dbRef = (directMatch && directMatch[1]) || (poolerUserMatch && poolerUserMatch[1]) || null;

  return { ok: true, dbHost, dbRef, targetRef };
}

const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '009_product_weight.sql');
const sqlContent = fs.readFileSync(sqlPath, 'utf8');

async function deploy009() {
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

  console.log('Connecting to database via DATABASE_URL to deploy 009_product_weight.sql...');

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    console.log('Database connection successful. Executing migration SQL...');
    await client.query(sqlContent);
    console.log('SUCCESSFULLY DEPLOYED 009_product_weight.sql!');

    console.log('\nVerifying products.weight_g via information_schema / pg_constraint...');
    const colRes = await client.query(
      `select column_name, data_type, is_nullable
       from information_schema.columns
       where table_name = 'products' and column_name = 'weight_g'`
    );
    const constraintRes = await client.query(
      `select conname, pg_get_constraintdef(oid) as definition
       from pg_constraint
       where conname = 'products_weight_g_positive' and conrelid = 'products'::regclass`
    );

    if (colRes.rows.length === 0) {
      console.error('VERIFICATION FAILED: products.weight_g column not found after migration.');
      process.exitCode = 1;
      return;
    }
    const col = colRes.rows[0];
    console.log(`  Column: ${col.column_name} — type=${col.data_type}, nullable=${col.is_nullable}`);

    if (constraintRes.rows.length === 0) {
      console.error('VERIFICATION FAILED: products_weight_g_positive constraint not found after migration.');
      process.exitCode = 1;
      return;
    }
    console.log(`  Constraint: ${constraintRes.rows[0].conname} — ${constraintRes.rows[0].definition}`);
    console.log('\nVerification passed: weight_g exists, is integer, nullable, with a positive-value check.');
  } catch (err) {
    console.error('Migration execution failed:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

deploy009();
