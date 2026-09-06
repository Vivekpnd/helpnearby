const express = require("express");

const protect = require("../middleware/auth.middleware");

const {
  createHelpRequest,
  getHelpRequest,
  getMyHelpRequests,
  updateHelpRequest,
  cancelHelpRequest,
  getNearbyHelpRequests,
  claimHelpRequest,
  startHelpRequest,
  completeHelpRequest,
  confirmHelpCompletion,
  raiseDispute
} = require("../controllers/helpRequest.controller");

const router = express.Router();

/*
 * EVERYTHING inside help-request API
 * requires an authenticated user.
 */
router.use(protect);

/* =========================================================
   CREATE
========================================================= */

router.post(
  "/",
  createHelpRequest
);

/* =========================================================
   NEARBY
========================================================= */

router.get(
  "/nearby",
  getNearbyHelpRequests
);

/* =========================================================
   MY REQUESTS
========================================================= */

router.get(
  "/my",
  getMyHelpRequests
);

/* =========================================================
   CLAIM
========================================================= */

router.post(
  "/:id/claim",
  claimHelpRequest
);

/* =========================================================
   START
========================================================= */

router.post(
  "/:id/start",
  startHelpRequest
);

/* =========================================================
   COMPLETE
========================================================= */

router.post(
  "/:id/complete",
  completeHelpRequest
);

/* =========================================================
   CONFIRM COMPLETION
========================================================= */

router.post(
  "/:id/confirm-complete",
  confirmHelpCompletion
);

/* =========================================================
   DISPUTE
========================================================= */

router.post(
  "/:id/dispute",
  raiseDispute
);

/* =========================================================
   UPDATE
========================================================= */

router.patch(
  "/:id",
  updateHelpRequest
);

/* =========================================================
   CANCEL
========================================================= */

router.post(
  "/:id/cancel",
  cancelHelpRequest
);

/* =========================================================
   SINGLE REQUEST
========================================================= */

router.get(
  "/:id",
  getHelpRequest
);

module.exports = router;