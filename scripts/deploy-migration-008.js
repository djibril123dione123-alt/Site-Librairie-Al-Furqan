const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const env = {};
envContent.split('\n').forEach((line) => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    env[match[1]] = value.trim();
  }
});

const sqlPath = path.join(__dirname, '..', 'supabase', 'migrations', '008_search_and_analytics.sql');
const sqlContent = fs.readFileSync(sqlPath, 'utf8');

async function tryConnect(port, pooler) {
  const pass = '49CpzDmopfSQuTnjmWbajUfOcvTewVIz!A1';
  const user = pooler ? 'postgres.ryrhopolzmcawscuwcak' : 'postgres';
  const host = pooler ? 'aws-0-eu-central-1.pooler.supabase.com' : 'db.ryrhopolzmcawscuwcak.supabase.co';
  
  console.log(`Trying host: ${host}, port: ${port}, user: ${user}...`);
  const client = new Client({
    user,
    password: pass,
    host,
    port,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
    console.log(`CONNECTED SUCCESS on ${host}:${port}! Deploying SQL...`);
    await client.query(sqlContent);
    console.log('SUCCESSFULLY APPLIED 008_search_and_analytics.sql!');
    await client.end();
    return true;
  } catch (err) {
    console.log(`Failed on ${host}:${port}: ${err.message}`);
    await client.end().catch(() => {});
    return false;
  }
}

async function run() {
  if (await tryConnect(5432, false)) return;
  if (await tryConnect(6543, false)) return;
  if (await tryConnect(5432, true)) return;
  if (await tryConnect(6543, true)) return;
}

run();
