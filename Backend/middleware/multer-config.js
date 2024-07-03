const multer = require("multer");
const path = require("path");
const sharp = require("sharp");

const MIME_TYPES = {
  "image/jpg": "jpg",
  "image/jpeg": "jpg",
  "image/png": "png",
};

const storage = multer.memoryStorage(); // Stockage dans la mémoire car sharp bloque l'image quand il est en format jpg dans un fichier temporaire

const upload = multer({ storage: storage }).single("image");

module.exports = (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      return next(err);
    }

    if (!req.file) {
      return next(new Error("No file uploaded."));
    }

    const originalName = req.file.originalname.split(" ").join("_"); //On prépare le nom et le path de l'image
    const nameWithoutExtension = path.parse(originalName).name;
    const finalName = nameWithoutExtension + "_" + Date.now() + ".webp";
    const finalPath = path.join("images", finalName);

    sharp(req.file.buffer) // Sharp lit le fichier depuis le memoryStorage
      .resize(400) //Size 400 et format webp pour optimiser les images
      .toFormat("webp")
      .toFile(finalPath, (sharpErr, info) => {
        if (sharpErr) {
          console.error("Failed to convert image:", sharpErr);
          return next(sharpErr);
        }

        req.file.path = finalPath;
        req.file.filename = finalName;
        next();
      });
  });
};
