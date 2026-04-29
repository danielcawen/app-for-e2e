import pool from './pool';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars from the root .env file
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

export async function migrate() {
  console.log('Starting database migration...');

  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash TEXT,
      first_name TEXT,
      last_name TEXT,
      is_verified BOOLEAN DEFAULT FALSE,
      magic_token TEXT,
      magic_token_expires_at TIMESTAMP,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT;

    CREATE TABLE IF NOT EXISTS conversations (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
      sender_type VARCHAR(50) NOT NULL, -- 'user' or 'ai'
      content TEXT NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- Create an index for faster lookups on user email
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  `;

  try {
    // Test connection
    const client = await pool.connect();
    console.log('Connected to database successfully.');

    try {
      await client.query('BEGIN');
      await client.query(schema);
      await client.query('COMMIT');
      console.log('Migration completed successfully.');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Migration failed, transaction rolled back.');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error during migration:', error);
    throw error;
  }
}

if (require.main === module) {
  migrate().then(() => {
    console.log('Migration process finished.');
    process.exit(0);
  }).catch((err) => {
    console.error('Migration process encountered an error:', err);
    process.exit(1);
  });
}
