const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("./cloudinary");

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    console.log("Multer processing file:", { // Debug
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });
    return {
      folder: file.fieldname === "file" ? "messages" : "posts", // Dynamic folder
      allowedFormats: ["jpg", "png", "jpeg", "gif", "mp4", "mov"],
      resource_type: "auto",
    };
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "video/mp4",
      "video/quicktime",
    ];
    // Remove any strict check here; Cloudinary handles it internally
    if (!file.originalname) {
      return cb(new Error("Invalid file"));
    }
    console.log("✅ File accepted:", file.originalname, file.mimetype);
    cb(null, true); // ✅ Accept all files, let Cloudinary handle validation

  },
});

module.exports = upload;