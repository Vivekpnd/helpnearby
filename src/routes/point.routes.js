const express = require("express");

const {
  getPointBalance,
  getPointHistory,
  getPointTransactionById,
  addPoints,
  deductPoints,
} = require("../controllers/point.controller");

const {
  validateTransactionId,
  validatePointHistoryQuery,
  validateAddPoints,
  validateDeductPoints,
} = require("../validators/point.validator");

const router = express.Router();

/*
 * IMPORTANT:
 * Add your existing authentication middleware here.
 *
 * Example:
 *
 * const authMiddleware = require("../middlewares/auth.middleware");
 * router.use(authMiddleware);
 */

/**
 * GET /api/points/balance
 * Get current user's point balance
 */
router.get(
  "/balance",
  getPointBalance
);

/**
 * GET /api/points/history
 * Get current user's point transaction history
 *
 * Optional:
 * ?type=credit
 * ?type=debit
 * ?status=completed
 * ?page=1&limit=20
 */
router.get(
  "/history",
  validatePointHistoryQuery,
  getPointHistory
);

/**
 * GET /api/points/transactions/:transactionId
 * Get a specific point transaction
 */
router.get(
  "/transactions/:transactionId",
  validateTransactionId,
  getPointTransactionById
);

/**
 * POST /api/points/add
 * Add points
 *
 * IMPORTANT:
 * This should NOT be publicly accessible to normal users.
 * Later we should restrict this to trusted internal flows/admin.
 */
router.post(
  "/add",
  validateAddPoints,
  addPoints
);

/**
 * POST /api/points/deduct
 * Deduct points
 *
 * This should normally be triggered by the reward
 * redemption service rather than directly by a user.
 */
router.post(
  "/deduct",
  validateDeductPoints,
  deductPoints
);

module.exports = router;