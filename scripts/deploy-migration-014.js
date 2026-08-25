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

async function deploy014() {
  const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '014_product_image_crop.sql');
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');

  console.log('Connecting to database via DATABASE_URL to deploy 014_product_image_crop.sql...');

  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    console.log('Database connection successful. Executing migration SQL...');
    await client.query(sqlContent);
    console.log('SUCCESSFULLY DEPLOYED 014_product_image_crop.sql!');

    const colRes = await client.query(
      `select column_name, data_type from information_schema.columns
       where table_schema = 'public' and table_name = 'product_images'
       and column_name in ('original_storage_path', 'crop_data')
       order by column_name`
    );
    console.log('  Columns found:', colRes.rows.map((r) => `${r.column_name} (${r.data_type})`).join(', ') || '(none)');
  } catch (err) {
    console.error('Migration execution failed:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

deploy014();
