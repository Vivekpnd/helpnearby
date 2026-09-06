const {
  uploadHelpRequestImage
} = require("../services/upload.service");

async function uploadImage(
  req,
  res,
  next
) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message:
          "Please select an image."
      });
    }

    const uploaded =
      await uploadHelpRequestImage(
        req.file.buffer
      );

    return res.status(201).json({
      success: true,
      message:
        "Image uploaded successfully.",
      data: uploaded
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  uploadImage
};