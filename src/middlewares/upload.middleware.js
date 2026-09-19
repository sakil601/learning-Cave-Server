import multer from "multer";
import path from "path";
import fs from "fs";

const ebookUploadDir = path.join(process.cwd(), "uploads", "ebooks");

fs.mkdirSync(ebookUploadDir, {
  recursive: true,
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, ebookUploadDir);
  },

  filename: (req, file, cb) => {
    const safeName = file.originalname
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9._-]/g, "");

    cb(null, `${Date.now()}-${safeName}`);
  },
});

function fileFilter(req, file, cb) {
  if (file.mimetype !== "application/pdf") {
    return cb(new Error("Only PDF files are allowed."), false);
  }

  cb(null, true);
}

export const uploadEbookPdf = multer({
  storage,
  fileFilter,

  limits: {
    fileSize: 20 * 1024 * 1024,
  },
}).single("file");
