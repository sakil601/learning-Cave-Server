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

const digitalUploadDir = path.join(
  process.cwd(),
  "uploads",
  "digital-products",
);

fs.mkdirSync(digitalUploadDir, {
  recursive: true,
});

const digitalStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, digitalUploadDir);
  },

  filename: (req, file, cb) => {
    const safeName = file.originalname
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9._-]/g, "");

    cb(null, `${Date.now()}-${safeName}`);
  },
});

function digitalFileFilter(req, file, cb) {
  const allowedMimeTypes = [
    "application/pdf",

    "application/zip",
    "application/x-zip-compressed",

    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",

    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",

    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-powerpoint",

    "text/plain",
    "text/csv",
  ];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error("Unsupported digital product file type."), false);
  }

  cb(null, true);
}

export const uploadDigitalProductFile = multer({
  storage: digitalStorage,

  fileFilter: digitalFileFilter,

  limits: {
    fileSize: 100 * 1024 * 1024,
  },
}).single("file");
