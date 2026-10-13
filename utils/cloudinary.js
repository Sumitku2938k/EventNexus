const cloudinary = require('cloudinary').v2;

// Configure Cloudinary from environment variables
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
});

/**
 * Check if all required Cloudinary environment variables are set.
 * @returns {boolean}
 */
function isCloudinaryConfigured() {
    return !!(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
    );
}

/**
 * Validate image buffer using file header magic bytes (not trusting client MIME type alone).
 * Supports JPEG, PNG, GIF, and WEBP.
 * @param {Buffer} buffer
 * @returns {boolean}
 */
function isValidImageBuffer(buffer) {
    if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 12) {
        return false;
    }

    // JPEG: starts with FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return true;
    }

    // PNG: starts with 89 50 4E 47 (0x89 'P' 'N' 'G')
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
        return true;
    }

    // GIF: starts with 47 49 46 ('GIF')
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
        return true;
    }

    // WEBP: starts with RIFF (bytes 0-3) and contains WEBP at bytes 8-11
    if (
        buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
        buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
    ) {
        return true;
    }

    return false;
}

/**
 * Upload an image buffer directly to Cloudinary using upload_stream.
 * @param {Buffer} buffer - In-memory image buffer
 * @param {Object} [options={}] - Additional upload options
 * @returns {Promise<{ secure_url: string, public_id: string }>}
 */
function uploadToCloudinary(buffer, options = {}) {
    return new Promise((resolve, reject) => {
        if (!isCloudinaryConfigured()) {
            return reject(new Error('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in environment variables.'));
        }

        const uploadOptions = {
            folder: 'eventnexus/posters',
            resource_type: 'image',
            allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
            ...options
        };

        const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
            if (error) {
                return reject(error);
            }
            resolve({
                secure_url: result.secure_url,
                public_id: result.public_id
            });
        });

        stream.end(buffer);
    });
}

/**
 * Delete an asset from Cloudinary by its public ID.
 * Only deletes when publicId is a valid non-empty string.
 * @param {string} publicId - Cloudinary public ID
 * @returns {Promise<any>}
 */
async function deleteFromCloudinary(publicId) {
    if (!publicId || typeof publicId !== 'string' || !isCloudinaryConfigured()) {
        return null;
    }

    try {
        const result = await cloudinary.uploader.destroy(publicId);
        return result;
    } catch (err) {
        console.error(`Failed to delete Cloudinary asset (${publicId}):`, err.message);
        return null;
    }
}

module.exports = {
    cloudinary,
    isCloudinaryConfigured,
    isValidImageBuffer,
    uploadToCloudinary,
    deleteFromCloudinary
};
