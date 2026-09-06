const cloudinary =
  require("cloudinary").v2;

cloudinary.config({
  cloud_name:
    process.env.CLOUDINARY_CLOUD_NAME,

  api_key:
    process.env.CLOUDINARY_API_KEY,

  api_secret:
    process.env.CLOUDINARY_API_SECRET
});

function uploadImage(buffer, folder) {
  return new Promise(
    (resolve, reject) => {
      const stream =
        cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: "image",

            transformation: [
              {
                width: 1600,
                height: 1600,
                crop: "limit",
                quality: "auto",
                fetch_format: "auto"
              }
            ]
          },

          (error, result) => {
            if (error) {
              return reject(error);
            }

            resolve(result);
          }
        );

      stream.end(buffer);
    }
  );
}

async function uploadHelpRequestImage(
  buffer
) {
  const result =
    await uploadImage(
      buffer,
      "helpnearby/help-requests"
    );

  return {
    url: result.secure_url,
    publicId: result.public_id
  };
}

module.exports = {
  uploadHelpRequestImage
};