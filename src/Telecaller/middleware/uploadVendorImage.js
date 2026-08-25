// /**
//  * Telecaller CRM — Upload Vendor Image Middleware
//  * Multer configuration for vendor image uploads.
//  * Rules: max 5 files, 2 MB each, jpg/jpeg/png/webp only.
//  * Stored at: /uploads/vendors/
//  */
// import multer from 'multer';
// import path from 'path';
// import fs from 'fs';
// import { fileURLToPath } from 'url';

// // Resolve __dirname equivalent in ESM
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// // Ensure upload directory exists
// const uploadDir = path.join(__dirname, '../../../../uploads/vendors');
// if (!fs.existsSync(uploadDir)) {
//   fs.mkdirSync(uploadDir, { recursive: true });
// }

// // Disk storage configuration
// const storage = multer.diskStorage({
//   destination: (_req, _file, cb) => {
//     cb(null, uploadDir);
//   },
//   filename: (_req, file, cb) => {
//     const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
//     const ext = path.extname(file.originalname).toLowerCase();
//     cb(null, `vendor-${uniqueSuffix}${ext}`);
//   },
// });

// // File type filter — allow jpg, jpeg, png, webp only
// // const fileFilter = (_req, file, cb) => {
// //   const allowedTypes = /jpeg|jpg|png|webp/;
// //   const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
// //   const mimetype = allowedTypes.test(file.mimetype);

// //   if (extname && mimetype) {
// //     cb(null, true);
// //   } else {
// //     cb(new Error('Only jpg, jpeg, png, and webp images are allowed'));
// //   }
// // };

// // const fileFilter = (_req, file, cb) => {
// //   const allowedMimeTypes = [
// //     'image/jpeg',
// //     'image/jpg',
// //     'image/png',
// //     'image/webp',
// //   ];

// //   const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

// //   const ext = path.extname(file.originalname).toLowerCase();
// //   const mime = file.mimetype.toLowerCase();

// //   if (
// //     allowedExtensions.includes(ext) &&
// //     allowedMimeTypes.includes(mime)
// //   ) {
// //     cb(null, true);
// //   } else {
// //     cb(new Error('Only jpg, jpeg, png, and webp images are allowed'));
// //   }
// // };

// const fileFilter = (_req, file, cb) => {
//   console.log('Uploaded file:', {
//     originalname: file.originalname,
//     mimetype: file.mimetype,
//   });

//   const allowedMimeTypes = [
//     'image/jpeg',
//     'image/jpg',
//     'image/png',
//     'image/webp',
//   ];

//   const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

//   const ext = path.extname(file.originalname).toLowerCase();
//   const mime = file.mimetype.toLowerCase();

//   if (
//     allowedExtensions.includes(ext) &&
//     allowedMimeTypes.includes(mime)
//   ) {
//     cb(null, true);
//   } else {
//     cb(new Error('Only jpg, jpeg, png, and webp images are allowed'));
//   }
// };

// const upload = multer({
//   storage,
//   fileFilter,
//   limits: {
//     fileSize: 2 * 1024 * 1024, // 2 MB per file
//     files: 5,                   // Max 5 files per request
//   },
// });

// // Export configured multer instance for field 'images[]'
// export const uploadVendorImages = upload.array('images', 5);

// // Error handler for multer-specific errors (used in route)
// export const handleUploadError = (err, req, res, next) => {
//   if (err instanceof multer.MulterError) {
//     if (err.code === 'LIMIT_FILE_COUNT') {
//       return res.status(400).json({ success: false, message: 'Maximum 5 images allowed per upload.' });
//     }
//     if (err.code === 'LIMIT_FILE_SIZE') {
//       return res.status(400).json({ success: false, message: 'Each image must be 2 MB or smaller.' });
//     }
//     return res.status(400).json({ success: false, message: err.message });
//   }
//   if (err) {
//     return res.status(400).json({ success: false, message: err.message });
//   }
//   next();
// };







/**
 * Telecaller CRM — Upload Vendor Image Middleware
 * Multer configuration for vendor image uploads.
 * Rules: max 5 files, 2 MB each, jpg/jpeg/png/webp only.
 * Stored at: /uploads/vendors/
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Resolve __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../../../../uploads/vendors');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// ─────────────────────────────────────────────────────────────────────────────
// Disk storage configuration
// ─────────────────────────────────────────────────────────────────────────────

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },

  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();

    cb(null, `vendor-${uniqueSuffix}${ext}`);
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// File type filter
// ─────────────────────────────────────────────────────────────────────────────
// Accept based on file extension because Postman is sending
// application/octet-stream for the uploaded images.

const fileFilter = (_req, file, cb) => {
  console.log('Uploaded file:', {
    originalname: file.originalname,
    mimetype: file.mimetype,
  });

  const allowedExtensions = [
    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
  ];

  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only jpg, jpeg, png, and webp images are allowed'));
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Multer configuration
// ─────────────────────────────────────────────────────────────────────────────

const upload = multer({
  storage,
  fileFilter,

  limits: {
    fileSize: 2 * 1024 * 1024, // 2 MB per file
    files: 5,                   // Maximum 5 files
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Upload field
// ─────────────────────────────────────────────────────────────────────────────
// Postman field name must be: images

export const uploadVendorImages = upload.array('images', 5);

// ─────────────────────────────────────────────────────────────────────────────
// Multer error handler
// ─────────────────────────────────────────────────────────────────────────────

export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Maximum 5 images allowed per upload.',
      });
    }

    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'Each image must be 2 MB or smaller.',
      });
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field. Use "images" as the field name.',
      });
    }

    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  next();
};