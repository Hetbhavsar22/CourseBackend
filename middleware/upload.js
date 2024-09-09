const multer = require("multer");
const path = require("path");

// Define file size limits
const VIDEO_SIZE_LIMIT = 1000 * 1024 * 1024; // 1 GB
const THUMBNAIL_SIZE_LIMIT = 500 * 1024 * 1024; // 500 MB

const PDF_SIZE_LIMIT = 50 * 1024 * 1024; // 50 MB
const PPT_SIZE_LIMIT = 50 * 1024 * 1024; // 50 MB
const DOC_SIZE_LIMIT = 50 * 1024 * 1024; // 50 MB

const PROFILE_IMAGE_SIZE_LIMIT = 5 * 1024 * 1024; // 5 MB
const COURSE_IMAGE_SIZE_LIMIT = 500 * 1024 * 1024; // 500 MB

// Storage configuration for video
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/videos");
  },
  filename: (req, file, cb) => {
    cb(null, "video_" + Date.now() + path.extname(file.originalname));
  },
});

// Storage configuration for thumbnail
const thumbnailStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/thumbnails");
  },
  filename: (req, file, cb) => {
    cb(null, "thumbnail_" + Date.now() + path.extname(file.originalname));
  },
});

// Storage configuration for PDF, PPT, and documents
const pdfStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/pdf");
  },
  filename: (req, file, cb) => {
    cb(null, "pdf_" + Date.now() + path.extname(file.originalname));
  },
});

const pptStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/ppt");
  },
  filename: (req, file, cb) => {
    cb(null, "ppt_" + Date.now() + path.extname(file.originalname));
  },
});

const docStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/document");
  },
  filename: (req, file, cb) => {
    cb(null, "doc_" + Date.now() + path.extname(file.originalname));
  },
});

const profileImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/profile_images");
  },
  filename: (req, file, cb) => {
    cb(null, "profileImage_" + Date.now() + path.extname(file.originalname));
  },
});

const courseImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/course_images");
  },
  filename: (req, file, cb) => {
    cb(null, "courseImage_" + Date.now() + path.extname(file.originalname));
  },
});

// Storage configuration for different types of files
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.body.type;

    if (type === "video") {
      if (file.fieldname === "videofile") {
        cb(null, "public/videos");
      } else if (file.fieldname === "thumbnail") {
        cb(null, "public/thumbnails");
      } else {
        cb(new Error("Invalid field name for video"), false);
      }
    } else if (type === "document") {
      if (file.fieldname === "pdf") {
        cb(null, "public/pdf");
      } else if (file.fieldname === "doc") {
        cb(null, "public/document");
      } else if (file.fieldname === "ppt") {
        cb(null, "public/ppt");
      } else {
        cb(new Error("Invalid field name for document"), false);
      }
    } else if (file.fieldname === "profileImage") {
      cb(null, "public/profile_images");
    } else if (file.fieldname === "courseImage") {
      cb(null, "public/course_images");
    } else {
      cb(new Error("Invalid field name"), false);
    }
  },
  filename: (req, file, cb) => {
    cb(null, `${file.originalname}`);
  }
});

// Define file limits based on type
const limits = {
  fileSize: (req, file, cb) => {
    const type = req.body.type;

    if (type === "video") {
      if (file.fieldname === "videofile") {
        cb(null, VIDEO_SIZE_LIMIT);
      } else if (file.fieldname === "thumbnail") {
        cb(null, THUMBNAIL_SIZE_LIMIT);
      } else {
        cb(new Error("Invalid file field for video"), false);
      }
    } else if (type === "document") {
      if (file.fieldname === "pdf") {
        cb(null, PDF_SIZE_LIMIT);
      } else if (file.fieldname === "doc") {
        cb(null, DOC_SIZE_LIMIT);
      } else if (file.fieldname === "ppt") {
        cb(null, PPT_SIZE_LIMIT);
      } else {
        cb(new Error("Invalid file field for document"), false);
      }
    } else if (file.fieldname === "profileImage") {
      cb(null, PROFILE_IMAGE_SIZE_LIMIT);
    } else if (file.fieldname === "courseImage") {
      cb(null, COURSE_IMAGE_SIZE_LIMIT);
    } else {
      cb(new Error("Invalid field name"), false);
    }
  }
};

// Define file filters
const fileFilter = (req, file, cb) => {
  const type = req.body.type;

  if (type === "video") {
    if (file.fieldname === "videofile" && file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else if (file.fieldname === "thumbnail" && file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type for video"), false);
    }
  } else if (type === "document") {

    if (file.fieldname === "pdf" && file.mimetype === "application/pdf") {
      cb(null, true);
    } else if (file.fieldname === "doc" && file.mimetype === "application/msword") {
      cb(null, true);
    } else if (file.fieldname === "ppt" && file.mimetype === "application/vnd.openxmlformats-officedocument.presentationml.presentation") {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type for document"), false);
    }
  } else if (file.fieldname === "profileImage" && file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else if (file.fieldname === "courseImage" && file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type"), false);
  }
};

// Create multer upload middleware
const upload = multer({ storage, limits, fileFilter }).fields([
  { name: "videofile", maxCount: 1 },
  { name: "thumbnail", maxCount: 1 },
  { name: "pdf", maxCount: 1 },
  { name: "ppt", maxCount: 1 },
  { name: "doc", maxCount: 1 },
  { name: "profileImage", maxCount: 1 },
  { name: "courseImage", maxCount: 1 },
]);

module.exports = upload;