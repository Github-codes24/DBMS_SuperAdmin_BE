import jwt from 'jsonwebtoken';
import SuperAdmin from './authSchema.js';
import User from '../UserManagement/userSchema.js';

export const verifyJWT = async (req, res, next) => {
  let token;

  // 1. Check Authorization header (Bearer <token>)
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } 
  // 2. Check HTTP-only cookie (accessToken)
  else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }
  // 3. Fallback: Parse raw Cookie header if cookie-parser middleware is not used
  else if (req.headers.cookie) {
    const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {});
    token = cookies.accessToken;
  }

  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');

    // Search in SuperAdmin collection first, then User collection
    let admin = await SuperAdmin.findById(decoded.id).select('-password');
    if (!admin) {
      admin = await User.findById(decoded.id).select('-password');
    }

    if (!admin) {
      return res.status(401).json({ message: 'Not authorized, user not found' });
    }

    const normalizedStatus = (admin.status || '').toUpperCase();
    if (normalizedStatus !== 'ACTIVE') {
      return res.status(403).json({ message: 'Account is not active or has been disabled' });
    }

    // Attach authenticated user to request
    req.user = admin;
    req.superAdmin = admin;

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Not authorized, token failed or expired' });
  }
};

// Export protectSuperAdmin as alias for verifyJWT
export const protectSuperAdmin = verifyJWT;
