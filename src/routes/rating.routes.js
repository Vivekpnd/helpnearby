const express = require("express");

const {
  createRating,
  getHelperRatings,
  getMyRatings
} = require("../controllers/rating.controller");

const protect = require("../middleware/auth.middleware");

const router = express.Router();

/* =========================================================
   CREATE RATING
   POST /api/ratings
========================================================= */

/**
 * Authenticated requester only.
 *
 * Validation:
 * rating.validator.js
 *
 * Business logic:
 * rating.service.js
 */
router.post(
  "/",
  protect,
  createRating
);

/* =========================================================
   GET HELPER RATINGS
   GET /api/ratings/helper/:helperId
========================================================= */

/**
 * Returns paginated ratings for a helper.
 *
 * Query:
 * ?page=1&limit=10
 */
router.get(
  "/helper/:helperId",
  protect,
  getHelperRatings
);

/* =========================================================
   GET MY RATINGS
   GET /api/ratings/my
========================================================= */

/**
 * Returns ratings created by the
 * currently authenticated user.
 *
 * Query:
 * ?page=1&limit=10
 */
router.get(
  "/my",
  protect,
  getMyRatings
);

/* =========================================================
   EXPORT ROUTER
========================================================= */

module.exports = router;