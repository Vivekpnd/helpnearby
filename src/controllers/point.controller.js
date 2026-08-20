const pointService = require("../services/point.service");

/**
 * Get current user's point balance
 * GET /api/points/balance
 */
const getPointBalance = async (req, res) => {
  try {
    const balance = await pointService.getPointBalance(req.user);

    return res.status(200).json({
      success: true,
      message: "Point balance fetched successfully",
      data: balance,
    });
  } catch (error) {
    console.error("Get point balance error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch point balance",
    });
  }
};

/**
 * Get current user's point transaction history
 * GET /api/points/history
 */
const getPointHistory = async (req, res) => {
  try {
    const history = await pointService.getPointHistory(
      req.user,
      req.query
    );

    return res.status(200).json({
      success: true,
      message: "Point history fetched successfully",
      data: history,
    });
  } catch (error) {
    console.error("Get point history error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch point history",
    });
  }
};

/**
 * Get a specific point transaction
 * GET /api/points/transactions/:transactionId
 */
const getPointTransactionById = async (req, res) => {
  try {
    const transaction = await pointService.getPointTransactionById(
      req.user,
      req.params.transactionId
    );

    return res.status(200).json({
      success: true,
      message: "Point transaction fetched successfully",
      data: transaction,
    });
  } catch (error) {
    console.error("Get point transaction error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch point transaction",
    });
  }
};

/**
 * Add points
 *
 * This should normally be called internally by your help-request
 * completion flow rather than directly by a normal user.
 */
const addPoints = async (req, res) => {
  try {
    const result = await pointService.addPoints(
      req.user,
      req.body
    );

    return res.status(201).json({
      success: true,
      message: "Points added successfully",
      data: result,
    });
  } catch (error) {
    console.error("Add points error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to add points",
    });
  }
};

/**
 * Deduct points
 *
 * This should normally be used by the reward redemption flow.
 */
const deductPoints = async (req, res) => {
  try {
    const result = await pointService.deductPoints(
      req.user,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Points deducted successfully",
      data: result,
    });
  } catch (error) {
    console.error("Deduct points error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to deduct points",
    });
  }
};

module.exports = {
  getPointBalance,
  getPointHistory,
  getPointTransactionById,
  addPoints,
  deductPoints,
};