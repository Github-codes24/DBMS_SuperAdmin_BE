import jwt from 'jsonwebtoken';
import Vendor from './authSchema.js';

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get vendor from database
      req.vendor = await Vendor.findById(decoded.id).select('-password');
      if (!req.vendor) {
        return res.status(401).json({ message: 'Not authorized, vendor not found' });
      }

      req.vendorId = req.vendor.vendorId;

      next();
    } catch (error) {
      console.error(error);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};
