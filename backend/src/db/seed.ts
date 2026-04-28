import pool from './pool';
import dotenv from 'dotenv';
import path from 'path';
import bcrypt from 'bcryptjs';

// Load env vars from the root .env file
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function seed() {
  console.log('Starting database seeding...');

  const defaultUserEmail = 'testuser@example.com';
  const defaultPassword = 'password123';

  try {
    const client = await pool.connect();
    console.log('Connected to database successfully.');

    try {
      await client.query('BEGIN');

      // 1. Check if user already exists to prevent duplicates
      const userCheck = await client.query('SELECT id FROM users WHERE email = $1', [defaultUserEmail]);

      if (userCheck.rowCount === 0) {
        // 2. Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(defaultPassword, salt);

        // 3. Insert default user
        await client.query(
          'INSERT INTO users (email, password_hash, is_verified) VALUES ($1, $2, $3)',
          [defaultUserEmail, passwordHash, true]
        );
        console.log(`Default user created: ${defaultUserEmail}`);
      } else {
        console.log(`User ${defaultUserEmail} already exists. Skipping user creation.`);
      }

      // 4. Seed a conversation and messages for this user
      const userResult = await client.query('SELECT id FROM users WHERE email = $1', [defaultUserEmail]);
      const userId = userResult.rows[0].id;

      // Check if conversation already exists for this user
      const convCheck = await client.query('SELECT id FROM conversations WHERE user_id = $1', [userId]);

      if (convCheck.rowCount === 0) {
        const convResult = await client.query(
          'INSERT INTO conversations (user_id) VALUES ($1) RETURNING id',
          [userId]
        );
        const conversationId = convResult.rows[0].id;
        console.log(`Created conversation ID: ${conversationId}`);

        // Seed initial messages
        await client.query(
          'INSERT INTO messages (conversation_id, sender_type, content) VALUES ($1, $2, $3)',
          [conversationId, 'user', 'Hello, can you help me?']
        );
        await client.query(
          'INSERT INTO messages (conversation_id, sender_type, content) VALUES ($1, $2, $3)',
          [conversationId, 'ai', 'Of course! I am your AI assistant. How can I assist you today?']
        );
        console.log('Initial messages seeded.');
      } else {
        console.log('Conversation already exists. Skipping conversation seeding.');
      }

      await client.query('COMMIT');
      console.log('Seeding completed successfully.');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Seeding failed, transaction rolled back.');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  }
}

seed().then(() => {
  console.log('Seeding process finished.');
}).catch((err) => {
  console.error('Seeding process encountered an error:', err);
  process.exit(1);
});
