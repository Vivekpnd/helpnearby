const rewardService = require("../services/reward.service");

/**
 * Create a reward
 * POST /api/rewards
 */
const createReward = async (req, res) => {
  try {
    const reward = await rewardService.createReward(req.user, req.body);

    return res.status(201).json({
      success: true,
      message: "Reward created successfully",
      data: reward,
    });
  } catch (error) {
    console.error("Create reward error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to create reward",
    });
  }
};

/**
 * Get available rewards
 * GET /api/rewards
 */
const getRewards = async (req, res) => {
  try {
    const rewards = await rewardService.getRewards(req.user, req.query);

    return res.status(200).json({
      success: true,
      message: "Rewards fetched successfully",
      data: rewards,
    });
  } catch (error) {
    console.error("Get rewards error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch rewards",
    });
  }
};

/**
 * Get reward by ID
 * GET /api/rewards/:rewardId
 */
const getRewardById = async (req, res) => {
  try {
    const reward = await rewardService.getRewardById(
      req.user,
      req.params.rewardId
    );

    return res.status(200).json({
      success: true,
      message: "Reward fetched successfully",
      data: reward,
    });
  } catch (error) {
    console.error("Get reward error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch reward",
    });
  }
};

/**
 * Redeem a reward
 * POST /api/rewards/:rewardId/redeem
 */
const redeemReward = async (req, res) => {
  try {
    const result = await rewardService.redeemReward(
      req.user,
      req.params.rewardId
    );

    return res.status(200).json({
      success: true,
      message: "Reward redeemed successfully",
      data: result,
    });
  } catch (error) {
    console.error("Redeem reward error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to redeem reward",
    });
  }
};

/**
 * Get user's reward history
 * GET /api/rewards/history
 */
const getRewardHistory = async (req, res) => {
  try {
    const history = await rewardService.getRewardHistory(
      req.user,
      req.query
    );

    return res.status(200).json({
      success: true,
      message: "Reward history fetched successfully",
      data: history,
    });
  } catch (error) {
    console.error("Get reward history error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch reward history",
    });
  }
};

module.exports = {
  createReward,
  getRewards,
  getRewardById,
  redeemReward,
  getRewardHistory,
};