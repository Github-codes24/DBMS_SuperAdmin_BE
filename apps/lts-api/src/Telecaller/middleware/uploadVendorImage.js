import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Resolve __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure upload directory exists inside workspace (matching server.js static /uploads)
const uploadDir = path.join(__dirname, '../../../uploads/vendors');

try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
} catch (dirErr) {
  console.warn('Could not initialize upload directory:', dirErr.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// Disk storage configuration
// ─────────────────────────────────────────────────────────────────────────────

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },

  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `vendor-${uniqueSuffix}${ext}`);
  },
});

export const uploadImages = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB per image
}).fields([
  { name: 'shopImages', maxCount: 10 },
  { name: 'productImages', maxCount: 10 },
]);

export const uploadVendorImages = uploadImages;

export const handleUploadError = (err, _req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`,
    });
  }
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'File upload failed',
    });
  }
  next();
};

export default uploadImages;
