const RewardTransaction = require("../models/rewardTransaction.model");

/**
 * Create a reward
 */
const createReward = async (user, rewardData) => {
  // Reward creation logic will be implemented here.
  // Keep business logic in this service, not in the controller.

  const reward = await RewardTransaction.create({
    ...rewardData,
    createdBy: user?._id,
  });

  return reward;
};

/**
 * Get available rewards
 */
const getRewards = async (user, query = {}) => {
  const filter = {
    isActive: true,
  };

  // Optional category filter
  if (query.category) {
    filter.category = query.category;
  }

  const rewards = await RewardTransaction.find(filter)
    .sort({ createdAt: -1 })
    .lean();

  return rewards;
};

/**
 * Get reward by ID
 */
const getRewardById = async (user, rewardId) => {
  const reward = await RewardTransaction.findById(rewardId).lean();

  if (!reward) {
    const error = new Error("Reward not found");
    error.statusCode = 404;
    throw error;
  }

  return reward;
};

/**
 * Redeem a reward
 */
const redeemReward = async (user, rewardId) => {
  if (!user?._id) {
    const error = new Error("Authentication required");
    error.statusCode = 401;
    throw error;
  }

  const reward = await RewardTransaction.findById(rewardId);

  if (!reward) {
    const error = new Error("Reward not found");
    error.statusCode = 404;
    throw error;
  }

  if (!reward.isActive) {
    const error = new Error("This reward is no longer available");
    error.statusCode = 400;
    throw error;
  }

  /*
   * Actual point deduction / redemption transaction
   * will be implemented after point.service.js
   * and pointTransaction.model.js are created.
   */

  return {
    rewardId: reward._id,
    message: "Reward redemption process initialized",
  };
};

/**
 * Get user's reward history
 */
const getRewardHistory = async (user, query = {}) => {
  if (!user?._id) {
    const error = new Error("Authentication required");
    error.statusCode = 401;
    throw error;
  }

  const filter = {
    user: user._id,
  };

  const history = await RewardTransaction.find(filter)
    .sort({ createdAt: -1 })
    .lean();

  return history;
};

module.exports = {
  createReward,
  getRewards,
  getRewardById,
  redeemReward,
  getRewardHistory,
};