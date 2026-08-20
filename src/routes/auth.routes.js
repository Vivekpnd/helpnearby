const express = require("express");
const {
  startRegistration,
  verifyRegistrationEmail,
  resendRegistrationEmail,
  completeRegistration,
  login,
  forgotPassword,
  resetPassword
} = require("../controllers/auth.controller");

const router = express.Router();

router.post("/register/email", startRegistration);
router.post("/register/verify-email", verifyRegistrationEmail);
router.post("/register/resend-verification", resendRegistrationEmail);
router.post("/register/complete", completeRegistration);

router.post("/login", login);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

module.exports = router;
