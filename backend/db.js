// db.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/banka-promosyon',
  ssl: {
    rejectUnauthorized: false // SSL zorunlu ama sertifika istemiyoruz
  }
});

module.exports = pool;