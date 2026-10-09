import multer from "multer";
import path from "path";
import fs from "fs";

const createUploader = (folderName) => {
  const uploadPath = path.join(process.cwd(), "uploads", folderName);

  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadPath);
    },

    filename: (req, file, cb) => {
      const extension = path.extname(file.originalname);

      const uniqueName = `${Date.now()}-${Math.round(
        Math.random() * 1e9
      )}${extension}`;

      cb(null, uniqueName);
    },
  });

  return multer({
    storage,

    limits: {
      fileSize: 5 * 1024 * 1024, // 5 MB
    },

    fileFilter: (req, file, cb) => {
      const allowedTypes = [
        "image/jpeg",
        "image/png",
        "image/jpg",
        "image/webp",
      ];

      if (!allowedTypes.includes(file.mimetype)) {
        return cb(new Error("Only image files are allowed"));
      }

      cb(null, true);
    },
  });
};

export default createUploader;