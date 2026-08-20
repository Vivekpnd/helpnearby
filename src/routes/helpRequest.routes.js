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


/* =========================================================
   HELP LIFECYCLE
========================================================= */
router.post(
  "/:id/dispute",
  raiseDispute
);

/**
 * ASSIGNED → IN_PROGRESS
 *
 * Only the assigned helper.
 */
router.post(
  "/:id/start",
  startHelpRequest
);

/**
 * IN_PROGRESS → AWAITING_CONFIRMATION
 *
 * Only the assigned helper.
 */
router.post(
  "/:id/complete",
  completeHelpRequest
);

/**
 * AWAITING_CONFIRMATION → COMPLETED
 *
 * Only the requester.
 */
router.post(
  "/:id/confirm-complete",
  confirmHelpCompletion
);

/* =========================================================
   CLAIM / ASSIGN
========================================================= */



/**
 * POST /api/help-requests/:id/claim
 *
 * Atomically claims a SEARCHING request.
 */
router.post("/:id/claim", claimHelpRequest);

/* =========================================================
   AUTHENTICATION
========================================================= */

router.use(protect);

/* =========================================================
   CREATE
========================================================= */

router.post("/", createHelpRequest);

/* =========================================================
   NEARBY
========================================================= */

/**
 * GET /api/help-requests/nearby
 *
 * IMPORTANT:
 * Must be before /:id.
 */
router.get("/nearby", getNearbyHelpRequests);

/* =========================================================
   MY ACTIVITY
========================================================= */

router.get("/my", getMyHelpRequests);

/* =========================================================
   SINGLE REQUEST
========================================================= */

router.get("/:id", getHelpRequest);

/* =========================================================
   UPDATE
========================================================= */

router.patch("/:id", updateHelpRequest);

/* =========================================================
   CANCEL
========================================================= */

router.post("/:id/cancel", cancelHelpRequest);

module.exports = router;