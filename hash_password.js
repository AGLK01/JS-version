/**********************************************
 * hash_password.js
 **********************************************/
const { Pool } = require('pg');
const crypto = require('crypto');

// Same DB config as app.js
const DB_HOST = "aws-0-eu-central-1.pooler.supabase.com";
const DB_NAME = "postgres";
const DB_USER = "postgres.agwvpuvzmhsberiqxsim";
const DB_PASS = "kjkger2346wgae#$Q^";
const DB_PORT = "6543";

const pool = new Pool({
  host: DB_HOST,
  database: DB_NAME,
  user: DB_USER,
  password: DB_PASS,
  port: DB_PORT,
});

// Generate PBKDF2:sha256 hash (similar to Werkzeug)
function generatePasswordHash(password) {
  const iterations = 260000;
  const saltBytes = crypto.randomBytes(16);
  const salt = saltBytes.toString('hex');
  const hashBytes = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256');
  const hashHex = hashBytes.toString('hex');
  return `pbkdf2:sha256:${iterations}$${salt}$${hashHex}`;
}

// Insert a test user
async function insertTestUser() {
  const client = await pool.connect();
  
  const username = "testuser";
  const plainPassword = "testpassword";
  const hashedPassword = generatePasswordHash(plainPassword);

  try {
    await client.query(
      "INSERT INTO users (username, password) VALUES ($1, $2);",
      [username, hashedPassword]
    );
    console.log("Test user created successfully.");
  } catch (err) {
    console.error("Error creating test user:", err.message);
  } finally {
    client.release();
    pool.end();
  }
}

insertTestUser();
