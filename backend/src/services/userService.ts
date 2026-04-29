import pool from '../db/pool';
import { generateToken, hashPassword, comparePassword, generateMagicLinkToken } from '../utils/auth';
import { AppError } from '../middleware/errorHandler';

interface User {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_verified: boolean;
}

export class UserService {
  /**
   * Registers a new user in the system
   * @param email User's email address
   * @param password User's plain text password
   * @returns The created user and their authentication token
   */
  async signup(email: string, password: string, firstName: string, lastName: string): Promise<{ user: User; verificationToken: string }> {
    const passwordHash = await hashPassword(password);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existingUser = await client.query('SELECT id FROM users WHERE email = $1', [email]);
      if ((existingUser.rowCount ?? 0) > 0) {
        throw new AppError('User with this email already exists', 400, 'USER_EXISTS');
      }

      const result = await client.query(
        'INSERT INTO users (email, password_hash, first_name, last_name) VALUES ($1, $2, $3, $4) RETURNING id, email, first_name, last_name, is_verified',
        [email, passwordHash, firstName, lastName]
      );

      const user = result.rows[0];
      const verificationToken = generateMagicLinkToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      await client.query(
        'UPDATE users SET magic_token = $1, magic_token_expires_at = $2 WHERE id = $3',
        [verificationToken, expiresAt, user.id]
      );

      await client.query('COMMIT');
      return { user, verificationToken };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Authenticates a user and returns a JWT token
   * @param email User's email address
   * @param password User's plain text password
   * @returns The user data and their authentication token
   */
  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const result = await pool.query('SELECT id, email, first_name, last_name, is_verified, password_hash FROM users WHERE email = $1', [email]);

    if (result.rowCount === 0) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const user = result.rows[0];

    if (!user.password_hash) {
      throw new AppError('This account uses magic link login. Please request a magic link.', 401, 'NO_PASSWORD');
    }

    const isValid = await comparePassword(password, user.password_hash);

    if (!isValid) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const token = generateToken({ userId: user.id, email: user.email });

    const { password_hash, ...userWithoutPassword } = user;
    return { user: userWithoutPassword, token };
  }

  /**
   * Retrieves a user by their ID
   * @param userId The ID of the user
   * @returns The user data
   */
  async getUserById(userId: number): Promise<User> {
    const result = await pool.query('SELECT id, email, is_verified FROM users WHERE id = $1', [userId]);

    if (result.rowCount === 0) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    const user = result.rows[0];
    const { password_hash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  /**
   * Generates a magic link token and stores it in the database
   * @param email User's email address
   * @returns The generated magic token
   */
  async sendMagicLink(email: string): Promise<string> {
    const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);

    if (result.rowCount === 0) {
      throw new AppError('No account found with that email address. Please sign up first.', 404, 'USER_NOT_FOUND');
    }

    const magicToken = generateMagicLinkToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Token expires in 24 hours

    await pool.query(
      'UPDATE users SET magic_token = $1, magic_token_expires_at = $2 WHERE email = $3',
      [magicToken, expiresAt, email]
    );

    return magicToken;
  }

  /**
   * Verifies the magic link token and marks the user as verified
   * @param token The magic link token
   * @returns The authenticated user data
   */
  async verifyMagicLink(token: string): Promise<User> {
    const result = await pool.query(
      'SELECT id, email, first_name, last_name, is_verified FROM users WHERE magic_token = $1 AND magic_token_expires_at > CURRENT_TIMESTAMP',
      [token]
    );

    if (result.rowCount === 0) {
      throw new AppError('Invalid or expired magic link', 400, 'INVALID_TOKEN');
    }

    const user = result.rows[0];

    await pool.query(
      'UPDATE users SET is_verified = true, magic_token = NULL, magic_token_expires_at = NULL WHERE id = $1',
      [user.id]
    );

    return { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name, is_verified: true };
  }
}

export default new UserService();
