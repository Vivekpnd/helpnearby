const express = require("express");
const multer = require("multer");

const protect =
  require("../middleware/auth.middleware");

const {
  uploadImage
} = require("../controllers/upload.controller");

const router =
  express.Router();

const upload =
  multer({
    storage:
      multer.memoryStorage(),

    limits: {
      fileSize:
        5 * 1024 * 1024
    },

    fileFilter:
      (req, file, callback) => {
        const allowed = [
          "image/jpeg",
          "image/png",
          "image/webp"
        ];

        if (
          allowed.includes(
            file.mimetype
          )
        ) {
          callback(null, true);
        } else {
          callback(
            new Error(
              "Only JPG, PNG and WebP images are allowed."
            )
          );
        }
      }
  });

router.use(protect);

router.post(
  "/image",
  upload.single("image"),
  uploadImage
);

module.exports = router;