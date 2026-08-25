/**
 * Telecaller CRM — Profile Routes
 * Mounted at: /api/telecaller/profile
 */
import express from 'express';
import { protectTelecaller } from '../middleware/telecallerAuth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getProfile, updateProfile } from '../controllers/profile.controller.js';

const router = express.Router();

// Single-file upload for profile image
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '../../../../uploads/vendors');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const profileImageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `profile-${Date.now()}${ext}`);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    if (allowed.test(path.extname(file.originalname).toLowerCase()) && allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only jpg, jpeg, png, and webp images are allowed'));
    }
  },
}).single('profileImage');

router.get('/',  protectTelecaller, getProfile);
router.put('/',  protectTelecaller, (req, res, next) => {
  profileImageUpload(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    next();
  });
}, updateProfile);

export default router;

