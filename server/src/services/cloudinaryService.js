const { Readable } = require("node:stream");
const { cloudinary } = require("../config/cloudinary");

function uploadImageBuffer(buffer, folder) {
  if (!cloudinary.config().cloud_name || !cloudinary.config().api_key || !cloudinary.config().api_secret) {
    const error = new Error("Cloudinary is not configured. Add Cloudinary keys to server/.env to upload images.");
    error.statusCode = 503;
    throw error;
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image"
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          publicId: result.public_id
        });
      }
    );

    Readable.from(buffer).pipe(stream);
  });
}

module.exports = { uploadImageBuffer };
