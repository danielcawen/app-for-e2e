import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_key_for_development_only';
const JWT_EXPIRY = process.env.JWT_EXPIRES_IN || '1d';

/**
 * Generates a JWT token for a user
 * @param payload The user data to encode in the token
 * @returns A signed JWT string
 */
export function generateToken(payload: { userId: number; email: string }): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRY as jwt.SignOptions['expiresIn'],
  });
}

/**
 * Verifies a JWT token and returns the decoded payload
 * @param token The JWT string to verify
 * @returns The decoded payload or null if verification fails
 */
export function verifyToken(token: string): any | null {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

/**
 * Generates a secure random token for magic links
 * @returns A random string token
 */
export function generateMagicLinkToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Hashes a plain text password
 * @param password The plain text password
 * @returns The hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compares a plain text password with a hashed password
 * @param password The plain text password
 * @param hash The hashed password
 * @returns True if they match, false otherwise
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
