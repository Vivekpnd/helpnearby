const mongoose = require("mongoose");

/**
 * Validate MongoDB ObjectId
 */
const isValidObjectId = (value) => {
  return mongoose.Types.ObjectId.isValid(value);
};

/**
 * Validate reward creation request
 */
const validateCreateReward = (req, res, next) => {
  const { rewardId, rewardName, pointsSpent } = req.body;

  if (!rewardId) {
    return res.status(400).json({
      success: false,
      message: "rewardId is required",
    });
  }

  if (!isValidObjectId(rewardId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid rewardId",
    });
  }

  if (!rewardName || typeof rewardName !== "string") {
    return res.status(400).json({
      success: false,
      message: "rewardName is required",
    });
  }

  if (
    pointsSpent === undefined ||
    typeof pointsSpent !== "number" ||
    pointsSpent < 0
  ) {
    return res.status(400).json({
      success: false,
      message: "pointsSpent must be a valid non-negative number",
    });
  }

  next();
};

/**
 * Validate reward ID parameter
 */
const validateRewardId = (req, res, next) => {
  const { rewardId } = req.params;

  if (!rewardId) {
    return res.status(400).json({
      success: false,
      message: "rewardId is required",
    });
  }

  if (!isValidObjectId(rewardId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid rewardId",
    });
  }

  next();
};

/**
 * Validate reward list query
 */
const validateRewardQuery = (req, res, next) => {
  const { category } = req.query;

  if (category !== undefined && typeof category !== "string") {
    return res.status(400).json({
      success: false,
      message: "category must be a string",
    });
  }

  next();
};

module.exports = {
  validateCreateReward,
  validateRewardId,
  validateRewardQuery,
};