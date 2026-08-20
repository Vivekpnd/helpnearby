const express = require("express");
const protect = require("../middleware/auth.middleware");
const {
  getMe,
  updateProfile,
  updateLocation
} = require("../controllers/user.controller");

const router = express.Router();

router.use(protect);

router.get("/me", getMe);
router.patch("/profile", updateProfile);
router.patch("/location", updateLocation);

module.exports = router;
