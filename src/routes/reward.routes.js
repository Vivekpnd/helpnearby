const express = require("express");

const {
  createReward,
  getRewards,
  getRewardById,
  redeemReward,
  getRewardHistory,
} = require("../controllers/reward.controller");

const {
  validateCreateReward,
  validateRewardId,
  validateRewardQuery,
} = require("../validators/reward.validator");

const router = express.Router();

/*
 * NOTE:
 * Add your existing authentication middleware here.
 *
 * Example:
 * const authMiddleware = require("../middlewares/auth.middleware");
 *
 * router.use(authMiddleware);
 */

/**
 * GET /api/rewards
 * Get available rewards
 */
router.get(
  "/",
  validateRewardQuery,
  getRewards
);

/**
 * GET /api/rewards/history
 * Get logged-in user's reward history
 */
router.get(
  "/history",
  getRewardHistory
);

/**
 * GET /api/rewards/:rewardId
 * Get a specific reward
 */
router.get(
  "/:rewardId",
  validateRewardId,
  getRewardById
);

/**
 * POST /api/rewards
 * Create reward
 */
router.post(
  "/",
  validateCreateReward,
  createReward
);

/**
 * POST /api/rewards/:rewardId/redeem
 * Redeem reward
 */
router.post(
  "/:rewardId/redeem",
  validateRewardId,
  redeemReward
);

module.exports = router;