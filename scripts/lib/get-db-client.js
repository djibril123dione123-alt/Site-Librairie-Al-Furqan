const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dns = require('dns');

dns.setDefaultResultOrder('ipv4first');

function getEnvVar(key) {
  if (process.env[key]) return process.env[key];
  
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    for (const line of envContent.split('\n')) {
      const parts = line.split('=');
      if (parts[0].trim() === key) {
        return parts.slice(1).join('=').trim();
      }
    }
  }
  return null;
}

function getDatabaseUrl() {
  const url = getEnvVar('DATABASE_URL');
  if (!url) {
    throw new Error("DATABASE_URL non définie dans l'environnement ni dans .env.local.");
  }
  return url;
}

async function getPgClient() {
  const connectionString = getDatabaseUrl();
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  return client;
}

module.exports = { getEnvVar, getDatabaseUrl, getPgClient };
