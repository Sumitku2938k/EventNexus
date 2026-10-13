const multer = require('multer');
const path = require('path');

// Configure memory storage for serverless compatibility (no local disk writes)
const storage = multer.memoryStorage();

// File filter - restrict to allowed image types
const fileFilter = (req, file, cb) => {
    const allowedExtensions = /jpeg|jpg|png|gif|webp/i;
    const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
    const isImageMime = file.mimetype && file.mimetype.startsWith('image/');

    if (extname && isImageMime) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
    }
};

// Configure Multer with 5MB file size limit
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: fileFilter
});

module.exports = upload;