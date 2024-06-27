const multer = require('multer');
const path = require('path');

const MIME_TYPES = {
  'image/jpg': 'jpg',
  'image/jpeg': 'jpg',
  'image/png': 'png'
};

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, 'images');
  },
  filename: (req, file, callback) => {
    const originalName = file.originalname;
    const nameWithoutExtension = path.parse(originalName).name;
    const extension = MIME_TYPES[file.mimetype];
    callback(null, nameWithoutExtension + '_' + Date.now() + '.' + extension);
  }
});

module.exports = multer({ storage: storage }).single('image');