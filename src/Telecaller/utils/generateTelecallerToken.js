/**
 * Telecaller Auth — JWT Token Utility
 * Generates a signed JWT for a telecaller user.
 * Expiry is read from process.env.JWT_EXPIRES_IN (default: '7d').
 */
import jwt from 'jsonwebtoken';
/**
 * Generate a JWT for a telecaller.
 * @param {string} id  - Telecaller MongoDB _id
 * @returns {string}   - Signed JWT string
 */
const generateToken = (id) => {
  return jwt.sign(
    { id, role: 'TELECALLER' },
    process.env.JWT_SECRET || 'lts_default_jwt_secret_key_2026',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

export default generateToken;
