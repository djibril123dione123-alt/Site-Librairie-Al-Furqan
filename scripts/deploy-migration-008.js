const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const envPath = path.join(__dirname, '..', '.env.local');
let databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl && fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match && match[1] === 'DATABASE_URL') {
      let val = match[2] || '';
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      databaseUrl = val.trim();
    }
  });
}

if (!databaseUrl) {
  console.error('ERROR: DATABASE_URL not set in environment or .env.local');
  process.exit(1);
}

// Decode URL percent-encoding safely if encoded
try {
  databaseUrl = decodeURIComponent(databaseUrl);
} catch {
  // ignore if already decoded
}

const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '008_search_and_analytics.sql');
const sqlContent = fs.readFileSync(sqlPath, 'utf8');

async function deploy008() {
  console.log('Connecting to database via DATABASE_URL to deploy 008_search_and_analytics.sql...');
  
  const client = new Client({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    console.log('Database connection successful. Executing migration SQL...');
    await client.query(sqlContent);
    console.log('SUCCESSFULLY DEPLOYED 008_search_and_analytics.sql!');
  } catch (err) {
    console.error('Migration execution failed:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

deploy008();
